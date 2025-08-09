import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpException, HttpStatus, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { BusinessService } from './business.service';
import { DatabaseService } from '../database/database.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { CognitoAuthGuard } from '../modules/auth/guards/cognito-auth.guard';
// Roles removed: we now scope by authenticated user

@ApiTags('businesses')
@Controller('businesses')
export class BusinessController {
  constructor(
    private readonly businessService: BusinessService,
    private readonly databaseService: DatabaseService,
  ) {}

  @Post()
  @UseGuards(CognitoAuthGuard)
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
      return await this.businessService.createBusiness(createBusinessDto, user.email, user.userId);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get()
  @UseGuards(CognitoAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all businesses' })
  @ApiResponse({ status: 200, description: 'Businesses retrieved successfully' })
  async getAllBusinesses(@Request() req: any) {
    try {
      const user = req.user;
      // Include businesses created for this user's email (authorizedEmails or ownerEmail)
      const owned = await this.businessService.getBusinessesForUser(user.userId);
      const byEmail = await this.databaseService.getBusinessesByAuthorizedEmail(user.email);
      // Merge unique by businessId
      const map = new Map<string, any>();
      [...owned, ...byEmail].forEach(b => map.set(b.businessId, b));
      return Array.from(map.values());
    } catch (error) {
      throw new HttpException('Failed to retrieve businesses', HttpStatus.BAD_REQUEST);
    }
  }

  @Get('status/:status')
  @UseGuards(CognitoAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get businesses by status' })
  @ApiResponse({ status: 200, description: 'Businesses retrieved successfully' })
  async getBusinessesByStatus(@Param('status') status: string, @Request() req: any) {
    try {
      const user = req.user;
      const owned = await this.businessService.getBusinessesForUser(user.userId);
      const byEmail = await this.databaseService.getBusinessesByAuthorizedEmail(user.email);
      const businesses = [...owned, ...byEmail];
      return businesses.filter(b => b.status === status);
    } catch (error) {
      throw new HttpException('Failed to retrieve businesses by status', HttpStatus.BAD_REQUEST);
    }
  }

  @Get('payment-status/:paymentStatus')
  @UseGuards(CognitoAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get businesses by payment status' })
  @ApiResponse({ status: 200, description: 'Businesses retrieved successfully' })
  async getBusinessesByPaymentStatus(@Param('paymentStatus') paymentStatus: string, @Request() req: any) {
    try {
      const user = req.user;
      const owned = await this.businessService.getBusinessesForUser(user.userId);
      const byEmail = await this.databaseService.getBusinessesByAuthorizedEmail(user.email);
      const businesses = [...owned, ...byEmail];
      return businesses.filter(b => b.paymentStatus === paymentStatus);
    } catch (error) {
      throw new HttpException('Failed to retrieve businesses by payment status', HttpStatus.BAD_REQUEST);
    }
  }

  @Get(':id')
  @UseGuards(CognitoAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a business by ID' })
  @ApiResponse({ status: 200, description: 'Business retrieved successfully' })
  async getBusiness(@Param('id') id: string, @Request() req: any) {
    try {
      const user = req.user;
      const business = await this.businessService.getBusiness(id);
      const isAuthorized = business.ownerUserId === user.userId || business.ownerEmail === user.email || (business.authorizedEmails || []).includes(user.email);
      if (!isAuthorized) {
        throw new HttpException('Not found', HttpStatus.NOT_FOUND);
      }
      return business;
    } catch (error) {
      throw new HttpException('Business not found', HttpStatus.NOT_FOUND);
    }
  }

  @Put(':id')
  @UseGuards(CognitoAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a business' })
  @ApiResponse({ status: 200, description: 'Business updated successfully' })
  async updateBusiness(
    @Param('id') id: string,
    @Body() updateBusinessDto: UpdateBusinessDto,
    @Request() req: any
  ) {
    try {
      const user = req.user;
      const existing = await this.businessService.getBusiness(id);
      const isAuthorized = existing.ownerUserId === user.userId || existing.ownerEmail === user.email || (existing.authorizedEmails || []).includes(user.email);
      if (!isAuthorized) {
        throw new HttpException('Not found', HttpStatus.NOT_FOUND);
      }
      return await this.businessService.updateBusiness(id, updateBusinessDto);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Delete(':id')
  @UseGuards(CognitoAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a business' })
  @ApiResponse({ status: 200, description: 'Business deleted successfully' })
  async deleteBusiness(@Param('id') id: string, @Request() req: any) {
    try {
      const user = req.user;
      const existing = await this.businessService.getBusiness(id);
      const isAuthorized = existing.ownerUserId === user.userId || existing.ownerEmail === user.email || (existing.authorizedEmails || []).includes(user.email);
      if (!isAuthorized) {
        throw new HttpException('Not found', HttpStatus.NOT_FOUND);
      }
      await this.businessService.deleteBusiness(id);
      return { message: 'Business deleted successfully' };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post(':id/register-shards')
  @UseGuards(CognitoAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Trigger shard creation for business locations' })
  @ApiResponse({ status: 200, description: 'Shard creation triggered successfully' })
  async registerBusinessShards(@Param('id') id: string, @Request() req: any) {
    try {
      const user = req.user;
      const existing = await this.businessService.getBusiness(id);
      const isAuthorized = existing.ownerUserId === user.userId || existing.ownerEmail === user.email || (existing.authorizedEmails || []).includes(user.email);
      if (!isAuthorized) {
        throw new HttpException('Not found', HttpStatus.NOT_FOUND);
      }
      await this.businessService.registerBusinessShards(id);
      return { 
        message: 'Shard creation triggered successfully',
        note: 'Shards will be created by the resources server via SQS messages'
      };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('activate/:token')
  @UseGuards(CognitoAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Activate business ownership and subscription by token' })
  @ApiResponse({ status: 200, description: 'Business activated successfully' })
  async activateBusiness(@Param('token') token: string, @Request() req: any) {
    try {
      const user = req.user;
      const updated = await this.businessService.activateBusinessForOwner(token, user.userId);
      return { message: 'Business activated successfully', businessId: updated.businessId };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get(':id/subscription')
  @UseGuards(CognitoAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get business subscription information including Stripe details' })
  @ApiResponse({ status: 200, description: 'Business subscription information retrieved successfully' })
  async getBusinessSubscription(@Param('id') id: string, @Request() req: any) {
    try {
      const user = req.user;
      const business = await this.businessService.getBusiness(id);
      const isAuthorized = business.ownerUserId === user.userId || business.ownerEmail === user.email || (business.authorizedEmails || []).includes(user.email);
      if (!isAuthorized) {
        throw new HttpException('Not found', HttpStatus.NOT_FOUND);
      }
      
      return await this.businessService.getBusinessSubscriptionInfo(id);
    } catch (error) {
      throw new HttpException('Failed to get business subscription information', HttpStatus.BAD_REQUEST);
    }
  }

  @Get(':id/status')
  @UseGuards(CognitoAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get detailed business status with subscription, payment methods, and credits' })
  @ApiResponse({ status: 200, description: 'Business status retrieved successfully' })
  async getBusinessStatus(@Param('id') id: string, @Request() req: any) {
    try {
      const user = req.user;
      const business = await this.businessService.getBusiness(id);
      const isAuthorized = business.ownerUserId === user.userId || business.ownerEmail === user.email || (business.authorizedEmails || []).includes(user.email);
      if (!isAuthorized) {
        throw new HttpException('Not found', HttpStatus.NOT_FOUND);
      }
      
      return await this.businessService.getDetailedBusinessStatus(id);
    } catch (error) {
      throw new HttpException('Failed to get business status', HttpStatus.BAD_REQUEST);
    }
  }

  @Get(':id/credits')
  @UseGuards(CognitoAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get business credits balance and history' })
  @ApiResponse({ status: 200, description: 'Business credits information retrieved successfully' })
  async getBusinessCredits(@Param('id') id: string, @Request() req: any) {
    try {
      const user = req.user;
      const business = await this.businessService.getBusiness(id);
      const isAuthorized = business.ownerUserId === user.userId || business.ownerEmail === user.email || (business.authorizedEmails || []).includes(user.email);
      if (!isAuthorized) {
        throw new HttpException('Not found', HttpStatus.NOT_FOUND);
      }
      
      return await this.businessService.getBusinessCredits(id);
    } catch (error) {
      throw new HttpException('Failed to get business credits', HttpStatus.BAD_REQUEST);
    }
  }

  @Post(':id/credits/purchase')
  @UseGuards(CognitoAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Purchase additional credits for business' })
  @ApiResponse({ status: 200, description: 'Credits purchase initiated successfully' })
  async purchaseCredits(@Param('id') id: string, @Body() purchaseData: { amount: number; paymentMethodId?: string }, @Request() req: any) {
    try {
      const user = req.user;
      const business = await this.businessService.getBusiness(id);
      const isAuthorized = business.ownerUserId === user.userId || business.ownerEmail === user.email || (business.authorizedEmails || []).includes(user.email);
      if (!isAuthorized) {
        throw new HttpException('Not found', HttpStatus.NOT_FOUND);
      }
      return await this.businessService.purchaseCredits(
        id,
        purchaseData.amount,
        { userId: user.userId, email: user.email, name: user.name },
        purchaseData.paymentMethodId,
      );
    } catch (error) {
      throw new HttpException('Failed to purchase credits', HttpStatus.BAD_REQUEST);
    }
  }

  @Post(':id/credits/allocate')
  @UseGuards(CognitoAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Allocate credits from business to a specific location' })
  @ApiResponse({ status: 200, description: 'Credits allocated successfully' })
  async allocateCredits(@Param('id') id: string, @Body() allocationData: { locationId: string; amount: number }, @Request() req: any) {
    try {
      const user = req.user;
      const business = await this.businessService.getBusiness(id);
      const isAuthorized = business.ownerUserId === user.userId || business.ownerEmail === user.email || (business.authorizedEmails || []).includes(user.email);
      if (!isAuthorized) {
        throw new HttpException('Not found', HttpStatus.NOT_FOUND);
      }
      
      return await this.businessService.allocateCreditsToLocation(id, allocationData.locationId, allocationData.amount);
    } catch (error) {
      throw new HttpException('Failed to allocate credits', HttpStatus.BAD_REQUEST);
    }
  }

  @Post(':id/credits/reallocate')
  @UseGuards(CognitoAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reallocate credits between locations' })
  @ApiResponse({ status: 200, description: 'Credits reallocated successfully' })
  async reallocateCredits(@Param('id') id: string, @Body() reallocationData: { fromLocationId: string; toLocationId: string; amount: number }, @Request() req: any) {
    try {
      const user = req.user;
      const business = await this.businessService.getBusiness(id);
      const isAuthorized = business.ownerUserId === user.userId || business.ownerEmail === user.email || (business.authorizedEmails || []).includes(user.email);
      if (!isAuthorized) {
        throw new HttpException('Not found', HttpStatus.NOT_FOUND);
      }
      
      return await this.businessService.reallocateCredits(id, reallocationData.fromLocationId, reallocationData.toLocationId, reallocationData.amount);
    } catch (error) {
      throw new HttpException('Failed to reallocate credits', HttpStatus.BAD_REQUEST);
    }
  }

  @Post(':id/credits/deallocate')
  @UseGuards(CognitoAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deallocate credits from location back to business pool' })
  @ApiResponse({ status: 200, description: 'Credits deallocated successfully' })
  async deallocateCredits(@Param('id') id: string, @Body() deallocationData: { locationId: string; amount: number }, @Request() req: any) {
    try {
      const user = req.user;
      const business = await this.businessService.getBusiness(id);
      const isAuthorized = business.ownerUserId === user.userId || business.ownerEmail === user.email || (business.authorizedEmails || []).includes(user.email);
      if (!isAuthorized) {
        throw new HttpException('Not found', HttpStatus.NOT_FOUND);
      }
      
      return await this.businessService.deallocateCreditsFromLocation(id, deallocationData.locationId, deallocationData.amount);
    } catch (error) {
      throw new HttpException('Failed to deallocate credits', HttpStatus.BAD_REQUEST);
    }
  }

  @Post(':id/subscription')
  @UseGuards(CognitoAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create or replace Stripe subscription for this business' })
  @ApiResponse({ status: 200, description: 'Subscription created/replaced successfully' })
  async createOrReplaceSubscription(
    @Param('id') id: string,
    @Body() data: { priceId: string; cancelPrevious?: boolean },
    @Request() req: any
  ) {
    try {
      const user = req.user;
      const business = await this.businessService.getBusiness(id);
      const isAuthorized = business.ownerUserId === user.userId || business.ownerEmail === user.email || (business.authorizedEmails || []).includes(user.email);
      if (!isAuthorized) {
        throw new HttpException('Not found', HttpStatus.NOT_FOUND);
      }
      if (!data?.priceId) {
        throw new HttpException('priceId is required', HttpStatus.BAD_REQUEST);
      }
      return await this.businessService.createOrReplaceBusinessSubscriptionForUser(
        id,
        data.priceId,
        { userId: user.userId, email: user.email, name: user.name },
        data.cancelPrevious ?? true,
      );
    } catch (error) {
      throw new HttpException(error.message || 'Failed to create/replace subscription', HttpStatus.BAD_REQUEST);
    }
  }
} 