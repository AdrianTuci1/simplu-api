

export interface LocationInfo {
  locationId: string;
  name: string;
  address: string;
  phone?: string;
  email?: string;
  timezone: string;
  isActive: boolean;
}

export interface BusinessSettings {
  currency: string;
  language: string;
  dateFormat: string;
  timeFormat: string;
  workingHours: {
    [day: string]: {
      open: string;
      close: string;
      isOpen: boolean;
    };
  };
}



export interface BusinessEntity {
  businessId: string;
  businessName: string;
  registrationNumber: string;
  businessType: 'dental' | 'gym' | 'hotel';
  ownerUserId?: string;
  ownerEmail: string;
  createdByUserId: string;
  isActivated: boolean;
  activationToken?: string;
  activationUrl?: string;
  authorizedEmails?: string[];
  locations: LocationInfo[];
  settings: BusinessSettings;
  deactivatedModules: string[];
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