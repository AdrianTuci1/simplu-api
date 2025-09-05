import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage } from '@langchain/core/messages';
import { AgentState } from '../../../interfaces/agent.interface';
import { ResourcesService } from '../../../../resources/resources.service';

export class ResourcesIntrospectionNode {
  constructor(
    private openaiModel: ChatOpenAI,
    private resourcesService: ResourcesService
  ) {}

  async invoke(state: AgentState): Promise<Partial<AgentState>> {
    try {
      const types = await this.resourcesService.discoverResourceTypes(state.businessId, state.locationId);
      const schemaEntries = await Promise.all(
        types.map(async (t) => [t, await this.resourcesService.inferResourceSchema(state.businessId, state.locationId, t)])
      );
      const schemas = Object.fromEntries(schemaEntries);

      const candidateFields = ['resource_id'];
      const userIdFields: Record<string, string> = {};
      for (const [rtype, schema] of Object.entries(schemas)) {
        const fields: any[] = (schema as any)?.fields || [];
        const names = fields.map((f: any) => String(f.name || '').toLowerCase());
        const found = candidateFields.find(cf => names.includes(cf.toLowerCase()));
        userIdFields[rtype] = found || 'resource_id';
      }

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
        discoveredSchemas: schemas,
        discoveredUserIdFields: userIdFields
      };
    } catch (error) {
      console.error('ResourcesIntrospectionNode: error', error);
      return { needsRagUpdate: false };
    }
  }
}


