import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { ExternalApisService } from '../external-apis.service';

@Injectable()
export class MetaService {
  private readonly logger = new Logger(MetaService.name);

  constructor(
    private readonly externalApis: ExternalApisService,
    private readonly configService: ConfigService,
  ) {}

  generateAuthUrl(
    businessId: string, 
    locationId: string, 
    customRedirectUri?: string
  ): { url: string; clientId: string; redirectUri: string } {
    if (!businessId || !locationId) throw new BadRequestException('Missing businessId or locationId');
    const clientId = this.configService.get<string>('meta.appId');
    
    // Use custom redirect_uri if provided (for dynamic frontend URLs), otherwise use default from config
    const redirectUri = customRedirectUri || this.configService.get<string>('meta.redirectUri');
    
    if (!clientId) {
      this.logger.error('META_APP_ID is not configured');
      throw new BadRequestException('Meta App ID is not configured');
    }
    
    if (!redirectUri) {
      this.logger.error('redirect_uri is not provided and META_REDIRECT_URI is not configured');
      throw new BadRequestException('Redirect URI is required. Provide it via query parameter or configure META_REDIRECT_URI');
    }
    
    // Get scopes from config (comma-separated string)
    // Default scopes for Meta API v19.0+ (Facebook Pages)
    // Note: Ensure these permissions are enabled in your Meta App Dashboard
    const scopesString = this.configService.get<string>('meta.scopes');
    const scopes = scopesString.split(',').map(s => s.trim()).filter(s => s.length > 0);
    
    // Store redirect_uri in state so we can use the same one during token exchange
    const state = Buffer.from(JSON.stringify({ businessId, locationId, redirectUri })).toString('base64url');
    const url = new URL('https://www.facebook.com/v19.0/dialog/oauth');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('scope', scopes.join(','));
    url.searchParams.set('state', state);
    
    this.logger.log(`Meta OAuth URL generated for businessId: ${businessId}, locationId: ${locationId}, clientId: ${clientId}, redirectUri: ${redirectUri}`);
    
    return {
      url: url.toString(),
      clientId,
      redirectUri,
    };
  }

  async handleCallback(code: string, state: string): Promise<any> {
    if (!code || !state) throw new BadRequestException('Missing code/state');
    
    // Extract redirect_uri from state - this ensures we use the SAME redirect_uri
    // that was used in the authorization request
    const stateData = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
    const { businessId, locationId, redirectUri } = stateData;
    
    const clientId = this.configService.get<string>('meta.appId');
    const clientSecret = this.configService.get<string>('meta.appSecret');

    this.logger.log(`Processing Meta OAuth callback for businessId: ${businessId}, locationId: ${locationId}, redirectUri: ${redirectUri}`);

    // Use default agents (no keep-alive) for one-off OAuth exchanges to avoid lingering sockets
    const axiosInstance = axios.create({
      timeout: 10000,
      maxRedirects: 3
    });

    // Exchange code for short-lived token
    // NOTE: redirect_uri MUST match the one used in authorization request
    try {
      this.logger.log(`Exchanging code for token with params: clientId=${clientId}, redirectUri=${redirectUri}`);
      const tokenResp = await axiosInstance.get('https://graph.facebook.com/v19.0/oauth/access_token', {
        params: { 
          client_id: clientId, 
          client_secret: clientSecret, 
          redirect_uri: redirectUri, // REQUIRED by Meta API - must match authorization request
          code 
        },
      });
      const accessToken = tokenResp.data?.access_token as string;
      this.logger.log(`Short-lived access token obtained for businessId: ${businessId}`);

      // Optional: exchange for long-lived token
      let longLived = accessToken;
      try {
        const ll = await axiosInstance.get('https://graph.facebook.com/v19.0/oauth/access_token', {
          params: { grant_type: 'fb_exchange_token', client_id: clientId, client_secret: clientSecret, fb_exchange_token: accessToken },
        });
        longLived = ll.data?.access_token || accessToken;
        this.logger.log(`Long-lived access token obtained for businessId: ${businessId}`);
      } catch (error) {
        this.logger.warn(`Failed to exchange for long-lived token for businessId: ${businessId}, using short-lived token`);
      }

      // Get user's pages and phone numbers
      this.logger.log(`Fetching user's Facebook Pages and WhatsApp phone numbers...`);
      
      let pageId = '';
      let pageAccessToken = longLived;
      let phoneNumberId = '';
      let phoneNumber = '';
      
      try {
        // Get user's Pages
        const pagesResp = await axiosInstance.get('https://graph.facebook.com/v19.0/me/accounts', {
          params: { access_token: longLived }
        });
        
        if (pagesResp.data?.data && pagesResp.data.data.length > 0) {
          const page = pagesResp.data.data[0]; // Use first page
          pageId = page.id;
          pageAccessToken = page.access_token; // Page access token!
          
          this.logger.log(`Found Facebook Page: ${page.name} (ID: ${pageId})`);
          
          // Check for WhatsApp Business Account
          try {
            const waResp = await axiosInstance.get(
              `https://graph.facebook.com/v19.0/${pageId}`,
              {
                params: {
                  fields: 'whatsapp_business_account',
                  access_token: pageAccessToken
                }
              }
            );
            
            if (waResp.data?.whatsapp_business_account) {
              const wabaId = waResp.data.whatsapp_business_account.id;
              this.logger.log(`Found WhatsApp Business Account: ${wabaId}`);
              
              // Get phone numbers
              const phoneResp = await axiosInstance.get(
                `https://graph.facebook.com/v19.0/${wabaId}/phone_numbers`,
                {
                  params: { access_token: pageAccessToken }
                }
              );
              
              if (phoneResp.data?.data && phoneResp.data.data.length > 0) {
                const phone = phoneResp.data.data[0];
                phoneNumberId = phone.id;
                phoneNumber = phone.display_phone_number;
                this.logger.log(`Found WhatsApp phone: ${phoneNumber} (ID: ${phoneNumberId})`);
              }
            }
          } catch (waError) {
            this.logger.warn(`No WhatsApp Business Account found for page ${pageId}`);
          }
        }
      } catch (pagesError) {
        this.logger.warn(`Could not fetch Pages: ${pagesError.message}`);
      }

      // Store per-location Meta token under serviceType meta#locationId
      await this.externalApis.saveMetaCredentials(businessId, locationId, {
        accessToken: pageAccessToken, // Use Page access token, not user token!
        phoneNumberId: phoneNumberId,
        appSecret: clientSecret,
        phoneNumber: phoneNumber,
        pageId: pageId,
        businessAccountId: '',
      } as any);

      this.logger.log(`Meta credentials saved successfully for businessId: ${businessId}, locationId: ${locationId}`);
      this.logger.log(`  - Page ID: ${pageId || 'N/A'}`);
      this.logger.log(`  - Phone Number ID: ${phoneNumberId || 'N/A'}`);
      this.logger.log(`  - Phone Number: ${phoneNumber || 'N/A'}`);

      return { success: true };
    } catch (error) {
      this.logger.error(`Meta OAuth token exchange failed for businessId: ${businessId}`, {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status,
        params: { clientId, redirectUri, hasCode: !!code }
      });
      throw new BadRequestException(
        error.response?.data?.error?.message || 
        'Failed to exchange OAuth code for access token. Please ensure redirect_uri matches the one configured in Meta App.'
      );
    }
  }

  async getCredentialsStatus(businessId: string, locationId: string): Promise<any> {
    try {
      this.logger.log(`Checking Meta credentials status for businessId: ${businessId}, locationId: ${locationId}`);
      const credentials = await this.externalApis.getMetaCredentials(businessId, locationId);
      const status = {
        connected: !!credentials,
        hasAccessToken: !!credentials?.accessToken,
        hasPhoneNumberId: !!credentials?.phoneNumberId,
        hasPhoneNumber: !!credentials?.phoneNumber,
        phoneNumber: credentials?.phoneNumber || null,
        pageId: credentials?.pageId || null,
      };
      this.logger.log(`Meta credentials status for businessId ${businessId}, locationId ${locationId}: connected=${status.connected}`);
      return status;
    } catch (error) {
      this.logger.error(`Error getting Meta credentials status for businessId: ${businessId}`, error.stack);
      return {
        connected: false,
        hasAccessToken: false,
        hasPhoneNumberId: false,
        hasPhoneNumber: false,
        phoneNumber: null,
        error: error.message,
      };
    }
  }
}


