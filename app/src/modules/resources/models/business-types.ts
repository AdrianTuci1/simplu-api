// Base resource structure that all resources follow
export interface BaseResource {
  id: string; // businessId-locationId
  businessType: 'dental' | 'gym' | 'hotel';
  resourceName: string;
  resourceId: string; // data id
  data: any; // json - specific to business type and resource
  date: string; // appointment, reservation, checkin, or emitted for rest
  lastUpdated: string;
}

// =============================================================================
// DENTAL BUSINESS TYPE
// =============================================================================

export interface DentalPatientData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  medicalHistory?: string;
  allergies?: string[];
  insuranceInfo?: {
    provider: string;
    policyNumber: string;
    groupNumber?: string;
  };
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  notes?: string;
  status: 'active' | 'inactive' | 'archived';
}

export interface DentalAppointmentData {
  patientId: string;
  dentistId: string;
  treatmentId: string;
  appointmentDate: string;
  duration: number; // in minutes
  status: 'scheduled' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled' | 'no-show';
  notes?: string;
  treatmentPlan?: string;
  cost?: number;
  insuranceCovered?: boolean;
  followUpRequired?: boolean;
  followUpDate?: string;
}

export interface DentalTreatmentData {
  name: string;
  description: string;
  duration: number; // in minutes
  cost: number;
  category: 'cleaning' | 'filling' | 'crown' | 'root-canal' | 'extraction' | 'orthodontics' | 'cosmetic' | 'surgery';
  requiresAnesthesia: boolean;
  followUpRequired: boolean;
  followUpDays?: number;
  active: boolean;
}

export interface DentalStaffData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: 'dentist' | 'hygienist' | 'assistant' | 'receptionist' | 'manager';
  licenseNumber?: string;
  specializations?: string[];
  workingHours: {
    [day: string]: {
      start: string;
      end: string;
      available: boolean;
    };
  };
  status: 'active' | 'inactive' | 'on-leave';
}

export interface RoleData {
  name: string;
  displayName: string;
  description: string;
  hierarchy: number; // Higher number = more permissions
  permissions: {
    [resourceName: string]: Array<'create' | 'read' | 'update' | 'delete' | 'list'>;
  };
  active: boolean;
  businessTypeSpecific: boolean; // If true, only applies to specific business type
  isSystemRole: boolean; // If true, cannot be deleted/modified
  createdBy?: string;
  modifiedBy?: string;
}

// =============================================================================
// GYM BUSINESS TYPE
// =============================================================================

export interface GymMemberData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  membershipType: string;
  membershipStart: string;
  membershipEnd: string;
  status: 'active' | 'suspended' | 'expired' | 'cancelled';
  healthConditions?: string[];
  fitnessGoals?: string[];
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  notes?: string;
}

export interface GymMembershipData {
  name: string;
  description: string;
  duration: number; // in days
  price: number;
  features: string[];
  accessHours: {
    start: string;
    end: string;
    daysOfWeek: string[];
  };
  maxFreezeDays: number;
  contractType: 'monthly' | 'annual' | 'lifetime';
  active: boolean;
}

export interface GymClassData {
  name: string;
  description: string;
  instructorId: string;
  date: string;
  duration: number; // in minutes
  maxCapacity: number;
  currentEnrollment: number;
  category: 'cardio' | 'strength' | 'yoga' | 'pilates' | 'dance' | 'martial-arts' | 'aqua';
  difficultyLevel: 'beginner' | 'intermediate' | 'advanced';
  equipment?: string[];
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
}

export interface GymEquipmentData {
  name: string;
  category: 'cardio' | 'strength' | 'free-weights' | 'functional' | 'recovery';
  manufacturer: string;
  model: string;
  serialNumber?: string;
  purchaseDate: string;
  warrantyExpiry?: string;
  maintenanceSchedule: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';
    lastMaintenance: string;
    nextMaintenance: string;
  };
  status: 'active' | 'maintenance' | 'out-of-order' | 'retired';
}

// =============================================================================
// HOTEL BUSINESS TYPE
// =============================================================================

export interface HotelGuestData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth?: string;
  nationality?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  idDocument: {
    type: 'passport' | 'drivers-license' | 'national-id';
    number: string;
    expiryDate?: string;
  };
  loyaltyProgram?: {
    number: string;
    tier: string;
    points: number;
  };
  preferences?: {
    roomType: string;
    bedType: string;
    floor: string;
    smoking: boolean;
    diet?: string[];
  };
  notes?: string;
  status: 'active' | 'vip' | 'blacklisted';
}

export interface HotelReservationData {
  guestId: string;
  roomId: string;
  checkInDate: string;
  checkOutDate: string;
  numberOfGuests: number;
  numberOfNights: number;
  roomRate: number;
  totalAmount: number;
  status: 'confirmed' | 'checked-in' | 'checked-out' | 'cancelled' | 'no-show';
  paymentStatus: 'pending' | 'partial' | 'paid' | 'refunded';
  specialRequests?: string[];
  source: 'direct' | 'online' | 'phone' | 'walk-in' | 'travel-agent' | 'booking-platform';
  confirmationNumber: string;
  notes?: string;
}

export interface HotelRoomData {
  roomNumber: string;
  roomType: 'standard' | 'deluxe' | 'suite' | 'presidential';
  floor: number;
  capacity: number;
  bedType: 'single' | 'double' | 'queen' | 'king' | 'twin';
  amenities: string[];
  baseRate: number;
  status: 'available' | 'occupied' | 'maintenance' | 'out-of-order' | 'cleaning';
  lastCleaned?: string;
  nextMaintenance?: string;
  notes?: string;
}

export interface HotelServiceData {
  name: string;
  description: string;
  category: 'room-service' | 'housekeeping' | 'concierge' | 'spa' | 'restaurant' | 'laundry' | 'transport';
  price?: number;
  duration?: number; // in minutes
  availability: {
    start: string;
    end: string;
    daysOfWeek: string[];
  };
  active: boolean;
}



// =============================================================================
// RESOURCE TYPE MAPPING
// =============================================================================

export type BusinessTypeResourceData = {
  dental: {
    patients: DentalPatientData;
    appointments: DentalAppointmentData;
    treatments: DentalTreatmentData;
    staff: DentalStaffData;
    roles: RoleData;
  };
  gym: {
    members: GymMemberData;
    memberships: GymMembershipData;
    classes: GymClassData;
    equipment: GymEquipmentData;
    roles: RoleData;
  };
  hotel: {
    guests: HotelGuestData;
    reservations: HotelReservationData;
    rooms: HotelRoomData;
    services: HotelServiceData;
    roles: RoleData;
  };
};

// Helper type to get data type for specific business and resource
export type GetResourceDataType<
  TBusinessType extends keyof BusinessTypeResourceData,
  TResourceName extends keyof BusinessTypeResourceData[TBusinessType]
> = BusinessTypeResourceData[TBusinessType][TResourceName];

// Resource with proper typing
export type TypedResource<
  TBusinessType extends keyof BusinessTypeResourceData,
  TResourceName extends keyof BusinessTypeResourceData[TBusinessType]
> = Omit<BaseResource, 'data' | 'businessType' | 'resourceName'> & {
  businessType: TBusinessType;
  resourceName: TResourceName;
  data: BusinessTypeResourceData[TBusinessType][TResourceName];
}; 