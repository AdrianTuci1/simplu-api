import { Controller, Post, Body, Logger } from '@nestjs/common';
import { RatingService } from './rating.service';
import { CreateRatingTokenDto } from './interfaces/rating.interface';

@Controller('rating')
export class RatingController {
  private readonly logger = new Logger(RatingController.name);

  constructor(private readonly ratingService: RatingService) {}

  /**
   * Called by resources-server when an appointment is marked as completed
   * Generates token and sends rating request email
   */
  @Post('send-request')
  async sendRatingRequest(@Body() dto: CreateRatingTokenDto) {
    this.logger.log(`Received rating request for appointment ${dto.appointmentId}`);
    
    const result = await this.ratingService.generateTokenAndSendEmail(dto);
    
    if (result.success) {
      return {
        success: true,
        message: 'Rating request email sent successfully',
        token: result.token,
      };
    } else {
      return {
        success: false,
        message: 'Failed to send rating request',
        error: result.error,
      };
    }
  }
}

