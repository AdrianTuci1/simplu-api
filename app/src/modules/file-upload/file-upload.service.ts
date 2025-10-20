import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { S3Service } from './services/s3.service';
import { ResourceQueryService } from '../resources/services/resource-query.service';
import { ResourcesService } from '../resources/resources.service';
import { ResourceType } from '../resources/types/base-resource';
import { AuthenticatedUser } from '../resources/services/permission.service';
import { v4 as uuidv4 } from 'uuid';

export interface FileMetadata {
  id: string;
  name: string;
  type: string;
  size: number;
  s3Key: string;
  uploadedAt: string;
  uploadedBy?: string;
}

export interface FileUploadResult {
  success: boolean;
  file: FileMetadata;
  message: string;
}

export interface FileListResult {
  success: boolean;
  files: FileMetadata[];
  total: number;
}

@Injectable()
export class FileUploadService {
  private readonly logger = new Logger(FileUploadService.name);

  // Allowed MIME types
  private readonly ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'model/obj',
    'application/pdf',
  ];

  // Max file size: 10MB
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024;

  constructor(
    private readonly s3Service: S3Service,
    private readonly resourceQueryService: ResourceQueryService,
    private readonly resourcesService: ResourcesService,
  ) {}

  /**
   * Upload a file for a specific resource
   */
  async uploadFile(
    businessId: string,
    locationId: string,
    resourceType: ResourceType,
    resourceId: string,
    file: Express.Multer.File,
    user: AuthenticatedUser,
  ): Promise<FileUploadResult> {
    // Validate file
    this.validateFile(file);

    // Check if resource exists
    const resource = await this.resourceQueryService.getResourceById(
      businessId,
      locationId,
      resourceType,
      resourceId,
    );

    if (!resource) {
      throw new NotFoundException(
        `Resource ${resourceType}/${resourceId} not found`,
      );
    }

    // Generate file ID and S3 key
    const fileId = uuidv4();
    const sanitizedFileName = this.sanitizeFileName(file.originalname);
    const s3Key = this.generateS3Key(
      businessId,
      locationId,
      resourceType,
      resourceId,
      fileId,
      sanitizedFileName,
    );

    try {
      // Upload to S3
      await this.s3Service.uploadFile(s3Key, file.buffer, file.mimetype, {
        businessId,
        locationId,
        resourceType,
        resourceId,
        fileId,
        uploadedBy: user.userId,
      });

      // Create file metadata
      const fileMetadata: FileMetadata = {
        id: fileId,
        name: sanitizedFileName,
        type: file.mimetype,
        size: file.size,
        s3Key: s3Key,
        uploadedAt: new Date().toISOString(),
        uploadedBy: user.userId,
      };

      // Update resource with file metadata
      const currentFiles = (resource.data?.files as FileMetadata[]) || [];
      await this.resourcesService.processResourceOperation({
        operation: 'patch',
        businessId,
        locationId,
        resourceType,
        resourceId,
        data: {
          files: [...currentFiles, fileMetadata],
        },
        user,
      });

      this.logger.log(
        `File uploaded successfully: ${fileId} for resource ${resourceType}/${resourceId}`,
      );

      return {
        success: true,
        file: fileMetadata,
        message: 'File uploaded successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to upload file: ${error.message}`);
      // Attempt to clean up S3 file if it was uploaded
      try {
        await this.s3Service.deleteFile(s3Key);
      } catch (cleanupError) {
        this.logger.error(`Failed to cleanup S3 file: ${cleanupError.message}`);
      }
      throw new BadRequestException(`File upload failed: ${error.message}`);
    }
  }

  /**
   * Delete a file from a resource
   */
  async deleteFile(
    businessId: string,
    locationId: string,
    resourceType: ResourceType,
    resourceId: string,
    fileId: string,
    user: AuthenticatedUser,
  ): Promise<{ success: boolean; message: string }> {
    // Check if resource exists
    const resource = await this.resourceQueryService.getResourceById(
      businessId,
      locationId,
      resourceType,
      resourceId,
    );

    if (!resource) {
      throw new NotFoundException(
        `Resource ${resourceType}/${resourceId} not found`,
      );
    }

    // Get current files
    const currentFiles = (resource.data?.files as FileMetadata[]) || [];
    const fileToDelete = currentFiles.find((f) => f.id === fileId);

    if (!fileToDelete) {
      throw new NotFoundException(`File ${fileId} not found in resource`);
    }

    try {
      // Delete from S3
      await this.s3Service.deleteFile(fileToDelete.s3Key);

      // Update resource - remove file metadata
      const updatedFiles = currentFiles.filter((f) => f.id !== fileId);
      await this.resourcesService.processResourceOperation({
        operation: 'patch',
        businessId,
        locationId,
        resourceType,
        resourceId,
        data: {
          files: updatedFiles,
        },
        user,
      });

      this.logger.log(
        `File deleted successfully: ${fileId} from resource ${resourceType}/${resourceId}`,
      );

      return {
        success: true,
        message: 'File deleted successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to delete file: ${error.message}`);
      throw new BadRequestException(`File deletion failed: ${error.message}`);
    }
  }

  /**
   * List all files for a resource
   */
  async listFiles(
    businessId: string,
    locationId: string,
    resourceType: ResourceType,
    resourceId: string,
  ): Promise<FileListResult> {
    // Check if resource exists
    const resource = await this.resourceQueryService.getResourceById(
      businessId,
      locationId,
      resourceType,
      resourceId,
    );

    if (!resource) {
      throw new NotFoundException(
        `Resource ${resourceType}/${resourceId} not found`,
      );
    }

    const files = (resource.data?.files as FileMetadata[]) || [];

    return {
      success: true,
      files,
      total: files.length,
    };
  }

  /**
   * Get a presigned URL for file download
   */
  async getFileUrl(
    businessId: string,
    locationId: string,
    resourceType: ResourceType,
    resourceId: string,
    fileId: string,
  ): Promise<{ success: boolean; url: string; expiresIn: number }> {
    // Check if resource exists
    const resource = await this.resourceQueryService.getResourceById(
      businessId,
      locationId,
      resourceType,
      resourceId,
    );

    if (!resource) {
      throw new NotFoundException(
        `Resource ${resourceType}/${resourceId} not found`,
      );
    }

    // Get file metadata
    const files = (resource.data?.files as FileMetadata[]) || [];
    const file = files.find((f) => f.id === fileId);

    if (!file) {
      throw new NotFoundException(`File ${fileId} not found in resource`);
    }

    // Generate presigned URL (valid for 1 hour)
    const expiresIn = 3600;
    const url = await this.s3Service.getPresignedUrl(file.s3Key, expiresIn);

    return {
      success: true,
      url,
      expiresIn,
    };
  }

  /**
   * Validate uploaded file
   */
  private validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Check file size
    if (file.size > this.MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${this.MAX_FILE_SIZE / 1024 / 1024}MB`,
      );
    }

    // Check MIME type
    if (!this.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type ${file.mimetype} is not allowed. Allowed types: ${this.ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }
  }

  /**
   * Generate S3 key for file storage
   */
  private generateS3Key(
    businessId: string,
    locationId: string,
    resourceType: string,
    resourceId: string,
    fileId: string,
    fileName: string,
  ): string {
    return `${businessId}-${locationId}/${resourceType}/${resourceId}/${fileId}-${fileName}`;
  }

  /**
   * Sanitize file name to prevent path traversal and special characters
   */
  private sanitizeFileName(fileName: string): string {
    return fileName
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_{2,}/g, '_')
      .toLowerCase();
  }
}

