import { ApiProperty } from '@nestjs/swagger';

export class PaginationInfo {
  @ApiProperty({ description: 'Current page number' })
  page: number;

  @ApiProperty({ description: 'Items per page' })
  limit: number;

  @ApiProperty({ description: 'Total number of items' })
  total: number;

  @ApiProperty({ description: 'Total number of pages' })
  pages: number;
}

export class MetaInfo {
  @ApiProperty({ description: 'Business ID' })
  businessId: string;

  @ApiProperty({ description: 'Location ID' })
  locationId: string;

  @ApiProperty({ description: 'Resource type' })
  resourceType: string;

  @ApiProperty({ description: 'Timestamp of the response' })
  timestamp: string;

  @ApiProperty({ description: 'Operation performed', required: false })
  operation?: string;
}

export class ErrorDetail {
  @ApiProperty({ description: 'Field that caused the error' })
  field: string;

  @ApiProperty({ description: 'Error message for the field' })
  message: string;
}

export class ErrorInfo {
  @ApiProperty({ description: 'Error code' })
  code: string;

  @ApiProperty({ description: 'Error message' })
  message: string;

  @ApiProperty({
    description: 'Error details',
    type: [ErrorDetail],
    required: false,
  })
  details?: ErrorDetail[];
}

export class DataInfo {
  @ApiProperty({
    description: 'Array of items for GET requests',
    required: false,
  })
  items?: any[];

  @ApiProperty({
    description: 'Pagination info for GET requests',
    required: false,
  })
  pagination?: PaginationInfo;

  @ApiProperty({
    description: 'Applied filters for GET requests',
    required: false,
  })
  filters?: Record<string, any>;

  @ApiProperty({
    description: 'Resource ID for POST/PUT/PATCH responses',
    required: false,
  })
  id?: string;

  @ApiProperty({ description: 'Creation timestamp', required: false })
  createdAt?: string;

  @ApiProperty({ description: 'Last update timestamp', required: false })
  updatedAt?: string;

  // Additional resource data
  [key: string]: any;
}

export class StandardResponse {
  @ApiProperty({ description: 'Indicates if the request was successful' })
  success: boolean;

  @ApiProperty({ description: 'Response data', required: false })
  data?: DataInfo;

  @ApiProperty({
    description: 'Error information if request failed',
    required: false,
  })
  error?: ErrorInfo;

  @ApiProperty({ description: 'Response metadata' })
  meta: MetaInfo;
}
