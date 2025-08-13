export type BusinessStatus = 'active' | 'suspended' | 'deleted';

export interface BusinessLocation {
  id: string;
  name: string;
  address: string;
  timezone?: string;
  active?: boolean;
}

export interface BusinessSettings {
  currency: string;
  language: string;
}

export interface BusinessCredits {
  total: number;
  available: number;
  currency: string;
  perLocation?: Record<string, number>;
  lockedLocations?: string[];
}

export interface BusinessEntity {
  businessId: string;
  companyName: string;
  registrationNumber?: string;
  businessType: string; // dental | gym | hotel
  locations: BusinessLocation[];
  settings: BusinessSettings;
  configureForEmail?: string;
  domainType?: 'subdomain' | 'custom';
  domainLabel?: string;
  customTld?: string;
  clientPageType?: 'website' | 'form';
  subscriptionType: 'solo' | 'enterprise';
  credits: BusinessCredits;
  active: boolean;
  status: BusinessStatus;
  ownerUserId: string | null;
  ownerEmail?: string;
  billingEmail?: string;
  createdByUserId: string;
  nextPaymentDate: string | null;
  paymentStatus: 'active' | 'past_due' | 'canceled' | 'unpaid';
  cloudFormationStackName?: string;
  reactAppUrl?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

