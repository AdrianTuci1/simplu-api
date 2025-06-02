import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum BusinessType {
  HOTEL = 'hotel',
  CLINIC = 'clinic',
  FITNESS = 'fitness',
  RESTAURANT = 'restaurant',
  SPA = 'spa'
}

export interface MarketingFeatures {
  facebook: boolean;
  instagram: boolean;
  youtube: boolean;
  email: boolean;
}

export interface BusinessFeatures {
  whatsapp: boolean;
  sms: boolean;
  phone: boolean;
  occupancyAnalysis: boolean;
  booking: boolean;
  marketing: MarketingFeatures;
}

@Entity('business_configs')
export class BusinessConfig {
  @PrimaryColumn()
  businessId: string;

  @Column({
    type: 'enum',
    enum: BusinessType
  })
  type: BusinessType;

  @Column('jsonb')
  enabledFeatures: BusinessFeatures;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 