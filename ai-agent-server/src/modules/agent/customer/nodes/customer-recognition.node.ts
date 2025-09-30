import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage } from '@langchain/core/messages';
import { AgentState } from '../../interfaces/agent.interface';
import { RagService } from '../../../rag/rag.service';

export class CustomerRecognitionNode {
  constructor(
    private openaiModel: ChatOpenAI,
    private ragService: RagService,
  ) {}

  async invoke(state: AgentState): Promise<Partial<AgentState>> {
    try {
      // Detect customer source (platform)
      const customerSource = this.detectCustomerSource(state);
      
      // Extract business and user info for RAG memory lookup
      const businessId = state.businessInfo?.businessId || 'unknown';
      const userId = this.extractUserId(state, customerSource);
      
      // Check RAG memory for existing customer data across platforms
      const userMemory = await this.ragService.getDynamicUserMemoryAllPlatforms(businessId, userId);
      
      // Check for existing customer in current platform
      const existingCustomer = await this.findExistingCustomer(state, customerSource);
      
      // If found in current platform, update RAG memory and return
      if (existingCustomer) {
        // Store/update user memory in RAG
        await this.ragService.putDynamicUserMemory(
          businessId, 
          userId, 
          customerSource, 
          {
            customerInfo: existingCustomer,
            lastInteraction: new Date().toISOString(),
            platform: customerSource,
            interactionCount: (userMemory[0]?.interactionCount || 0) + 1
          }
        );
        
        return {
          isExistingCustomer: true,
          customerInfo: existingCustomer,
          customerSource: customerSource,
          personalizedGreeting: this.generatePersonalizedGreeting(existingCustomer, userMemory),
          needsRegistration: false,
          ragMemory: userMemory
        };
      }

      // Check if customer exists on other platforms
      if (userMemory.length > 0) {
        const crossPlatformCustomer = userMemory[0];
        return {
          isExistingCustomer: true,
          customerInfo: crossPlatformCustomer.customerInfo,
          customerSource: customerSource,
          crossPlatformSource: crossPlatformCustomer.platform,
          personalizedGreeting: this.generateCrossPlatformGreeting(crossPlatformCustomer, customerSource),
          needsRegistration: false,
          ragMemory: userMemory
        };
      }

      // New customer - store initial interaction
      await this.ragService.putDynamicUserMemory(
        businessId, 
        userId, 
        customerSource, 
        {
          customerInfo: null,
          lastInteraction: new Date().toISOString(),
          platform: customerSource,
          interactionCount: 1,
          isNewCustomer: true
        }
      );

      return {
        isExistingCustomer: false,
        needsRegistration: true,
        customerSource: customerSource,
        ragMemory: []
      };
    } catch (error) {
      console.warn('CustomerRecognitionNode: error recognizing customer', error);
      return {
        isExistingCustomer: false,
        needsRegistration: true,
        customerSource: 'unknown',
        ragMemory: []
      };
    }
  }

  private async findExistingCustomer(state: AgentState, platform: string): Promise<any> {
    // Caută în baza de date după telefon, email, sau alte identificatori
    const searchCriteria = this.extractSearchCriteria(state.message);
    
    // Simulare căutare - în implementarea reală, aici ar fi query-uri la baza de date
    const phoneMatch = await this.searchByPhone(searchCriteria.phone);
    const emailMatch = await this.searchByEmail(searchCriteria.email);
    const nameMatch = await this.searchByName(searchCriteria.name);
    
    return phoneMatch || emailMatch || nameMatch;
  }

  private extractUserId(state: AgentState, platform: string): string {
    // Extract user ID based on platform
    if (platform === 'meta' && state.metaUserId) {
      return state.metaUserId;
    }
    if (platform === 'twilio' && state.twilioUserId) {
      return state.twilioUserId;
    }
    if (platform === 'email' && state.emailUserId) {
      return state.emailUserId;
    }
    
    // Fallback to phone or email from message
    const searchCriteria = this.extractSearchCriteria(state.message);
    return searchCriteria.phone || searchCriteria.email || 'unknown';
  }

  private extractSearchCriteria(message: string): { phone?: string; email?: string; name?: string } {
    const phoneRegex = /(\+?40|0)[0-9]{9}/g;
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const nameRegex = /(?:numele meu este|mă numesc|sunt|suntem)\s+([A-Za-z\s]+)/i;
    
    const phone = message.match(phoneRegex)?.[0];
    const email = message.match(emailRegex)?.[0];
    const nameMatch = message.match(nameRegex);
    const name = nameMatch ? nameMatch[1].trim() : undefined;
    
    return { phone, email, name };
  }

  private async searchByPhone(phone?: string): Promise<any> {
    if (!phone) return null;
    
    // Simulare căutare după telefon
    // În implementarea reală, aici ar fi query la baza de date
    console.log(`Searching for customer by phone: ${phone}`);
    
    // Simulare rezultat
    if (phone.includes('123')) {
      return {
        id: 'customer_123',
        name: 'Ion Popescu',
        phone: phone,
        email: 'ion.popescu@example.com',
        lastAppointment: '2024-01-10',
        totalAppointments: 5
      };
    }
    
    return null;
  }

  private async searchByEmail(email?: string): Promise<any> {
    if (!email) return null;
    
    // Simulare căutare după email
    console.log(`Searching for customer by email: ${email}`);
    
    // Simulare rezultat
    if (email.includes('test')) {
      return {
        id: 'customer_456',
        name: 'Maria Ionescu',
        phone: '+40123456789',
        email: email,
        lastAppointment: '2024-01-15',
        totalAppointments: 3
      };
    }
    
    return null;
  }

  private async searchByName(name?: string): Promise<any> {
    if (!name) return null;
    
    // Simulare căutare după nume
    console.log(`Searching for customer by name: ${name}`);
    
    // Simulare rezultat
    if (name.toLowerCase().includes('popescu')) {
      return {
        id: 'customer_789',
        name: name,
        phone: '+40987654321',
        email: 'popescu@example.com',
        lastAppointment: '2024-01-12',
        totalAppointments: 2
      };
    }
    
    return null;
  }

  private detectCustomerSource(state: AgentState): string {
    // Detectează sursa clientului (Meta, Twilio, Email, Web)
    if (state.clientSource) {
      return state.clientSource;
    }
    
    // Analizează mesajul pentru a detecta sursa
    const message = state.message.toLowerCase();
    
    if (message.includes('facebook') || message.includes('instagram')) {
      return 'meta';
    }
    if (message.includes('whatsapp')) {
      return 'twilio';
    }
    if (message.includes('@')) {
      return 'email';
    }
    
    return 'web';
  }

  private generatePersonalizedGreeting(customer: any, ragMemory: any[]): string {
    const interactionCount = ragMemory[0]?.interactionCount || 0;
    const lastPlatform = ragMemory[0]?.platform;
    
    const greetings = [
      `Bună ziua ${customer.name}! Văd că sunteți clientul nostru. Cum vă pot ajuta astăzi?`,
      `Salut ${customer.name}! Mă bucur să vă văd din nou. Cu ce vă pot ajuta?`,
      `Bună ${customer.name}! Văd că aveți ${customer.totalAppointments} programări la noi. Cum vă pot ajuta?`
    ];
    
    // Add cross-platform awareness
    if (lastPlatform && lastPlatform !== 'unknown') {
      greetings.push(`Bună ${customer.name}! Văd că ne-ați contactat anterior prin ${lastPlatform}. Cum vă pot ajuta?`);
    }
    
    // Add interaction count awareness
    if (interactionCount > 1) {
      greetings.push(`Bună ${customer.name}! Văd că este a ${interactionCount}-a interacțiune cu noi. Cum vă pot ajuta?`);
    }
    
    // Alege un salut aleatoriu
    const randomIndex = Math.floor(Math.random() * greetings.length);
    return greetings[randomIndex];
  }

  private generateCrossPlatformGreeting(crossPlatformCustomer: any, currentPlatform: string): string {
    const customer = crossPlatformCustomer.customerInfo;
    const previousPlatform = crossPlatformCustomer.platform;
    
    return `Bună ${customer.name}! Văd că ne-ați contactat anterior prin ${previousPlatform} și acum prin ${currentPlatform}. Cum vă pot ajuta?`;
  }
}
