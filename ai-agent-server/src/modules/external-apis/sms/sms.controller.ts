import { 
  Controller, 
  Post, 
  Get,
  Body, 
  Param, 
  Query,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import { ExternalApisService } from '../external-apis.service';

export interface SendSMSDto {
  to: string;
  message: string;
  businessId: string;
}

export interface SendBulkSMSDto {
  recipients: Array<{
    phoneNumber: string;
    message: string;
  }>;
  businessId: string;
}

@Controller('sms')
export class SMSController {
  constructor(
    private readonly externalApisService: ExternalApisService
  ) {}

  @Post('send')
  @HttpCode(HttpStatus.OK)
  async sendSMS(@Body() sendSMSDto: SendSMSDto) {
    const { to, message, businessId } = sendSMSDto;
    
    if (!to || !message || !businessId) {
      return {
        success: false,
        error: 'Missing required fields: to, message, businessId'
      };
    }

    return await this.externalApisService.sendSMS(to, message, businessId);
  }

  @Post('send-bulk')
  @HttpCode(HttpStatus.OK)
  async sendBulkSMS(@Body() sendBulkSMSDto: SendBulkSMSDto) {
    const { recipients, businessId } = sendBulkSMSDto;
    
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0 || !businessId) {
      return {
        success: false,
        error: 'Missing required fields: recipients (array), businessId'
      };
    }

    const results = [];
    
    for (const recipient of recipients) {
      if (!recipient.phoneNumber || !recipient.message) {
        results.push({
          phoneNumber: recipient.phoneNumber || 'unknown',
          success: false,
          error: 'Missing phoneNumber or message'
        });
        continue;
      }

      try {
        const result = await this.externalApisService.sendSMS(
          recipient.phoneNumber, 
          recipient.message, 
          businessId
        );
        
        results.push({
          phoneNumber: recipient.phoneNumber,
          ...result
        });
      } catch (error) {
        results.push({
          phoneNumber: recipient.phoneNumber,
          success: false,
          error: error.message
        });
      }
    }

    return {
      success: true,
      results,
      totalSent: recipients.length,
      successfulSends: results.filter(r => r.success).length,
      failedSends: results.filter(r => !r.success).length
    };
  }

  @Get('test/:businessId')
  async testSMSService(@Param('businessId') businessId: string) {
    // Test endpoint to verify SMS service configuration
    const testMessage = 'Test SMS from AI Agent - Service is working correctly';
    const testPhoneNumber = '+40700000000'; // Replace with a test number
    
    return await this.externalApisService.sendSMS(testPhoneNumber, testMessage, businessId);
  }
}
