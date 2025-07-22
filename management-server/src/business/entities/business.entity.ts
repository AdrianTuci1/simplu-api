

export interface LocationInfo {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessSettings {
  timezone: string;
  currency: string;
  language: string;
  features: string[];
}

export interface BusinessPermissions {
  roles: string[];
  modules: string[];
}

export interface BusinessEntity {
  id: string;
  companyName: string;
  registrationNumber: string;
  businessType: 'dental' | 'gym' | 'hotel';
  locations: LocationInfo[];
  settings: BusinessSettings;
  permissions: BusinessPermissions;
  customDomain?: string;
  subdomain?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  paymentStatus: 'active' | 'past_due' | 'canceled' | 'unpaid';
  nextPaymentDate?: string;
  status: 'active' | 'suspended' | 'deleted';
  cloudFormationStackName?: string;
  reactAppUrl?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
} 