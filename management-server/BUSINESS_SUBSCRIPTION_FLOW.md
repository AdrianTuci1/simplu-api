# Business Subscription Flow

## Overview

The business creation and subscription flow has been improved to automatically determine subscription types based on the number of locations, making the process more intuitive and reducing user confusion.

## Flow Steps

### Step 1: Business Configuration (`POST /businesses/configure`)

**What happens:**
- Business is created with `status: 'suspended'` and `active: false`
- **Subscription type is automatically determined:**
  - 1 location → `subscriptionType: 'solo'`
  - 2+ locations → `subscriptionType: 'enterprise'`
- No subscription type needs to be specified in the request

**Request body:**
```json
{
  "companyName": "My Business",
  "businessType": "dental",
  "locations": [
    {
      "name": "Main Location",
      "address": "123 Main St",
      "timezone": "Europe/Bucharest"
    }
  ],
  "settings": {
    "currency": "RON",
    "language": "ro"
  }
}
```

**Response:**
```json
{
  "businessId": "uuid",
  "companyName": "My Business",
  "subscriptionType": "solo", // Automatically determined
  "status": "suspended",
  "active": false,
  // ... other fields
}
```

### Step 2: Payment Setup (`POST /businesses/:id/payment`)

**What happens:**
- User only needs to specify plan, billing interval, and currency
- Subscription type is automatically used from business configuration
- Stripe subscription is created

**Request body:**
```json
{
  "planKey": "basic",
  "billingInterval": "month",
  "currency": "ron"
}
```

**Response:**
```json
{
  "subscriptionId": "sub_xxx",
  "status": "incomplete",
  "clientSecret": "pi_xxx_secret_xxx"
}
```

### Step 3: Business Launch (`POST /businesses/:id/launch`)

**What happens:**
- Business is activated (`active: true`, `status: 'active'`)
- Infrastructure is deployed
- Shards are created for each location

## Business Rules

### Solo Plan Constraints
- **Maximum 1 location allowed**
- If user tries to create business with 2+ locations, it automatically becomes `enterprise`
- If user tries to update business to have 2+ locations on solo plan, validation error is thrown

### Enterprise Plan
- **Unlimited locations allowed**
- Automatically assigned when business has 2+ locations

### Automatic Updates
- When locations are updated via `PUT /businesses/:id`, subscription type is automatically recalculated
- If location count changes from 1 to 2+, subscription type changes from `solo` to `enterprise`
- If location count changes from 2+ to 1, subscription type changes from `enterprise` to `solo`

## Migration Notes

### For Existing Businesses
- Existing businesses with `subscriptionType: 'solo'` and multiple locations will need to be updated
- Consider running a migration script to fix inconsistencies

### API Changes
- `subscriptionType` is no longer required in business creation requests
- `subscriptionType` is no longer required in payment setup requests
- The field is still present in responses for backward compatibility

## Benefits

1. **Simplified User Experience**: Users don't need to understand subscription types
2. **Reduced Errors**: No more mismatched subscription types and location counts
3. **Automatic Scaling**: Subscription type automatically adjusts as business grows
4. **Clearer Logic**: 1 location = solo, multiple locations = enterprise

## Validation Rules

```typescript
// Solo plan validation
if (locations.length > 1 && subscriptionType === 'solo') {
  throw new BadRequestException('Planul solo permite o singură locație');
}

// Automatic subscription type determination
const subscriptionType = locations.length === 1 ? 'solo' : 'enterprise';
``` 