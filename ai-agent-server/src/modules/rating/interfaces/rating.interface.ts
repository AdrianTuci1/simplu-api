export interface Rating {
  ratingId: string; // Primary key - UUID
  businessId: string;
  locationId: string;
  appointmentId: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  
  // Rating data
  score: number; // 1-5 stars
  comment?: string;
  categories?: {
    service?: number; // 1-5
    cleanliness?: number; // 1-5
    staff?: number; // 1-5
    waitTime?: number; // 1-5
  };
  
  // One-time link management
  token: string; // One-time use token
  tokenUsed: boolean;
  tokenExpiresAt: string; // ISO date string
  
  // Metadata
  submittedAt?: string; // ISO date string - when rating was submitted
  createdAt: string; // ISO date string - when token was created
  ipAddress?: string; // For fraud prevention
}

export interface CreateRatingTokenDto {
  businessId: string;
  locationId: string;
  appointmentId: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  appointmentDate: string;
  appointmentTime: string;
}

export interface SubmitRatingDto {
  token: string;
  score: number; // 1-5 stars (required)
  comment?: string;
  categories?: {
    service?: number;
    cleanliness?: number;
    staff?: number;
    waitTime?: number;
  };
}

export interface RatingStats {
  totalRatings: number;
  averageScore: number;
  averageByCategory?: {
    service?: number;
    cleanliness?: number;
    staff?: number;
    waitTime?: number;
  };
  distribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

