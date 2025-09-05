import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage } from '@langchain/core/messages';
import { AgentState } from '../../../interfaces/agent.interface';

export class SqlGenerateNode {
  constructor(private openaiModel: ChatOpenAI) {}

  async invoke(state: AgentState): Promise<Partial<AgentState>> {
    try {
      const discoveredTypes: string[] = (state.discoveredResourceTypes || []) as any;
      const inferredType = (state as any).userFoundInResourceType || discoveredTypes[0] || 'resource';

      const businessLocationId = `${state.businessId}-${state.locationId}`;
      const prompt = `
      Generează o singură instrucțiune SQL (sau pseudo-SQL) pe tabelul unic "resources".

      Context:
      - Mesaj: "${state.message}"
      - Tip business: ${state.businessInfo?.businessType || 'general'}
      - business_location_id: ${businessLocationId}
      - resource_type țintă: ${inferredType}

      Reguli:
      - Pentru listare/căutare: SELECT ... FROM resources WHERE business_location_id='${businessLocationId}' AND resource_type='${inferredType}' [AND condiții relevante pe resource_id/data/start_date/end_date]
      - Pentru creare: INSERT INTO resources (resource_type, resource_id, data, start_date, end_date) VALUES ('${inferredType}', '<id>', '{...json...}', '<start_date>', '<end_date>')
      - Pentru actualizare: UPDATE resources SET data='{...json...}' WHERE business_location_id='${businessLocationId}' AND resource_type='${inferredType}' AND (resource_id='<id>' OR id='<row_id>')
      - Pentru ștergere: DELETE FROM resources WHERE business_location_id='${businessLocationId}' AND resource_type='${inferredType}' AND (resource_id='<id>' OR id='<row_id>')
      - Returnează DOAR interogarea, fără explicații.
      `;
      const response = await this.openaiModel.invoke([new HumanMessage(prompt)]);
      const sql = String(response.content || '').trim();
      return { generatedSql: sql, targetResourceType: inferredType, actions: [...(state.actions || []), { type: 'sql_generate', status: 'success', details: { sql, resourceType: inferredType } }] } as any;
    } catch (error) {
      return { actions: [...(state.actions || []), { type: 'sql_generate', status: 'failed', details: { error: String(error?.message || error) } }] } as any;
    }
  }
}


