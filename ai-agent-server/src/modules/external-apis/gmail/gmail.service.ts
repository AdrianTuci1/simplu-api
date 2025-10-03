import { Injectable, BadRequestException, Res } from '@nestjs/common';
import { ExternalApisService } from '../external-apis.service';
import { google } from 'googleapis';
import { Response } from 'express';

@Injectable()
export class GmailService {
  constructor(private readonly externalApis: ExternalApisService) {}

  private createOAuthClient(redirectUri?: string) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const defaultRedirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3003/external/gmail/callback';
    const finalRedirectUri = redirectUri || defaultRedirectUri;
    
    if (!clientId || !clientSecret) {
      throw new BadRequestException('Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET environment variables. Please configure these variables in your .env file.');
    }
    
    return new google.auth.OAuth2(clientId, clientSecret, finalRedirectUri);
  }

  generateAuthUrl(businessId: string, locationId: string, redirectUrl?: string): string {
    if (!businessId || !locationId) throw new BadRequestException('Missing businessId or locationId');
    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/userinfo.email',
      'openid',
      'email',
    ];
    const state = Buffer.from(JSON.stringify({ 
      businessId, 
      locationId, 
      redirectUrl: redirectUrl || 'http://localhost:3000' // Default frontend URL
    })).toString('base64url');
    
    // Use the backend callback URI for OAuth (this is what Google will redirect to)
    const oauth2Client = this.createOAuthClient();
    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: scopes,
      state,
    });
  }

  async handleOAuthCallback(code: string, state: string, res?: Response): Promise<any> {
    if (!code || !state) throw new BadRequestException('Missing code/state');
    
    let redirectUrl = 'http://localhost:3000'; // Default frontend URL
    
    try {
      const { businessId, locationId, redirectUrl: stateRedirectUrl } = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
      console.log('Gmail callback - businessId:', businessId, 'locationId:', locationId);
      redirectUrl = stateRedirectUrl || redirectUrl;
      
      const oauth2Client = this.createOAuthClient();
      const { tokens } = await oauth2Client.getToken(code);
      
      if (!tokens?.access_token || !tokens?.refresh_token) {
        throw new BadRequestException('Invalid tokens returned by Google');
      }
      
      await this.externalApis.saveGmailCredentials(businessId, locationId, {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiryDate: typeof tokens.expiry_date === 'number' ? tokens.expiry_date : undefined,
        email: await this.fetchUserEmail(tokens.access_token),
      });
      
      // If res is provided, redirect to frontend with success
      if (res) {
        return res.redirect(`${redirectUrl}?gmail_auth=success`);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Gmail OAuth callback error:', error);
      
      // If res is provided, redirect to frontend with error
      if (res) {
        const errorMessage = encodeURIComponent(error.message || 'Gmail authorization failed');
        return res.redirect(`${redirectUrl}?gmail_auth=error&error=${errorMessage}`);
      }
      
      throw error;
    }
  }

  async getCredentialsStatus(businessId: string, locationId: string): Promise<any> {
    try {
      console.log(`Getting Gmail credentials status for businessId: ${businessId}, locationId: ${locationId}`);
      const credentials = await this.externalApis.getGmailCredentials(businessId, locationId);
      console.log('Retrieved credentials:', credentials);
      
      const status = {
        connected: !!credentials,
        email: credentials?.email || null,
        hasAccessToken: !!credentials?.accessToken,
        hasRefreshToken: !!credentials?.refreshToken,
        expiryDate: credentials?.expiryDate || null,
      };
      
      console.log('Returning status:', status);
      return status;
    } catch (error) {
      console.error('Error getting Gmail credentials status:', error);
      return {
        connected: false,
        email: null,
        hasAccessToken: false,
        hasRefreshToken: false,
        expiryDate: null,
        error: error.message,
      };
    }
  }

  async fetchUserEmail(accessToken: string): Promise<string> {
    const oauth2Client = this.createOAuthClient();
    oauth2Client.setCredentials({ access_token: accessToken });
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const resp = await oauth2.userinfo.get({});
    return (resp.data as any)?.email || '';
  }
}


