import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface PublicService {
  id: string;
  name: string;
  description?: string;
  duration: number;
  price: number;
  isActive: boolean;
  category?: string;
}

export interface AvailableDate {
  date: string;
  slots: TimeSlot[];
}

export interface TimeSlot {
  time: string;
  isAvailable: boolean;
  serviceId?: string;
}

export interface BusinessInfo {
  businessId: string;
  businessName: string;
  businessType: string;
  locations: LocationInfo[];
  settings: any;
}

export interface LocationInfo {
  locationId: string;
  name: string;
  address: string;
  phone?: string;
  email?: string;
  timezone: string;
  isActive: boolean;
}

@Injectable()
export class AppServerClient {
  private readonly httpClient: AxiosInstance;
  private readonly appServerUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.appServerUrl = this.configService.get<string>('APP_SERVER_URL') || 'http://localhost:3001';
    
    this.httpClient = axios.create({
      baseURL: this.appServerUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  // Get public services available for booking
  async getPublicServices(
    businessId: string,
    locationId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<{ services: PublicService[]; pagination: any }> {
    try {
      const response = await this.httpClient.get(
        `/patient-booking/services/${businessId}-${locationId}`,
        {
          params: { page, limit }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching public services:', error);
      throw new Error('Failed to fetch public services');
    }
  }

  // Get available dates with free slots
  async getAvailableDates(
    businessId: string,
    locationId: string,
    from: string,
    to: string,
    serviceId?: string
  ): Promise<AvailableDate[]> {
    try {
      const response = await this.httpClient.get(
        `/patient-booking/available-dates/${businessId}-${locationId}`,
        {
          params: { from, to, serviceId }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching available dates:', error);
      throw new Error('Failed to fetch available dates');
    }
  }

  // Get specific time slots for a date
  async getTimeSlots(
    businessId: string,
    locationId: string,
    date: string,
    serviceId?: string
  ): Promise<TimeSlot[]> {
    try {
      const response = await this.httpClient.get(
        `/patient-booking/time-slots/${businessId}-${locationId}`,
        {
          params: { date, serviceId }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching time slots:', error);
      throw new Error('Failed to fetch time slots');
    }
  }

  // Get business information
  async getBusinessInfo(businessId: string): Promise<BusinessInfo> {
    try {
      const response = await this.httpClient.get(`/business-info/${businessId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching business info:', error);
      throw new Error('Failed to fetch business info');
    }
  }

  // Get location information
  async getLocationInfo(businessId: string, locationId: string): Promise<LocationInfo> {
    try {
      const response = await this.httpClient.get(`/business-info/${businessId}/locations/${locationId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching location info:', error);
      throw new Error('Failed to fetch location info');
    }
  }

  // Create a booking (if the customer agent has booking capabilities)
  async createBooking(
    businessId: string,
    locationId: string,
    bookingData: {
      serviceId: string;
      date: string;
      time: string;
      customerName: string;
      customerPhone: string;
      customerEmail?: string;
      notes?: string;
    }
  ): Promise<{ success: boolean; bookingId?: string; message: string }> {
    try {
      const response = await this.httpClient.post(
        `/patient-booking/book/${businessId}-${locationId}`,
        bookingData
      );
      return response.data;
    } catch (error) {
      console.error('Error creating booking:', error);
      return {
        success: false,
        message: 'Failed to create booking'
      };
    }
  }

  // Check if a specific time slot is available
  async checkSlotAvailability(
    businessId: string,
    locationId: string,
    date: string,
    time: string,
    serviceId: string
  ): Promise<boolean> {
    try {
      const response = await this.httpClient.get(
        `/patient-booking/check-availability/${businessId}-${locationId}`,
        {
          params: { date, time, serviceId }
        }
      );
      return response.data.available;
    } catch (error) {
      console.error('Error checking slot availability:', error);
      return false;
    }
  }
}
