import { BusinessInfoService } from '../../../business-info/business-info.service';
import { AgentState } from '../../interfaces/agent.interface';

export class BusinessInfoNode {
  constructor(private businessInfoService: BusinessInfoService) {}

  async invoke(state: AgentState): Promise<Partial<AgentState>> {
    try {
      const businessInfo = await this.businessInfoService.getBusinessInfo(state.businessId);
      
      return {
        businessInfo
      };
    } catch (error) {
      console.error('Error in BusinessInfoNode:', error);
      return {
        businessInfo: null
      };
    }
  }
} 