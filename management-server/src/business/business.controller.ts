import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpException, HttpStatus, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { BusinessService } from './business.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { CognitoAuthGuard } from '../modules/auth/guards/cognito-auth.guard';
import { RolesGuard } from '../modules/auth/guards/roles.guard';
import { Roles } from '../modules/auth/decorators/roles.decorator';

@ApiTags('businesses')
@Controller('businesses')
export class BusinessController {
  constructor(private readonly businessService: BusinessService) {}

  @Post()
  @UseGuards(CognitoAuthGuard, RolesGuard)
  @Roles('admin', 'super_admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new business' })
  @ApiResponse({ status: 201, description: 'Business created successfully' })
  async createBusiness(
    @Body() createBusinessDto: CreateBusinessDto,
    @Request() req: any
  ) {
    try {
      const user = req.user;
      if (!user || !user.email) {
        throw new HttpException('User email is required', HttpStatus.BAD_REQUEST);
      }
      return await this.businessService.createBusiness(createBusinessDto, user.email);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get()
  @UseGuards(CognitoAuthGuard, RolesGuard)
  @Roles('admin', 'super_admin', 'manager')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all businesses' })
  @ApiResponse({ status: 200, description: 'Businesses retrieved successfully' })
  async getAllBusinesses() {
    try {
      return await this.businessService.getAllBusinesses();
    } catch (error) {
      throw new HttpException('Failed to retrieve businesses', HttpStatus.BAD_REQUEST);
    }
  }

  @Get('status/:status')
  @UseGuards(CognitoAuthGuard, RolesGuard)
  @Roles('admin', 'super_admin', 'manager')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get businesses by status' })
  @ApiResponse({ status: 200, description: 'Businesses retrieved successfully' })
  async getBusinessesByStatus(@Param('status') status: string) {
    try {
      return await this.businessService.getBusinessesByStatus(status);
    } catch (error) {
      throw new HttpException('Failed to retrieve businesses by status', HttpStatus.BAD_REQUEST);
    }
  }

  @Get('payment-status/:paymentStatus')
  @UseGuards(CognitoAuthGuard, RolesGuard)
  @Roles('admin', 'super_admin', 'manager')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get businesses by payment status' })
  @ApiResponse({ status: 200, description: 'Businesses retrieved successfully' })
  async getBusinessesByPaymentStatus(@Param('paymentStatus') paymentStatus: string) {
    try {
      return await this.businessService.getBusinessesByPaymentStatus(paymentStatus);
    } catch (error) {
      throw new HttpException('Failed to retrieve businesses by payment status', HttpStatus.BAD_REQUEST);
    }
  }

  @Get(':id')
  @UseGuards(CognitoAuthGuard, RolesGuard)
  @Roles('admin', 'super_admin', 'manager')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a business by ID' })
  @ApiResponse({ status: 200, description: 'Business retrieved successfully' })
  async getBusiness(@Param('id') id: string) {
    try {
      return await this.businessService.getBusiness(id);
    } catch (error) {
      throw new HttpException('Business not found', HttpStatus.NOT_FOUND);
    }
  }

  @Put(':id')
  @UseGuards(CognitoAuthGuard, RolesGuard)
  @Roles('admin', 'super_admin', 'manager')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a business' })
  @ApiResponse({ status: 200, description: 'Business updated successfully' })
  async updateBusiness(
    @Param('id') id: string,
    @Body() updateBusinessDto: UpdateBusinessDto
  ) {
    try {
      return await this.businessService.updateBusiness(id, updateBusinessDto);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Delete(':id')
  @UseGuards(CognitoAuthGuard, RolesGuard)
  @Roles('admin', 'super_admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a business' })
  @ApiResponse({ status: 200, description: 'Business deleted successfully' })
  async deleteBusiness(@Param('id') id: string) {
    try {
      await this.businessService.deleteBusiness(id);
      return { message: 'Business deleted successfully' };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post(':id/register-shards')
  @UseGuards(CognitoAuthGuard, RolesGuard)
  @Roles('admin', 'super_admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Trigger shard creation for business locations' })
  @ApiResponse({ status: 200, description: 'Shard creation triggered successfully' })
  async registerBusinessShards(@Param('id') id: string) {
    try {
      await this.businessService.registerBusinessShards(id);
      return { 
        message: 'Shard creation triggered successfully',
        note: 'Shards will be created by the resources server via SQS messages'
      };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
} 