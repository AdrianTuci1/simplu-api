# Recent Activities API

## Overview

The Recent Activities API provides real-time information about business activities that occurred on the current day, focusing on appointments, patients, products, pickups, and sales. This endpoint is designed to give businesses a comprehensive overview of their daily operations and recent changes.

## Endpoint

```
GET /resources/{businessId}-{locationId}
```

**Headers:**
```
X-Resource-Type: recent-activities
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `businessId` | string | Yes | The business identifier |
| `locationId` | string | Yes | The location identifier |

## Headers

| Header | Type | Required | Description |
|--------|------|----------|-------------|
| `X-Resource-Type` | string | Yes | Type of data to retrieve: `recent-activities`, `statistics`, or specific resource type |

## Response Format

### Success Response (200)

```json
{
  "success": true,
  "data": [
    {
      "id": "123",
      "resourceType": "appointment",
      "resourceId": "appointment-001",
      "activityType": "appointment",
      "title": "Consultație Dentară",
      "description": "Programare nouă sau actualizată",
      "amount": 150.00,
      "status": "scheduled",
      "updatedAt": "2024-01-15T10:30:00.000Z",
      "createdAt": "2024-01-15T10:30:00.000Z"
    },
    {
      "id": "124",
      "resourceType": "patient",
      "resourceId": "patient-002",
      "activityType": "patient",
      "title": "Ion Popescu",
      "description": "Pacient nou sau actualizat",
      "amount": null,
      "status": "active",
      "updatedAt": "2024-01-15T14:20:00.000Z",
      "createdAt": "2024-01-15T14:20:00.000Z"
    },
    {
      "id": "125",
      "resourceType": "sales",
      "resourceId": "sale-003",
      "activityType": "sale",
      "title": "Vânzare Produs",
      "description": "Vânzare nouă",
      "amount": 75.00,
      "status": "completed",
      "updatedAt": "2024-01-15T16:45:00.000Z",
      "createdAt": "2024-01-15T16:45:00.000Z"
    }
  ],
  "meta": {
    "businessId": "test-business",
    "locationId": "test-location",
    "timestamp": "2024-01-15T16:00:00.000Z",
    "operation": "recent-activities"
  }
}
```

### Error Response (4xx/5xx)

```json
{
  "success": false,
  "message": "Error getting recent activities: Database connection failed",
  "meta": {
    "businessId": "test-business",
    "locationId": "test-location",
    "timestamp": "2024-01-15T16:00:00.000Z",
    "operation": "recent-activities"
  }
}
```

## Data Structure

### Activity Object

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier for the activity |
| `resourceType` | string | Type of resource (appointment, patient, product, pickups, sales) |
| `resourceId` | string | Original resource identifier |
| `activityType` | string | Type of activity: "appointment", "patient", "product", "pickup", "sale", or "other" |
| `title` | string | Human-readable title for the activity |
| `description` | string | Detailed description of the activity |
| `amount` | number | Optional: Amount associated with the activity |
| `status` | string | Optional: Current status of the activity |
| `updatedAt` | Date | When the activity was last updated |
| `createdAt` | Date | When the activity was created |

## Activity Types

### Appointments
- **Source**: `appointment` resources
- **Filter**: All appointments updated today
- **Date Filter**: Activities updated today (based on `updatedAt`)

### Patients
- **Source**: `patient` resources
- **Filter**: All patients updated today
- **Date Filter**: Activities updated today (based on `updatedAt`)

### Products
- **Source**: `product` resources
- **Filter**: All products updated today
- **Date Filter**: Activities updated today (based on `updatedAt`)

### Pickups
- **Source**: `pickups` resources
- **Filter**: All pickups updated today
- **Date Filter**: Activities updated today (based on `updatedAt`)

### Sales
- **Source**: `sales` resources
- **Filter**: All sales updated today
- **Date Filter**: Activities updated today (based on `updatedAt`)

## Business Logic

1. **Date Range**: Only activities from the current day are included
2. **Sorting**: Activities are sorted by update date (newest first)
3. **Data Sources**:
   - Appointments: All appointment entries
   - Patients: All patient entries
   - Products: All product entries
   - Pickups: All pickup entries
   - Sales: All sales entries
4. **Error Handling**: Individual query failures don't stop the entire operation

## Usage Examples

### cURL

```bash
curl -X GET \
  "http://localhost:3000/resources/test-business-test-location" \
  -H "Content-Type: application/json" \
  -H "X-Resource-Type: recent-activities"
```

### JavaScript

```javascript
const response = await fetch(
  'http://localhost:3000/resources/test-business-test-location',
  {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-Resource-Type': 'recent-activities',
    },
  }
);

const data = await response.json();
console.log('Recent activities:', data.data);
```

### Python

```python
import requests

response = requests.get(
    'http://localhost:3000/resources/test-business-test-location',
    headers={
        'Content-Type': 'application/json',
        'X-Resource-Type': 'recent-activities'
    }
)

data = response.json()
print('Recent activities:', data['data'])
```

## Testing

Use the provided test script to verify the functionality:

```bash
node scripts/test-recent-activities.js
```

## Implementation Details

### Database Queries

The API performs a single comprehensive query:

```sql
SELECT * FROM resources 
WHERE business_location_id = ? 
AND resource_type IN ('appointment', 'patient', 'product', 'pickups', 'sales')
AND updated_at >= ? 
AND updated_at < ?
ORDER BY updated_at DESC
```

### Performance Considerations

- Uses database indexes on `businessLocationId`, `resourceType`, and `updatedAt`
- Queries are optimized for current day data only
- Results are limited to relevant resource types
- Error handling prevents partial failures from affecting the entire response

## Related Endpoints

All statistics endpoints now use the same base URL with different `X-Resource-Type` headers:

- `GET /resources/{businessId}-{locationId}` with `X-Resource-Type: statistics` - General business statistics
- `GET /resources/{businessId}-{locationId}` with `X-Resource-Type: recent-activities` - Recent activities for current day
- `GET /resources/{businessId}-{locationId}` with `X-Resource-Type: {resourceType}` - Resource type specific statistics
- `GET /resources/{businessId}-{locationId}` with `X-Resource-Type: {resourceType}` - Regular resource queries
