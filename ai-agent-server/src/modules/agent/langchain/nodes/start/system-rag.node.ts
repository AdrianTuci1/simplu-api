import { AgentState } from '../../../interfaces/agent.interface';
import { RagService } from '../../../../rag/rag.service';

export class SystemRagNode {
  constructor(private ragService: RagService) {}

  async invoke(state: AgentState): Promise<Partial<AgentState>> {
    try {
      const businessType = state.businessInfo?.businessType || 'general';
      const loaded = await this.ragService.listActiveSystemInstructions(businessType);
      const baseInstruction = {
        id: 'base-strategy',
        instruction: 'Identifica din cererea utilizatorului metoda optima de a ajunge la un rezultat. Poti incepe prin a descrie tabelul, a vedea cum arata diferitele tipuri de resurse (appointment, patient, medic etc) si apoi realizeaza query-uri eficiente. Daca nu stii cum sa creezi o resursa, verifica mai intai modelul si apoi completeaza cu datele pe care le ai. Obtine singur informatiile necesare, cu cat mai putine indicii.',
        active: true,
      } as any;
      const systemInstructions = [baseInstruction, ...(loaded || [])];
      return { systemInstructions };
    } catch (error) {
      console.warn('SystemRagNode: failed to load system instructions', error);
      return { systemInstructions: [] };
    }
  }
}


