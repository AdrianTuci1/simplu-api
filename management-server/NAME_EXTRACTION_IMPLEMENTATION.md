# Name Extraction Implementation

## Overview

The management server now automatically extracts `firstName` and `lastName` from Cognito's `name` attribute and populates the users table. This handles the common scenario where Cognito returns a full name as a single field. The implementation only uses the basic user information that Cognito actually provides (userId, username, email, name) and stores additional user data in the DynamoDB users table.

## Implementation Details

### Files Modified

1. **`src/modules/auth/auth.service.ts`**
   - Simplified `CognitoUser` interface to only include fields Cognito actually provides
   - Added `name`, `firstName`, `lastName` fields to `CognitoUser` interface
   - Added `splitFullName()` utility function
   - Updated `getUserInfo()` to extract and split name from Cognito attributes
   - Simplified `getMockUser()` for development (removed mock roles/permissions)
   - Removed unused role/permission management methods

2. **`src/users/users.service.ts`**
   - Updated all methods to accept optional `firstName` and `lastName` parameters
   - Modified `getMe()` to automatically populate name fields from Cognito data
   - Enhanced profile creation to include extracted name data

3. **`src/users/users.controller.ts`**
   - Updated all endpoints to pass name data from authenticated user to service methods

### Name Extraction Logic

The `splitFullName()` function handles various name formats:

```typescript
// Examples of how names are split:
"John Doe" → firstName: "John", lastName: "Doe"
"Dr. John Smith Jr." → firstName: "Dr.", lastName: "John Smith Jr."
"Jean-Claude Van Damme" → firstName: "Jean-Claude", lastName: "Van Damme"
"SingleName" → firstName: "SingleName", lastName: ""
"Multiple Word Last Name" → firstName: "Multiple", lastName: "Word Last Name"
```

### Cognito Attribute Mapping

The system looks for the name in these Cognito attributes (in order):
1. `name` (standard Cognito attribute)
2. `custom:name` (custom attribute)

### Automatic Population

When a user profile is created or retrieved:

1. **If name data exists in Cognito** and the profile doesn't have `firstName`/`lastName`:
   - Automatically extracts and stores the name data
   - Updates the profile in DynamoDB

2. **If name data already exists in profile**:
   - Preserves existing name data
   - No overwrite occurs

### Response Format

The `GET /users/me` endpoint now returns:

```json
{
  "userId": "user-123",
  "email": "john.doe@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890",
  "billingAddress": {
    "company": "Acme Corp",
    "street": "123 Main St",
    "city": "New York",
    "district": "NY",
    "postalCode": "10001",
    "country": "US"
  },
  "entityType": "srl",
  "registrationNumber": "J12/123/2024",
  "taxCode": "RO12345678",
  "stripeCustomerId": "cus_abc123",
  "defaultPaymentMethodId": "pm_xyz789",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

## Testing

### Name Extraction Test

Run the test script to verify name extraction logic:

```bash
node scripts/test-name-extraction.js
```

This will test various name formats and show how they're split.

### API Test

Test the actual API endpoint:

```bash
# Start the server
npm run start:dev

# Run the test (requires valid JWT token)
node scripts/test-name-extraction.js
```

## Development Mode

In development mode, simple mock users are created with basic information:

- userId: `user-{hash}`
- username: `user{hash}`
- email: `user{hash}@example.com`
- name: `User {hash}`
- firstName: `User`
- lastName: `{hash}`

## Migration Notes

### For Existing Users

- Existing profiles without `firstName`/`lastName` will be populated on next login
- Existing profiles with name data will be preserved
- No data loss occurs

### For New Users

- New profiles are automatically created with extracted name data
- The process is transparent to the user

## Error Handling

- Empty or null names are handled gracefully
- Whitespace-only names return empty strings
- Invalid input types are safely handled
- No exceptions are thrown during name extraction

## Security Considerations

- Name data is only extracted from validated Cognito tokens
- No user input is used for name extraction (only Cognito attributes)
- The extraction process is read-only for Cognito data 