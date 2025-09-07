import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage } from '@langchain/core/messages';
import { AgentState } from '../../../interfaces/agent.interface';

export class SqlGenerateNode {
  constructor(private openaiModel: ChatOpenAI) {}

  async invoke(state: AgentState): Promise<Partial<AgentState>> {
    try {
      const discoveredTypes: string[] = (state.discoveredResourceTypes || []) as any;
      const inferredType = (state as any).userFoundInResourceType || discoveredTypes[0] || 'resource';
      // If reasoning stored intent with filters/operation, prefer that
      const intent = (state as any).dynamicUserMemory?.intent || (state as any).dynamicBusinessMemory?.intent || {};
      const targetType = intent.resourceType || inferredType;

      const businessLocationId = `${state.businessId}-${state.locationId}`;
      const prompt = `
      Generează o singură instrucțiune SQL (sau pseudo-SQL) pe tabelul unic "resources".

      Context:
      - Mesaj: "${state.message}"
      - Tip business: ${state.businessInfo?.businessType || 'general'}
      - business_location_id: ${businessLocationId}
      - resource_type țintă: ${targetType}
      - indicii intent: ${JSON.stringify(intent)}

      Reguli:
      - Pentru listare/căutare: SELECT ... FROM resources WHERE business_location_id='${businessLocationId}' AND resource_type='${inferredType}' [AND condiții relevante pe resource_id/data/start_date/end_date]
      - Pentru creare: INSERT INTO resources (resource_type, resource_id, data, start_date, end_date) VALUES ('${inferredType}', '<id>', '{...json...}', '<start_date>', '<end_date>')
      - Pentru actualizare: UPDATE resources SET data='{...json...}' WHERE business_location_id='${businessLocationId}' AND resource_type='${inferredType}' AND (resource_id='<id>' OR id='<row_id>')
      - Pentru ștergere: DELETE FROM resources WHERE business_location_id='${businessLocationId}' AND resource_type='${inferredType}' AND (resource_id='<id>' OR id='<row_id>')
      - Returnează DOAR interogarea, fără explicații.
      `;
      const response = await this.openaiModel.invoke([new HumanMessage(prompt)]);
      const sql = String(response.content || '').trim();
      // CRITICAL FIX: Don't create new array, push to existing one
      if (!state.actions) state.actions = [];
      state.actions.push({ type: 'sql_generate', status: 'success', details: { sql, resourceType: targetType } });
      return { generatedSql: sql, targetResourceType: targetType };
    } catch (error) {
      // CRITICAL FIX: Don't create new array, push to existing one
      if (!state.actions) state.actions = [];
      state.actions.push({ type: 'sql_generate', status: 'failed', details: { error: String(error?.message || error) } });
      return {};
    }
  }
}


