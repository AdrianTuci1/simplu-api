import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Headers,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ResourcesService } from './resources.service';
import { ResourceQueryService, ResourceQuery } from './services/resource-query.service';
import { StatisticsService } from './services/statistics.service';
import { ResourceType } from './types/base-resource';

// Simplified request interface - just the data
interface ResourceDataRequest {
  data: Record<string, any>; // The actual resource data
}

interface StandardResponse {
  success: boolean;
  message: string;
  requestId: string;
  timestamp: string;
}

@ApiTags('Resources')
@Controller('resources')
export class ResourcesController {
  constructor(
    private readonly resourcesService: ResourcesService,
    private readonly resourceQueryService: ResourceQueryService,
    private readonly statisticsService: StatisticsService,
  ) { }

  @Post(':businessId-:locationId')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Create resource - sends to stream for processing' })
  @ApiResponse({ status: 202, description: 'Request accepted and sent to stream' })
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  @ApiParam({ name: 'locationId', description: 'Location ID' })
  @ApiHeader({ name: 'X-Resource-Type', required: true, description: 'Resource type' })
  async createResource(
    @Param('businessId') businessId: string,
    @Param('locationId') locationId: string,
    @Body() resourceRequest: ResourceDataRequest,
    @Headers('X-Resource-Type') resourceType: ResourceType,
  ): Promise<StandardResponse> {
    return this.resourcesService.processResourceOperation({
      operation: 'create',
      businessId,
      locationId,
      resourceType,
      data: resourceRequest.data,
    });
  }

  @Post(':businessId-:locationId/query')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Create resource with query parameter - sends to stream for processing' })
  @ApiResponse({ status: 202, description: 'Request accepted and sent to stream' })
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  @ApiParam({ name: 'locationId', description: 'Location ID' })
  @ApiQuery({ name: 'X-Resource-Type', required: true, description: 'Resource type' })
  async createResourceWithQuery(
    @Param('businessId') businessId: string,
    @Param('locationId') locationId: string,
    @Body() resourceRequest: ResourceDataRequest,
    @Query('X-Resource-Type') resourceType: ResourceType,
  ): Promise<StandardResponse> {
    return this.resourcesService.processResourceOperation({
      operation: 'create',
      businessId,
      locationId,
      resourceType,
      data: resourceRequest.data,
    });
  }

  @Put(':businessId-:locationId/:resourceId')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Update resource - sends to stream for processing' })
  @ApiResponse({ status: 202, description: 'Request accepted and sent to stream' })
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  @ApiParam({ name: 'locationId', description: 'Location ID' })
  @ApiParam({ name: 'resourceId', description: 'Resource ID' })
  @ApiHeader({ name: 'X-Resource-Type', required: true, description: 'Resource type' })
  async updateResource(
    @Param('businessId') businessId: string,
    @Param('locationId') locationId: string,
    @Param('resourceId') resourceId: string,
    @Body() resourceRequest: ResourceDataRequest,
    @Headers('X-Resource-Type') resourceType: ResourceType,
  ): Promise<StandardResponse> {
    return this.resourcesService.processResourceOperation({
      operation: 'update',
      businessId,
      locationId,
      resourceType,
      resourceId,
      data: resourceRequest.data,
    });
  }

  @Patch(':businessId-:locationId/:resourceId')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Patch resource - sends to stream for processing' })
  @ApiResponse({ status: 202, description: 'Request accepted and sent to stream' })
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  @ApiParam({ name: 'locationId', description: 'Location ID' })
  @ApiParam({ name: 'resourceId', description: 'Resource ID' })
  @ApiHeader({ name: 'X-Resource-Type', required: true, description: 'Resource type' })
  async patchResource(
    @Param('businessId') businessId: string,
    @Param('locationId') locationId: string,
    @Param('resourceId') resourceId: string,
    @Body() resourceRequest: ResourceDataRequest,
    @Headers('X-Resource-Type') resourceType: ResourceType,
  ): Promise<StandardResponse> {
    return this.resourcesService.processResourceOperation({
      operation: 'patch',
      businessId,
      locationId,
      resourceType,
      resourceId,
      data: resourceRequest.data,
    });
  }

  @Delete(':businessId-:locationId/:resourceId')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Delete resource - sends to stream for processing' })
  @ApiResponse({ status: 202, description: 'Request accepted and sent to stream' })
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  @ApiParam({ name: 'locationId', description: 'Location ID' })
  @ApiParam({ name: 'resourceId', description: 'Resource ID' })
  @ApiHeader({ name: 'X-Resource-Type', required: true, description: 'Resource type' })
  async deleteResource(
    @Param('businessId') businessId: string,
    @Param('locationId') locationId: string,
    @Param('resourceId') resourceId: string,
    @Headers('X-Resource-Type') resourceType: ResourceType,
  ): Promise<StandardResponse> {
    return this.resourcesService.processResourceOperation({
      operation: 'delete',
      businessId,
      locationId,
      resourceType,
      resourceId,
    });
  }

  // GET endpoints - read directly from database (RDS or Citrus)

  @Get(':businessId-:locationId/:resourceId')
  @ApiOperation({ summary: 'Get specific resource by ID - reads from database' })
  @ApiResponse({ status: 200, description: 'Resource retrieved successfully' })
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  @ApiParam({ name: 'locationId', description: 'Location ID' })
  @ApiParam({ name: 'resourceId', description: 'Resource ID' })
  @ApiHeader({ name: 'X-Resource-Type', required: true, description: 'Resource type' })
  async getResourceById(
    @Param('businessId') businessId: string,
    @Param('locationId') locationId: string,
    @Param('resourceId') resourceId: string,
    @Headers('X-Resource-Type') resourceType: ResourceType,
  ) {
    const resource = await this.resourceQueryService.getResourceById(
      businessId,
      locationId,
      resourceType,
      resourceId,
    );

    if (!resource) {
      return {
        success: false,
        message: 'Resource not found',
        meta: {
          businessId,
          locationId,
          resourceType,
          resourceId,
          timestamp: new Date().toISOString(),
          operation: 'read',
        },
      };
    }

    return {
      success: true,
      data: resource,
      meta: {
        businessId,
        locationId,
        resourceType,
        resourceId,
        timestamp: new Date().toISOString(),
        operation: 'read',
      },
    };
  }

  @Get(':businessId-:locationId')
  @ApiOperation({ summary: 'Query resources with filters - reads from database' })
  @ApiResponse({ status: 200, description: 'Resources retrieved successfully' })
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  @ApiParam({ name: 'locationId', description: 'Location ID' })
  @ApiHeader({ name: 'X-Resource-Type', required: true, description: 'Resource type' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiQuery({ name: 'sortBy', required: false, description: 'Sort field' })
  @ApiQuery({ name: 'sortOrder', required: false, description: 'Sort order (ASC/DESC)' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date filter (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date filter (YYYY-MM-DD)' })
  @ApiQuery({ name: 'name', required: false, description: 'Name search (partial match)' })
  @ApiQuery({ name: 'isActive', required: false, description: 'Active status filter (true/false)' })
  @ApiQuery({ name: 'queryType', required: false, description: 'Query type: date-range, stats, or general' })
  async queryResources(
    @Param('businessId') businessId: string,
    @Param('locationId') locationId: string,
    @Headers('X-Resource-Type') resourceType: ResourceType,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('name') name?: string,
    @Query('isActive') isActive?: string,
    @Query('queryType') queryType?: string,
    @Query() allFilters?: any,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 50;

    // Handle different query types based on queryType parameter
    if (queryType === 'date-range') {
      if (!startDate || !endDate) {
        return {
          success: false,
          message: 'startDate and endDate are required for date-range queries',
          meta: {
            businessId,
            locationId,
            resourceType,
            timestamp: new Date().toISOString(),
            operation: 'date-range-query',
          },
        };
      }

      const offset = (pageNum - 1) * limitNum;
      const resources = await this.resourceQueryService.getResourcesByDateRange(
        businessId,
        locationId,
        resourceType,
        startDate,
        endDate,
        limitNum,
        offset,
      );

      return {
        success: true,
        data: resources,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: resources.length,
          pages: Math.ceil(resources.length / limitNum),
        },
        meta: {
          businessId,
          locationId,
          resourceType,
          startDate,
          endDate,
          timestamp: new Date().toISOString(),
          operation: 'date-range-query',
        },
      };
    }

    if (queryType === 'stats') {
      const stats = await this.resourceQueryService.getResourceStats(
        businessId,
        locationId,
        resourceType,
      );

      return {
        success: true,
        data: stats,
        meta: {
          businessId,
          locationId,
          resourceType,
          timestamp: new Date().toISOString(),
          operation: 'stats',
        },
      };
    }

    // Default general query
    const query: ResourceQuery = {
      resourceType,
      page: pageNum,
      limit: limitNum,
      sortBy,
      sortOrder,
      filters: {
        startDate,
        endDate,
        name,
        isActive: isActive ? isActive === 'true' : undefined,
        customFilters: allFilters,
      },
    };

    const result = await this.resourceQueryService.queryResources(
      businessId,
      locationId,
      query,
    );

    return {
      success: true,
      data: result.data,
      pagination: result.pagination,
      meta: {
        businessId,
        locationId,
        resourceType,
        timestamp: new Date().toISOString(),
        operation: 'query',
      },
    };
  }

  // Statistics endpoints

  @Get(':businessId-:locationId/statistics/business')
  @ApiOperation({ summary: 'Get comprehensive business statistics' })
  @ApiResponse({ status: 200, description: 'Business statistics retrieved successfully' })
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  @ApiParam({ name: 'locationId', description: 'Location ID' })
  async getBusinessStatistics(
    @Param('businessId') businessId: string,
    @Param('locationId') locationId: string,
  ) {
    try {
      const statistics = await this.statisticsService.getBusinessStatistics(businessId, locationId);

      return {
        success: true,
        data: statistics,
        meta: {
          businessId,
          locationId,
          timestamp: new Date().toISOString(),
          operation: 'business-statistics',
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Error generating business statistics: ${error.message}`,
        meta: {
          businessId,
          locationId,
          timestamp: new Date().toISOString(),
          operation: 'business-statistics',
        },
      };
    }
  }

  @Get(':businessId-:locationId/statistics/:resourceType')
  @ApiOperation({ summary: 'Get statistics for a specific resource type' })
  @ApiResponse({ status: 200, description: 'Resource type statistics retrieved successfully' })
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  @ApiParam({ name: 'locationId', description: 'Location ID' })
  @ApiParam({ name: 'resourceType', description: 'Resource type' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date filter (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date filter (YYYY-MM-DD)' })
  async getResourceTypeStatistics(
    @Param('businessId') businessId: string,
    @Param('locationId') locationId: string,
    @Param('resourceType') resourceType: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    try {
      const dateRange = startDate && endDate ? { startDate, endDate } : undefined;
      const statistics = await this.statisticsService.getResourceTypeStatistics(
        businessId,
        locationId,
        resourceType,
        dateRange,
      );

      return {
        success: true,
        data: statistics,
        meta: {
          businessId,
          locationId,
          resourceType,
          dateRange,
          timestamp: new Date().toISOString(),
          operation: 'resource-type-statistics',
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Error generating resource type statistics: ${error.message}`,
        meta: {
          businessId,
          locationId,
          resourceType,
          timestamp: new Date().toISOString(),
          operation: 'resource-type-statistics',
        },
      };
    }
  }

  @Get(':businessId-:locationId/statistics/appointments/daily')
  @ApiOperation({ summary: 'Get daily appointment statistics' })
  @ApiResponse({ status: 200, description: 'Daily appointment statistics retrieved successfully' })
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  @ApiParam({ name: 'locationId', description: 'Location ID' })
  @ApiQuery({ name: 'days', required: false, description: 'Number of days to analyze (default: 7)' })
  async getDailyAppointmentStatistics(
    @Param('businessId') businessId: string,
    @Param('locationId') locationId: string,
    @Query('days') days?: string,
  ) {
    try {
      const daysToAnalyze = days ? parseInt(days, 10) : 7;
      const statistics = await this.statisticsService.getResourceTypeStatistics(
        businessId,
        locationId,
        'timeline',
      );

      // Filter for the last N days
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - daysToAnalyze);

      const dailyStats = {
        daysAnalyzed: daysToAnalyze,
        totalAppointments: statistics.total,
        averagePerDay: Math.round((statistics.total / daysToAnalyze) * 100) / 100,
        byDate: statistics.byDate,
        trend: this.calculateTrend(statistics.byDate),
      };

      return {
        success: true,
        data: dailyStats,
        meta: {
          businessId,
          locationId,
          resourceType: 'timeline',
          daysAnalyzed: daysToAnalyze,
          timestamp: new Date().toISOString(),
          operation: 'daily-appointment-statistics',
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Error generating daily appointment statistics: ${error.message}`,
        meta: {
          businessId,
          locationId,
          timestamp: new Date().toISOString(),
          operation: 'daily-appointment-statistics',
        },
      };
    }
  }

  @Get(':businessId-:locationId/statistics/revenue/monthly')
  @ApiOperation({ summary: 'Get monthly revenue statistics' })
  @ApiResponse({ status: 200, description: 'Monthly revenue statistics retrieved successfully' })
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  @ApiParam({ name: 'locationId', description: 'Location ID' })
  @ApiQuery({ name: 'months', required: false, description: 'Number of months to analyze (default: 6)' })
  async getMonthlyRevenueStatistics(
    @Param('businessId') businessId: string,
    @Param('locationId') locationId: string,
    @Query('months') months?: string,
  ) {
    try {
      const monthsToAnalyze = months ? parseInt(months, 10) : 6;
      const statistics = await this.statisticsService.getResourceTypeStatistics(
        businessId,
        locationId,
        'invoices',
      );

      const monthlyStats = {
        monthsAnalyzed: monthsToAnalyze,
        totalRevenue: statistics.totalValue,
        averagePerMonth: Math.round((statistics.totalValue / monthsToAnalyze) * 100) / 100,
        byMonth: this.groupByMonth(statistics.byDate),
        trend: this.calculateTrend(this.groupByMonth(statistics.byDate)),
      };

      return {
        success: true,
        data: monthlyStats,
        meta: {
          businessId,
          locationId,
          resourceType: 'invoices',
          monthsAnalyzed: monthsToAnalyze,
          timestamp: new Date().toISOString(),
          operation: 'monthly-revenue-statistics',
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Error generating monthly revenue statistics: ${error.message}`,
        meta: {
          businessId,
          locationId,
          timestamp: new Date().toISOString(),
          operation: 'monthly-revenue-statistics',
        },
      };
    }
  }

  // Helper methods for trend calculation
  private calculateTrend(data: Record<string, number>): 'increasing' | 'decreasing' | 'stable' {
    const values = Object.values(data).sort();
    if (values.length < 2) return 'stable';
    
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    const change = ((secondAvg - firstAvg) / firstAvg) * 100;
    
    if (change > 5) return 'increasing';
    if (change < -5) return 'decreasing';
    return 'stable';
  }

  private groupByMonth(data: Record<string, number>): Record<string, number> {
    const monthlyData: Record<string, number> = {};
    
    Object.entries(data).forEach(([date, value]) => {
      const monthKey = date.substring(0, 7); // YYYY-MM
      monthlyData[monthKey] = (monthlyData[monthKey] || 0) + value;
    });
    
    return monthlyData;
  }

  // Name-based search endpoints

  @Get(':businessId-:locationId/search/name/:nameField')
  @ApiOperation({ summary: 'Search resources by specific name field' })
  @ApiResponse({ status: 200, description: 'Resources found by name' })
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  @ApiParam({ name: 'locationId', description: 'Location ID' })
  @ApiParam({ name: 'nameField', description: 'Name field to search: medicName, patientName, trainerName, customerName' })
  @ApiQuery({ name: 'nameValue', required: true, description: 'Name value to search for' })
  @ApiQuery({ name: 'resourceType', required: false, description: 'Filter by resource type' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 50)' })
  async searchResourcesByName(
    @Param('businessId') businessId: string,
    @Param('locationId') locationId: string,
    @Param('nameField') nameField: 'medicName' | 'patientName' | 'trainerName' | 'customerName',
    @Query('nameValue') nameValue: string,
    @Query('resourceType') resourceType?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    try {
      const pageNum = page ? parseInt(page, 10) : 1;
      const limitNum = limit ? parseInt(limit, 10) : 50;
      const offset = (pageNum - 1) * limitNum;

      const resources = await this.resourceQueryService.getResourcesByName(
        businessId,
        locationId,
        nameField,
        nameValue,
        resourceType,
        limitNum,
        offset,
      );

      return {
        success: true,
        data: resources,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: resources.length,
          pages: Math.ceil(resources.length / limitNum),
        },
        meta: {
          businessId,
          locationId,
          nameField,
          nameValue,
          resourceType,
          timestamp: new Date().toISOString(),
          operation: 'name-search',
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Error searching resources by name: ${error.message}`,
        meta: {
          businessId,
          locationId,
          nameField,
          nameValue,
          timestamp: new Date().toISOString(),
          operation: 'name-search',
        },
      };
    }
  }

  @Post(':businessId-:locationId/search/names')
  @ApiOperation({ summary: 'Search resources by multiple name fields' })
  @ApiResponse({ status: 200, description: 'Resources found by multiple names' })
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  @ApiParam({ name: 'locationId', description: 'Location ID' })
  async searchResourcesByMultipleNames(
    @Param('businessId') businessId: string,
    @Param('locationId') locationId: string,
    @Body() nameFilters: {
      medicName?: string;
      patientName?: string;
      trainerName?: string;
      customerName?: string;
      resourceType?: string;
      page?: number;
      limit?: number;
    },
  ) {
    try {
      const { page = 1, limit = 50, resourceType, ...names } = nameFilters;
      const offset = (page - 1) * limit;

      const resources = await this.resourceQueryService.getResourcesByMultipleNames(
        businessId,
        locationId,
        names,
        resourceType,
        limit,
        offset,
      );

      return {
        success: true,
        data: resources,
        pagination: {
          page,
          limit,
          total: resources.length,
          pages: Math.ceil(resources.length / limit),
        },
        meta: {
          businessId,
          locationId,
          nameFilters: names,
          resourceType,
          timestamp: new Date().toISOString(),
          operation: 'multiple-names-search',
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Error searching resources by multiple names: ${error.message}`,
        meta: {
          businessId,
          locationId,
          timestamp: new Date().toISOString(),
          operation: 'multiple-names-search',
        },
      };
    }
  }
}
