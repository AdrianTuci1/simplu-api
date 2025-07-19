import { Injectable } from '@nestjs/common';
import { BusinessResourceDataMap, BusinessType } from '../../models/unified-data-types';
import { ResourceValidatorService } from './resource-validator.service';

@Injectable()
export class ResourceStructureService {
  
  constructor(private readonly resourceValidator: ResourceValidatorService) {}

  /**
   * Get typed resource data structure for a business type and resource
   */
  getResourceStructure<
    TBusinessType extends BusinessType,
    TResourceName extends keyof BusinessResourceDataMap[TBusinessType]
  >(
    businessType: TBusinessType,
    resourceName: TResourceName,
  ): Partial<BusinessResourceDataMap[TBusinessType][TResourceName]> {
    return this.resourceValidator.getDefaultResourceData(businessType, resourceName as string);
  }

  /**
   * Validate resource data structure
   */
  validateResourceStructure<
    TBusinessType extends BusinessType,
    TResourceName extends keyof BusinessResourceDataMap[TBusinessType]
  >(
    businessType: TBusinessType,
    resourceName: TResourceName,
    data: any,
  ): data is BusinessResourceDataMap[TBusinessType][TResourceName] {
    return this.resourceValidator.validateResourceData(businessType, resourceName, data);
  }
}