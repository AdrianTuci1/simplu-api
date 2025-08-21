import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class BusinessIdService {
  private readonly logger = new Logger(BusinessIdService.name);

  constructor(private readonly db: DatabaseService) {}

  /**
   * Generate a unique business ID according to the pattern:
   * B{last 2 digits of year}{5 unique digits}
   * 
   * Examples:
   * - Business in 2024: B2400001, B2400002
   * - Business in 2025: B2500001, B2500002
   */
  async generateBusinessId(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2); // Last 2 digits
    
    // Base ID pattern
    const baseId = `B${year}`;
    
    // Find the next available sequence number
    const sequenceNumber = await this.getNextBusinessSequenceNumber(baseId);
    
    // Format with 5 digits
    const formattedSequence = sequenceNumber.toString().padStart(5, '0');
    
    const businessId = `${baseId}${formattedSequence}`;
    
    this.logger.log(`Generated business ID: ${businessId}`);
    
    return businessId;
  }

  /**
   * Generate a unique location ID according to the pattern:
   * L{last 2 digits of year}{5 unique digits}
   * 
   * Examples:
   * - Location in 2024: L2400001, L2400002
   * - Location in 2025: L2500001, L2500002
   */
  async generateLocationId(businessId?: string): Promise<string> {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2); // Last 2 digits
    
    // Base ID pattern
    const baseId = `L${year}`;
    
    // Find the next available sequence number
    const sequenceNumber = await this.getNextLocationSequenceNumber(baseId);
    
    // Format with 5 digits
    const formattedSequence = sequenceNumber.toString().padStart(5, '0');
    
    const locationId = `${baseId}${formattedSequence}`;
    
    this.logger.log(`Generated location ID: ${locationId} for business: ${businessId || 'new'}`);
    
    return locationId;
  }

  /**
   * Get the next available sequence number for business IDs in a given year
   */
  private async getNextBusinessSequenceNumber(baseId: string): Promise<number> {
    try {
      // Get all existing business IDs that match the pattern
      const businesses = await this.db.getAllBusinesses();
      
      // Filter businesses that match the current year pattern
      const matchingBusinesses = businesses.filter(business => 
        business.businessId && business.businessId.startsWith(baseId)
      );
      
      if (matchingBusinesses.length === 0) {
        return 1;
      }
      
      // Extract sequence numbers and find the highest
      const sequenceNumbers = matchingBusinesses
        .map(business => {
          const match = business.businessId.match(new RegExp(`^${baseId}(\\d{5})$`));
          return match ? parseInt(match[1], 10) : 0;
        })
        .filter(num => num > 0);
      
      const maxSequence = sequenceNumbers.length > 0 ? Math.max(...sequenceNumbers) : 0;
      return maxSequence + 1;
    } catch (error) {
      this.logger.error(`Error getting next business sequence number: ${error.message}`);
      // Fallback to timestamp-based sequence
      return Math.floor(Date.now() / 1000) % 99999 + 1;
    }
  }

  /**
   * Get the next available sequence number for location IDs in a given year
   */
  private async getNextLocationSequenceNumber(baseId: string): Promise<number> {
    try {
      // Get all existing businesses to extract location IDs
      const businesses = await this.db.getAllBusinesses();
      
      // Extract all location IDs from all businesses
      const allLocationIds: string[] = [];
      businesses.forEach(business => {
        if (business.locations) {
          business.locations.forEach(location => {
            if (location.id) {
              allLocationIds.push(location.id);
            }
          });
        }
      });
      
      // Filter location IDs that match the current year pattern
      const matchingLocationIds = allLocationIds.filter(locationId => 
        locationId && locationId.startsWith(baseId)
      );
      
      if (matchingLocationIds.length === 0) {
        return 1;
      }
      
      // Extract sequence numbers and find the highest
      const sequenceNumbers = matchingLocationIds
        .map(locationId => {
          const match = locationId.match(new RegExp(`^${baseId}(\\d{5})$`));
          return match ? parseInt(match[1], 10) : 0;
        })
        .filter(num => num > 0);
      
      const maxSequence = sequenceNumbers.length > 0 ? Math.max(...sequenceNumbers) : 0;
      return maxSequence + 1;
    } catch (error) {
      this.logger.error(`Error getting next location sequence number: ${error.message}`);
      // Fallback to timestamp-based sequence
      return Math.floor(Date.now() / 1000) % 99999 + 1;
    }
  }
}
