import { BusinessInfoService } from '../../../business-info/business-info.service';
import { AgentState } from '../../interfaces/agent.interface';

export class BusinessInfoNode {
  constructor(private businessInfoService: BusinessInfoService) {}

  async invoke(state: AgentState): Promise<Partial<AgentState>> {
    try {
      console.log(`BusinessInfoNode: Getting business info for ${state.businessId}`);
      
      const businessInfo = await this.businessInfoService.getBusinessInfo(state.businessId);
      
      if (businessInfo) {
        console.log(`BusinessInfoNode: Found business info for ${state.businessId}:`, {
          name: businessInfo.businessName,
          type: businessInfo.businessType,
          locations: businessInfo.locations?.length || 0
        });
      } else {
        console.warn(`BusinessInfoNode: No business info found for ${state.businessId}`);
      }
      
      return {
        businessInfo
      };
    } catch (error) {
      console.error(`BusinessInfoNode: Error getting business info for ${state.businessId}:`, error);
      return {
        businessInfo: null
      };
    }
  }
} 