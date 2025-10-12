import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { CreateRatingTokenDto } from './interfaces/rating.interface';
import { ExternalApiConfigService } from '../external-apis/services/external-api-config.service';
import { ExternalApisService } from '../external-apis/external-apis.service';
import { BusinessInfoService } from '../business-info/business-info.service';

@Injectable()
export class RatingService {
  private readonly logger = new Logger(RatingService.name);

  constructor(
    private readonly configService: ExternalApiConfigService,
    private readonly externalApisService: ExternalApisService,
    private readonly businessInfoService: BusinessInfoService,
  ) {}

  /**
   * Generate a one-time rating token and send email
   * The token will be verified and stored by the app server
   */
  async generateTokenAndSendEmail(dto: CreateRatingTokenDto): Promise<{ success: boolean; token: string; error?: string }> {
    try {
      // Check if rating config is enabled
      const config = await this.configService.getOrCreateConfig(dto.businessId, dto.locationId);
      
      if (!config.rating.enabled || !config.rating.sendOnCompletion) {
        this.logger.log(`Rating system is disabled for business ${dto.businessId}, location ${dto.locationId}`);
        return { success: false, token: '', error: 'Rating system is disabled' };
      }

      // Generate unique token (UUID)
      const token = uuidv4();

      this.logger.log(`Generated rating token for appointment ${dto.appointmentId}: ${token}`);

      // Send email
      const emailResult = await this.sendRatingEmail(dto, token, config);

      if (!emailResult.success) {
        return { success: false, token: '', error: emailResult.error };
      }

      return { success: true, token };
    } catch (error) {
      this.logger.error(`Failed to generate token and send email: ${error.message}`, error.stack);
      return { success: false, token: '', error: error.message };
    }
  }

  /**
   * Send rating request email to patient
   */
  private async sendRatingEmail(
    dto: CreateRatingTokenDto,
    token: string,
    config: any,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get rating template
      const template = config.rating.templates.find(t => t.id === config.rating.defaultTemplate);
      if (!template) {
        return { success: false, error: 'No rating email template found' };
      }

      // Get business info to retrieve domainLabel
      const businessInfo = await this.businessInfoService.getBusinessInfo(dto.businessId);
      const domainLabel = businessInfo?.domainLabel;

      if (!domainLabel) {
        this.logger.warn(`No domainLabel found for business ${dto.businessId}, using default URL`);
      }

      // Build rating URL using domainLabel
      const baseUrl = domainLabel 
        ? `https://${domainLabel}.simplu.io` 
        : 'not received';
      const ratingUrl = `${baseUrl}/rating/${dto.businessId}/${dto.locationId}/${token}`;

      // Process template variables
      const variables = {
        patientName: dto.patientName,
        locationName: config.email.senderName || businessInfo?.businessName || dto.businessId,
        appointmentDate: dto.appointmentDate,
        appointmentTime: dto.appointmentTime,
        ratingUrl,
        phoneNumber: '', // Phone number can be added from location info if needed
      };

      const subject = this.configService.processTemplate(template.subject, variables);
      const content = this.configService.processTemplate(template.content, variables);

      // Send email based on service type
      let result;
      switch (config.email.serviceType) {
        case 'gmail':
          result = await this.externalApisService.sendEmailFromGmail(
            dto.businessId,
            dto.locationId,
            dto.patientEmail,
            subject,
            content,
          );
          break;
        case 'smtp':
          result = await this.externalApisService.sendEmail(
            dto.patientEmail,
            subject,
            content,
            dto.businessId,
          );
          break;
        default:
          return { success: false, error: 'Unsupported email service type' };
      }

      if (result.success) {
        this.logger.log(`Rating email sent successfully to ${dto.patientEmail}`);
        return { success: true };
      } else {
        this.logger.warn(`Failed to send rating email: ${result.error}`);
        return { success: false, error: result.error };
      }
    } catch (error) {
      this.logger.error(`Failed to send rating email: ${error.message}`, error.stack);
      return { success: false, error: error.message };
    }
  }
}
