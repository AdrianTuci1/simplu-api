import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage } from '@langchain/core/messages';
import { AgentState } from '../../interfaces/agent.interface';
import { AppServerClient } from '../clients/app-server.client';

export class AppServerDataNode {
  constructor(
    private openaiModel: ChatOpenAI,
    private appServerClient: AppServerClient,
  ) {}

  async invoke(state: AgentState): Promise<Partial<AgentState>> {
    try {
      const prompt = `
      Ești un agent AI care interoghează serverul aplicației pentru a obține informații despre servicii și programări.
      
      Context:
      - Business: ${state.businessInfo?.businessName || 'necunoscut'} (${state.businessInfo?.businessType || 'general'})
      - Mesaj: "${state.message}"
      - Business ID: ${state.businessId}
      - Location ID: ${state.locationId}
      
      Generează cereri pentru serverul aplicației pentru a obține informații despre servicii și programări.
      
      Returnează un JSON cu:
      {
        "appServerRequests": [
          {
            "type": "services|available_dates|time_slots|business_info",
            "parameters": {},
            "purpose": "string"
          }
        ],
        "needsAppServerData": true
      }
      `;

      const response = await this.openaiModel.invoke([new HumanMessage(prompt)]);
      const parsed = JSON.parse((response.content as string) || '{}');

      let appServerData = null;
      
      if (parsed.needsAppServerData && parsed.appServerRequests) {
        // Execute app server requests
        appServerData = await this.executeAppServerRequests(state, parsed.appServerRequests);
      }

      return {
        appServerRequests: parsed.appServerRequests || [],
        needsAppServerData: !!parsed.needsAppServerData,
        appServerData
      };
    } catch (error) {
      console.warn('AppServerDataNode: error generating app server requests', error);
      return {
        appServerRequests: [],
        needsAppServerData: false,
        appServerData: null
      };
    }
  }

  private async executeAppServerRequests(state: AgentState, requests: any[]): Promise<any> {
    const results = {
      services: [],
      availableDates: [],
      timeSlots: [],
      businessInfo: null,
      locationInfo: null
    };

    for (const request of requests) {
      try {
        switch (request.type) {
          case 'services':
            const servicesResult = await this.appServerClient.getPublicServices(
              state.businessId,
              state.locationId
            );
            results.services = servicesResult.services || [];
            break;

          case 'available_dates':
            const today = new Date();
            const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
            const availableDates = await this.appServerClient.getAvailableDates(
              state.businessId,
              state.locationId,
              today.toISOString().split('T')[0],
              nextWeek.toISOString().split('T')[0],
              request.parameters?.serviceId
            );
            results.availableDates = availableDates || [];
            break;

          case 'time_slots':
            if (request.parameters?.date) {
              const timeSlots = await this.appServerClient.getTimeSlots(
                state.businessId,
                state.locationId,
                request.parameters.date,
                request.parameters.serviceId
              );
              results.timeSlots = timeSlots || [];
            }
            break;

          case 'business_info':
            const businessInfo = await this.appServerClient.getBusinessInfo(state.businessId);
            results.businessInfo = businessInfo;
            break;

          case 'location_info':
            const locationInfo = await this.appServerClient.getLocationInfo(
              state.businessId,
              state.locationId
            );
            results.locationInfo = locationInfo;
            break;
        }
      } catch (error) {
        console.warn(`App server request failed for ${request.type}:`, error);
      }
    }

    return results;
  }
}
