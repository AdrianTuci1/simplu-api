import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { InvitationsService } from './invitations.service';
import { CognitoAuthGuard } from '../auth/guards/cognito-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { CognitoUser } from '../auth/auth.service';

@ApiTags('Invitations')
@Controller('invitations')
@UseGuards(CognitoAuthGuard)
@ApiBearerAuth()
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Post('send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send invitation email to a medic' })
  @ApiResponse({ status: 200, description: 'Invitation sent successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - already has account or missing email' })
  @ApiResponse({ status: 404, description: 'Medic not found' })
  async sendInvitation(
    @CurrentUser() user: CognitoUser,
    @Body()
    body: {
      businessId: string;
      locationId: string;
      medicResourceId: string;
    },
  ) {
    const result = await this.invitationsService.sendInvitation({
      businessId: body.businessId,
      locationId: body.locationId,
      medicResourceId: body.medicResourceId,
      invitedBy: {
        userId: user.userId,
        userName: user.username,
        email: user.email,
        businessId: body.businessId,
        roles: [
          {
            locationId: body.locationId,
            locationName: body.locationId,
            role: 'admin',
          },
        ],
      },
    });

    return result;
  }

  @Get('verify')
  @Public() // This endpoint is public - no authentication required
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify invitation by ID and email (public endpoint)' })
  @ApiResponse({ status: 200, description: 'Invitation verification result' })
  async verifyInvitation(
    @Query('invitation') invitationId: string,
    @Query('email') email: string,
    @Query('businessId') businessId: string,
    @Query('locationId') locationId: string,
  ) {
    return this.invitationsService.verifyInvitation({
      invitationId,
      email,
      businessId,
      locationId,
    });
  }

  @Get('status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get invitation status for a medic' })
  @ApiResponse({ status: 200, description: 'Invitation status' })
  @ApiResponse({ status: 404, description: 'Medic not found' })
  async getStatus(
    @Query('businessId') businessId: string,
    @Query('locationId') locationId: string,
    @Query('medicResourceId') medicResourceId: string,
  ) {
    return this.invitationsService.getInvitationStatus({
      businessId,
      locationId,
      medicResourceId,
    });
  }
}

