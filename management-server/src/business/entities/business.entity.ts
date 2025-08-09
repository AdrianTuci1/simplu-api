

export interface LocationInfo {
  locationId: string;
  name: string;
  address: string;
  phone?: string;
  email?: string;
  timezone: string;
  isActive: boolean;
  allocatedCredits?: {
    balance: number;
    lastUpdated: string;
  };
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
  
  // Company address for invoicing
  companyAddress?: {
    street: string;
    city: string;
    district?: string; // județ/sector
    country: string;
    postalCode?: string;
  };
  
  ownerUserId?: string;
  ownerEmail: string;
  billingEmail?: string; // Email used for Stripe billing (can be different from ownerEmail)
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
  clientPageType?: 'website' | 'form';
  appLabel: string;
  // Deprecated: subscriptions stored per-user in `business-subscriptions` table
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  paymentStatus: 'active' | 'past_due' | 'canceled' | 'unpaid';
  nextPaymentDate?: string;
  credits?: {
    totalBalance: number;
    availableBalance: number; // Total - allocated
    currency: string;
    lastUpdated: string;
  };
  status: 'active' | 'suspended' | 'deleted';
  cloudFormationStackName?: string;
  reactAppUrl?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
} 