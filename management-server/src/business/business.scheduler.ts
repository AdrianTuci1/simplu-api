import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DatabaseService } from '../database/database.service';
import { BusinessService } from './business.service';

@Injectable()
export class BusinessScheduler {
  private readonly logger = new Logger(BusinessScheduler.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly businessService: BusinessService,
  ) {}

  // Runs every day at 02:00
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async enforceGracePeriods(): Promise<void> {
    try {
      const pastDue = await this.db.getBusinessesByPaymentStatus('past_due');
      const unpaid = await this.db.getBusinessesByPaymentStatus('unpaid');
      const canceled = await this.db.getBusinessesByPaymentStatus('canceled');
      const targets = [...pastDue, ...unpaid, ...canceled];

      for (const b of targets) {
        await this.businessService.suspendIfGracePeriodPassed(b.businessId);
      }

      this.logger.log(`Grace period enforcement checked ${targets.length} businesses`);
    } catch (error) {
      this.logger.error('Failed grace period enforcement', error.stack);
    }
  }
}

