import { Injectable, BadRequestException } from '@nestjs/common';
import { ExternalApisService } from '../external-apis.service';
import { google } from 'googleapis';

@Injectable()
export class GmailService {
  constructor(private readonly externalApis: ExternalApisService) {}

  private createOAuthClient() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/external/gmail/callback';
    if (!clientId || !clientSecret) {
      console.warn('GmailService: missing GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET');
    }
    return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  }

  generateAuthUrl(businessId: string, userId: string): string {
    if (!businessId || !userId) throw new BadRequestException('Missing businessId or userId');
    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/userinfo.email',
      'openid',
      'email',
    ];
    const state = Buffer.from(JSON.stringify({ businessId, userId })).toString('base64url');
    const oauth2Client = this.createOAuthClient();
    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: scopes,
      state,
    });
  }

  async handleOAuthCallback(code: string, state: string): Promise<any> {
    if (!code || !state) throw new BadRequestException('Missing code/state');
    const { businessId, userId } = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
    const oauth2Client = this.createOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);
    if (!tokens?.access_token || !tokens?.refresh_token) {
      throw new BadRequestException('Invalid tokens returned by Google');
    }
    await this.externalApis.saveGmailCredentials(businessId, userId, {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiryDate: typeof tokens.expiry_date === 'number' ? tokens.expiry_date : undefined,
      email: await this.fetchUserEmail(tokens.access_token),
    });
    return { success: true };
  }

  async fetchUserEmail(accessToken: string): Promise<string> {
    const oauth2Client = this.createOAuthClient();
    oauth2Client.setCredentials({ access_token: accessToken });
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const resp = await oauth2.userinfo.get({});
    return (resp.data as any)?.email || '';
  }
}


