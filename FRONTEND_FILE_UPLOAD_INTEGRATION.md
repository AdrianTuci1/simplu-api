# Frontend File Upload Integration Guide

## Overview

This guide explains how to integrate file upload functionality for `medic` and `patient` resources in your frontend application. The file upload system allows uploading images (JPEG, PNG) and 3D model files (OBJ) to existing resources.

## Important: Resource Must Exist First

⚠️ **Files can only be uploaded to existing resources.** You must first create the resource (medic/patient) and receive its `resourceId` before uploading files.

## System Architecture

```
Frontend → POST /resources/{businessId}-{locationId}
          ↓ (returns requestId)
App Server → Kinesis Stream
          ↓ (async processing)
Resources Server → Generates resourceId (e.g., me2410-00001)
                → Saves to database
                → Notifies via WebSocket

Frontend receives resourceId via WebSocket
          ↓
Frontend → POST /resources/{businessId}-{locationId}/files/{resourceType}/{resourceId}
          ↓ (uploads file with multipart/form-data)
App Server → Validates & uploads to S3
          → Updates resource metadata via Kinesis
```

## File Storage Structure

Files are stored in S3 with the following structure:

```
s3://simplu-resources/
  └── {businessId}-{locationId}/
      ├── medic/
      │   └── {medicId}/
      │       ├── {fileId}-profile.jpg
      │       ├── {fileId}-certificate.pdf
      │       └── {fileId}-diploma.jpg
      └── patient/
          └── {patientId}/
              ├── {fileId}-xray.jpg
              ├── {fileId}-document.pdf
              └── {fileId}-scan.obj
```

## File Constraints

- **Allowed MIME types:**
  - `image/jpeg`, `image/jpg`
  - `image/png`
  - `model/obj`
  - `application/pdf`
  
- **Maximum file size:** 10MB
- **Supported resource types:** `medic`, `patient`

## API Endpoints

### Base URL
```
https://api.simplu.io
```

### Authentication
All endpoints require Bearer token authentication:
```
Authorization: Bearer {cognito_jwt_token}
```

---

### 1. Upload File

**Endpoint:** `POST /resources/{businessId}-{locationId}/files/{resourceType}/{resourceId}`

**Request:**
- Content-Type: `multipart/form-data`
- Body: Form data with `file` field

**Parameters:**
- `businessId` - Business identifier
- `locationId` - Location identifier
- `resourceType` - Resource type (`medic` or `patient`)
- `resourceId` - **Must exist** (e.g., `me2410-00001`)

**Response (201 Created):**
```json
{
  "success": true,
  "file": {
    "id": "a1b2c3d4-5678-90ab-cdef-1234567890ab",
    "name": "certificate.jpg",
    "type": "image/jpeg",
    "size": 1024000,
    "s3Key": "business-123-location-456/medic/me2410-00001/a1b2c3d4-certificate.jpg",
    "uploadedAt": "2025-10-17T10:30:00Z",
    "uploadedBy": "user-id-123"
  },
  "message": "File uploaded successfully"
}
```

**Error Responses:**

```json
// 400 - Bad Request (invalid file type)
{
  "statusCode": 400,
  "message": "File type image/gif is not allowed. Allowed types: image/jpeg, image/jpg, image/png, model/obj, application/pdf"
}

// 400 - Bad Request (file too large)
{
  "statusCode": 400,
  "message": "File size exceeds maximum allowed size of 10MB"
}

// 404 - Not Found (resource doesn't exist)
{
  "statusCode": 404,
  "message": "Resource medic/me2410-00001 not found"
}

// 403 - Forbidden (insufficient permissions)
{
  "statusCode": 403,
  "message": "Insufficient permissions for this operation"
}
```

---

### 2. List Files

**Endpoint:** `GET /resources/{businessId}-{locationId}/files/{resourceType}/{resourceId}`

**Response (200 OK):**
```json
{
  "success": true,
  "files": [
    {
      "id": "a1b2c3d4-5678-90ab-cdef-1234567890ab",
      "name": "certificate.jpg",
      "type": "image/jpeg",
      "size": 1024000,
      "s3Key": "business-123-location-456/medic/me2410-00001/a1b2c3d4-certificate.jpg",
      "uploadedAt": "2025-10-17T10:30:00Z",
      "uploadedBy": "user-id-123"
    },
    {
      "id": "b2c3d4e5-6789-01bc-def0-2345678901bc",
      "name": "profile.png",
      "type": "image/png",
      "size": 512000,
      "s3Key": "business-123-location-456/medic/me2410-00001/b2c3d4e5-profile.png",
      "uploadedAt": "2025-10-17T11:00:00Z",
      "uploadedBy": "user-id-456"
    }
  ],
  "total": 2
}
```

---

### 3. Get File URL (Download)

**Endpoint:** `GET /resources/{businessId}-{locationId}/files/{resourceType}/{resourceId}/{fileId}/url`

**Response (200 OK):**
```json
{
  "success": true,
  "url": "https://simplu-resources.s3.amazonaws.com/business-123-location-456/medic/me2410-00001/a1b2c3d4-certificate.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=...",
  "expiresIn": 3600
}
```

**Note:** The presigned URL is valid for 1 hour (3600 seconds).

---

### 4. Delete File

**Endpoint:** `DELETE /resources/{businessId}-{locationId}/files/{resourceType}/{resourceId}/{fileId}`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "File deleted successfully"
}
```

---

## Frontend Implementation Examples

### React/TypeScript Example

```typescript
import axios from 'axios';

const API_BASE_URL = 'https://api.simplu.io';

// Helper to get auth token
const getAuthToken = () => {
  return localStorage.getItem('authToken');
};

// 1. Upload File
async function uploadFile(
  businessId: string,
  locationId: string,
  resourceType: 'medic' | 'patient',
  resourceId: string,
  file: File
): Promise<any> {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await axios.post(
      `${API_BASE_URL}/resources/${businessId}-${locationId}/files/${resourceType}/${resourceId}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${getAuthToken()}`,
        },
      }
    );

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.message || 'Upload failed');
    }
    throw error;
  }
}

// 2. List Files
async function listFiles(
  businessId: string,
  locationId: string,
  resourceType: 'medic' | 'patient',
  resourceId: string
): Promise<any> {
  const response = await axios.get(
    `${API_BASE_URL}/resources/${businessId}-${locationId}/files/${resourceType}/${resourceId}`,
    {
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
      },
    }
  );

  return response.data;
}

// 3. Get File URL
async function getFileUrl(
  businessId: string,
  locationId: string,
  resourceType: 'medic' | 'patient',
  resourceId: string,
  fileId: string
): Promise<string> {
  const response = await axios.get(
    `${API_BASE_URL}/resources/${businessId}-${locationId}/files/${resourceType}/${resourceId}/${fileId}/url`,
    {
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
      },
    }
  );

  return response.data.url;
}

// 4. Delete File
async function deleteFile(
  businessId: string,
  locationId: string,
  resourceType: 'medic' | 'patient',
  resourceId: string,
  fileId: string
): Promise<any> {
  const response = await axios.delete(
    `${API_BASE_URL}/resources/${businessId}-${locationId}/files/${resourceType}/${resourceId}/${fileId}`,
    {
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
      },
    }
  );

  return response.data;
}
```

### React Component Example

```tsx
import React, { useState, useEffect } from 'react';

interface FileMetadata {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
  uploadedBy?: string;
}

interface FileUploadProps {
  businessId: string;
  locationId: string;
  resourceType: 'medic' | 'patient';
  resourceId: string;
}

export const FileUploadComponent: React.FC<FileUploadProps> = ({
  businessId,
  locationId,
  resourceType,
  resourceId,
}) => {
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load existing files
  useEffect(() => {
    loadFiles();
  }, [resourceId]);

  const loadFiles = async () => {
    try {
      const data = await listFiles(businessId, locationId, resourceType, resourceId);
      setFiles(data.files);
    } catch (err) {
      console.error('Failed to load files:', err);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (file.size > 10 * 1024 * 1024) {
      setError('File size exceeds 10MB');
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'model/obj', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      await uploadFile(businessId, locationId, resourceType, resourceId, file);
      await loadFiles(); // Reload file list
      event.target.value = ''; // Clear input
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleFileDelete = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return;

    try {
      await deleteFile(businessId, locationId, resourceType, resourceId, fileId);
      await loadFiles(); // Reload file list
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleFileDownload = async (fileId: string) => {
    try {
      const url = await getFileUrl(businessId, locationId, resourceType, resourceId, fileId);
      window.open(url, '_blank');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="file-upload-component">
      <h3>Files for {resourceType} {resourceId}</h3>

      {/* Upload section */}
      <div className="upload-section">
        <input
          type="file"
          onChange={handleFileUpload}
          accept=".jpg,.jpeg,.png,.obj,.pdf"
          disabled={uploading}
        />
        {uploading && <span>Uploading...</span>}
      </div>

      {/* Error display */}
      {error && <div className="error">{error}</div>}

      {/* File list */}
      <div className="file-list">
        {files.length === 0 && <p>No files uploaded yet.</p>}
        {files.map((file) => (
          <div key={file.id} className="file-item">
            <span>{file.name}</span>
            <span>{(file.size / 1024).toFixed(2)} KB</span>
            <button onClick={() => handleFileDownload(file.id)}>Download</button>
            <button onClick={() => handleFileDelete(file.id)}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
};
```

---

## Complete Workflow Example

### Step 1: Create Resource

```typescript
// Create a medic resource
const createMedicResponse = await axios.post(
  `${API_BASE_URL}/resources/${businessId}-${locationId}`,
  {
    data: {
      name: "Dr. Ion Popescu",
      specialization: "Cardiologie",
      phone: "0721234567",
      email: "ion.popescu@example.com"
    }
  },
  {
    headers: {
      'X-Resource-Type': 'medic',
      'Authorization': `Bearer ${token}`,
    }
  }
);

// Response:
// {
//   "success": true,
//   "message": "create operation queued for processing",
//   "requestId": "abc-123-def-456",
//   "timestamp": "2025-10-17T10:00:00Z"
// }
```

### Step 2: Listen for Resource Creation (WebSocket)

```typescript
// Connect to WebSocket (using Phoenix Channels or similar)
const socket = new Phoenix.Socket('wss://notification.simplu.io/socket', {
  params: { token: authToken }
});

const channel = socket.channel(`resources:${businessId}-${locationId}`);

channel.on('resource_created', (payload) => {
  if (payload.resourceType === 'medic') {
    console.log('Medic created with ID:', payload.resourceId);
    // Now you can upload files
    setMedicId(payload.resourceId); // e.g., "me2410-00001"
    setCanUploadFiles(true);
  }
});

channel.join();
```

### Step 3: Upload Files

```typescript
// Now that we have the resourceId, we can upload files
const medicId = "me2410-00001"; // Received from WebSocket

// Upload profile photo
const profilePhoto = await fetch('path/to/profile.jpg').then(r => r.blob());
const profileFile = new File([profilePhoto], 'profile.jpg', { type: 'image/jpeg' });

await uploadFile(businessId, locationId, 'medic', medicId, profileFile);

// Upload certificate
const certificate = await fetch('path/to/certificate.pdf').then(r => r.blob());
const certFile = new File([certificate], 'certificate.pdf', { type: 'application/pdf' });

await uploadFile(businessId, locationId, 'medic', medicId, certFile);
```

### Step 4: Display Files

```typescript
// Get all files for the medic
const filesData = await listFiles(businessId, locationId, 'medic', medicId);

// Display files
filesData.files.forEach(async (file) => {
  const downloadUrl = await getFileUrl(businessId, locationId, 'medic', medicId, file.id);
  
  // For images, you can display them directly
  if (file.type.startsWith('image/')) {
    const img = document.createElement('img');
    img.src = downloadUrl;
    document.body.appendChild(img);
  }
});
```

---

## Best Practices

### 1. File Validation
Always validate files on the frontend before uploading:
```typescript
function validateFile(file: File): { valid: boolean; error?: string } {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'model/obj', 'application/pdf'];

  if (file.size > maxSize) {
    return { valid: false, error: 'File size exceeds 10MB' };
  }

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: `File type ${file.type} is not allowed` };
  }

  return { valid: true };
}
```

### 2. Progress Indication
Show upload progress to users:
```typescript
async function uploadFileWithProgress(
  businessId: string,
  locationId: string,
  resourceType: 'medic' | 'patient',
  resourceId: string,
  file: File,
  onProgress: (progress: number) => void
): Promise<any> {
  const formData = new FormData();
  formData.append('file', file);

  return axios.post(
    `${API_BASE_URL}/resources/${businessId}-${locationId}/files/${resourceType}/${resourceId}`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${getAuthToken()}`,
      },
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / (progressEvent.total || 1)
        );
        onProgress(percentCompleted);
      },
    }
  );
}
```

### 3. Error Handling
Implement comprehensive error handling:
```typescript
try {
  await uploadFile(businessId, locationId, 'medic', medicId, file);
} catch (error) {
  if (axios.isAxiosError(error)) {
    switch (error.response?.status) {
      case 400:
        alert('Invalid file or request');
        break;
      case 401:
        alert('Please log in again');
        // Redirect to login
        break;
      case 403:
        alert('You do not have permission to upload files');
        break;
      case 404:
        alert('Resource not found. Please create the resource first.');
        break;
      default:
        alert('Upload failed. Please try again.');
    }
  }
}
```

### 4. Cache Presigned URLs
Presigned URLs are valid for 1 hour, so you can cache them:
```typescript
const urlCache = new Map<string, { url: string; expiresAt: number }>();

async function getCachedFileUrl(
  businessId: string,
  locationId: string,
  resourceType: 'medic' | 'patient',
  resourceId: string,
  fileId: string
): Promise<string> {
  const cacheKey = `${businessId}-${locationId}-${resourceType}-${resourceId}-${fileId}`;
  const cached = urlCache.get(cacheKey);

  // Check if cached and not expired (with 5 min buffer)
  if (cached && cached.expiresAt > Date.now() + 5 * 60 * 1000) {
    return cached.url;
  }

  // Fetch new URL
  const url = await getFileUrl(businessId, locationId, resourceType, resourceId, fileId);
  urlCache.set(cacheKey, {
    url,
    expiresAt: Date.now() + 3600 * 1000, // 1 hour
  });

  return url;
}
```

### 5. Resource Metadata
After uploading files, the resource's `data.files` field is automatically updated. You can fetch the updated resource to see file metadata:
```typescript
const medicResource = await axios.get(
  `${API_BASE_URL}/resources/${businessId}-${locationId}/me2410-00001`,
  {
    headers: {
      'X-Resource-Type': 'medic',
      'Authorization': `Bearer ${token}`,
    }
  }
);

// medicResource.data.data.files will contain:
// [
//   {
//     "id": "file-uuid-1",
//     "name": "profile.jpg",
//     "type": "image/jpeg",
//     "size": 1024000,
//     "s3Key": "...",
//     "uploadedAt": "2025-10-17T10:30:00Z"
//   }
// ]
```

---

## Security Considerations

1. **Authentication Required**: All endpoints require valid Bearer tokens
2. **Permission Checks**: Users must have appropriate permissions for the resource
3. **File Type Validation**: Only specific MIME types are allowed
4. **File Size Limits**: Maximum 10MB per file
5. **Presigned URLs**: Temporary URLs expire after 1 hour
6. **Resource Isolation**: Files are organized per business-location for isolation

---

## Troubleshooting

### Problem: "Resource not found" error
**Solution:** Ensure the resource exists before uploading. Wait for the `resource_created` WebSocket event after creating the resource.

### Problem: "File type not allowed" error
**Solution:** Check the file's MIME type. Ensure it matches one of: `image/jpeg`, `image/jpg`, `image/png`, `model/obj`, `application/pdf`.

### Problem: "File size exceeds maximum"
**Solution:** Compress the file or reduce its quality before uploading. Maximum size is 10MB.

### Problem: "Presigned URL expired"
**Solution:** Request a new presigned URL. URLs are valid for 1 hour only.

### Problem: Upload fails silently
**Solution:** Check the browser console for errors. Ensure CORS is properly configured and the Bearer token is valid.

---

## Support

For additional support or questions:
- Check the API documentation at `https://api.simplu.io/docs`
- Review the backend logs for detailed error messages
- Contact the development team

---

## Changelog

### 2025-10-17
- Initial implementation of file upload system
- Support for medic and patient resources
- S3 integration with presigned URLs
- Maximum file size: 10MB
- Supported formats: JPEG, PNG, OBJ, PDF

