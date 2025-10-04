import { ApiProperty } from '@nestjs/swagger';

export class BusinessSearchLocationDto {
  @ApiProperty({ description: 'Location ID' })
  id: string;

  @ApiProperty({ description: 'Location name' })
  name: string;

  @ApiProperty({ description: 'Location address' })
  address: string;

  @ApiProperty({ description: 'Location timezone' })
  timezone: string;

  @ApiProperty({ description: 'Location active status' })
  active: boolean;
}

export class BusinessSearchResultDto {
  @ApiProperty({ description: 'Business ID' })
  businessId: string;

  @ApiProperty({ description: 'Company name' })
  companyName: string;

  @ApiProperty({ description: 'Business locations', type: [BusinessSearchLocationDto] })
  locations: BusinessSearchLocationDto[];

  @ApiProperty({ description: 'Whether the business is active' })
  active: boolean;

  @ApiProperty({ description: 'Business type' })
  businessType: string;

  @ApiProperty({ description: 'Domain label' })
  domainLabel: string;

  @ApiProperty({ description: 'Registration number' })
  registrationNumber: string;
}
