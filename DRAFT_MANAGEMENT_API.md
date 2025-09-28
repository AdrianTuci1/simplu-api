# Draft Management API

## Overview

This document describes the WebSocket API for draft management in the AI agent system. Drafts allow the AI agent to create, update, delete, and list draft documents for various business operations.

## Draft Types

### 1. Appointment Draft
```javascript
{
  draftType: 'appointment_draft',
  content: {
    patientName: 'John Doe',
    patientPhone: '+40123456789',
    serviceId: 'service_1',
    preferredDate: '2024-01-16',
    preferredTime: '10:00',
    notes: 'Regular checkup',
    status: 'pending'
  }
}
```

### 2. Patient Draft
```javascript
{
  draftType: 'patient_draft',
  content: {
    name: 'John Doe',
    phone: '+40123456789',
    email: 'john@example.com',
    dateOfBirth: '1990-01-01',
    address: 'Strada Principală 123',
    medicalHistory: [],
    notes: 'New patient'
  }
}
```

### 3. Service Draft
```javascript
{
  draftType: 'service_draft',
  content: {
    name: 'Consultație Generală',
    description: 'Consultație medicală generală',
    price: 100,
    duration: 30,
    category: 'general',
    isActive: true
  }
}
```

### 4. Report Draft
```javascript
{
  draftType: 'report_draft',
  content: {
    title: 'Raport Lunar',
    type: 'monthly',
    period: {
      start: '2024-01-01',
      end: '2024-01-31'
    },
    sections: [],
    status: 'draft'
  }
}
```

## WebSocket Events

### Create Draft

**Event**: `agent_create_draft`

**Request**:
```javascript
{
  event: 'agent_create_draft',
  topic: 'agent:sessionId',
  payload: {
    sessionId: 'business123:user456:1234567890',
    draftType: 'appointment_draft',
    content: {
      patientName: 'John Doe',
      serviceType: 'Consultație',
      preferredDate: '2024-01-16',
      preferredTime: '10:00'
    },
    businessId: 'business123',
    locationId: 'location_456'
  }
}
```

**Response**:
```javascript
{
  event: 'agent_draft_created',
  topic: 'agent:sessionId',
  payload: {
    success: true,
    draftId: 'draft_1234567890',
    message: 'Draft created successfully'
  }
}
```

### Update Draft

**Event**: `agent_update_draft`

**Request**:
```javascript
{
  event: 'agent_update_draft',
  topic: 'agent:sessionId',
  payload: {
    sessionId: 'business123:user456:1234567890',
    draftId: 'draft_1234567890',
    content: {
      patientName: 'John Doe',
      serviceType: 'Consultație',
      preferredDate: '2024-01-17',
      preferredTime: '11:00',
      notes: 'Updated appointment details'
    },
    businessId: 'business123',
    locationId: 'location_456'
  }
}
```

**Response**:
```javascript
{
  event: 'agent_draft_updated',
  topic: 'agent:sessionId',
  payload: {
    success: true,
    message: 'Draft updated successfully'
  }
}
```

### Delete Draft

**Event**: `agent_delete_draft`

**Request**:
```javascript
{
  event: 'agent_delete_draft',
  topic: 'agent:sessionId',
  payload: {
    sessionId: 'business123:user456:1234567890',
    draftId: 'draft_1234567890',
    businessId: 'business123',
    locationId: 'location_456'
  }
}
```

**Response**:
```javascript
{
  event: 'agent_draft_deleted',
  topic: 'agent:sessionId',
  payload: {
    success: true,
    message: 'Draft deleted successfully'
  }
}
```

### List Drafts

**Event**: `agent_list_drafts`

**Request**:
```javascript
{
  event: 'agent_list_drafts',
  topic: 'agent:sessionId',
  payload: {
    sessionId: 'business123:user456:1234567890',
    businessId: 'business123',
    locationId: 'location_456',
    filters: {
      draftType: 'appointment_draft',
      status: 'pending',
      dateRange: {
        start: '2024-01-01',
        end: '2024-01-31'
      }
    }
  }
}
```

**Response**:
```javascript
{
  event: 'agent_drafts_listed',
  topic: 'agent:sessionId',
  payload: {
    success: true,
    drafts: [
      {
        draftId: 'draft_1234567890',
        draftType: 'appointment_draft',
        content: {
          patientName: 'John Doe',
          serviceType: 'Consultație',
          preferredDate: '2024-01-16',
          preferredTime: '10:00'
        },
        status: 'pending',
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-15T10:30:00Z'
      }
    ],
    message: 'Drafts listed successfully'
  }
}
```

## Frontend Implementation

### Client Class

```javascript
class DraftManager {
  constructor(websocketClient) {
    this.client = websocketClient;
  }

  // Create a new draft
  createDraft(draftType, content) {
    this.client.send({
      event: 'agent_create_draft',
      topic: `agent:${this.client.sessionId}`,
      payload: {
        sessionId: this.client.sessionId,
        draftType: draftType,
        content: content,
        businessId: this.client.businessId,
        locationId: this.client.locationId
      }
    });
  }

  // Update an existing draft
  updateDraft(draftId, content) {
    this.client.send({
      event: 'agent_update_draft',
      topic: `agent:${this.client.sessionId}`,
      payload: {
        sessionId: this.client.sessionId,
        draftId: draftId,
        content: content,
        businessId: this.client.businessId,
        locationId: this.client.locationId
      }
    });
  }

  // Delete a draft
  deleteDraft(draftId) {
    this.client.send({
      event: 'agent_delete_draft',
      topic: `agent:${this.client.sessionId}`,
      payload: {
        sessionId: this.client.sessionId,
        draftId: draftId,
        businessId: this.client.businessId,
        locationId: this.client.locationId
      }
    });
  }

  // List drafts with filters
  listDrafts(filters = {}) {
    this.client.send({
      event: 'agent_list_drafts',
      topic: `agent:${this.client.sessionId}`,
      payload: {
        sessionId: this.client.sessionId,
        businessId: this.client.businessId,
        locationId: this.client.locationId,
        filters: filters
      }
    });
  }

  // Event handlers
  onDraftCreated(callback) {
    this.client.on('agent_draft_created', callback);
  }

  onDraftUpdated(callback) {
    this.client.on('agent_draft_updated', callback);
  }

  onDraftDeleted(callback) {
    this.client.on('agent_draft_deleted', callback);
  }

  onDraftsListed(callback) {
    this.client.on('agent_drafts_listed', callback);
  }
}
```

### Usage Examples

```javascript
// Initialize draft manager
const draftManager = new DraftManager(operatorClient);

// Create an appointment draft
draftManager.createDraft('appointment_draft', {
  patientName: 'John Doe',
  serviceType: 'Consultație',
  preferredDate: '2024-01-16',
  preferredTime: '10:00',
  notes: 'Regular checkup'
});

// Create a patient draft
draftManager.createDraft('patient_draft', {
  name: 'Jane Smith',
  phone: '+40123456789',
  email: 'jane@example.com',
  dateOfBirth: '1985-05-15',
  address: 'Strada Secundară 456'
});

// Update a draft
draftManager.updateDraft('draft_1234567890', {
  patientName: 'John Doe',
  serviceType: 'Consultație',
  preferredDate: '2024-01-17',
  preferredTime: '11:00',
  notes: 'Updated appointment details'
});

// Delete a draft
draftManager.deleteDraft('draft_1234567890');

// List drafts with filters
draftManager.listDrafts({
  draftType: 'appointment_draft',
  status: 'pending',
  dateRange: {
    start: '2024-01-01',
    end: '2024-01-31'
  }
});

// Set up event handlers
draftManager.onDraftCreated((payload) => {
  console.log('Draft created:', payload);
  // Handle draft creation
});

draftManager.onDraftUpdated((payload) => {
  console.log('Draft updated:', payload);
  // Handle draft update
});

draftManager.onDraftDeleted((payload) => {
  console.log('Draft deleted:', payload);
  // Handle draft deletion
});

draftManager.onDraftsListed((payload) => {
  console.log('Drafts listed:', payload);
  // Handle draft listing
});
```

## Error Handling

### Error Events

```javascript
{
  event: 'agent_draft_error',
  topic: 'agent:sessionId',
  payload: {
    success: false,
    message: 'Draft operation failed',
    error: 'Error details'
  }
}
```

### Error Types

- `DRAFT_CREATION_FAILED` - Failed to create draft
- `DRAFT_UPDATE_FAILED` - Failed to update draft
- `DRAFT_DELETION_FAILED` - Failed to delete draft
- `DRAFT_LISTING_FAILED` - Failed to list drafts
- `INVALID_DRAFT_TYPE` - Invalid draft type
- `DRAFT_NOT_FOUND` - Draft not found
- `UNAUTHORIZED_ACCESS` - Unauthorized access to draft

## Draft Status

### Status Values

- `pending` - Draft is pending approval
- `approved` - Draft has been approved
- `rejected` - Draft has been rejected
- `archived` - Draft has been archived
- `deleted` - Draft has been deleted

### Status Transitions

```
pending → approved
pending → rejected
approved → archived
rejected → pending (can be resubmitted)
archived → deleted
```

## Draft Filters

### Available Filters

```javascript
{
  draftType: 'appointment_draft' | 'patient_draft' | 'service_draft' | 'report_draft',
  status: 'pending' | 'approved' | 'rejected' | 'archived',
  dateRange: {
    start: '2024-01-01',
    end: '2024-01-31'
  },
  createdBy: 'user_id',
  businessId: 'business_id',
  locationId: 'location_id'
}
```

## Draft Content Validation

### Appointment Draft Validation

```javascript
{
  patientName: { required: true, type: 'string', maxLength: 100 },
  serviceType: { required: true, type: 'string' },
  preferredDate: { required: true, type: 'date' },
  preferredTime: { required: true, type: 'time' },
  notes: { required: false, type: 'string', maxLength: 500 }
}
```

### Patient Draft Validation

```javascript
{
  name: { required: true, type: 'string', maxLength: 100 },
  phone: { required: true, type: 'string', pattern: '^\\+?[1-9]\\d{1,14}$' },
  email: { required: false, type: 'email' },
  dateOfBirth: { required: false, type: 'date' },
  address: { required: false, type: 'string', maxLength: 200 }
}
```

## Security Considerations

1. **Authentication**: All draft operations require valid agent session
2. **Authorization**: Agents can only access drafts for their business/location
3. **Data Validation**: All draft content is validated before storage
4. **Audit Trail**: All draft operations are logged for audit purposes
5. **Data Encryption**: Draft content is encrypted in transit and at rest

## Performance Considerations

1. **Pagination**: Large draft lists are paginated
2. **Caching**: Frequently accessed drafts are cached
3. **Indexing**: Drafts are indexed by type, status, and date
4. **Cleanup**: Old archived drafts are automatically cleaned up
5. **Rate Limiting**: Draft operations are rate-limited per agent

This API provides a complete solution for draft management in the AI agent system, allowing agents to create, manage, and organize draft documents for various business operations.
