import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileUploadService } from './file-upload.service';
import { CognitoAuthGuard } from '../auth/guards/cognito-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CognitoUser } from '../auth/auth.service';
import {
  PermissionService,
  AuthenticatedUser,
} from '../resources/services/permission.service';
import { ResourceType } from '../resources/types/base-resource';

@ApiTags('File Upload')
@Controller('resources/:businessId-:locationId/files')
@UseGuards(CognitoAuthGuard)
@ApiBearerAuth()
export class FileUploadController {
  constructor(
    private readonly fileUploadService: FileUploadService,
    private readonly permissionService: PermissionService,
  ) {}

  /**
   * Create a minimal user object for the service
   */
  private createMinimalUser(
    user: CognitoUser,
    businessId: string,
    locationId: string,
  ): AuthenticatedUser {
    return {
      userId: user.userId,
      userName: user.username,
      email: user.email,
      businessId,
      roles: [
        {
          locationId,
          locationName: locationId,
          role: 'user',
        },
      ],
    };
  }

  @Post(':resourceType/:resourceId')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
  )
  @ApiOperation({ summary: 'Upload a file to an existing resource' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'File to upload',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'File uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        file: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'uuid-123' },
            name: { type: 'string', example: 'certificate.jpg' },
            type: { type: 'string', example: 'image/jpeg' },
            size: { type: 'number', example: 1024000 },
            s3Key: {
              type: 'string',
              example: 'business-location/medic/me2410-00001/uuid-123-certificate.jpg',
            },
            uploadedAt: { type: 'string', example: '2025-10-17T10:00:00Z' },
            uploadedBy: { type: 'string', example: 'user-id-123' },
          },
        },
        message: { type: 'string', example: 'File uploaded successfully' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid file or resource not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing Bearer token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  @ApiParam({ name: 'locationId', description: 'Location ID' })
  @ApiParam({
    name: 'resourceType',
    description: 'Resource type (medic, patient, etc.)',
  })
  @ApiParam({ name: 'resourceId', description: 'Resource ID (must exist)' })
  async uploadFile(
    @CurrentUser() user: CognitoUser,
    @Param('businessId') businessId: string,
    @Param('locationId') locationId: string,
    @Param('resourceType') resourceType: string,
    @Param('resourceId') resourceId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    // Validate resource type
    if (!['medic', 'patient'].includes(resourceType)) {
      throw new BadRequestException(
        `File upload is only supported for 'medic' and 'patient' resources`,
      );
    }

    // Check permission
    await this.permissionService.checkPermissionFromMedic(
      user.userId,
      businessId,
      locationId,
      resourceType as ResourceType,
      'update',
    );

    const authenticatedUser = this.createMinimalUser(
      user,
      businessId,
      locationId,
    );

    return this.fileUploadService.uploadFile(
      businessId,
      locationId,
      resourceType as ResourceType,
      resourceId,
      file,
      authenticatedUser,
    );
  }

  @Get(':resourceType/:resourceId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all files for a resource' })
  @ApiResponse({
    status: 200,
    description: 'Files retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        files: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              type: { type: 'string' },
              size: { type: 'number' },
              s3Key: { type: 'string' },
              uploadedAt: { type: 'string' },
              uploadedBy: { type: 'string' },
            },
          },
        },
        total: { type: 'number', example: 3 },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing Bearer token',
  })
  @ApiResponse({
    status: 404,
    description: 'Resource not found',
  })
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  @ApiParam({ name: 'locationId', description: 'Location ID' })
  @ApiParam({
    name: 'resourceType',
    description: 'Resource type (medic, patient, etc.)',
  })
  @ApiParam({ name: 'resourceId', description: 'Resource ID' })
  async listFiles(
    @CurrentUser() user: CognitoUser,
    @Param('businessId') businessId: string,
    @Param('locationId') locationId: string,
    @Param('resourceType') resourceType: string,
    @Param('resourceId') resourceId: string,
  ) {
    // Check permission
    await this.permissionService.checkPermissionFromMedic(
      user.userId,
      businessId,
      locationId,
      resourceType as ResourceType,
      'read',
    );

    return this.fileUploadService.listFiles(
      businessId,
      locationId,
      resourceType as ResourceType,
      resourceId,
    );
  }

  @Get(':resourceType/:resourceId/:fileId/url')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get presigned URL for file download' })
  @ApiResponse({
    status: 200,
    description: 'Presigned URL generated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        url: {
          type: 'string',
          example: 'https://s3.amazonaws.com/...',
        },
        expiresIn: { type: 'number', example: 3600 },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing Bearer token',
  })
  @ApiResponse({
    status: 404,
    description: 'Resource or file not found',
  })
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  @ApiParam({ name: 'locationId', description: 'Location ID' })
  @ApiParam({
    name: 'resourceType',
    description: 'Resource type (medic, patient, etc.)',
  })
  @ApiParam({ name: 'resourceId', description: 'Resource ID' })
  @ApiParam({ name: 'fileId', description: 'File ID' })
  async getFileUrl(
    @CurrentUser() user: CognitoUser,
    @Param('businessId') businessId: string,
    @Param('locationId') locationId: string,
    @Param('resourceType') resourceType: string,
    @Param('resourceId') resourceId: string,
    @Param('fileId') fileId: string,
  ) {
    // Check permission
    await this.permissionService.checkPermissionFromMedic(
      user.userId,
      businessId,
      locationId,
      resourceType as ResourceType,
      'read',
    );

    return this.fileUploadService.getFileUrl(
      businessId,
      locationId,
      resourceType as ResourceType,
      resourceId,
      fileId,
    );
  }

  @Delete(':resourceType/:resourceId/:fileId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a file from a resource' })
  @ApiResponse({
    status: 200,
    description: 'File deleted successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'File deleted successfully' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing Bearer token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'Resource or file not found',
  })
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  @ApiParam({ name: 'locationId', description: 'Location ID' })
  @ApiParam({
    name: 'resourceType',
    description: 'Resource type (medic, patient, etc.)',
  })
  @ApiParam({ name: 'resourceId', description: 'Resource ID' })
  @ApiParam({ name: 'fileId', description: 'File ID to delete' })
  async deleteFile(
    @CurrentUser() user: CognitoUser,
    @Param('businessId') businessId: string,
    @Param('locationId') locationId: string,
    @Param('resourceType') resourceType: string,
    @Param('resourceId') resourceId: string,
    @Param('fileId') fileId: string,
  ) {
    // Check permission
    await this.permissionService.checkPermissionFromMedic(
      user.userId,
      businessId,
      locationId,
      resourceType as ResourceType,
      'delete',
    );

    const authenticatedUser = this.createMinimalUser(
      user,
      businessId,
      locationId,
    );

    return this.fileUploadService.deleteFile(
      businessId,
      locationId,
      resourceType as ResourceType,
      resourceId,
      fileId,
      authenticatedUser,
    );
  }
}

