import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  GetObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface S3UploadResult {
  key: string;
  bucket: string;
  location: string;
  etag?: string;
}

export interface S3FileMetadata {
  key: string;
  size: number;
  lastModified: Date;
  contentType: string;
}

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly region: string;

  constructor(private readonly configService: ConfigService) {
    this.region = this.configService.get('AWS_REGION', 'us-east-1');
    this.bucket =
      this.configService.get('S3_RESOURCES_BUCKET') || 'simplu-resources';

    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY');

    if (!accessKeyId || !secretAccessKey) {
      throw new Error('AWS credentials not configured');
    }

    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    this.logger.log(
      `S3 Service initialized with bucket: ${this.bucket}, region: ${this.region}`,
    );
  }

  /**
   * Upload a file to S3
   */
  async uploadFile(
    key: string,
    buffer: Buffer,
    contentType: string,
    metadata?: Record<string, string>,
  ): Promise<S3UploadResult> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        Metadata: metadata,
      });

      const result = await this.s3Client.send(command);

      this.logger.log(`File uploaded successfully to S3: ${key}`);

      return {
        key,
        bucket: this.bucket,
        location: `s3://${this.bucket}/${key}`,
        etag: result.ETag,
      };
    } catch (error) {
      this.logger.error(`Failed to upload file to S3: ${error.message}`);
      throw new Error(`S3 upload failed: ${error.message}`);
    }
  }

  /**
   * Delete a file from S3
   */
  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(command);
      this.logger.log(`File deleted successfully from S3: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete file from S3: ${error.message}`);
      throw new Error(`S3 delete failed: ${error.message}`);
    }
  }

  /**
   * List files in a specific S3 directory
   */
  async listFiles(prefix: string): Promise<S3FileMetadata[]> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
      });

      const response = await this.s3Client.send(command);

      if (!response.Contents || response.Contents.length === 0) {
        return [];
      }

      return response.Contents.filter((item) => item.Key && item.Size !== undefined && item.LastModified).map((item) => ({
        key: item.Key!,
        size: item.Size!,
        lastModified: item.LastModified!,
        contentType: 'application/octet-stream', // Default, will be fetched if needed
      }));
    } catch (error) {
      this.logger.error(`Failed to list files from S3: ${error.message}`);
      throw new Error(`S3 list failed: ${error.message}`);
    }
  }

  /**
   * Generate a presigned URL for temporary file access
   */
  async getPresignedUrl(
    key: string,
    expiresIn: number = 3600,
  ): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const url = await getSignedUrl(this.s3Client, command, { expiresIn });
      this.logger.log(`Generated presigned URL for: ${key}`);
      return url;
    } catch (error) {
      this.logger.error(
        `Failed to generate presigned URL: ${error.message}`,
      );
      throw new Error(`Presigned URL generation failed: ${error.message}`);
    }
  }

  /**
   * Check if a file exists in S3
   */
  async fileExists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error) {
      if (error.name === 'NotFound') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(key: string): Promise<S3FileMetadata | null> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.s3Client.send(command);

      return {
        key,
        size: response.ContentLength || 0,
        lastModified: response.LastModified || new Date(),
        contentType: response.ContentType || 'application/octet-stream',
      };
    } catch (error) {
      if (error.name === 'NotFound') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Delete multiple files (bulk delete)
   */
  async deleteMultipleFiles(keys: string[]): Promise<void> {
    try {
      const deletePromises = keys.map((key) => this.deleteFile(key));
      await Promise.all(deletePromises);
      this.logger.log(`Deleted ${keys.length} files from S3`);
    } catch (error) {
      this.logger.error(`Failed to delete multiple files: ${error.message}`);
      throw new Error(`Bulk delete failed: ${error.message}`);
    }
  }
}

