import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class BookingIntegrationService {
  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {}

  async fetchBookings(tenantId: string, startDate: Date, endDate: Date) {
    try {
      const config = await this.getBookingConfig(tenantId);
      const response = await firstValueFrom(
        this.httpService.get(`${config.apiUrl}/bookings`, {
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json',
          },
          params: {
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
          },
        })
      );
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch bookings: ${error.message}`);
    }
  }

  async updateBookingStatus(tenantId: string, bookingId: string, status: string) {
    try {
      const config = await this.getBookingConfig(tenantId);
      const response = await firstValueFrom(
        this.httpService.put(
          `${config.apiUrl}/bookings/${bookingId}`,
          { status },
          {
            headers: {
              'Authorization': `Bearer ${config.apiKey}`,
              'Content-Type': 'application/json',
            },
          }
        )
      );
      return response.data;
    } catch (error) {
      throw new Error(`Failed to update booking status: ${error.message}`);
    }
  }

  private async getBookingConfig(tenantId: string) {
    // This would typically come from your tenant configuration
    return {
      apiUrl: this.configService.get(`BOOKING_API_URL_${tenantId}`),
      apiKey: this.configService.get(`BOOKING_API_KEY_${tenantId}`),
    };
  }
} 