import { ApiProperty } from '@nestjs/swagger';

export class LocationInfo {
  @ApiProperty({ description: 'Location ID' })
  id: string;

  @ApiProperty({ description: 'Location name' })
  name: string;

  @ApiProperty({ description: 'Location address' })
  address: string;

  @ApiProperty({ description: 'Location phone number' })
  phone: string;

  @ApiProperty({ description: 'Location email' })
  email: string;

  @ApiProperty({ description: 'Location active status' })
  active: boolean;
}

export class BusinessSettings {
  @ApiProperty({ description: 'Business timezone' })
  timezone: string;

  @ApiProperty({ description: 'Business currency' })
  currency: string;

  @ApiProperty({ description: 'Business language' })
  language: string;

  @ApiProperty({ description: 'Business features', type: [String] })
  features: string[];
}

export class BusinessPermissions {
  @ApiProperty({ description: 'Available roles', type: [String] })
  roles: string[];

  @ApiProperty({ description: 'Available modules', type: [String] })
  modules: string[];
}

export class BusinessInfo {
  @ApiProperty({ description: 'Business ID' })
  id: string;

  @ApiProperty({ description: 'Business name' })
  name: string;

  @ApiProperty({
    description: 'Business type',
    enum: ['dental', 'gym', 'hotel', 'sales'],
  })
  type: 'dental' | 'gym' | 'hotel' | 'sales';

  @ApiProperty({ description: 'Business locations', type: [LocationInfo] })
  locations: LocationInfo[];

  @ApiProperty({ description: 'Business settings' })
  settings: BusinessSettings;

  @ApiProperty({ description: 'Business permissions' })
  permissions: BusinessPermissions;

  @ApiProperty({ description: 'Business creation date' })
  createdAt: string;

  @ApiProperty({ description: 'Business last update date' })
  updatedAt: string;
}
