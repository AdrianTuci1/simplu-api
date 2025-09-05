import { AgentState } from '../../../interfaces/agent.interface';
import { ResourcesService } from '../../../../resources/resources.service';
import { ResourceQueryService } from '../../../../resources/services/resource-query.service';

export class SqlExecuteNode {
  constructor(
    private resourcesService: ResourcesService,
    private resourceQueryService: ResourceQueryService,
  ) {}

  async invoke(state: AgentState): Promise<Partial<AgentState>> {
    try {
      const sql = (state as any).generatedSql as string | undefined;
      if (!sql) {
        return {};
      }

      // Simple SQL-like parsing to derive action and resource type
      const lowered = sql.toLowerCase();
      const selectMatch = lowered.match(/select[\s\S]*?from\s+resources/);
      const insertMatch = lowered.match(/insert\s+into\s+resources/);
      const updateMatch = lowered.match(/update\s+resources/);
      const deleteMatch = lowered.match(/delete\s+from\s+resources/);

      if (selectMatch) {
        const typeMatch = lowered.match(/resource_type\s*=\s*['\"]([a-z_]+)['\"]/);
        const resourceType = (typeMatch && typeMatch[1]) || (state as any).targetResourceType || 'resource';
        const result = await this.resourceQueryService.queryResources(
          state.businessId,
          state.locationId,
          { resourceType, page: 1, limit: 50 } as any,
        );
        return {
          resourceOperations: [
            ...((state.resourceOperations as any[]) || []),
            { operation: { type: 'read', resourceType }, result },
          ],
        } as any;
      }

      if (insertMatch) {
        const typeMatch = lowered.match(/\(\s*resource_type\s*,/);
        const resourceType = (state as any).targetResourceType || 'resource';
        const data = (state as any).generatedData || { createdAt: new Date().toISOString() };
        const result = await this.resourcesService.processResourceOperation({
          operation: 'create' as any,
          businessId: state.businessId,
          locationId: state.locationId,
          resourceType: resourceType as any,
          data,
        } as any);
        return {
          resourceOperations: [
            ...((state.resourceOperations as any[]) || []),
            { operation: { type: 'create', resourceType }, result },
          ],
        } as any;
      }

      if (updateMatch) {
        const typeMatch = lowered.match(/resource_type\s*=\s*['\"]([a-z_]+)['\"]/);
        const resourceType = (typeMatch && typeMatch[1]) || (state as any).targetResourceType || 'resource';
        // Try to extract resource id from WHERE clause
        const idMatch = lowered.match(/where\s+(?:resource_id|resourceid|id)\s*=\s*['\"]?([a-z0-9_\-:]+)/);
        const resourceId = idMatch ? idMatch[1] : undefined;
        if (!resourceId) {
          return {};
        }
        const data = (state as any).generatedData || {};
        const result = await this.resourcesService.processResourceOperation({
          operation: 'update' as any,
          businessId: state.businessId,
          locationId: state.locationId,
          resourceType: resourceType as any,
          resourceId,
          data,
        } as any);
        return {
          resourceOperations: [
            ...((state.resourceOperations as any[]) || []),
            { operation: { type: 'update', resourceType, resourceId }, result },
          ],
        } as any;
      }

      if (deleteMatch) {
        const typeMatch = lowered.match(/resource_type\s*=\s*['\"]([a-z_]+)['\"]/);
        const resourceType = (typeMatch && typeMatch[1]) || (state as any).targetResourceType || 'resource';
        const idMatch = lowered.match(/where\s+(?:resource_id|resourceid|id)\s*=\s*['\"]?([a-z0-9_\-:]+)/);
        const resourceId = idMatch ? idMatch[1] : undefined;
        if (!resourceId) {
          return {};
        }
        const result = await this.resourcesService.processResourceOperation({
          operation: 'delete' as any,
          businessId: state.businessId,
          locationId: state.locationId,
          resourceType: resourceType as any,
          resourceId,
        } as any);
        return {
          resourceOperations: [
            ...((state.resourceOperations as any[]) || []),
            { operation: { type: 'delete', resourceType, resourceId }, result },
          ],
        } as any;
      }

      return {};
    } catch (error) {
      return {};
    }
  }
}


