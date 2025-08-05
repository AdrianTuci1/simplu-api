import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../redis/redis.service';
import { AuthEnvelope, Step1AuthResponse } from '../dto/auth-step1.dto';
import { CognitoUser } from '../auth.service';
import { randomBytes } from 'crypto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthEnvelopeService {
  private readonly CODE_EXPIRY_SECONDS = 60; // 1 minute
  private readonly ENVELOPE_PREFIX = 'auth_envelope:';

  constructor(
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Creates an authorization envelope with temporary code
   */
  async createAuthEnvelope(
    user: CognitoUser,
    clientId: string,
  ): Promise<{ envelope: AuthEnvelope; redirectUrl: string }> {
    const envelopeId = uuidv4();
    const authCode = this.generateAuthCode();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.CODE_EXPIRY_SECONDS * 1000);

    const envelope: AuthEnvelope = {
      envelopeId,
      userId: user.userId,
      authCode,
      clientId,
      timestamp: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    // Store envelope in Redis with expiration
    await this.storeEnvelope(envelope);

    // Generate redirect URL for the client
    const redirectUrl = this.buildRedirectUrl(envelope, clientId);

    return { envelope, redirectUrl };
  }

  /**
   * Validates and retrieves an authorization envelope
   */
  async validateAndRetrieveEnvelope(
    envelopeId: string,
    authCode: string,
  ): Promise<AuthEnvelope | null> {
    const envelope = await this.getEnvelope(envelopeId);

    if (!envelope) {
      return null;
    }

    // Check if envelope has expired
    if (new Date() > new Date(envelope.expiresAt)) {
      await this.removeEnvelope(envelopeId);
      return null;
    }

    // Validate auth code
    if (envelope.authCode !== authCode) {
      return null;
    }

    return envelope;
  }

  /**
   * Consumes an authorization envelope (removes it after use)
   */
  async consumeEnvelope(
    envelopeId: string,
    authCode: string,
  ): Promise<AuthEnvelope | null> {
    const envelope = await this.validateAndRetrieveEnvelope(
      envelopeId,
      authCode,
    );

    if (envelope) {
      // Remove envelope after successful validation
      await this.removeEnvelope(envelopeId);
    }

    return envelope;
  }

  /**
   * Generates a secure random authorization code
   */
  private generateAuthCode(): string {
    return randomBytes(16).toString('hex');
  }

  /**
   * Stores envelope in Redis with expiration
   */
  private async storeEnvelope(envelope: AuthEnvelope): Promise<void> {
    const key = `${this.ENVELOPE_PREFIX}${envelope.envelopeId}`;
    await this.redisService.set(
      key,
      JSON.stringify(envelope),
      this.CODE_EXPIRY_SECONDS,
    );
  }

  /**
   * Retrieves envelope from Redis
   */
  private async getEnvelope(envelopeId: string): Promise<AuthEnvelope | null> {
    const key = `${this.ENVELOPE_PREFIX}${envelopeId}`;
    const data = await this.redisService.get(key);

    if (!data) {
      return null;
    }

    try {
      return JSON.parse(data) as AuthEnvelope;
    } catch (error) {
      console.error('Error parsing envelope data:', error);
      return null;
    }
  }

  /**
   * Removes envelope from Redis
   */
  private async removeEnvelope(envelopeId: string): Promise<void> {
    const key = `${this.ENVELOPE_PREFIX}${envelopeId}`;
    await this.redisService.del(key);
  }

  /**
   * Builds redirect URL for the target client service
   */
  private buildRedirectUrl(envelope: AuthEnvelope, clientId: string): string {
    const baseUrl = this.getClientRedirectUrl(clientId);
    const params = new URLSearchParams({
      envelope_id: envelope.envelopeId,
      auth_code: envelope.authCode,
      user_id: envelope.userId,
      expires_at: envelope.expiresAt,
    });

    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Gets the redirect URL for a specific client
   */
  private getClientRedirectUrl(clientId: string): string {
    // Configuration for different client redirect URLs
    const clientUrls = this.configService.get('auth.clientRedirectUrls', {
      'web-app': 'http://localhost:3000/auth/step2',
      'mobile-app': 'https://mobile.example.com/auth/step2',
      'admin-panel': 'http://localhost:3001/auth/step2',
    });

    return clientUrls[clientId] || clientUrls['web-app'];
  }

  /**
   * Cleans up expired envelopes (can be called by a scheduled job)
   */
  async cleanupExpiredEnvelopes(): Promise<void> {
    // This would typically be handled by Redis TTL, but we can implement
    // additional cleanup logic here if needed
    console.log('Cleaning up expired auth envelopes...');
  }
}
