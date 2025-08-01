import { ApiProperty } from '@nestjs/swagger';

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface MetaInfo {
  businessId: string;
  locationId: string;
  resourceType: string;
  timestamp: string;
  operation: string;
  shardId?: string;
}

export interface ErrorInfo {
  code: string;
  message: string;
  details?: any;
}

export class StandardResponse {
  @ApiProperty({ description: 'Success status' })
  success: boolean;

  @ApiProperty({ description: 'Response data', required: false })
  data?: any;

  @ApiProperty({ description: 'Error information', required: false })
  error?: ErrorInfo;

  @ApiProperty({ description: 'Metadata about the operation' })
  meta: MetaInfo;
}
