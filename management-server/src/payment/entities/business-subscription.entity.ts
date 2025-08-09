export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'unpaid' | 'incomplete' | 'incomplete_expired' | 'trialing';

export interface BusinessSubscriptionEntity {
  id: string;
  businessId: string;
  payerUserId: string; // Cognito sub of the paying user
  priceId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  status: SubscriptionStatus;
  nextPaymentDate?: string;
  createdAt: string;
  updatedAt: string;
}

