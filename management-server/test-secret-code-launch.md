# Test: Business Launch with Secret Code

## Overview
This document describes how to test launching businesses using a secret code instead of user authentication.

## Changes Made
1. **Created `LaunchBusinessDto`** with secret code validation
2. **Modified launch endpoint** to be public and accept secret code
3. **Added `launchBusinessWithSecret` method** with secret code validation
4. **Extracted common logic** into `launchBusinessInternal` method
5. **Added environment variable** `BUSINESS_LAUNCH_SECRET_CODE`

## Configuration

### Environment Variable
Add to your `.env` file:
```bash
BUSINESS_LAUNCH_SECRET_CODE=LAUNCH_SECRET_2024
```

Default value if not set: `LAUNCH_SECRET_2024`

## API Usage

### Endpoint
```
POST /businesses/{businessId}/launch
```

### Request Body
```json
{
  "secretCode": "LAUNCH_SECRET_2024"
}
```

### Headers
- **No authentication required** (endpoint is public)
- Content-Type: `application/json`

## Test Flow

### 1. Configure Business (Optional - can use existing)
```bash
POST /businesses/configure
Authorization: Bearer <token>
{
  "companyName": "Test Secret Business",
  "businessType": "dental",
  "locations": [
    {
      "name": "Main Office",
      "address": "123 Secret St",
      "timezone": "Europe/Bucharest"
    }
  ],
  "domainLabel": "test-secret-business"
}
```

**Expected Result**: Business created with `status: 'suspended'`

### 2. Launch Business with Secret Code
```bash
POST /businesses/{businessId}/launch
{
  "secretCode": "LAUNCH_SECRET_2024"
}
```

**Expected Result**: 
- Business becomes `active: true` and `status: 'active'`
- `paymentStatus` becomes `'active'`
- Infrastructure deployed successfully
- No authentication required

### 3. Test Invalid Secret Code
```bash
POST /businesses/{businessId}/launch
{
  "secretCode": "WRONG_CODE"
}
```

**Expected Result**: 
```json
{
  "statusCode": 400,
  "message": "Invalid secret code",
  "error": "Bad Request"
}
```

### 4. Verify Business Status
```bash
GET /businesses/{businessId}
Authorization: Bearer <token>
```

**Expected Result**: Business should be fully active and operational

## Security Notes

### Advantages
- ✅ **No authentication required** - can be called from anywhere
- ✅ **Simple secret-based access** - easy to integrate
- ✅ **Configurable secret** - can be changed via environment variable
- ✅ **Backward compatible** - old user auth method still works

### Security Considerations
- ⚠️ **Secret code is transmitted in request body** - use HTTPS
- ⚠️ **Anyone with the secret code can launch businesses** - keep it secure
- ⚠️ **No rate limiting implemented** - consider adding if needed
- ⚠️ **No audit trail** - consider adding logging for security

## Implementation Details

### Code Structure
```typescript
// New method for secret code validation
async launchBusinessWithSecret(businessId: string, secretCode: string): Promise<BusinessEntity>

// Internal method with common launch logic
private async launchBusinessInternal(businessId: string): Promise<BusinessEntity>

// Legacy method (still works)
async launchBusiness(businessId: string, user: any): Promise<BusinessEntity>
```

### Controller Changes
- Removed `@UseGuards(CognitoAuthGuard)` from launch endpoint
- Added `@SetMetadata('isPublic', true)` to make endpoint public
- Changed parameter from `@Req() req: any` to `@Body() body: LaunchBusinessDto`

### Service Changes
- Added secret code validation against environment variable
- Extracted common launch logic to avoid code duplication
- Maintained backward compatibility with user authentication

## Reverting Changes

To disable secret code and re-enable user authentication:

1. **Remove public metadata** from controller:
```typescript
// Remove this line:
@SetMetadata('isPublic', true)
```

2. **Restore auth guard**:
```typescript
// Add back:
@UseGuards(CognitoAuthGuard)
```

3. **Change endpoint signature** back to:
```typescript
async launchBusiness(@Req() req: any, @Param('id') businessId: string)
```

4. **Remove secret code method** and use only user authentication

## Testing Checklist

- [ ] Business launch with correct secret code works
- [ ] Business launch with incorrect secret code fails
- [ ] Business launch without secret code fails
- [ ] Business becomes active after successful launch
- [ ] Infrastructure deployment works
- [ ] Legacy user authentication still works
- [ ] Environment variable configuration works
- [ ] Default secret code works when env var not set
