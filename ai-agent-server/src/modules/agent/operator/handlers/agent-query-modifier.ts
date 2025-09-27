import { Injectable } from '@nestjs/common';

export interface QueryModification {
  field: string;
  operation: 'add' | 'remove' | 'modify' | 'filter';
  value: any;
  condition?: string;
}

export interface ModifiedQuery {
  originalQuery: any;
  modifications: QueryModification[];
  modifiedQuery: any;
  modificationId: string;
  timestamp: string;
}

@Injectable()
export class AgentQueryModifier {
  private modificationHistory: Map<string, ModifiedQuery[]> = new Map();

  // Allows the agent to modify queries
  async modifyQuery(
    sessionId: string, 
    repositoryType: string, 
    modifications: QueryModification[]
  ): Promise<{ success: boolean; modifiedQuery: any; modificationId: string }> {
    try {
      // Get the original query (this would typically come from the frontend)
      const originalQuery = await this.getOriginalQuery(sessionId, repositoryType);
      
      if (!originalQuery) {
        return {
          success: false,
          modifiedQuery: null,
          modificationId: ''
        };
      }

      // Apply modifications to the query
      const modifiedQuery = this.applyModificationsToQuery(originalQuery, modifications);
      
      // Generate modification ID
      const modificationId = this.generateModificationId();
      
      // Store the modification
      const modifiedQueryRecord: ModifiedQuery = {
        originalQuery,
        modifications,
        modifiedQuery,
        modificationId,
        timestamp: new Date().toISOString()
      };
      
      this.storeModification(sessionId, modifiedQueryRecord);
      
      return {
        success: true,
        modifiedQuery,
        modificationId
      };
    } catch (error) {
      console.error('Error modifying query:', error);
      return {
        success: false,
        modifiedQuery: null,
        modificationId: ''
      };
    }
  }

  // Applies modifications to an existing query
  applyModificationsToQuery(originalQuery: any, modifications: QueryModification[]): any {
    let modifiedQuery = { ...originalQuery };
    
    for (const modification of modifications) {
      modifiedQuery = this.applySingleModification(modifiedQuery, modification);
    }
    
    return modifiedQuery;
  }

  // Reverts to the original query
  async revertQueryModification(sessionId: string, modificationId: string): Promise<{ success: boolean; originalQuery: any }> {
    try {
      const modifications = this.modificationHistory.get(sessionId) || [];
      const modification = modifications.find(m => m.modificationId === modificationId);
      
      if (!modification) {
        return {
          success: false,
          originalQuery: null
        };
      }
      
      // Remove the modification from history
      const updatedModifications = modifications.filter(m => m.modificationId !== modificationId);
      this.modificationHistory.set(sessionId, updatedModifications);
      
      return {
        success: true,
        originalQuery: modification.originalQuery
      };
    } catch (error) {
      console.error('Error reverting query modification:', error);
      return {
        success: false,
        originalQuery: null
      };
    }
  }

  // Gets modification history for a session
  getModificationHistory(sessionId: string): ModifiedQuery[] {
    return this.modificationHistory.get(sessionId) || [];
  }

  // Clears all modifications for a session
  clearModificationHistory(sessionId: string): void {
    this.modificationHistory.delete(sessionId);
  }

  private async getOriginalQuery(sessionId: string, repositoryType: string): Promise<any> {
    // This would typically fetch the original query from the frontend or database
    // For now, we'll return a mock query structure
    console.log(`Getting original query for session ${sessionId}, repository ${repositoryType}`);
    
    return {
      repository: repositoryType,
      filters: {},
      fields: [],
      sort: {},
      limit: 100,
      offset: 0
    };
  }

  private applySingleModification(query: any, modification: QueryModification): any {
    const { field, operation, value, condition } = modification;
    
    switch (operation) {
      case 'add':
        if (field === 'filters') {
          query.filters = { ...query.filters, ...value };
        } else if (field === 'fields') {
          query.fields = [...(query.fields || []), ...(Array.isArray(value) ? value : [value])];
        } else {
          query[field] = value;
        }
        break;
        
      case 'remove':
        if (field === 'filters' && value) {
          delete query.filters[value];
        } else if (field === 'fields' && value) {
          query.fields = query.fields.filter((f: string) => f !== value);
        } else {
          delete query[field];
        }
        break;
        
      case 'modify':
        if (field === 'filters') {
          query.filters = { ...query.filters, ...value };
        } else {
          query[field] = value;
        }
        break;
        
      case 'filter':
        if (condition) {
          query.filters = { ...query.filters, [field]: { [condition]: value } };
        } else {
          query.filters = { ...query.filters, [field]: value };
        }
        break;
    }
    
    return query;
  }

  private generateModificationId(): string {
    return `mod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private storeModification(sessionId: string, modification: ModifiedQuery): void {
    const existing = this.modificationHistory.get(sessionId) || [];
    existing.push(modification);
    this.modificationHistory.set(sessionId, existing);
  }
}
