import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { BusinessService } from './business.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';

@ApiTags('businesses')
@Controller('businesses')
export class BusinessController {
  constructor(private readonly businessService: BusinessService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new business' })
  @ApiResponse({ status: 201, description: 'Business created successfully' })
  async createBusiness(
    @Body() createBusinessDto: CreateBusinessDto,
    @Query('userEmail') userEmail: string
  ) {
    try {
      if (!userEmail) {
        throw new HttpException('User email is required', HttpStatus.BAD_REQUEST);
      }
      return await this.businessService.createBusiness(createBusinessDto, userEmail);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get()
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
} 