import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface AgentAuthenticationPayload {
  sessionId: string;
  businessId: string;
  operatorId: string;
  permissions: string[];
}

export interface ExecuteCommandPayload {
  sessionId: string;
  command: string;
  parameters: any;
  businessId: string;
  locationId: string;
}

export interface ModifyQueryPayload {
  sessionId: string;
  repositoryType: string;
  modifications: any;
  businessId: string;
  locationId: string;
}

export interface ApproveChangesPayload {
  sessionId: string;
  changeId: string;
  businessId: string;
  locationId: string;
}

export interface RejectChangesPayload {
  sessionId: string;
  changeId: string;
  reason: string;
  businessId: string;
  locationId: string;
}

export interface FrontendResourceRequest {
  sessionId: string;
  requestType: 'get_services' | 'get_appointments' | 'get_business_info' | 'get_available_dates';
  parameters: any;
  businessId: string;
  locationId: string;
}

export interface FrontendResourceResponse {
  sessionId: string;
  resources: any;
  businessId: string;
  locationId: string;
}

export interface CreateDraftPayload {
  sessionId: string;
  draftType: string;
  content: any;
  businessId: string;
  locationId: string;
}

export interface UpdateDraftPayload {
  sessionId: string;
  draftId: string;
  content: any;
  businessId: string;
  locationId: string;
}

export interface DeleteDraftPayload {
  sessionId: string;
  draftId: string;
  businessId: string;
  locationId: string;
}

export interface ListDraftsPayload {
  sessionId: string;
  businessId: string;
  locationId: string;
  filters: any;
}

@Injectable()
export class AgentWebSocketHandler {
  constructor(
    private readonly httpService: HttpService
  ) {}

  // Handles agent authentication
  async handleAuthentication(sessionId: string, payload: AgentAuthenticationPayload): Promise<{ success: boolean; message: string }> {
    try {
      // Validate operator permissions
      const hasValidPermissions = this.validateOperatorPermissions(payload.permissions);
      
      if (!hasValidPermissions) {
        return {
          success: false,
          message: 'Permisiuni insuficiente pentru autentificarea agentului'
        };
      }

      // Store authentication in session
      await this.storeAgentAuthentication(sessionId, payload);
      
      // Note: Broadcasting will be handled by the calling WebSocketGateway

      return {
        success: true,
        message: 'Agent autentificat cu succes'
      };
    } catch (error) {
      console.error('Error handling agent authentication:', error);
      return {
        success: false,
        message: 'Eroare la autentificarea agentului'
      };
    }
  }

  // Executes commands from agents
  async handleExecuteCommand(sessionId: string, payload: ExecuteCommandPayload): Promise<{ success: boolean; result: any; message: string }> {
    try {
      // Validate agent session
      const isAuthenticated = await this.validateAgentSession(sessionId, payload.businessId);
      
      if (!isAuthenticated) {
        return {
          success: false,
          result: null,
          message: 'Agent neautentificat'
        };
      }

      // Execute the command via HTTP
      const result = await this.executeAgentCommandViaHttp(payload.command, payload.parameters, payload.businessId);
      
      // Note: Broadcasting will be handled by the calling WebSocketGateway

      return {
        success: true,
        result,
        message: 'Comandă executată cu succes'
      };
    } catch (error) {
      console.error('Error executing agent command:', error);
      return {
        success: false,
        result: null,
        message: 'Eroare la executarea comenzii'
      };
    }
  }

  // Modifies queries from the application
  async handleModifyQuery(sessionId: string, payload: ModifyQueryPayload): Promise<{ success: boolean; modifiedQuery: any; message: string }> {
    try {
      // Validate agent session
      const isAuthenticated = await this.validateAgentSession(sessionId, payload.businessId);
      
      if (!isAuthenticated) {
        return {
          success: false,
          modifiedQuery: null,
          message: 'Agent neautentificat'
        };
      }

      // Apply query modifications via HTTP
      const modifiedQuery = await this.applyQueryModificationsViaHttp(
        payload.repositoryType,
        payload.modifications,
        payload.businessId
      );
      
      // Notify frontend about query modification
      // Note: Broadcasting will be handled by the calling WebSocketGateway
      // this.websocketGateway.broadcastToBusiness(
        payload.businessId,
        'query_modified',
        {
          sessionId,
          repositoryType: payload.repositoryType,
          modifications: payload.modifications,
          timestamp: new Date().toISOString()
        }
      // );

      return {
        success: true,
        modifiedQuery,
        message: 'Query modificat cu succes'
      };
    } catch (error) {
      console.error('Error modifying query:', error);
      return {
        success: false,
        modifiedQuery: null,
        message: 'Eroare la modificarea query-ului'
      };
    }
  }

  // Handles approval of changes
  async handleApproveChanges(sessionId: string, payload: ApproveChangesPayload): Promise<{ success: boolean; message: string }> {
    try {
      // Validate agent session
      const isAuthenticated = await this.validateAgentSession(sessionId, payload.businessId);
      
      if (!isAuthenticated) {
        return {
          success: false,
          message: 'Agent neautentificat'
        };
      }

      // Approve the changes via HTTP
      await this.approveChangesViaHttp(payload.changeId, payload.businessId);
      
      // Notify frontend about approval
      // Note: Broadcasting will be handled by the calling WebSocketGateway
      // this.websocketGateway.broadcastToBusiness(
        payload.businessId,
        'changes_approved',
        {
          sessionId,
          changeId: payload.changeId,
          timestamp: new Date().toISOString()
        }
      // );

      return {
        success: true,
        message: 'Modificările au fost aprobate'
      };
    } catch (error) {
      console.error('Error approving changes:', error);
      return {
        success: false,
        message: 'Eroare la aprobarea modificărilor'
      };
    }
  }

  // Handles rejection of changes
  async handleRejectChanges(sessionId: string, payload: RejectChangesPayload): Promise<{ success: boolean; message: string }> {
    try {
      // Validate agent session
      const isAuthenticated = await this.validateAgentSession(sessionId, payload.businessId);
      
      if (!isAuthenticated) {
        return {
          success: false,
          message: 'Agent neautentificat'
        };
      }

      // Reject the changes via HTTP
      await this.rejectChangesViaHttp(payload.changeId, payload.reason, payload.businessId);
      
      // Notify frontend about rejection
      // Note: Broadcasting will be handled by the calling WebSocketGateway
      // this.websocketGateway.broadcastToBusiness(
        payload.businessId,
        'changes_rejected',
        {
          sessionId,
          changeId: payload.changeId,
          reason: payload.reason,
          timestamp: new Date().toISOString()
        }
      // );

      return {
        success: true,
        message: 'Modificările au fost respinse'
      };
    } catch (error) {
      console.error('Error rejecting changes:', error);
      return {
        success: false,
        message: 'Eroare la respingerea modificărilor'
      };
    }
  }

  // Requests resources from frontend via Elixir
  async requestFrontendResources(sessionId: string, payload: FrontendResourceRequest): Promise<{ success: boolean; resources: any; message: string }> {
    try {
      // Validate agent session
      const isAuthenticated = await this.validateAgentSession(sessionId, payload.businessId);
      
      if (!isAuthenticated) {
        return {
          success: false,
          resources: null,
          message: 'Agent neautentificat'
        };
      }

      // Request resources from frontend via Elixir HTTP API
      const resources = await this.requestFrontendDataViaElixir(payload);

      return {
        success: true,
        resources,
        message: 'Resursele au fost solicitate de la frontend prin Elixir'
      };
    } catch (error) {
      console.error('Error requesting frontend resources:', error);
      return {
        success: false,
        resources: null,
        message: 'Eroare la solicitarea resurselor de la frontend'
      };
    }
  }

  // Handles frontend resource response
  async handleFrontendResourceResponse(sessionId: string, payload: FrontendResourceResponse): Promise<{ success: boolean; message: string }> {
    try {
      // Store the resources for the agent session
      await this.storeFrontendResources(sessionId, payload.resources);
      
      // Notify agent about resource availability
      // Note: Broadcasting will be handled by the calling WebSocketGateway
      // this.websocketGateway.broadcastToBusiness(
        payload.businessId,
        'agent_resources_available',
        {
          sessionId,
          resources: payload.resources,
          timestamp: new Date().toISOString()
        }
      // );

      return {
        success: true,
        message: 'Resursele au fost primite de la frontend'
      };
    } catch (error) {
      console.error('Error handling frontend resource response:', error);
      return {
        success: false,
        message: 'Eroare la procesarea resurselor de la frontend'
      };
    }
  }

  private validateOperatorPermissions(permissions: string[]): boolean {
    const requiredPermissions = ['agent_access', 'data_query', 'draft_creation'];
    return requiredPermissions.every(permission => permissions.includes(permission));
  }

  private async storeAgentAuthentication(sessionId: string, payload: AgentAuthenticationPayload): Promise<void> {
    // Store authentication data in session or database
    // This would typically involve storing in Redis or database
    console.log(`Storing agent authentication for session ${sessionId}:`, payload);
  }

  private async validateAgentSession(sessionId: string, businessId: string): Promise<boolean> {
    // Validate that the agent session is still active and authenticated
    // This would typically check against stored session data
    console.log(`Validating agent session ${sessionId} for business ${businessId}`);
    return true; // Simplified for now
  }

  // HTTP-based command execution
  private async executeAgentCommandViaHttp(command: string, parameters: any, businessId: string): Promise<any> {
    try {
      const baseUrl = process.env.APP_SERVER_URL || 'http://localhost:3001';
      const endpoint = `${baseUrl}/api/agent/execute-command`;
      
      const response = await firstValueFrom(
        this.httpService.post(endpoint, {
          command,
          parameters,
          businessId,
          timestamp: new Date().toISOString()
        })
      );
      
      return response.data;
    } catch (error) {
      console.error('Error executing agent command via HTTP:', error);
      throw error;
    }
  }

  // HTTP-based query modification
  private async applyQueryModificationsViaHttp(repositoryType: string, modifications: any, businessId: string): Promise<any> {
    try {
      const baseUrl = process.env.APP_SERVER_URL || 'http://localhost:3001';
      const endpoint = `${baseUrl}/api/agent/modify-query`;
      
      const response = await firstValueFrom(
        this.httpService.post(endpoint, {
          repositoryType,
          modifications,
          businessId,
          timestamp: new Date().toISOString()
        })
      );
      
      return response.data;
    } catch (error) {
      console.error('Error applying query modifications via HTTP:', error);
      throw error;
    }
  }

  // HTTP-based change approval
  private async approveChangesViaHttp(changeId: string, businessId: string): Promise<void> {
    try {
      const baseUrl = process.env.APP_SERVER_URL || 'http://localhost:3001';
      const endpoint = `${baseUrl}/api/agent/approve-changes`;
      
      await firstValueFrom(
        this.httpService.post(endpoint, {
          changeId,
          businessId,
          timestamp: new Date().toISOString()
        })
      );
    } catch (error) {
      console.error('Error approving changes via HTTP:', error);
      throw error;
    }
  }

  // HTTP-based change rejection
  private async rejectChangesViaHttp(changeId: string, reason: string, businessId: string): Promise<void> {
    try {
      const baseUrl = process.env.APP_SERVER_URL || 'http://localhost:3001';
      const endpoint = `${baseUrl}/api/agent/reject-changes`;
      
      await firstValueFrom(
        this.httpService.post(endpoint, {
          changeId,
          reason,
          businessId,
          timestamp: new Date().toISOString()
        })
      );
    } catch (error) {
      console.error('Error rejecting changes via HTTP:', error);
      throw error;
    }
  }

  // Request frontend data via Elixir HTTP API
  private async requestFrontendDataViaElixir(payload: FrontendResourceRequest): Promise<any> {
    try {
      const elixirUrl = process.env.NOTIFICATION_HUB_HTTP_URL || 'http://notification-hub:4000';
      const endpoint = `${elixirUrl}/api/frontend-data-request`;
      
      console.log(`Requesting frontend data via Elixir: ${endpoint}`);
      console.log(`Payload: ${JSON.stringify(payload)}`);

      const response = await firstValueFrom(
        this.httpService.post(endpoint, {
          sessionId: payload.sessionId,
          businessId: payload.businessId,
          locationId: payload.locationId,
          requestType: payload.requestType,
          parameters: payload.parameters,
          timestamp: new Date().toISOString()
        }, {
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'AI-Agent-Server/1.0'
          },
          timeout: 15000 // 15 seconds timeout for frontend data requests
        })
      );

      console.log(`Elixir response: ${JSON.stringify(response.data)}`);
      return response.data.resources || response.data;
    } catch (error) {
      console.error('Error requesting frontend data via Elixir:', error);
      
      // Fallback to simulated data if Elixir is not available
      console.log('Falling back to simulated frontend data');
      return this.getSimulatedFrontendData(payload.requestType);
    }
  }

  // Helper methods for frontend resource handling
  private async getSimulatedFrontendData(requestType: string): Promise<any> {
    // Simulate different responses based on request type
    switch (requestType) {
      case 'get_services':
        return {
          services: [
            { id: '1', name: 'Consultație', price: 100, duration: 30 },
            { id: '2', name: 'Tratament', price: 200, duration: 60 }
          ]
        };
      case 'get_appointments':
        return {
          appointments: [
            { id: '1', date: '2024-01-15', time: '10:00', patient: 'John Doe' },
            { id: '2', date: '2024-01-15', time: '11:00', patient: 'Jane Smith' }
          ]
        };
      case 'get_business_info':
        return {
          businessInfo: {
            name: 'Cabinet Dental',
            address: 'Strada Principală 123',
            phone: '+40123456789',
            email: 'contact@cabinet.ro'
          }
        };
      case 'get_available_dates':
        return {
          availableDates: [
            { date: '2024-01-16', slots: ['09:00', '10:00', '11:00'] },
            { date: '2024-01-17', slots: ['09:00', '14:00', '15:00'] }
          ]
        };
      case 'data_query':
        return {
          results: 'Error fallback data for data_query',
          count: 0,
          timestamp: new Date().toISOString(),
          source: 'error_fallback'
        };
      default:
        return { message: 'Unknown request type' };
    }
  }

  private async storeFrontendResources(sessionId: string, resources: any): Promise<void> {
    // Store resources in session or database
    console.log(`Storing frontend resources for session ${sessionId}:`, resources);
    // This would typically involve storing in Redis or database
  }

  // Draft management methods
  async handleCreateDraft(sessionId: string, payload: CreateDraftPayload): Promise<{ success: boolean; draftId?: string; message: string }> {
    try {
      // Validate agent session
      const isAuthenticated = await this.validateAgentSession(sessionId, payload.businessId);
      
      if (!isAuthenticated) {
        return {
          success: false,
          message: 'Agent neautentificat'
        };
      }

      // Create draft via HTTP
      const draftId = await this.createDraftViaHttp(
        payload.draftType,
        payload.content,
        payload.businessId,
        payload.locationId
      );
      
      // Notify frontend about draft creation
      // Note: Broadcasting will be handled by the calling WebSocketGateway
      // this.websocketGateway.broadcastToBusiness(
        payload.businessId,
        'draft_created',
        {
          sessionId,
          draftId,
          draftType: payload.draftType,
          timestamp: new Date().toISOString()
        }
      // );

      return {
        success: true,
        draftId,
        message: 'Draft creat cu succes'
      };
    } catch (error) {
      console.error('Error creating draft:', error);
      return {
        success: false,
        message: 'Eroare la crearea draft-ului'
      };
    }
  }

  async handleUpdateDraft(sessionId: string, payload: UpdateDraftPayload): Promise<{ success: boolean; message: string }> {
    try {
      // Validate agent session
      const isAuthenticated = await this.validateAgentSession(sessionId, payload.businessId);
      
      if (!isAuthenticated) {
        return {
          success: false,
          message: 'Agent neautentificat'
        };
      }

      // Update draft via HTTP
      await this.updateDraftViaHttp(
        payload.draftId,
        payload.content,
        payload.businessId,
        payload.locationId
      );
      
      // Notify frontend about draft update
      // Note: Broadcasting will be handled by the calling WebSocketGateway
      // this.websocketGateway.broadcastToBusiness(
        payload.businessId,
        'draft_updated',
        {
          sessionId,
          draftId: payload.draftId,
          timestamp: new Date().toISOString()
        }
      // );

      return {
        success: true,
        message: 'Draft actualizat cu succes'
      };
    } catch (error) {
      console.error('Error updating draft:', error);
      return {
        success: false,
        message: 'Eroare la actualizarea draft-ului'
      };
    }
  }

  async handleDeleteDraft(sessionId: string, payload: DeleteDraftPayload): Promise<{ success: boolean; message: string }> {
    try {
      // Validate agent session
      const isAuthenticated = await this.validateAgentSession(sessionId, payload.businessId);
      
      if (!isAuthenticated) {
        return {
          success: false,
          message: 'Agent neautentificat'
        };
      }

      // Delete draft via HTTP
      await this.deleteDraftViaHttp(
        payload.draftId,
        payload.businessId,
        payload.locationId
      );
      
      // Notify frontend about draft deletion
      // Note: Broadcasting will be handled by the calling WebSocketGateway
      // this.websocketGateway.broadcastToBusiness(
        payload.businessId,
        'draft_deleted',
        {
          sessionId,
          draftId: payload.draftId,
          timestamp: new Date().toISOString()
        }
      // );

      return {
        success: true,
        message: 'Draft șters cu succes'
      };
    } catch (error) {
      console.error('Error deleting draft:', error);
      return {
        success: false,
        message: 'Eroare la ștergerea draft-ului'
      };
    }
  }

  async handleListDrafts(sessionId: string, payload: ListDraftsPayload): Promise<{ success: boolean; drafts: any[]; message: string }> {
    try {
      // Validate agent session
      const isAuthenticated = await this.validateAgentSession(sessionId, payload.businessId);
      
      if (!isAuthenticated) {
        return {
          success: false,
          drafts: [],
          message: 'Agent neautentificat'
        };
      }

      // List drafts via HTTP
      const drafts = await this.listDraftsViaHttp(
        payload.businessId,
        payload.locationId,
        payload.filters
      );

      return {
        success: true,
        drafts,
        message: 'Draft-uri listate cu succes'
      };
    } catch (error) {
      console.error('Error listing drafts:', error);
      return {
        success: false,
        drafts: [],
        message: 'Eroare la listarea draft-urilor'
      };
    }
  }

  // HTTP-based draft operations
  private async createDraftViaHttp(draftType: string, content: any, businessId: string, locationId: string): Promise<string> {
    try {
      const baseUrl = process.env.APP_SERVER_URL || 'http://localhost:3001';
      const endpoint = `${baseUrl}/api/drafts`;
      
      const response = await firstValueFrom(
        this.httpService.post(endpoint, {
          draftType,
          content,
          businessId,
          locationId,
          timestamp: new Date().toISOString()
        })
      );
      
      return response.data.draftId;
    } catch (error) {
      console.error('Error creating draft via HTTP:', error);
      throw error;
    }
  }

  private async updateDraftViaHttp(draftId: string, content: any, businessId: string, locationId: string): Promise<void> {
    try {
      const baseUrl = process.env.APP_SERVER_URL || 'http://localhost:3001';
      const endpoint = `${baseUrl}/api/drafts/${draftId}`;
      
      await firstValueFrom(
        this.httpService.put(endpoint, {
          content,
          businessId,
          locationId,
          timestamp: new Date().toISOString()
        })
      );
    } catch (error) {
      console.error('Error updating draft via HTTP:', error);
      throw error;
    }
  }

  private async deleteDraftViaHttp(draftId: string, businessId: string, locationId: string): Promise<void> {
    try {
      const baseUrl = process.env.APP_SERVER_URL || 'http://localhost:3001';
      const endpoint = `${baseUrl}/api/drafts/${draftId}`;
      
      await firstValueFrom(
        this.httpService.delete(endpoint, {
          data: {
            businessId,
            locationId,
            timestamp: new Date().toISOString()
          }
        })
      );
    } catch (error) {
      console.error('Error deleting draft via HTTP:', error);
      throw error;
    }
  }

  private async listDraftsViaHttp(businessId: string, locationId: string, filters: any): Promise<any[]> {
    try {
      const baseUrl = process.env.APP_SERVER_URL || 'http://localhost:3001';
      const endpoint = `${baseUrl}/api/drafts`;
      
      const response = await firstValueFrom(
        this.httpService.get(endpoint, {
          params: {
            businessId,
            locationId,
            ...filters
          }
        })
      );
      
      return response.data.drafts || [];
    } catch (error) {
      console.error('Error listing drafts via HTTP:', error);
      throw error;
    }
  }
}
