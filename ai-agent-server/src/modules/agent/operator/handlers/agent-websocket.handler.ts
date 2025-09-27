import { Injectable } from '@nestjs/common';
import { WebSocketGateway } from '../../../websocket/websocket.gateway';
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
}

export interface ModifyQueryPayload {
  sessionId: string;
  repositoryType: string;
  modifications: any;
  businessId: string;
}

export interface ApproveChangesPayload {
  sessionId: string;
  changeId: string;
  businessId: string;
}

export interface RejectChangesPayload {
  sessionId: string;
  changeId: string;
  reason: string;
  businessId: string;
}

export interface FrontendResourceRequest {
  sessionId: string;
  requestType: 'get_services' | 'get_appointments' | 'get_business_info' | 'get_available_dates';
  parameters: any;
  businessId: string;
}

export interface FrontendResourceResponse {
  sessionId: string;
  resources: any;
  businessId: string;
}

@Injectable()
export class AgentWebSocketHandler {
  constructor(
    private readonly websocketGateway: WebSocketGateway,
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
      
      // Notify frontend about agent authentication
      this.websocketGateway.broadcastToBusiness(
        payload.businessId,
        'agent_authenticated',
        {
          sessionId,
          operatorId: payload.operatorId,
          timestamp: new Date().toISOString()
        }
      );

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
      
      // Notify frontend about command execution
      this.websocketGateway.broadcastToBusiness(
        payload.businessId,
        'agent_command_executed',
        {
          sessionId,
          command: payload.command,
          result,
          timestamp: new Date().toISOString()
        }
      );

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
      this.websocketGateway.broadcastToBusiness(
        payload.businessId,
        'query_modified',
        {
          sessionId,
          repositoryType: payload.repositoryType,
          modifications: payload.modifications,
          timestamp: new Date().toISOString()
        }
      );

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
      this.websocketGateway.broadcastToBusiness(
        payload.businessId,
        'changes_approved',
        {
          sessionId,
          changeId: payload.changeId,
          timestamp: new Date().toISOString()
        }
      );

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
      this.websocketGateway.broadcastToBusiness(
        payload.businessId,
        'changes_rejected',
        {
          sessionId,
          changeId: payload.changeId,
          reason: payload.reason,
          timestamp: new Date().toISOString()
        }
      );

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

  // Requests resources from frontend
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

      // Request resources from frontend via WebSocket
      this.websocketGateway.broadcastToBusiness(
        payload.businessId,
        'agent_request_resources',
        {
          sessionId,
          requestType: payload.requestType,
          parameters: payload.parameters,
          timestamp: new Date().toISOString()
        }
      );

      // Wait for frontend response (this would typically be handled asynchronously)
      // For now, we'll simulate a response
      const resources = await this.waitForFrontendResponse(sessionId, payload.requestType);

      return {
        success: true,
        resources,
        message: 'Resursele au fost solicitate de la frontend'
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
      this.websocketGateway.broadcastToBusiness(
        payload.businessId,
        'agent_resources_available',
        {
          sessionId,
          resources: payload.resources,
          timestamp: new Date().toISOString()
        }
      );

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

  // Helper methods for frontend resource handling
  private async waitForFrontendResponse(sessionId: string, requestType: string): Promise<any> {
    // This would typically implement a proper async wait mechanism
    // For now, we'll simulate a response based on request type
    console.log(`Waiting for frontend response for session ${sessionId}, request type: ${requestType}`);
    
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
      default:
        return { message: 'Unknown request type' };
    }
  }

  private async storeFrontendResources(sessionId: string, resources: any): Promise<void> {
    // Store resources in session or database
    console.log(`Storing frontend resources for session ${sessionId}:`, resources);
    // This would typically involve storing in Redis or database
  }
}
