import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { SESService } from '../shared/services/ses.service';
import { ResourceQueryService } from '../resources/services/resource-query.service';
import { ResourcesService } from '../resources/resources.service';
import { AuthenticatedUser } from '../resources/services/permission.service';
import { BusinessInfoService } from '../business-info/business-info.service';

export interface InvitationData {
  email: string;
  businessId: string;
  locationId: string;
  medicResourceId: string;
  businessType: string; // dental, gym, hotel
  invitedBy: string;
  invitationId: string;
  expiresAt: number;
}

@Injectable()
export class InvitationsService {
  private readonly logger = new Logger(InvitationsService.name);
  private readonly baseDomain: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly sesService: SESService,
    private readonly resourceQueryService: ResourceQueryService,
    private readonly resourcesService: ResourcesService,
    private readonly businessInfoService: BusinessInfoService,
  ) {
    this.baseDomain = this.configService.get<string>('BASE_DOMAIN', 'simplu.io');
  }

  /**
   * Generate frontend URL based on business type
   */
  private getFrontendUrl(businessType: string): string {
    const typeMap: Record<string, string> = {
      'dental': `https://dental.${this.baseDomain}`,
      'gym': `https://gym.${this.baseDomain}`,
      'hotel': `https://hotel.${this.baseDomain}`,
    };

    return typeMap[businessType] || `https://admin.${this.baseDomain}`;
  }

  /**
   * Send invitation email to a medic
   */
  async sendInvitation(params: {
    businessId: string;
    locationId: string;
    medicResourceId: string;
    invitedBy: AuthenticatedUser;
  }): Promise<{ success: boolean; message: string; error?: string }> {
    try {
      this.logger.log(
        `Sending invitation for medic ${params.medicResourceId} in ${params.businessId}/${params.locationId}`,
      );

      // 1. Get medic resource
      const medic = await this.resourceQueryService.getResourceById(
        params.businessId,
        params.locationId,
        'medic',
        params.medicResourceId,
      );

      if (!medic) {
        throw new NotFoundException('Medic not found');
      }

      // 2. Check if already has Cognito account
      if (medic.data.cognitoUserId) {
        throw new BadRequestException('This user already has an account');
      }

      // 3. Validate email
      const email = medic.data.email;
      if (!email) {
        throw new BadRequestException('Medic resource does not have an email');
      }

      // 4. Get business info for email content and business type
      const businessInfo = await this.businessInfoService.getBusinessInfo(params.businessId);
      
      this.logger.log(`Business info retrieved:`, {
        businessId: params.businessId,
        businessName: businessInfo?.businessName,
        businessType: businessInfo?.businessType,
      });

      const businessName = businessInfo?.businessName || 'Echipa';
      const businessType = businessInfo?.businessType || 'dental';

      // Get inviter's real name (prefer email over username which can be a UUID)
      const inviterName = params.invitedBy.email || params.invitedBy.userName;

      this.logger.log(`Invitation details:`, {
        to: email,
        businessName,
        businessType,
        inviterName,
      });

      // 5. Generate simple UUID for invitation (no JWT needed!)
      const invitationId = randomUUID();
      const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days from now

      // 6. Generate invitation URL based on business type
      const frontendUrl = this.getFrontendUrl(businessType);
      const invitationUrl = `${frontendUrl}/register?invitation=${invitationId}&email=${encodeURIComponent(email)}&businessId=${params.businessId}&locationId=${params.locationId}`;
      
      this.logger.log(`Generated invitation URL for ${businessType}: ${invitationUrl}`);

      // 7. Send email via SES
      const emailResult = await this.sesService.sendInvitationEmail({
        to: email,
        businessName,
        inviterName,
        invitationUrl,
      });

      if (!emailResult.success) {
        throw new Error(`Failed to send email: ${emailResult.error}`);
      }

      this.logger.log(`Invitation email sent successfully to ${email} - MessageId: ${emailResult.messageId}`);

      // 8. Update medic resource with invitation details
      await this.resourcesService.processResourceOperation({
        operation: 'patch',
        businessId: params.businessId,
        locationId: params.locationId,
        resourceType: 'medic',
        resourceId: params.medicResourceId,
        data: {
          invitationId,
          invitationStatus: 'sent',
          invitationSentAt: new Date().toISOString(),
          invitationSentBy: params.invitedBy.userId,
          invitationExpiresAt: new Date(expiresAt).toISOString(),
        },
        user: params.invitedBy,
      });

      return {
        success: true,
        message: `Invitation sent successfully to ${email}`,
      };
    } catch (error) {
      this.logger.error(`Failed to send invitation: ${error.message}`, error.stack);
      return {
        success: false,
        message: 'Failed to send invitation',
        error: error.message,
      };
    }
  }

  /**
   * Verify invitation by ID (searches in medic resources)
   * Requires businessId and locationId for efficient lookup
   */
  async verifyInvitation(params: {
    invitationId: string;
    email: string;
    businessId: string;
    locationId: string;
  }): Promise<{
    valid: boolean;
    data?: InvitationData;
    error?: string;
  }> {
    try {
      this.logger.log(`Verifying invitation: ${params.invitationId} for ${params.email}`);

      // Find medic by email (resource_id = email initially)
      const medic = await this.resourceQueryService.getResourceById(
        params.businessId,
        params.locationId,
        'medic',
        params.email, // resource_id is email before acceptance
      );

      if (!medic) {
        return {
          valid: false,
          error: 'Invitation not found',
        };
      }

      // Verify invitationId matches
      if (medic.data.invitationId !== params.invitationId) {
        return {
          valid: false,
          error: 'Invalid invitation ID',
        };
      }

      // Check if already accepted
      if (medic.data.cognitoUserId) {
        return {
          valid: false,
          error: 'Invitation already accepted',
        };
      }

      // Check if expired
      const expiresAt = new Date(medic.data.invitationExpiresAt).getTime();
      if (Date.now() > expiresAt) {
        return {
          valid: false,
          error: 'Invitation expired',
        };
      }

      // Get business info for response
      const businessInfo = await this.businessInfoService.getBusinessInfo(params.businessId);

      return {
        valid: true,
        data: {
          email: medic.data.email,
          businessId: params.businessId,
          locationId: params.locationId,
          medicResourceId: params.email, // Still email at this point
          businessType: businessInfo?.businessType || 'dental',
          invitedBy: medic.data.invitationSentBy || 'Admin',
          invitationId: params.invitationId,
          expiresAt,
        },
      };
    } catch (error) {
      this.logger.error(`Error verifying invitation: ${error.message}`);
      return {
        valid: false,
        error: 'Invalid invitation',
      };
    }
  }

  /**
   * Verify invitation token (backward compatibility - deprecated)
   */
  async verifyInvitationToken(invitationId: string, email: string): Promise<{
    valid: boolean;
    data?: InvitationData;
    error?: string;
  }> {
    return {
      valid: false,
      error: 'Please provide businessId and locationId parameters',
    };
  }

  /**
   * Get invitation status for a medic
   */
  async getInvitationStatus(params: {
    businessId: string;
    locationId: string;
    medicResourceId: string;
  }): Promise<{
    status: 'not_sent' | 'sent' | 'accepted';
    sentAt?: string;
    acceptedAt?: string;
    hasCognitoAccount: boolean;
  }> {
    const medic = await this.resourceQueryService.getResourceById(
      params.businessId,
      params.locationId,
      'medic',
      params.medicResourceId,
    );

    if (!medic) {
      throw new NotFoundException('Medic not found');
    }

    const hasCognitoAccount = !!medic.data.cognitoUserId;
    const invitationStatus = medic.data.invitationStatus;

    return {
      status: hasCognitoAccount ? 'accepted' : (invitationStatus || 'not_sent'),
      sentAt: medic.data.invitationSentAt,
      acceptedAt: medic.data.invitationAcceptedAt,
      hasCognitoAccount,
    };
  }
}

