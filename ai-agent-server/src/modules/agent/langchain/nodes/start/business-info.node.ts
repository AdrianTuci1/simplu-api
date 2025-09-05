import { BusinessInfoService } from '../../../../business-info/business-info.service';
import { AgentState } from '../../../interfaces/agent.interface';

export class BusinessInfoNode {
  constructor(private businessInfoService: BusinessInfoService) {}

  async invoke(state: AgentState): Promise<Partial<AgentState>> {
    try {
      if (state.businessInfo) {
        return { businessInfo: state.businessInfo };
      }
      if (!state.businessId) {
        return { businessInfo: null };
      }
      const businessInfo = await this.businessInfoService.getBusinessInfo(state.businessId);

      return { businessInfo };
    } catch (error) {
      console.error(`BusinessInfoNode: Error getting business info for ${state.businessId}:`, error);
      return { businessInfo: null };
    }
  }
}


