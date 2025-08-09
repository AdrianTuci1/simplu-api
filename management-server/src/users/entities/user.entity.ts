export interface UserAddress {
  street: string;
  city: string;
  district?: string;
  country: string;
  postalCode?: string;
}

export interface UserEntity {
  userId: string; // Cognito sub
  email: string;
  name?: string;
  address?: UserAddress;
  stripeCustomerId?: string;
  defaultPaymentMethodId?: string;
  createdAt: string;
  updatedAt: string;
}

