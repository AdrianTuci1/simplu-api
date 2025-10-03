import { Injectable, BadRequestException } from '@nestjs/common';
import axios from 'axios';
import { ExternalApisService } from '../external-apis.service';

@Injectable()
export class MetaService {
  constructor(private readonly externalApis: ExternalApisService) {}

  generateAuthUrl(businessId: string, locationId: string): string {
    if (!businessId || !locationId) throw new BadRequestException('Missing businessId or locationId');
    const clientId = process.env.META_APP_ID as string;
    const redirectUri = process.env.META_REDIRECT_URI || 'http://localhost:3003/external/meta/callback';
    const scopes = [
      'pages_messaging',
      'pages_show_list',
      'pages_manage_metadata',
      'instagram_basic',
      'instagram_manage_messages',
    ];
    const state = Buffer.from(JSON.stringify({ businessId, locationId })).toString('base64url');
    const url = new URL('https://www.facebook.com/v19.0/dialog/oauth');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('scope', scopes.join(','));
    url.searchParams.set('state', state);
    return url.toString();
  }

  async handleCallback(code: string, state: string): Promise<any> {
    if (!code || !state) throw new BadRequestException('Missing code/state');
    const { businessId, locationId } = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
    const clientId = process.env.META_APP_ID as string;
    const clientSecret = process.env.META_APP_SECRET as string;
    const redirectUri = process.env.META_REDIRECT_URI || 'http://localhost:3003/external/meta/callback';

    // Use default agents (no keep-alive) for one-off OAuth exchanges to avoid lingering sockets
    const axiosInstance = axios.create({
      timeout: 10000,
      maxRedirects: 3
    });

    // Exchange code for short-lived token
    const tokenResp = await axiosInstance.get('https://graph.facebook.com/v19.0/oauth/access_token', {
      params: { client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, code },
    });
    const accessToken = tokenResp.data?.access_token as string;

    // Optional: exchange for long-lived token
    let longLived = accessToken;
    try {
      const ll = await axiosInstance.get('https://graph.facebook.com/v19.0/oauth/access_token', {
        params: { grant_type: 'fb_exchange_token', client_id: clientId, client_secret: clientSecret, fb_exchange_token: accessToken },
      });
      longLived = ll.data?.access_token || accessToken;
    } catch {}

    // Store per-location Meta token under serviceType meta#locationId
    await this.externalApis.saveMetaCredentials(businessId, {
      accessToken: longLived,
      phoneNumberId: '',
      appSecret: clientSecret,
      phoneNumber: '',
    } as any);

    return { success: true };
  }

  async getCredentialsStatus(businessId: string, locationId: string): Promise<any> {
    try {
      const credentials = await this.externalApis.getMetaCredentials(businessId);
      return {
        connected: !!credentials,
        hasAccessToken: !!credentials?.accessToken,
        hasPhoneNumberId: !!credentials?.phoneNumberId,
        hasPhoneNumber: !!credentials?.phoneNumber,
        phoneNumber: credentials?.phoneNumber || null,
      };
    } catch (error) {
      console.error('Error getting Meta credentials status:', error);
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


