import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage } from '@langchain/core/messages';
import { AgentState } from '../../interfaces/agent.interface';
import { ResourcesService } from '../../../resources/resources.service';

export class ResourcesIntrospectionNode {
  constructor(
    private openaiModel: ChatOpenAI,
    private resourcesService: ResourcesService
  ) {}

  async invoke(state: AgentState): Promise<Partial<AgentState>> {
    try {
      // Discover resource types dynamically
      const types = await this.resourcesService.discoverResourceTypes(state.businessId, state.locationId);
      const schemaEntries = await Promise.all(
        types.map(async (t) => [t, await this.resourcesService.inferResourceSchema(state.businessId, state.locationId, t)])
      );
      const schemas = Object.fromEntries(schemaEntries);

      const prompt = `
      Avem următoarele resurse disponibile: ${JSON.stringify(types)}.
      Avem următoarele scheme detectate: ${JSON.stringify(schemas)}.
      În funcție de mesajul: "${state.message}",
      decide dacă trebuie actualizat RAG-ul cu noile descoperiri.
      Returnează JSON: { "needsRagUpdate": boolean }
      `;

      const response = await this.openaiModel.invoke([new HumanMessage(prompt)]);
      const parsed = JSON.parse((response.content as string) || '{}');

      return {
        needsRagUpdate: !!parsed.needsRagUpdate,
        discoveredResourceTypes: types,
        discoveredSchemas: schemas
      };
    } catch (error) {
      console.error('ResourcesIntrospectionNode: error', error);
      return { needsRagUpdate: false };
    }
  }
}

