# File Upload Module

## Overview

This module provides file upload functionality for `medic` and `patient` resources. Files are stored in AWS S3 and metadata is saved in the resource's `data.files` field.

## Architecture

```
FileUploadModule
├── FileUploadController - HTTP endpoints for file operations
├── FileUploadService - Business logic for file management
└── S3Service - AWS S3 integration
```

## Features

- ✅ Upload files to existing resources only
- ✅ Automatic S3 storage with organized structure
- ✅ File type validation (JPEG, PNG, OBJ, PDF)
- ✅ File size validation (max 10MB)
- ✅ Presigned URLs for secure downloads
- ✅ File metadata stored in resource
- ✅ Permission checks via PermissionService
- ✅ Full CRUD operations (create, read, delete)

## S3 Storage Structure

```
s3://simplu-resources/
  └── {businessId}-{locationId}/
      ├── medic/
      │   └── {medicId}/
      │       └── {fileId}-{sanitized-filename}
      └── patient/
          └── {patientId}/
              └── {fileId}-{sanitized-filename}
```

## File Metadata Format

Files metadata is stored in the resource's `data.files` array:

```json
{
  "data": {
    "name": "Dr. Ion Popescu",
    "files": [
      {
        "id": "uuid-123",
        "name": "certificate.jpg",
        "type": "image/jpeg",
        "size": 1024000,
        "s3Key": "business-location/medic/me2410-00001/uuid-123-certificate.jpg",
        "uploadedAt": "2025-10-17T10:00:00Z",
        "uploadedBy": "user-id"
      }
    ]
  }
}
```

## Endpoints

### 1. Upload File
- **Method:** POST
- **Path:** `/resources/:businessId-:locationId/files/:resourceType/:resourceId`
- **Body:** multipart/form-data with `file` field
- **Returns:** File metadata

### 2. List Files
- **Method:** GET
- **Path:** `/resources/:businessId-:locationId/files/:resourceType/:resourceId`
- **Returns:** Array of file metadata

### 3. Get File URL
- **Method:** GET
- **Path:** `/resources/:businessId-:locationId/files/:resourceType/:resourceId/:fileId/url`
- **Returns:** Presigned S3 URL (valid for 1 hour)

### 4. Delete File
- **Method:** DELETE
- **Path:** `/resources/:businessId-:locationId/files/:resourceType/:resourceId/:fileId`
- **Returns:** Success message

## Environment Variables

Add to your `.env` file:

```bash
# S3 bucket for resource files
S3_RESOURCES_BUCKET=simplu-resources

# AWS credentials (already configured)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
```

## Dependencies

Required packages (already added to package.json):

```json
{
  "dependencies": {
    "@aws-sdk/client-s3": "^3.846.0",
    "@aws-sdk/s3-request-presigner": "^3.846.0"
  },
  "devDependencies": {
    "@types/multer": "^1.4.11"
  }
}
```

## Usage Example

### Service Layer
```typescript
import { FileUploadService } from './file-upload/file-upload.service';

constructor(private fileUploadService: FileUploadService) {}

async uploadMedicCertificate(medicId: string, file: Express.Multer.File) {
  return this.fileUploadService.uploadFile(
    'business-123',
    'location-456',
    'medic',
    medicId,
    file,
    authenticatedUser
  );
}
```

### Controller Layer
The controller is already set up with proper authentication, validation, and Swagger documentation.

## Security

- ✅ Bearer token authentication required
- ✅ Permission checks via PermissionService
- ✅ File type whitelist validation
- ✅ File size limit enforcement (10MB)
- ✅ Presigned URLs expire after 1 hour
- ✅ S3 bucket isolation per business-location

## Error Handling

All errors are properly handled and returned with appropriate HTTP status codes:

- `400 Bad Request` - Invalid file, file too large, or wrong file type
- `401 Unauthorized` - Missing or invalid Bearer token
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource or file not found

## Workflow

1. **Create Resource** → Wait for `resource_created` WebSocket event → Get `resourceId`
2. **Upload File** → File stored in S3 + metadata saved to resource via Kinesis
3. **List Files** → Read from resource's `data.files` field
4. **Download File** → Generate presigned URL → User downloads directly from S3
5. **Delete File** → Remove from S3 + update resource metadata via Kinesis

## Integration with Resources Module

The file upload module integrates seamlessly with the resources module:

- Uses `ResourceQueryService` to verify resources exist
- Uses `PermissionService` for access control
- Uses `ResourcesService` to update resource metadata via Kinesis
- File metadata is stored in the resource's `data` field

## Testing

To test the file upload functionality:

1. Create a resource (medic/patient)
2. Wait for resource creation (check WebSocket or query API)
3. Upload a file using multipart/form-data
4. List files to verify upload
5. Get presigned URL and download file
6. Delete file

## Frontend Integration

See the comprehensive frontend integration guide:
- **File:** `/FRONTEND_FILE_UPLOAD_INTEGRATION.md`
- Includes React/TypeScript examples
- Complete workflow examples
- Best practices and error handling

## Maintenance

### Adding New File Types

To add new allowed file types, update `ALLOWED_MIME_TYPES` in `file-upload.service.ts`:

```typescript
private readonly ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'model/obj',
  'application/pdf',
  'image/gif',  // Add new type here
];
```

### Changing File Size Limit

Update `MAX_FILE_SIZE` in `file-upload.service.ts`:

```typescript
private readonly MAX_FILE_SIZE = 20 * 1024 * 1024; // Change to 20MB
```

Also update the `FileInterceptor` limit in `file-upload.controller.ts`:

```typescript
@UseInterceptors(
  FileInterceptor('file', {
    limits: {
      fileSize: 20 * 1024 * 1024, // Change to 20MB
    },
  }),
)
```

### Adding Support for More Resource Types

To add support for more resource types (e.g., `appointment`, `invoice`):

1. Update the validation in `file-upload.controller.ts`:
```typescript
if (!['medic', 'patient', 'appointment'].includes(resourceType)) {
  throw new BadRequestException(
    `File upload is only supported for 'medic', 'patient', and 'appointment' resources`,
  );
}
```

2. Update frontend documentation accordingly.

## Swagger Documentation

All endpoints are documented with Swagger/OpenAPI. Access the interactive API docs at:
```
http://localhost:3000/api/docs
```

## Troubleshooting

### Upload fails with 413 Payload Too Large
- Check nginx/proxy max body size configuration
- Verify file size is under 10MB

### S3 upload fails with permission errors
- Verify AWS credentials are correct
- Check IAM policy has S3 PutObject permission
- Verify bucket exists and is accessible

### Presigned URL returns 403 Forbidden
- URL may have expired (1 hour limit)
- Request a new presigned URL
- Verify S3 bucket policy allows GetObject

## Future Enhancements

Potential improvements for future versions:

- [ ] Image compression before upload
- [ ] Thumbnail generation for images
- [ ] Virus scanning integration
- [ ] Multiple file upload in single request
- [ ] File versioning
- [ ] Direct S3 upload from frontend (presigned POST)
- [ ] File search and filtering
- [ ] File categories/tags

