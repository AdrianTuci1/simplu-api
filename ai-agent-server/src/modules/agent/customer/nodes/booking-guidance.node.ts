import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage } from '@langchain/core/messages';
import { AgentState } from '../../interfaces/agent.interface';
import { AppServerClient } from '../clients/app-server.client';

export class BookingGuidanceNode {
  constructor(
    private openaiModel: ChatOpenAI,
    private appServerClient: AppServerClient,
  ) {}

  async invoke(state: AgentState): Promise<Partial<AgentState>> {
    try {
      // Check if we have the necessary data for booking guidance
      if (!state.appServerData || !state.databaseQueryResults) {
        return {
          bookingGuidance: null,
          needsBookingGuidance: false
        };
      }

      const prompt = `
      Ești un agent AI care ghidează clienții prin procesul de rezervare.
      
      Context:
      - Business: ${state.businessInfo?.businessName || 'necunoscut'} (${state.businessInfo?.businessType || 'general'})
      - Mesaj: "${state.message}"
      - Servicii disponibile: ${JSON.stringify(state.appServerData?.services || [])}
      - Date disponibile: ${JSON.stringify(state.appServerData?.availableDates || [])}
      - Tratamente din baza de date: ${JSON.stringify(state.databaseQueryResults || [])}
      
      Generează ghidaj pentru rezervare bazat pe datele disponibile.
      
      Returnează un JSON cu:
      {
        "bookingGuidance": {
          "availableServices": [],
          "recommendedServices": [],
          "availableSlots": [],
          "nextSteps": [],
          "bookingInstructions": "string"
        },
        "needsBookingGuidance": true
      }
      `;

      const response = await this.openaiModel.invoke([new HumanMessage(prompt)]);
      const parsed = JSON.parse((response.content as string) || '{}');

      // Enhance guidance with real-time data
      const enhancedGuidance = await this.enhanceBookingGuidance(state, parsed.bookingGuidance);

      return {
        bookingGuidance: enhancedGuidance,
        needsBookingGuidance: !!parsed.needsBookingGuidance
      };
    } catch (error) {
      console.warn('BookingGuidanceNode: error generating booking guidance', error);
      return {
        bookingGuidance: null,
        needsBookingGuidance: false
      };
    }
  }

  private async enhanceBookingGuidance(state: AgentState, guidance: any): Promise<any> {
    try {
      // Get current available dates and slots
      const today = new Date();
      const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      const availableDates = await this.appServerClient.getAvailableDates(
        state.businessId,
        state.locationId,
        today.toISOString().split('T')[0],
        nextWeek.toISOString().split('T')[0]
      );

      // Get specific time slots for the next few days
      const timeSlots = [];
      for (let i = 0; i < 3; i++) {
        const date = new Date(today.getTime() + i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];
        
        try {
          const slots = await this.appServerClient.getTimeSlots(
            state.businessId,
            state.locationId,
            dateStr
          );
          timeSlots.push({
            date: dateStr,
            slots: slots.filter(slot => slot.isAvailable)
          });
        } catch (error) {
          console.warn(`Failed to get time slots for ${dateStr}:`, error);
        }
      }

      return {
        ...guidance,
        availableSlots: timeSlots,
        realTimeData: {
          availableDates,
          timeSlots,
          lastUpdated: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Error enhancing booking guidance:', error);
      return guidance;
    }
  }
}
