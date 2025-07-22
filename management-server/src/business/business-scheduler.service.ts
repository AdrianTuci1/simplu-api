import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BusinessService } from './business.service';
import { PaymentService } from '../payment/payment.service';
import { InfrastructureService } from '../infrastructure/infrastructure.service';

@Injectable()
export class BusinessSchedulerService {
  private readonly logger = new Logger(BusinessSchedulerService.name);

  constructor(
    private readonly businessService: BusinessService,
    private readonly paymentService: PaymentService,
    private readonly infrastructureService: InfrastructureService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handlePaymentMonitoring() {
    this.logger.log('Starting daily payment monitoring...');

    try {
      // Get businesses with past due payments
      const pastDueBusinesses = await this.businessService.getBusinessesByPaymentStatus('past_due');
      
      for (const business of pastDueBusinesses) {
        await this.handlePastDueBusiness(business);
      }

      // Get businesses with unpaid status
      const unpaidBusinesses = await this.businessService.getBusinessesByPaymentStatus('unpaid');
      
      for (const business of unpaidBusinesses) {
        await this.handleUnpaidBusiness(business);
      }

      this.logger.log('Daily payment monitoring completed');
    } catch (error) {
      this.logger.error(`Error in payment monitoring: ${error.message}`);
    }
  }

  @Cron(CronExpression.EVERY_WEEK)
  async handleExpiredBusinessCleanup() {
    this.logger.log('Starting weekly expired business cleanup...');

    try {
      // Get all active businesses
      const activeBusinesses = await this.businessService.getBusinessesByStatus('active');
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      for (const business of activeBusinesses) {
        // Check if business has been unpaid for more than 30 days
        if (business.nextPaymentDate && new Date(business.nextPaymentDate) < thirtyDaysAgo) {
          await this.handleExpiredBusiness(business);
        }
      }

      this.logger.log('Weekly expired business cleanup completed');
    } catch (error) {
      this.logger.error(`Error in expired business cleanup: ${error.message}`);
    }
  }

  private async handlePastDueBusiness(business: any) {
    try {
      this.logger.log(`Handling past due business: ${business.id}`);

      // Update business status to suspended
      await this.businessService.updateBusiness(business.id, {
        status: 'suspended',
      } as any);

      // Send notification to business owner
      // This would typically involve sending an email or SMS
      this.logger.log(`Business ${business.id} suspended due to past due payment`);
    } catch (error) {
      this.logger.error(`Error handling past due business ${business.id}: ${error.message}`);
    }
  }

  private async handleUnpaidBusiness(business: any) {
    try {
      this.logger.log(`Handling unpaid business: ${business.id}`);

      // Check if it's been more than 7 days since the payment was due
      const paymentDueDate = new Date(business.nextPaymentDate);
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      if (paymentDueDate < sevenDaysAgo) {
        // Business has been unpaid for more than 7 days, mark for deletion
        await this.businessService.updateBusiness(business.id, {
          status: 'suspended',
        } as any);

        this.logger.log(`Business ${business.id} marked for deletion due to unpaid status`);
      }
    } catch (error) {
      this.logger.error(`Error handling unpaid business ${business.id}: ${error.message}`);
    }
  }

  private async handleExpiredBusiness(business: any) {
    try {
      this.logger.log(`Handling expired business: ${business.id}`);

      // Delete the business and all associated resources
      await this.businessService.deleteBusiness(business.id);

      this.logger.log(`Business ${business.id} deleted due to expiration`);
    } catch (error) {
      this.logger.error(`Error handling expired business ${business.id}: ${error.message}`);
    }
  }
} 