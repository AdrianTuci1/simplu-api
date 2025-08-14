# Business Listing

## Overview

The business listing functionality shows all businesses that a user has access to, regardless of their status. This includes businesses that are configured but not yet paid for.

## Endpoint

### `GET /businesses`

**Description**: Returns all businesses accessible to the current user.

**Authentication**: Required (Bearer token)

**Response**: Array of `BusinessEntity` objects

## Business Access Types

A user can see businesses in the following scenarios:

### 1. **Owner Access** (`ownerUserId`)
- User is the owner of the business
- Can configure payment and launch the business
- Has full administrative rights

### 2. **Creator Access** (`createdByUserId`)
- User created the business (e.g., admin creating for client)
- Can view and manage the business
- Cannot configure payment or launch (only owner can)

### 3. **Authorized Email Access** (`authorizedEmails` or `ownerEmail`)
- User's email is in the authorized emails list
- User's email matches the owner email
- Can view the business

## Business Statuses

Businesses can have different statuses, and **all are visible** in the listing:

### `suspended` (Default after configuration)
- Business is configured but not yet paid for
- `active: false`
- `paymentStatus: "unpaid"`
- User can see it and proceed to payment

### `active` (After payment and launch)
- Business is fully operational
- `active: true`
- `paymentStatus: "active"`
- Infrastructure is deployed

### `deleted` (Soft delete)
- Business is marked as deleted
- `active: false`
- `deletedAt` is set
- Still visible in listing but marked as deleted

## Response Example

```json
[
  {
    "businessId": "b-uuid-1",
    "companyName": "My Dental Clinic",
    "businessType": "dental",
    "subscriptionType": "solo",
    "status": "suspended",
    "active": false,
    "paymentStatus": "unpaid",
    "locations": [
      {
        "id": "loc-1",
        "name": "Main Location",
        "address": "123 Main St",
        "active": true
      }
    ],
    "ownerUserId": "user-uuid",
    "ownerEmail": "owner@clinic.com",
    "createdByUserId": "user-uuid",
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T10:00:00.000Z"
  },
  {
    "businessId": "b-uuid-2",
    "companyName": "Active Gym",
    "businessType": "gym",
    "subscriptionType": "enterprise",
    "status": "active",
    "active": true,
    "paymentStatus": "active",
    "locations": [
      {
        "id": "loc-1",
        "name": "Downtown Gym",
        "address": "456 Downtown St",
        "active": true
      },
      {
        "id": "loc-2",
        "name": "Uptown Gym",
        "address": "789 Uptown St",
        "active": true
      }
    ],
    "ownerUserId": "user-uuid",
    "ownerEmail": "owner@gym.com",
    "createdByUserId": "user-uuid",
    "createdAt": "2024-01-10T10:00:00.000Z",
    "updatedAt": "2024-01-12T10:00:00.000Z"
  }
]
```

## Sorting

Businesses are sorted by creation date (newest first).

## Frontend Implementation

### For Suspended Businesses
- Show "Configure Payment" button
- Display warning that business is not yet active
- Allow user to proceed to payment setup

### For Active Businesses
- Show "Launch" or "Manage" button
- Display business as fully operational
- Allow access to business dashboard

### For Deleted Businesses
- Show "Deleted" status
- Optionally hide from main listing
- Keep in history for audit purposes

## Business Flow

1. **User configures business** → `status: "suspended"` → Visible in listing
2. **User sets up payment** → Still `status: "suspended"` → Still visible
3. **User completes payment** → `status: "active"` → Still visible, now operational
4. **User deletes business** → `status: "deleted"` → Still visible, marked as deleted

## Security

- Only businesses the user has access to are returned
- Access is determined by ownership, creation, or email authorization
- No filtering by status - all accessible businesses are shown
- User can see their suspended businesses and proceed with payment 