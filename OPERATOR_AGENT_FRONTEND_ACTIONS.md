# Operator Agent Frontend Actions

## Overview

This document describes the WebSocket topics and actions that allow the operator agent to interrogate frontend resources and make modifications.

## WebSocket Topics

### 1. Agent Resource Interrogation

#### Topic: `agent_request_frontend_resources`

**Purpose**: Agent requests data from frontend

**Request Format**:
```javascript
{
  event: 'agent_request_frontend_resources',
  topic: 'agent:sessionId',
  payload: {
    sessionId: 'business123:user456:1234567890',
    requestType: 'get_services' | 'get_appointments' | 'get_business_info' | 'get_available_dates',
    parameters: {
      // Request-specific parameters
    },
    businessId: 'business123',
    locationId: 'location_456'
  }
}
```

**Response Format**:
```javascript
{
  event: 'agent_frontend_resources_response',
  topic: 'agent:sessionId',
  payload: {
    success: true,
    resources: {
      // Frontend data
    },
    message: 'Resources retrieved successfully'
  }
}
```

### 2. Agent Command Execution

#### Topic: `agent_execute_command`

**Purpose**: Agent executes commands on frontend resources

**Request Format**:
```javascript
{
  event: 'agent_execute_command',
  topic: 'agent:sessionId',
  payload: {
    sessionId: 'business123:user456:1234567890',
    command: 'create_appointment' | 'update_service' | 'delete_appointment' | 'modify_business_info',
    parameters: {
      // Command-specific parameters
    },
    businessId: 'business123',
    locationId: 'location_456'
  }
}
```

**Response Format**:
```javascript
{
  event: 'agent_command_result',
  topic: 'agent:sessionId',
  payload: {
    success: true,
    result: {
      // Command execution result
    },
    message: 'Command executed successfully'
  }
}
```

### 3. Agent Query Modification

#### Topic: `agent_modify_query`

**Purpose**: Agent modifies queries for better data retrieval

**Request Format**:
```javascript
{
  event: 'agent_modify_query',
  topic: 'agent:sessionId',
  payload: {
    sessionId: 'business123:user456:1234567890',
    repositoryType: 'appointments' | 'services' | 'business_info' | 'available_dates',
    modifications: {
      filters: {},
      sorting: {},
      pagination: {}
    },
    businessId: 'business123',
    locationId: 'location_456'
  }
}
```

**Response Format**:
```javascript
{
  event: 'agent_query_modified',
  topic: 'agent:sessionId',
  payload: {
    success: true,
    modifiedQuery: {
      // Modified query structure
    },
    message: 'Query modified successfully'
  }
}
```

### 4. Agent Changes Approval

#### Topic: `agent_approve_changes`

**Purpose**: Agent approves pending changes

**Request Format**:
```javascript
{
  event: 'agent_approve_changes',
  topic: 'agent:sessionId',
  payload: {
    sessionId: 'business123:user456:1234567890',
    changeId: 'change_1234567890',
    businessId: 'business123',
    locationId: 'location_456'
  }
}
```

**Response Format**:
```javascript
{
  event: 'agent_changes_approved',
  topic: 'agent:sessionId',
  payload: {
    success: true,
    message: 'Changes approved successfully'
  }
}
```

### 5. Agent Changes Rejection

#### Topic: `agent_reject_changes`

**Purpose**: Agent rejects pending changes

**Request Format**:
```javascript
{
  event: 'agent_reject_changes',
  topic: 'agent:sessionId',
  payload: {
    sessionId: 'business123:user456:1234567890',
    changeId: 'change_1234567890',
    reason: 'Invalid data provided',
    businessId: 'business123',
    locationId: 'location_456'
  }
}
```

**Response Format**:
```javascript
{
  event: 'agent_changes_rejected',
  topic: 'agent:sessionId',
  payload: {
    success: true,
    message: 'Changes rejected successfully'
  }
}
```

### 6. Agent Draft Creation

#### Topic: `agent_create_draft`

**Purpose**: Agent creates drafts

**Request Format**:
```javascript
{
  event: 'agent_create_draft',
  topic: 'agent:sessionId',
  payload: {
    sessionId: 'business123:user456:1234567890',
    draftType: 'appointment_draft|patient_draft|service_draft|report_draft',
    content: {
      // Draft content
    },
    businessId: 'business123',
    locationId: 'location_456'
  }
}
```

**Response Format**:
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

### 7. Agent Draft Update

#### Topic: `agent_update_draft`

**Purpose**: Agent updates existing drafts

**Request Format**:
```javascript
{
  event: 'agent_update_draft',
  topic: 'agent:sessionId',
  payload: {
    sessionId: 'business123:user456:1234567890',
    draftId: 'draft_1234567890',
    content: {
      // Updated draft content
    },
    businessId: 'business123',
    locationId: 'location_456'
  }
}
```

**Response Format**:
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

### 8. Agent Draft Deletion

#### Topic: `agent_delete_draft`

**Purpose**: Agent deletes drafts

**Request Format**:
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

**Response Format**:
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

### 9. Agent Draft Listing

#### Topic: `agent_list_drafts`

**Purpose**: Agent lists drafts with filters

**Request Format**:
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

**Response Format**:
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
        content: {},
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

### Client Class for Operator Agent Actions

```javascript
class OperatorAgentClient {
  constructor(businessId, locationId, websocketUrl = 'ws://localhost:4000/socket/websocket') {
    this.businessId = businessId;
    this.locationId = locationId;
    this.websocketUrl = websocketUrl;
    this.socket = null;
    this.isConnected = false;
    this.sessionId = null;
  }

  connect() {
    this.socket = new WebSocket(this.websocketUrl);
    
    this.socket.onopen = () => {
      console.log('Operator Agent WebSocket connected');
      this.isConnected = true;
      this.joinAgentChannel();
    };

    this.socket.onmessage = (event) => {
      this.handleMessage(event);
    };

    this.socket.onclose = () => {
      console.log('Operator Agent WebSocket disconnected');
      this.isConnected = false;
    };

    this.socket.onerror = (error) => {
      console.error('Operator Agent WebSocket error:', error);
    };
  }

  joinAgentChannel() {
    this.sessionId = `${this.businessId}:operator:${Date.now()}`;
    
    this.send({
      event: 'phx_join',
      topic: `agent:${this.sessionId}`,
      payload: { 
        businessId: this.businessId,
        locationId: this.locationId 
      },
      ref: '1'
    });
  }

  send(data) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data));
    } else {
      console.error('WebSocket not connected');
    }
  }

  handleMessage(event) {
    const data = JSON.parse(event.data);
    
    switch (data.event) {
      case 'phx_reply':
        console.log('Joined agent channel:', data.topic);
        break;
        
      case 'agent_frontend_resources_response':
        this.handleResourceResponse(data.payload);
        break;
        
      case 'agent_command_result':
        this.handleCommandResult(data.payload);
        break;
        
      case 'agent_query_modified':
        this.handleQueryModified(data.payload);
        break;
        
      case 'agent_changes_approved':
        this.handleChangesApproved(data.payload);
        break;
        
        case 'agent_changes_rejected':
          this.handleChangesRejected(data.payload);
          break;
          
        case 'agent_draft_created':
          this.handleDraftCreated(data.payload);
          break;
          
        case 'agent_draft_updated':
          this.handleDraftUpdated(data.payload);
          break;
          
        case 'agent_draft_deleted':
          this.handleDraftDeleted(data.payload);
          break;
          
        case 'agent_drafts_listed':
          this.handleDraftsListed(data.payload);
          break;
    }
  }

  // Request frontend resources
  requestFrontendResources(requestType, parameters = {}) {
    this.send({
      event: 'agent_request_frontend_resources',
      topic: `agent:${this.sessionId}`,
      payload: {
        sessionId: this.sessionId,
        requestType: requestType,
        parameters: parameters,
        businessId: this.businessId,
        locationId: this.locationId
      }
    });
  }

  // Execute command
  executeCommand(command, parameters = {}) {
    this.send({
      event: 'agent_execute_command',
      topic: `agent:${this.sessionId}`,
      payload: {
        sessionId: this.sessionId,
        command: command,
        parameters: parameters,
        businessId: this.businessId,
        locationId: this.locationId
      }
    });
  }

  // Modify query
  modifyQuery(repositoryType, modifications = {}) {
    this.send({
      event: 'agent_modify_query',
      topic: `agent:${this.sessionId}`,
      payload: {
        sessionId: this.sessionId,
        repositoryType: repositoryType,
        modifications: modifications,
        businessId: this.businessId,
        locationId: this.locationId
      }
    });
  }

  // Approve changes
  approveChanges(changeId) {
    this.send({
      event: 'agent_approve_changes',
      topic: `agent:${this.sessionId}`,
      payload: {
        sessionId: this.sessionId,
        changeId: changeId,
        businessId: this.businessId,
        locationId: this.locationId
      }
    });
  }

  // Reject changes
  rejectChanges(changeId, reason) {
    this.send({
      event: 'agent_reject_changes',
      topic: `agent:${this.sessionId}`,
      payload: {
        sessionId: this.sessionId,
        changeId: changeId,
        reason: reason,
        businessId: this.businessId,
        locationId: this.locationId
      }
    });
  }

  // Draft management methods
  createDraft(draftType, content) {
    this.send({
      event: 'agent_create_draft',
      topic: `agent:${this.sessionId}`,
      payload: {
        sessionId: this.sessionId,
        draftType: draftType,
        content: content,
        businessId: this.businessId,
        locationId: this.locationId
      }
    });
  }

  updateDraft(draftId, content) {
    this.send({
      event: 'agent_update_draft',
      topic: `agent:${this.sessionId}`,
      payload: {
        sessionId: this.sessionId,
        draftId: draftId,
        content: content,
        businessId: this.businessId,
        locationId: this.locationId
      }
    });
  }

  deleteDraft(draftId) {
    this.send({
      event: 'agent_delete_draft',
      topic: `agent:${this.sessionId}`,
      payload: {
        sessionId: this.sessionId,
        draftId: draftId,
        businessId: this.businessId,
        locationId: this.locationId
      }
    });
  }

  listDrafts(filters = {}) {
    this.send({
      event: 'agent_list_drafts',
      topic: `agent:${this.sessionId}`,
      payload: {
        sessionId: this.sessionId,
        businessId: this.businessId,
        locationId: this.locationId,
        filters: filters
      }
    });
  }

  // Event handlers (to be implemented by frontend)
  handleResourceResponse(payload) {
    console.log('Resource response:', payload);
    // Implement frontend logic
  }

  handleCommandResult(payload) {
    console.log('Command result:', payload);
    // Implement frontend logic
  }

  handleQueryModified(payload) {
    console.log('Query modified:', payload);
    // Implement frontend logic
  }

  handleChangesApproved(payload) {
    console.log('Changes approved:', payload);
    // Implement frontend logic
  }

  handleChangesRejected(payload) {
    console.log('Changes rejected:', payload);
    // Implement frontend logic
  }

  // Draft event handlers (to be implemented by frontend)
  handleDraftCreated(payload) {
    console.log('Draft created:', payload);
    // Implement frontend logic
  }

  handleDraftUpdated(payload) {
    console.log('Draft updated:', payload);
    // Implement frontend logic
  }

  handleDraftDeleted(payload) {
    console.log('Draft deleted:', payload);
    // Implement frontend logic
  }

  handleDraftsListed(payload) {
    console.log('Drafts listed:', payload);
    // Implement frontend logic
  }
}
```

### Usage Examples

```javascript
// Initialize operator agent client
const operatorClient = new OperatorAgentClient('business123', 'location_456', 'ws://localhost:4000/socket/websocket');

// Connect to WebSocket
operatorClient.connect();

// Request services
operatorClient.requestFrontendResources('get_services');

// Request appointments with filters
operatorClient.requestFrontendResources('get_appointments', {
  date: '2024-01-15',
  status: 'confirmed'
});

// Execute command to create appointment
operatorClient.executeCommand('create_appointment', {
  patientName: 'John Doe',
  serviceId: 'service_1',
  date: '2024-01-16',
  time: '10:00'
});

// Modify query for better results
operatorClient.modifyQuery('appointments', {
  filters: {
    dateRange: {
      start: '2024-01-01',
      end: '2024-01-31'
    }
  },
  sorting: {
    field: 'date',
    order: 'asc'
  }
});

// Approve pending changes
operatorClient.approveChanges('change_1234567890');

// Reject pending changes
operatorClient.rejectChanges('change_1234567890', 'Invalid patient information');

// Create a draft
operatorClient.createDraft('appointment_draft', {
  patientName: 'John Doe',
  serviceType: 'Consultație',
  preferredDate: '2024-01-16',
  preferredTime: '10:00'
});

// Update a draft
operatorClient.updateDraft('draft_1234567890', {
  patientName: 'John Doe',
  serviceType: 'Consultație',
  preferredDate: '2024-01-17',
  preferredTime: '11:00',
  notes: 'Updated appointment details'
});

// Delete a draft
operatorClient.deleteDraft('draft_1234567890');

// List drafts with filters
operatorClient.listDrafts({
  draftType: 'appointment_draft',
  status: 'pending',
  dateRange: {
    start: '2024-01-01',
    end: '2024-01-31'
  }
});
```

### Command Types

#### 1. Create Appointment
```javascript
{
  command: 'create_appointment',
  parameters: {
    patientName: 'John Doe',
    patientPhone: '+40123456789',
    serviceId: 'service_1',
    date: '2024-01-16',
    time: '10:00',
    notes: 'Regular checkup'
  }
}
```

#### 2. Update Service
```javascript
{
  command: 'update_service',
  parameters: {
    serviceId: 'service_1',
    name: 'Updated Service Name',
    price: 150,
    duration: 45,
    description: 'Updated service description'
  }
}
```

#### 3. Delete Appointment
```javascript
{
  command: 'delete_appointment',
  parameters: {
    appointmentId: 'appointment_123',
    reason: 'Patient cancelled'
  }
}
```

#### 4. Modify Business Info
```javascript
{
  command: 'modify_business_info',
  parameters: {
    field: 'workingHours',
    value: {
      monday: '09:00-18:00',
      tuesday: '09:00-18:00',
      wednesday: '09:00-18:00'
    }
  }
}
```

### Error Handling

```javascript
class OperatorAgentClient {
  // ... existing code ...

  handleMessage(event) {
    const data = JSON.parse(event.data);
    
    switch (data.event) {
      // ... existing cases ...
      
      case 'agent_frontend_error':
        this.handleError('Frontend resource error', data.payload);
        break;
        
      case 'agent_command_error':
        this.handleError('Command execution error', data.payload);
        break;
        
      case 'agent_query_error':
        this.handleError('Query modification error', data.payload);
        break;
        
      case 'agent_approval_error':
        this.handleError('Changes approval error', data.payload);
        break;
        
      case 'agent_rejection_error':
        this.handleError('Changes rejection error', data.payload);
        break;
    }
  }

  handleError(type, payload) {
    console.error(`${type}:`, payload);
    // Implement error handling logic
  }
}
```

### Testing

```javascript
// Test operator agent functionality
function testOperatorAgent() {
  const client = new OperatorAgentClient('test-business', 'test-location', 'ws://localhost:4000/socket/websocket');
  
  client.connect();
  
  // Test resource requests
  setTimeout(() => {
    client.requestFrontendResources('get_services');
  }, 1000);
  
  setTimeout(() => {
    client.requestFrontendResources('get_appointments', { date: '2024-01-15' });
  }, 2000);
  
  // Test command execution
  setTimeout(() => {
    client.executeCommand('create_appointment', {
      patientName: 'Test Patient',
      serviceId: 'service_1',
      date: '2024-01-16',
      time: '10:00'
    });
  }, 3000);
}
```

This implementation provides the complete WebSocket interface for operator agent actions, allowing the agent to interrogate frontend resources and make modifications through a structured API.
