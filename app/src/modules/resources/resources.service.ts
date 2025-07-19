import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  StandardResponse,
  PaginationInfo,
  MetaInfo,
  ErrorInfo,
} from './dto/standard-response.dto';
import { citrusShardingService } from '../../config/citrus-sharding.config';
import { ResourceModelService } from './services/resource-model.service';
import { BusinessType } from './models/unified-data-types';
import { ResourcePermissionsService, UserContext, ResourceAction } from './services/resource-permissions.service';

interface ResourceRequestParams {
  businessId: string;
  locationId: string;
  resourceType: string;
  page?: number;
  limit?: number;
  filters?: Record<string, any>;
  operation?: string;
  data?: any;
  user?: UserContext; // User context for permission checking
}

@Injectable()
export class ResourcesService {
  
  constructor(
    private readonly resourceModelService: ResourceModelService,
    private readonly resourcePermissionsService: ResourcePermissionsService,
  ) {}

  async getResources(params: ResourceRequestParams): Promise<StandardResponse> {
    try {
      const {
        businessId,
        locationId,
        resourceType,
        page = 1,
        limit = 20,
        filters = {},
        user,
      } = params;

      // Validate required parameters
      this.validateRequiredParams(businessId, locationId, resourceType);

      // Get business type for permission checking and resource organization
      const businessType = await this.getBusinessType(businessId, locationId);

      // Check permissions if user context is provided
      if (user) {
        await this.resourcePermissionsService.validatePermission(
          user,
          businessType,
          resourceType,
          'list',
        );
      }

      // Get shard connection for this business-location combination
      const shardConnection = await citrusShardingService.getShardForBusiness(businessId, locationId);
      console.log(`Using shard ${shardConnection.shardId} for business ${businessId} location ${locationId}`);

      let result: any;
      let total = 0;
      let items: any[] = [];

      switch (resourceType) {
        case 'timeline':
          result = await this.getTimelineResources(
            businessId,
            locationId,
            filters,
            page,
            limit,
            shardConnection,
          );
          break;
        case 'clients':
          result = await this.getClientsResources(
            businessId,
            locationId,
            filters,
            page,
            limit,
            shardConnection,
          );
          break;
        case 'members':
          result = await this.getMembersResources(
            businessId,
            locationId,
            filters,
            page,
            limit,
            shardConnection,
          );
          break;
        case 'services':
          result = await this.getServicesResources(
            businessId,
            locationId,
            filters,
            page,
            limit,
            shardConnection,
          );
          break;
        case 'packages':
          result = await this.getPackagesResources(
            businessId,
            locationId,
            filters,
            page,
            limit,
            shardConnection,
          );
          break;
        case 'rooms':
          result = await this.getRoomsResources(
            businessId,
            locationId,
            filters,
            page,
            limit,
            shardConnection,
          );
          break;
        case 'products':
          result = await this.getProductsResources(
            businessId,
            locationId,
            filters,
            page,
            limit,
            shardConnection,
          );
          break;
        case 'sales':
          result = await this.getSalesResources(
            businessId,
            locationId,
            filters,
            page,
            limit,
            shardConnection,
          );
          break;
        case 'stocks':
          result = await this.getStocksResources(
            businessId,
            locationId,
            filters,
            page,
            limit,
            shardConnection,
          );
          break;
        case 'invoices':
          result = await this.getInvoicesResources(
            businessId,
            locationId,
            filters,
            page,
            limit,
            shardConnection,
          );
          break;
        case 'activities':
          result = await this.getActivitiesResources(
            businessId,
            locationId,
            filters,
            page,
            limit,
            shardConnection,
          );
          break;
        case 'reports':
          result = await this.getReportsResources(
            businessId,
            locationId,
            filters,
            page,
            limit,
            shardConnection,
          );
          break;
        case 'workflows':
          result = await this.getWorkflowsResources(
            businessId,
            locationId,
            filters,
            page,
            limit,
            shardConnection,
          );
          break;
        case 'permissions':
          result = await this.getPermissionsResources(
            businessId,
            locationId,
            filters,
            page,
            limit,
            shardConnection,
          );
          break;
        case 'userData':
          result = await this.getUserDataResources(
            businessId,
            locationId,
            filters,
            page,
            limit,
            shardConnection,
          );
          break;
        case 'history':
          result = await this.getHistoryResources(
            businessId,
            locationId,
            filters,
            page,
            limit,
            shardConnection,
          );
          break;
        default:
          throw new BadRequestException(
            `Unknown resource type: ${resourceType}`,
          );
      }

      items = result.items || result;
      total = result.total || items.length;

      const pagination: PaginationInfo = {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      };

      const meta: MetaInfo = {
        businessId,
        locationId,
        resourceType,
        timestamp: new Date().toISOString(),
      };

      return {
        success: true,
        data: {
          items,
          pagination,
          filters,
        },
        meta,
      };
    } catch (error) {
      return this.handleError(error, params);
    }
  }

  async createResource(
    params: ResourceRequestParams,
  ): Promise<StandardResponse> {
    try {
      const { businessId, locationId, resourceType, data } = params;
      let result: any;

      switch (resourceType) {
        case 'timeline':
          result = await this.createTimelineResource(
            businessId,
            locationId,
            data,
          );
          break;
        case 'clients':
          result = await this.createClientsResource(
            businessId,
            locationId,
            data,
          );
          break;
        case 'members':
          result = await this.createMembersResource(
            businessId,
            locationId,
            data,
          );
          break;
        case 'services':
          result = await this.createServicesResource(
            businessId,
            locationId,
            data,
          );
          break;
        case 'packages':
          result = await this.createPackagesResource(
            businessId,
            locationId,
            data,
          );
          break;
        case 'rooms':
          result = await this.createRoomsResource(businessId, locationId, data);
          break;
        case 'products':
          result = await this.createProductsResource(
            businessId,
            locationId,
            data,
          );
          break;
        case 'sales':
          result = await this.createSalesResource(businessId, locationId, data);
          break;
        case 'stocks':
          result = await this.createStocksResource(
            businessId,
            locationId,
            data,
          );
          break;
        case 'invoices':
          result = await this.createInvoicesResource(
            businessId,
            locationId,
            data,
          );
          break;
        case 'activities':
          result = await this.createActivitiesResource(
            businessId,
            locationId,
            data,
          );
          break;
        default:
          throw new BadRequestException(
            `Resource type ${resourceType} does not support creation`,
          );
      }

      const meta: MetaInfo = {
        businessId,
        locationId,
        resourceType,
        timestamp: new Date().toISOString(),
        operation: 'create',
      };

      return {
        success: true,
        data: {
          id: result.id,
          createdAt: result.createdAt || new Date().toISOString(),
          updatedAt: result.updatedAt || new Date().toISOString(),
          ...result,
        },
        meta,
      };
    } catch (error) {
      return this.handleError(error, params);
    }
  }

  async updateResource(
    params: ResourceRequestParams,
  ): Promise<StandardResponse> {
    try {
      const { businessId, locationId, resourceType, data } = params;
      let result: any;

      switch (resourceType) {
        case 'timeline':
          result = await this.updateTimelineResource(
            businessId,
            locationId,
            data,
          );
          break;
        case 'clients':
          result = await this.updateClientsResource(
            businessId,
            locationId,
            data,
          );
          break;
        case 'members':
          result = await this.updateMembersResource(
            businessId,
            locationId,
            data,
          );
          break;
        case 'services':
          result = await this.updateServicesResource(
            businessId,
            locationId,
            data,
          );
          break;
        case 'packages':
          result = await this.updatePackagesResource(
            businessId,
            locationId,
            data,
          );
          break;
        case 'rooms':
          result = await this.updateRoomsResource(businessId, locationId, data);
          break;
        case 'products':
          result = await this.updateProductsResource(
            businessId,
            locationId,
            data,
          );
          break;
        case 'sales':
          result = await this.updateSalesResource(businessId, locationId, data);
          break;
        case 'stocks':
          result = await this.updateStocksResource(
            businessId,
            locationId,
            data,
          );
          break;
        case 'invoices':
          result = await this.updateInvoicesResource(
            businessId,
            locationId,
            data,
          );
          break;
        default:
          throw new BadRequestException(
            `Resource type ${resourceType} does not support updates`,
          );
      }

      const meta: MetaInfo = {
        businessId,
        locationId,
        resourceType,
        timestamp: new Date().toISOString(),
        operation: 'update',
      };

      return {
        success: true,
        data: {
          id: result.id,
          updatedAt: new Date().toISOString(),
          ...result,
        },
        meta,
      };
    } catch (error) {
      return this.handleError(error, params);
    }
  }

  async patchResource(
    params: ResourceRequestParams,
  ): Promise<StandardResponse> {
    // For now, patch will behave the same as update
    return this.updateResource({ ...params, operation: 'patch' });
  }

  async deleteResource(
    params: ResourceRequestParams,
  ): Promise<StandardResponse> {
    try {
      const { businessId, locationId, resourceType } = params;
      let result: any;

      switch (resourceType) {
        case 'timeline':
          result = await this.deleteTimelineResource(businessId, locationId);
          break;
        case 'clients':
          result = await this.deleteClientsResource(businessId, locationId);
          break;
        case 'members':
          result = await this.deleteMembersResource(businessId, locationId);
          break;
        case 'services':
          result = await this.deleteServicesResource(businessId, locationId);
          break;
        case 'packages':
          result = await this.deletePackagesResource(businessId, locationId);
          break;
        case 'rooms':
          result = await this.deleteRoomsResource(businessId, locationId);
          break;
        case 'products':
          result = await this.deleteProductsResource(businessId, locationId);
          break;
        case 'sales':
          result = await this.deleteSalesResource(businessId, locationId);
          break;
        case 'stocks':
          result = await this.deleteStocksResource(businessId, locationId);
          break;
        case 'invoices':
          result = await this.deleteInvoicesResource(businessId, locationId);
          break;
        default:
          throw new BadRequestException(
            `Resource type ${resourceType} does not support deletion`,
          );
      }

      const meta: MetaInfo = {
        businessId,
        locationId,
        resourceType,
        timestamp: new Date().toISOString(),
        operation: 'delete',
      };

      return {
        success: true,
        data: result,
        meta,
      };
    } catch (error) {
      return this.handleError(error, params);
    }
  }

  // Mock implementations for all resource types
  private async getTimelineResources(
    businessId: string,
    locationId: string,
    filters: any,
    page: number,
    limit: number,
    shardConnection: any,
  ) {
    const mockAppointments = [
      {
        id: '1',
        patientId: 'patient-1',
        dentistId: 'dentist-1',
        appointmentDate: '2024-01-15T10:00:00Z',
        duration: 60,
        status: 'scheduled',
        notes: 'Regular checkup',
      },
    ];
    return { items: mockAppointments, total: mockAppointments.length };
  }

  private async getClientsResources(
    businessId: string,
    locationId: string,
    filters: any,
    page: number,
    limit: number,
    shardConnection: any,
  ) {
    const mockClients = [
      {
        id: '1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        status: 'active',
      },
    ];
    return { items: mockClients, total: mockClients.length };
  }

  private async getMembersResources(
    businessId: string,
    locationId: string,
    filters: any,
    page: number,
    limit: number,
    shardConnection: any,
  ) {
    const mockMembers = [
      {
        id: '1',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        membershipType: 'monthly',
        status: 'active',
      },
    ];
    return { items: mockMembers, total: mockMembers.length };
  }

  private async getServicesResources(
    businessId: string,
    locationId: string,
    filters: any,
    page: number,
    limit: number,
    shardConnection: any,
  ) {
    const mockServices = [
      {
        id: '1',
        name: 'Dental Cleaning',
        description: 'Professional dental cleaning',
        duration: 30,
        price: 100,
        category: 'treatment',
        active: true,
      },
    ];
    return { items: mockServices, total: mockServices.length };
  }

  private async getPackagesResources(
    businessId: string,
    locationId: string,
    filters: any,
    page: number,
    limit: number,
    shardConnection: any,
  ) {
    const mockPackages = [
      {
        id: '1',
        name: 'Monthly Membership',
        description: 'Basic monthly gym membership',
        price: 50,
        duration: 30,
        category: 'membership',
        active: true,
      },
    ];
    return { items: mockPackages, total: mockPackages.length };
  }

  private async getRoomsResources(
    businessId: string,
    locationId: string,
    filters: any,
    page: number,
    limit: number,
    shardConnection: any,
  ) {
    const mockRooms = [
      {
        id: '1',
        number: '101',
        type: 'single',
        floor: 1,
        price: 100,
        status: 'available',
        capacity: 2,
      },
    ];
    return { items: mockRooms, total: mockRooms.length };
  }

  private async getProductsResources(
    businessId: string,
    locationId: string,
    filters: any,
    page: number,
    limit: number,
    shardConnection: any,
  ) {
    const mockProducts = [
      {
        id: '1',
        name: 'Product A',
        description: 'Sample product',
        price: 50,
        category: 'electronics',
        sku: 'PROD001',
        stock: 100,
        active: true,
      },
    ];
    return { items: mockProducts, total: mockProducts.length };
  }

  private async getSalesResources(
    businessId: string,
    locationId: string,
    filters: any,
    page: number,
    limit: number,
    shardConnection: any,
  ) {
    const mockSales = [
      {
        id: '1',
        customerId: 'customer-1',
        total: 200,
        status: 'completed',
        date: '2024-01-15',
        items: [{ productId: 'prod-1', quantity: 2, price: 100 }],
      },
    ];
    return { items: mockSales, total: mockSales.length };
  }

  private async getStocksResources(
    businessId: string,
    locationId: string,
    filters: any,
    page: number,
    limit: number,
    shardConnection: any,
  ) {
    const mockStocks = [
      {
        id: '1',
        name: 'Stock Item A',
        description: 'Sample stock item',
        category: 'supplies',
        quantity: 50,
        minQuantity: 10,
        unit: 'pieces',
        price: 5,
      },
    ];
    return { items: mockStocks, total: mockStocks.length };
  }

  private async getInvoicesResources(
    businessId: string,
    locationId: string,
    filters: any,
    page: number,
    limit: number,
    shardConnection: any,
  ) {
    const mockInvoices = [
      {
        id: '1',
        customerId: 'customer-1',
        total: 100,
        status: 'paid',
        dueDate: '2024-02-15',
        items: [{ description: 'Service', quantity: 1, price: 100 }],
      },
    ];
    return { items: mockInvoices, total: mockInvoices.length };
  }

  private async getActivitiesResources(
    businessId: string,
    locationId: string,
    filters: any,
    page: number,
    limit: number,
    shardConnection: any,
  ) {
    const mockActivities = [
      {
        id: '1',
        type: 'action',
        action: 'create_client',
        userId: 'user-1',
        details: { clientId: 'client-1' },
        timestamp: '2024-01-15T10:00:00Z',
      },
    ];
    return { items: mockActivities, total: mockActivities.length };
  }

  private async getReportsResources(
    businessId: string,
    locationId: string,
    filters: any,
    page: number,
    limit: number,
    shardConnection: any,
  ) {
    const mockReports = [
      {
        id: '1',
        type: 'daily',
        date: '2024-01-15',
        metrics: { revenue: 1000, clients: 10, appointments: 5 },
      },
    ];
    return { items: mockReports, total: mockReports.length };
  }

  private async getWorkflowsResources(
    businessId: string,
    locationId: string,
    filters: any,
    page: number,
    limit: number,
    shardConnection: any,
  ) {
    const mockWorkflows = [
      {
        id: '1',
        name: 'Patient Follow-up',
        description: 'Automated follow-up workflow for patients',
        status: 'active',
        steps: [
          { type: 'email', delay: '1d', template: 'follow-up' },
          { type: 'sms', delay: '3d', template: 'reminder' }
        ],
        createdBy: 'admin-1',
        createdAt: '2024-01-15T10:00:00Z',
      },
    ];
    return { items: mockWorkflows, total: mockWorkflows.length };
  }

  private async getPermissionsResources(
    businessId: string,
    locationId: string,
    filters: any,
    page: number,
    limit: number,
    shardConnection: any,
  ) {
    const mockPermissions = [
      {
        id: '1',
        name: 'manage_clients',
        displayName: 'Manage Clients',
        description: 'Permission to create, read, update, and delete clients',
        resourceName: 'clients',
        actions: ['create', 'read', 'update', 'delete', 'list'],
        active: true,
        isSystemPermission: true,
      },
    ];
    return { items: mockPermissions, total: mockPermissions.length };
  }

  private async getUserDataResources(
    businessId: string,
    locationId: string,
    filters: any,
    page: number,
    limit: number,
    shardConnection: any,
  ) {
    const mockUserData = [
      {
        id: '1',
        userId: 'user-1',
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@example.com',
        roles: ['admin'],
        permissions: ['manage_all'],
        status: 'active',
        lastLogin: '2024-01-15T09:00:00Z',
        createdAt: '2024-01-01T00:00:00Z',
      },
    ];
    return { items: mockUserData, total: mockUserData.length };
  }

  private async getHistoryResources(
    businessId: string,
    locationId: string,
    filters: any,
    page: number,
    limit: number,
    shardConnection: any,
  ) {
    const mockHistory = [
      {
        id: '1',
        type: 'action',
        action: 'create_client',
        userId: 'user-1',
        entityType: 'clients',
        entityId: 'client-1',
        entityName: 'John Doe',
        description: 'Created new client: John Doe',
        timestamp: '2024-01-15T10:00:00Z',
        status: 'success',
      },
    ];
    return { items: mockHistory, total: mockHistory.length };
  }

  // Mock CREATE implementations
  private async createTimelineResource(
    businessId: string,
    locationId: string,
    data: any,
  ) {
    return {
      id: `timeline-${Date.now()}`,
      ...data,
      createdAt: new Date().toISOString(),
    };
  }

  private async createClientsResource(
    businessId: string,
    locationId: string,
    data: any,
  ) {
    return {
      id: `client-${Date.now()}`,
      ...data,
      createdAt: new Date().toISOString(),
    };
  }

  private async createMembersResource(
    businessId: string,
    locationId: string,
    data: any,
  ) {
    return {
      id: `member-${Date.now()}`,
      ...data,
      createdAt: new Date().toISOString(),
    };
  }

  private async createServicesResource(
    businessId: string,
    locationId: string,
    data: any,
  ) {
    return {
      id: `service-${Date.now()}`,
      ...data,
      createdAt: new Date().toISOString(),
    };
  }

  private async createPackagesResource(
    businessId: string,
    locationId: string,
    data: any,
  ) {
    return {
      id: `package-${Date.now()}`,
      ...data,
      createdAt: new Date().toISOString(),
    };
  }

  private async createRoomsResource(
    businessId: string,
    locationId: string,
    data: any,
  ) {
    return {
      id: `room-${Date.now()}`,
      ...data,
      createdAt: new Date().toISOString(),
    };
  }

  private async createProductsResource(
    businessId: string,
    locationId: string,
    data: any,
  ) {
    return {
      id: `product-${Date.now()}`,
      ...data,
      createdAt: new Date().toISOString(),
    };
  }

  private async createSalesResource(
    businessId: string,
    locationId: string,
    data: any,
  ) {
    return {
      id: `sale-${Date.now()}`,
      ...data,
      createdAt: new Date().toISOString(),
    };
  }

  private async createStocksResource(
    businessId: string,
    locationId: string,
    data: any,
  ) {
    return {
      id: `stock-${Date.now()}`,
      ...data,
      createdAt: new Date().toISOString(),
    };
  }

  private async createInvoicesResource(
    businessId: string,
    locationId: string,
    data: any,
  ) {
    return {
      id: `invoice-${Date.now()}`,
      ...data,
      createdAt: new Date().toISOString(),
    };
  }

  private async createActivitiesResource(
    businessId: string,
    locationId: string,
    data: any,
  ) {
    return {
      id: `activity-${Date.now()}`,
      ...data,
      createdAt: new Date().toISOString(),
    };
  }

  // Mock UPDATE implementations
  private async updateTimelineResource(
    businessId: string,
    locationId: string,
    data: any,
  ) {
    return { ...data, updatedAt: new Date().toISOString() };
  }

  private async updateClientsResource(
    businessId: string,
    locationId: string,
    data: any,
  ) {
    return { ...data, updatedAt: new Date().toISOString() };
  }

  private async updateMembersResource(
    businessId: string,
    locationId: string,
    data: any,
  ) {
    return { ...data, updatedAt: new Date().toISOString() };
  }

  private async updateServicesResource(
    businessId: string,
    locationId: string,
    data: any,
  ) {
    return { ...data, updatedAt: new Date().toISOString() };
  }

  private async updatePackagesResource(
    businessId: string,
    locationId: string,
    data: any,
  ) {
    return { ...data, updatedAt: new Date().toISOString() };
  }

  private async updateRoomsResource(
    businessId: string,
    locationId: string,
    data: any,
  ) {
    return { ...data, updatedAt: new Date().toISOString() };
  }

  private async updateProductsResource(
    businessId: string,
    locationId: string,
    data: any,
  ) {
    return { ...data, updatedAt: new Date().toISOString() };
  }

  private async updateSalesResource(
    businessId: string,
    locationId: string,
    data: any,
  ) {
    return { ...data, updatedAt: new Date().toISOString() };
  }

  private async updateStocksResource(
    businessId: string,
    locationId: string,
    data: any,
  ) {
    return { ...data, updatedAt: new Date().toISOString() };
  }

  private async updateInvoicesResource(
    businessId: string,
    locationId: string,
    data: any,
  ) {
    return { ...data, updatedAt: new Date().toISOString() };
  }

  // Mock DELETE implementations
  private async deleteTimelineResource(businessId: string, locationId: string) {
    return { deleted: true, deletedAt: new Date().toISOString() };
  }

  private async deleteClientsResource(businessId: string, locationId: string) {
    return { deleted: true, deletedAt: new Date().toISOString() };
  }

  private async deleteMembersResource(businessId: string, locationId: string) {
    return { deleted: true, deletedAt: new Date().toISOString() };
  }

  private async deleteServicesResource(businessId: string, locationId: string) {
    return { deleted: true, deletedAt: new Date().toISOString() };
  }

  private async deletePackagesResource(businessId: string, locationId: string) {
    return { deleted: true, deletedAt: new Date().toISOString() };
  }

  private async deleteRoomsResource(businessId: string, locationId: string) {
    return { deleted: true, deletedAt: new Date().toISOString() };
  }

  private async deleteProductsResource(businessId: string, locationId: string) {
    return { deleted: true, deletedAt: new Date().toISOString() };
  }

  private async deleteSalesResource(businessId: string, locationId: string) {
    return { deleted: true, deletedAt: new Date().toISOString() };
  }

  private async deleteStocksResource(businessId: string, locationId: string) {
    return { deleted: true, deletedAt: new Date().toISOString() };
  }

  private async deleteInvoicesResource(businessId: string, locationId: string) {
    return { deleted: true, deletedAt: new Date().toISOString() };
  }

  private handleError(
    error: any,
    params: ResourceRequestParams,
  ): StandardResponse {
    const errorInfo: ErrorInfo = {
      code: error.name || 'UNKNOWN_ERROR',
      message: error.message || 'An unknown error occurred',
    };

    const meta: MetaInfo = {
      businessId: params.businessId,
      locationId: params.locationId,
      resourceType: params.resourceType,
      timestamp: new Date().toISOString(),
      operation: params.operation,
    };

    return {
      success: false,
      error: errorInfo,
      meta,
    };
  }

  private validateRequiredParams(businessId: string, locationId: string, resourceType: string) {
    if (!businessId || !locationId) {
      throw new BadRequestException('Business ID and Location ID are required.');
    }
    if (!resourceType) {
      throw new BadRequestException('Resource type is required.');
    }
  }

  /**
   * Get business type from business info
   */
  private async getBusinessType(businessId: string, locationId: string): Promise<BusinessType> {
    // Mock implementation - in real system would query business info service
    // For now, infer from business ID pattern or fetch from business info service
    const businessIdLower = businessId.toLowerCase();
    
    if (businessIdLower.includes('dental') || businessIdLower.includes('clinic')) {
      return 'dental';
    } else if (businessIdLower.includes('gym') || businessIdLower.includes('fitness')) {
      return 'gym';
    } else if (businessIdLower.includes('hotel') || businessIdLower.includes('resort')) {
      return 'hotel';
    }
    
    // Default to dental for unknown business types
    return 'dental';
  }
}
