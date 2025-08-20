import { BusinessType } from './resource-types';
import { ResourceDataType } from './unified-data-types';

// Base resource structure that all resources follow
export interface BaseResource {
  id: string; // businessId-locationId
  businessType: BusinessType;
  resourceName: string;
  resourceId: string; // data id
  data: ResourceDataType; // json - specific to business type and resource
  startDate: string; // appointment, reservation, checkin, or emitted for rest
  endDate: string; // appointment, reservation, checkin, or emitted for rest
  lastUpdated: string;
} 