import {
  DentalPatientData,
  DentalAppointmentData,
  DentalTreatmentData,
  DentalStaffData,
  DentalTimelineData
} from './dental';

import {
  GymMemberData,
  GymMembershipData,
  GymClassData,
  GymEquipmentData,
  GymStaffData,
  GymTimelineData
} from './gym';

import {
  HotelGuestData,
  HotelReservationData,
  HotelRoomData,
  HotelServiceData,
  HotelStaffData,
  HotelTimelineData
} from './hotel';

import {
  StockItemData,
  InvoiceData,
  ActivityData,
  ReportData,
  RoleData,
  SalesTransactionData,
  WorkflowData,
  PermissionData,
  UserData,
  HistoryData
} from './common';

import { BusinessType, ResourceType } from './resource-types';

// Re-export for convenience
export { BusinessType, ResourceType };

// Union type for all possible data types based on business and resource type
export type ResourceDataType =
  // Dental business data types
  | DentalPatientData
  | DentalAppointmentData
  | DentalTreatmentData
  | DentalStaffData
  | DentalTimelineData
  // Gym business data types
  | GymMemberData
  | GymMembershipData
  | GymClassData
  | GymEquipmentData
  | GymStaffData
  | GymTimelineData
  // Hotel business data types
  | HotelGuestData
  | HotelReservationData
  | HotelRoomData
  | HotelServiceData
  | HotelStaffData
  | HotelTimelineData
  // Common data types
  | StockItemData
  | InvoiceData
  | ActivityData
  | ReportData
  | RoleData
  | SalesTransactionData
  | WorkflowData
  | PermissionData
  | UserData
  | HistoryData;

// Mapping of business types to their specific resource data types
export type BusinessResourceDataMap = {
  dental: {
    timeline: DentalTimelineData;
    clients: DentalPatientData;
    services: DentalTreatmentData;
    staff: DentalStaffData;
    stocks: StockItemData;
    invoices: InvoiceData;
    activities: ActivityData;
    reports: ReportData;
    roles: RoleData;
    sales: SalesTransactionData;
    workflows: WorkflowData;
    permissions: PermissionData;
    userData: UserData;
    history: HistoryData;
  };
  gym: {
    timeline: GymTimelineData;
    members: GymMemberData;
    packages: GymMembershipData;
    classes: GymClassData;
    equipment: GymEquipmentData;
    staff: GymStaffData;
    stocks: StockItemData;
    invoices: InvoiceData;
    activities: ActivityData;
    reports: ReportData;
    roles: RoleData;
    sales: SalesTransactionData;
    workflows: WorkflowData;
    permissions: PermissionData;
    userData: UserData;
    history: HistoryData;
  };
  hotel: {
    timeline: HotelTimelineData;
    clients: HotelGuestData;
    rooms: HotelRoomData;
    services: HotelServiceData;
    staff: HotelStaffData;
    stocks: StockItemData;
    invoices: InvoiceData;
    activities: ActivityData;
    reports: ReportData;
    roles: RoleData;
    sales: SalesTransactionData;
    workflows: WorkflowData;
    permissions: PermissionData;
    userData: UserData;
    history: HistoryData;
  };
};

// Helper type to get the correct data type for a specific business and resource combination
export type GetResourceDataType<
  TBusiness extends BusinessType,
  TResource extends keyof BusinessResourceDataMap[TBusiness]
> = BusinessResourceDataMap[TBusiness][TResource];

// Type guard functions to check resource data types
export function isDentalResource(businessType: string): businessType is 'dental' {
  return businessType === 'dental';
}

export function isGymResource(businessType: string): businessType is 'gym' {
  return businessType === 'gym';
}

export function isHotelResource(businessType: string): businessType is 'hotel' {
  return businessType === 'hotel';
}

// Resource validation helper
export function isValidResourceForBusiness(
  businessType: BusinessType,
  resourceType: string
): boolean {
  const businessResourceMap: Record<BusinessType, string[]> = {
    dental: ['timeline', 'clients', 'services', 'staff', 'stocks', 'invoices', 'activities', 'reports', 'roles', 'sales', 'workflows', 'permissions', 'userData', 'history'],
    gym: ['timeline', 'members', 'packages', 'classes', 'equipment', 'staff', 'stocks', 'invoices', 'activities', 'reports', 'roles', 'sales', 'workflows', 'permissions', 'userData', 'history'],
    hotel: ['timeline', 'clients', 'rooms', 'services', 'staff', 'stocks', 'invoices', 'activities', 'reports', 'roles', 'sales', 'workflows', 'permissions', 'userData', 'history'],
  };

  return businessResourceMap[businessType]?.includes(resourceType) || false;
}

// Common resource types that are available for all business types
export const COMMON_RESOURCE_TYPES = [
  'stocks',
  'invoices',
  'activities',
  'reports',
  'roles',
  'sales',
  'workflows',
  'permissions',
  'userData',
  'history'
] as const;

// Business-specific resource types
export const BUSINESS_SPECIFIC_RESOURCES = {
  dental: ['timeline', 'clients', 'services', 'staff'],
  gym: ['timeline', 'members', 'packages', 'classes', 'equipment', 'staff'],
  hotel: ['timeline', 'clients', 'rooms', 'services', 'staff'],
} as const;