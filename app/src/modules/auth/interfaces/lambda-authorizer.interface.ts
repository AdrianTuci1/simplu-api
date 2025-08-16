export interface LambdaAuthorizerResponse {
  userId: string;
  userName: string;
  businessId: string;
  roles: LocationRole[];
}

export interface LocationRole {
  locationId: string;
  locationName: string;
  role: string;
  permissions?: string[];
}

export interface LambdaAuthorizerContext {
  userId: string;
  userName: string;
  businessId: string;
  currentLocationId?: string;
  roles: LocationRole[];
}

export interface LambdaAuthorizerPolicy {
  principalId: string;
  policyDocument: {
    Version: string;
    Statement: Array<{
      Action: string;
      Effect: string;
      Resource: string;
    }>;
  };
  context: LambdaAuthorizerContext;
} 