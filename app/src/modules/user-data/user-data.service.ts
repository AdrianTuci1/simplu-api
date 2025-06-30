import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserData, UserDataType } from './entities/user-data.entity';

interface GetUserDataParams {
  tenantId: string;
  userId: string;
  locationId: string;
  type?: string;
}

interface SetUserDataDto {
  type: string;
  key: string;
  value: Record<string, any>;
  isEncrypted?: boolean;
  metadata?: Record<string, any>;
}

@Injectable()
export class UserDataService {
  constructor(
    @InjectRepository(UserData)
    private readonly userDataRepository: Repository<UserData>,
  ) {}

  async getUserData(params: GetUserDataParams) {
    const { tenantId, userId, locationId, type } = params;

    const queryBuilder = this.userDataRepository
      .createQueryBuilder('userData')
      .where('userData.tenant.id = :tenantId', { tenantId })
      .andWhere('userData.user.id = :userId', { userId });

    if (locationId) {
      queryBuilder.andWhere('userData.locationId = :locationId', { locationId });
    }

    if (type) {
      queryBuilder.andWhere('userData.type = :type', { type });
    }

    const userData = await queryBuilder
      .orderBy('userData.createdAt', 'DESC')
      .getMany();

    return {
      userData,
      total: userData.length,
      tenantId,
      userId,
      locationId,
    };
  }

  async setUserData(setUserDataDto: SetUserDataDto, tenantId: string, userId: string, locationId: string) {
    // Check if user data already exists
    const existingData = await this.userDataRepository.findOne({
      where: {
        tenant: { id: tenantId },
        user: { id: userId },
        type: setUserDataDto.type as UserDataType,
        key: setUserDataDto.key,
      },
    });

    if (existingData) {
      // Update existing data
      existingData.value = setUserDataDto.value;
      existingData.isEncrypted = setUserDataDto.isEncrypted || false;
      if (setUserDataDto.metadata) {
        existingData.metadata = setUserDataDto.metadata;
      }
      return this.userDataRepository.save(existingData);
    } else {
      // Create new data
      const userData = this.userDataRepository.create({
        type: setUserDataDto.type as UserDataType,
        key: setUserDataDto.key,
        value: setUserDataDto.value,
        isEncrypted: setUserDataDto.isEncrypted || false,
        metadata: setUserDataDto.metadata || {},
        tenant: Promise.resolve({ id: tenantId } as any),
        user: Promise.resolve({ id: userId } as any),
        locationId,
      });

      return this.userDataRepository.save(userData) as unknown as UserData;
    }
  }

  async deleteUserData(type: string, key: string, tenantId: string, userId: string, locationId: string) {
    const userData = await this.userDataRepository.findOne({
      where: {
        tenant: { id: tenantId },
        user: { id: userId },
        type: type as UserDataType,
        key,
      },
    });

    if (userData) {
      await this.userDataRepository.remove(userData);
      return { message: 'User data deleted successfully' };
    }

    return { message: 'User data not found' };
  }

  async getDefaultUserData(tenantId: string, userId: string, locationId: string) {
    const defaultData = [
      {
        type: UserDataType.PREFERENCES,
        key: 'theme',
        value: { theme: 'light', language: 'en' },
      },
      {
        type: UserDataType.SETTINGS,
        key: 'notifications',
        value: { email: true, sms: false, push: true },
      },
      {
        type: UserDataType.DASHBOARD,
        key: 'layout',
        value: { layout: 'default', widgets: ['recent_activity', 'quick_actions'] },
      },
    ];

    return {
      userData: defaultData,
      total: defaultData.length,
      tenantId,
      userId,
      locationId,
    };
  }
} 