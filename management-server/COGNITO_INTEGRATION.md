# Cognito Integration for Management Server

## Overview

The management server is a general service for managing businesses across the entire platform. It includes AWS Cognito integration for **token validation only** - user management is handled by the central auth gateway (auth.simplu.io). This provides secure authentication and authorization for business management operations.

## Features

### Authentication
- **Token Validation**: Validates Cognito access tokens from central auth gateway
- **User Profile**: Retrieves current user information from token
- **Mock Support**: Development mode with mock users

### User Management
- **NOT SUPPORTED**: User management is handled by the central auth gateway (auth.simplu.io)
- **Token Validation Only**: Management server only validates tokens and extracts user info

### Authorization
- **Role-Based Access Control**: Different roles with specific permissions
- **Permission Validation**: Check specific permissions for actions
- **Guards**: Protect endpoints with authentication and role requirements

## Roles and Permissions

### Super Admin
- Full system access across all businesses
- Can manage all users and businesses globally
- Can delete users and businesses
- System-level permissions for the entire platform

**Permissions:**
- `create:business`
- `read:business`
- `update:business`
- `delete:business`
- `manage:users`
- `manage:infrastructure`
- `manage:payments`
- `view:analytics`
- `manage:system`

### Admin
- Global business management across the platform
- User management for the entire system
- Infrastructure management for all businesses

**Permissions:**
- `create:business`
- `read:business`
- `update:business`
- `delete:business`
- `manage:users`
- `manage:infrastructure`
- `manage:payments`
- `view:analytics`

### Manager
- Read and update businesses across the platform
- Manage users globally
- View analytics for all businesses

**Permissions:**
- `read:business`
- `update:business`
- `manage:users`
- `view:analytics`

### User
- Basic read access to business information

**Permissions:**
- `read:business`

## API Endpoints

### Authentication
- `POST /auth/validate-token` - Validate access token from central auth gateway
- `GET /auth/profile` - Get current user profile from token

### User Management
- **NOT SUPPORTED** - User management endpoints are not available
- **Use central auth gateway** (auth.simplu.io) for user management operations

### Business Management (Protected)
All business endpoints now require authentication and appropriate roles for global management:
- `POST /businesses` - Create business (Admin/Super Admin)
- `GET /businesses` - List all businesses (Admin/Super Admin/Manager)
- `GET /businesses/:id` - Get business details (Admin/Super Admin/Manager)
- `PUT /businesses/:id` - Update business (Admin/Super Admin/Manager)
- `DELETE /businesses/:id` - Delete business (Admin/Super Admin)
- `POST /businesses/:id/register-shards` - Register shards (Admin/Super Admin)

## Configuration

### Environment Variables

Add these to your `.env` file:

```env
# Cognito Configuration
COGNITO_USER_POOL_ID=us-east-1_xxxxxxxxx
COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx

# JWT Configuration
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=1h
```

### AWS Cognito Setup

1. **Create User Pool**:
   - Go to AWS Cognito Console
   - Create a new User Pool
   - Configure sign-in experience
   - Set up password policy

2. **Create App Client**:
   - Create an app client in your user pool
   - Note the Client ID

3. **Create Groups**:
   - Create groups for different roles:
     - `super_admin`
     - `admin`
     - `manager`
     - `user`

4. **Custom Attributes**:
   - No custom attributes needed for management server (general service)

## Usage Examples

### Creating a Business (with Authentication)

```bash
# First, get an access token from the central auth gateway (auth.simplu.io)
# Then use it in the Authorization header

curl -X POST http://localhost:3001/businesses \
  -H "Authorization: Bearer YOUR_COGNITO_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "My Business",
    "registrationNumber": "123456789",
    "businessType": "dental",
    "locations": [
      {
        "name": "Main Office",
        "address": "123 Main St",
        "phone": "+1234567890",
        "email": "contact@mybusiness.com"
      }
    ]
  }'
```

### Validating Token

```bash
curl -X POST http://localhost:3001/auth/validate-token \
  -H "Content-Type: application/json" \
  -d '{
    "accessToken": "YOUR_COGNITO_ACCESS_TOKEN"
  }'
```

### Getting User Profile

```bash
curl -X GET http://localhost:3001/auth/profile \
  -H "Authorization: Bearer YOUR_COGNITO_ACCESS_TOKEN"
```

### User Management

**User management is not supported in management server. Use the central auth gateway:**

```bash
# For user creation, updates, deletion - use auth.simplu.io
# Management server only validates tokens and manages businesses
```

## Development Mode

In development mode, the system uses mock users when Cognito is not available. Mock users are generated based on the token hash and include admin permissions for testing.

## Security Considerations

1. **Token Validation**: Always validate tokens on protected endpoints
2. **Role-Based Access**: Use appropriate roles for different operations
3. **Permission Checking**: Validate specific permissions when needed
4. **Environment Variables**: Keep Cognito credentials secure
5. **HTTPS**: Use HTTPS in production for all API calls

## Error Handling

The system provides clear error messages for:
- Invalid tokens
- Missing permissions
- User not found
- Role validation failures

## Migration from Previous Version

If you're upgrading from a version without Cognito:

1. Install new dependencies: `npm install`
2. Add Cognito environment variables
3. Update API calls to include Authorization headers
4. Test authentication flow
5. Update any client applications to handle authentication

## Troubleshooting

### Common Issues

1. **"Bearer token required"**: Missing or malformed Authorization header
2. **"User does not have required roles"**: User lacks necessary permissions
3. **"Invalid token"**: Token is expired or invalid
4. **Cognito connection errors**: Check AWS credentials and region

### Debug Mode

Enable debug logging by setting `NODE_ENV=development` and check the console for detailed error messages. 