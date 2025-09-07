import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage } from '@langchain/core/messages';
import { AgentState } from '../../../interfaces/agent.interface';
import { RagService } from '../../../../rag/rag.service';

export class ReasoningNode {
  constructor(
    private openaiModel: ChatOpenAI,
    private ragService: RagService,
  ) {}

  async invoke(state: AgentState): Promise<Partial<AgentState>> {
    try {
      const baseInstruction = `Identifica din cererea utilizatorului metoda optima de a ajunge la un rezultat. Poti incepe prin a descrie tabelul, a vedea cum arata diferitele tipuri de resurse (appointment, patient, medic etc) si apoi realizeaza query-uri eficiente. Daca nu stii cum sa creezi o resursa, verifica mai intai modelul si apoi completeaza cu datele pe care le ai. Obtine singur informatiile necesare, cu cat mai putine indicii.`;
      const systemRules = JSON.stringify([baseInstruction, ...(state.systemInstructions || [])]);
      const userCapabilities = state.userCapabilities;
      const canAccessAllData = userCapabilities?.canAccessAllData || false;
      const canViewPersonalInfo = userCapabilities?.canViewPersonalInfo || false;
      const canModifyReservations = userCapabilities?.canModifyReservations || false;
      
      const prompt = `
      Ești un modul de raționament pentru un agent conversațional.
      Primesti context și trebuie să decizi următoarele flag-uri booleene:
      { "needsResourceSearch": boolean, "needsExternalApi": boolean, "needsHumanApproval": boolean, "needsIntrospection": boolean,
        "intent": { "operation": "list|create|update|delete|query_db", "resourceType": string, "filters": object }
      }

      Context:
      - Rol: ${state.role}
      - Capabilități utilizator: 
        * Acces la toate datele: ${canAccessAllData}
        * Vizualizare informații personale: ${canViewPersonalInfo}
        * Modificare rezervări: ${canModifyReservations}
      - Mesaj: "${state.message}"
      - Business: ${state.businessInfo?.businessName || 'necunoscut'} (${state.businessInfo?.businessType || 'general'})
      - Rezultate RAG (sumar): ${JSON.stringify((state.ragResults || []).map(r => r.instruction).slice(0, 3))}
      - Instrucțiuni de sistem (JSON): ${systemRules}
      - Resurse descoperite: ${JSON.stringify(state.discoveredResourceTypes || [])}

      Reguli orientative:
      - Dacă mesajul cere operații CRUD pe resurse (creare/actualizare/ștergere/listare), setează needsResourceSearch=true.
      - Dacă trebuie trimis un mesaj/sms/email sau apelat un API extern, setează needsExternalApi=true.
      - Dacă incertitudinea e mare sau acțiunea e sensibilă, setează needsHumanApproval=true.
      - Pentru operatori (${state.role === 'operator'}), permite accesul la toate datele și operațiile.
      - Pentru clienți (${state.role !== 'operator'}), limitează accesul la datele personale ale altor clienți.
      - Returnează DOAR JSON-ul cerut, fără alt text.
      `;

      const response = await this.openaiModel.invoke([new HumanMessage(prompt)]);
      const parsed = JSON.parse((response.content as string) || '{}');
      // Heuristics: if RAG is empty, force internal exploration
      if ((state.ragResults || []).length === 0) {
        parsed.needsIntrospection = true;
        parsed.needsResourceSearch = true;
      }

      // Persist structured dynamic memory so next nodes can use it immediately
      try {
        const intent = parsed.intent || {};
        const dynamicUpdate = {
          lastMessage: state.message,
          lastUpdatedAt: new Date().toISOString(),
          intent,
        } as any;
        const businessId = state.businessId || state.businessInfo?.businessId || 'unknown';
        const businessType = state.businessInfo?.businessType || 'general';
        const userId = state.userId || 'unknown';
        const platform = state.clientSource || 'unknown';
        
        // Determine action based on intent
        const action = intent.operation || intent.action || 'general';
        
        const businessMemoryUpdate = {
          ...dynamicUpdate,
          businessType: state.businessInfo?.businessType,
          discoveredResourceTypes: state.discoveredResourceTypes || [],
          ragResults: (state.ragResults || []).map(r => r.instruction)
        };
        
        const userMemoryUpdate = {
          role: state.role || 'client_existent',
          lastInteractionAt: new Date().toISOString(),
          context: { businessId, locationId: state.locationId || 'default' },
          intent,
          platform,
          message: state.message,
          businessType
        };
        
        await Promise.all([
          this.ragService.putDynamicBusinessMemory(businessId, businessType, action, businessMemoryUpdate),
          this.ragService.putDynamicUserMemory(businessId, userId, platform, userMemoryUpdate),
        ]);
      } catch (e) {
        console.warn('ReasoningNode: failed to persist dynamic memory', (e as any)?.message || e);
      }

      return {
        needsResourceSearch: !!parsed.needsResourceSearch,
        needsExternalApi: !!parsed.needsExternalApi,
        needsHumanApproval: !!parsed.needsHumanApproval,
        needsIntrospection: parsed.needsIntrospection ?? (state.role === 'operator'),
        // Hints for downstream nodes
        userFoundInResourceType: parsed.intent?.resourceType,
        dynamicUserMemory: {
          current: {
            ...(state as any).dynamicUserMemory?.current,
            intent: parsed.intent || (state as any).dynamicUserMemory?.current?.intent,
          },
          allPlatforms: (state as any).dynamicUserMemory?.allPlatforms || []
        },
      } as any;
    } catch (error) {
      console.warn('ReasoningNode: fallback flags due to error', error);
      return {
        needsResourceSearch: state.needsResourceSearch,
        needsExternalApi: state.needsExternalApi,
        needsHumanApproval: state.needsHumanApproval
      };
    }
  }
}


