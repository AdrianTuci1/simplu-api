import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FileUploadController } from './file-upload.controller';
import { FileUploadService } from './file-upload.service';
import { S3Service } from './services/s3.service';
import { ResourcesModule } from '../resources/resources.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [ConfigModule, ResourcesModule, AuthModule],
  controllers: [FileUploadController],
  providers: [FileUploadService, S3Service],
  exports: [FileUploadService, S3Service],
})
export class FileUploadModule {}

