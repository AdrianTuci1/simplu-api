import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage } from '@langchain/core/messages';
import { AgentState } from '../../interfaces/agent.interface';
import { ResourceQueryService } from '../../../resources/services/resource-query.service';

export class DatabaseQueryNode {
  constructor(
    private openaiModel: ChatOpenAI,
    private resourceQueryService: ResourceQueryService,
  ) {}

  async invoke(state: AgentState): Promise<Partial<AgentState>> {
    try {
      const prompt = `
      Ești un agent AI care interoghează baza de date pentru a obține informații despre tratamente.
      
      Context:
      - Business: ${state.businessInfo?.businessName || 'necunoscut'} (${state.businessInfo?.businessType || 'general'})
      - Mesaj: "${state.message}"
      - Business ID: ${state.businessId}
      - Location ID: ${state.locationId}
      
      Generează query-uri pentru baza de date pentru a obține informații despre tratamente.
      
      Returnează un JSON cu:
      {
        "databaseQueries": [
          {
            "resourceType": "treatment",
            "filters": {},
            "fields": ["name", "description", "duration", "price", "category"],
            "purpose": "string"
          }
        ],
        "needsDatabaseQuery": true
      }
      `;

      const response = await this.openaiModel.invoke([new HumanMessage(prompt)]);
      const parsed = JSON.parse((response.content as string) || '{}');

      let databaseQueryResults = [];
      
      if (parsed.needsDatabaseQuery && parsed.databaseQueries) {
        // Execute database queries
        for (const query of parsed.databaseQueries) {
          try {
            const result = await this.executeDatabaseQuery(state, query);
            databaseQueryResults.push({
              query,
              result,
              timestamp: new Date().toISOString()
            });
          } catch (error) {
            console.warn('Database query failed:', error);
            databaseQueryResults.push({
              query,
              error: error.message,
              timestamp: new Date().toISOString()
            });
          }
        }
      }

      return {
        databaseQueries: parsed.databaseQueries || [],
        needsDatabaseQuery: !!parsed.needsDatabaseQuery,
        databaseQueryResults
      };
    } catch (error) {
      console.warn('DatabaseQueryNode: error generating database queries', error);
      return {
        databaseQueries: [],
        needsDatabaseQuery: false,
        databaseQueryResults: []
      };
    }
  }

  private async executeDatabaseQuery(state: AgentState, query: any): Promise<any> {
    try {
      const queryParams = {
        resourceType: query.resourceType || 'treatment',
        businessId: state.businessId,
        locationId: state.locationId,
        filters: {
          ...query.filters,
          isActive: true // Only get active treatments
        },
        page: 1,
        limit: 100,
        sortBy: 'name',
        sortOrder: 'ASC' as const
      };

      const result = await this.resourceQueryService.queryResources(queryParams);
      
      return {
        success: true,
        data: result.data,
        pagination: result.pagination,
        totalCount: result.pagination.total
      };
    } catch (error) {
      console.error('Error executing database query:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }
}
