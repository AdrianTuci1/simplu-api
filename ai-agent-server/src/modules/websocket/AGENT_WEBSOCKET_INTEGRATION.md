# Agent WebSocket Integration

This document describes the WebSocket integration for agent operations, allowing operators to interact with the AI agent through WebSocket connections.

## Overview

The WebSocket gateway now supports agent-specific operations that allow operators to:
- Authenticate agents
- Execute commands
- Modify queries
- Approve/reject changes
- Manage query history

## WebSocket Events

### Agent Authentication

#### `agent_authenticate`
Authenticates an agent with the system.

**Request:**
```json
{
  "event": "agent_authenticate",
  "topic": "agent:sessionId",
  "payload": {
    "sessionId": "string",
    "payload": {
      "sessionId": "string",
      "businessId": "string",
      "operatorId": "string",
      "permissions": ["agent_access", "data_query", "draft_creation"]
    }
  }
}
```

**Response:**
```json
{
  "event": "agent_authenticated",
  "topic": "agent:sessionId",
  "payload": {
    "success": true,
    "message": "Agent autentificat cu succes"
  }
}
```

### Command Execution

#### `agent_execute_command`
Executes a command from an authenticated agent.

**Request:**
```json
{
  "event": "agent_execute_command",
  "topic": "agent:sessionId",
  "payload": {
    "sessionId": "string",
    "payload": {
      "sessionId": "string",
      "command": "string",
      "parameters": {},
      "businessId": "string"
    }
  }
}
```

**Response:**
```json
{
  "event": "agent_command_result",
  "topic": "agent:sessionId",
  "payload": {
    "success": true,
    "result": {},
    "message": "Comandă executată cu succes"
  }
}
```

### Query Modification

#### `agent_modify_query`
Modifies application queries through the agent.

**Request:**
```json
{
  "event": "agent_modify_query",
  "topic": "agent:sessionId",
  "payload": {
    "sessionId": "string",
    "payload": {
      "sessionId": "string",
      "repositoryType": "string",
      "modifications": {},
      "businessId": "string"
    }
  }
}
```

**Response:**
```json
{
  "event": "agent_query_modified",
  "topic": "agent:sessionId",
  "payload": {
    "success": true,
    "modifiedQuery": {},
    "message": "Query modificat cu succes"
  }
}
```

### Change Management

#### `agent_approve_changes`
Approves changes made by the agent.

**Request:**
```json
{
  "event": "agent_approve_changes",
  "topic": "agent:sessionId",
  "payload": {
    "sessionId": "string",
    "payload": {
      "sessionId": "string",
      "changeId": "string",
      "businessId": "string"
    }
  }
}
```

**Response:**
```json
{
  "event": "agent_changes_approved",
  "topic": "agent:sessionId",
  "payload": {
    "success": true,
    "message": "Modificările au fost aprobate"
  }
}
```

#### `agent_reject_changes`
Rejects changes made by the agent.

**Request:**
```json
{
  "event": "agent_reject_changes",
  "topic": "agent:sessionId",
  "payload": {
    "sessionId": "string",
    "payload": {
      "sessionId": "string",
      "changeId": "string",
      "reason": "string",
      "businessId": "string"
    }
  }
}
```

**Response:**
```json
{
  "event": "agent_changes_rejected",
  "topic": "agent:sessionId",
  "payload": {
    "success": true,
    "message": "Modificările au fost respinse"
  }
}
```

### Query Management

#### `agent_query_modify`
Directly modifies queries using the query modifier.

**Request:**
```json
{
  "event": "agent_query_modify",
  "topic": "agent:sessionId",
  "payload": {
    "sessionId": "string",
    "repositoryType": "string",
    "modifications": [
      {
        "field": "string",
        "operation": "add|remove|modify|filter",
        "value": {},
        "condition": "string"
      }
    ]
  }
}
```

**Response:**
```json
{
  "event": "agent_query_modified",
  "topic": "agent:sessionId",
  "payload": {
    "success": true,
    "modifiedQuery": {},
    "modificationId": "string"
  }
}
```

#### `agent_query_revert`
Reverts a query modification.

**Request:**
```json
{
  "event": "agent_query_revert",
  "topic": "agent:sessionId",
  "payload": {
    "sessionId": "string",
    "modificationId": "string"
  }
}
```

**Response:**
```json
{
  "event": "agent_query_reverted",
  "topic": "agent:sessionId",
  "payload": {
    "success": true,
    "originalQuery": {}
  }
}
```

#### `agent_query_history`
Retrieves query modification history.

**Request:**
```json
{
  "event": "agent_query_history",
  "topic": "agent:sessionId",
  "payload": {
    "sessionId": "string"
  }
}
```

**Response:**
```json
{
  "event": "agent_query_history",
  "topic": "agent:sessionId",
  "payload": {
    "success": true,
    "history": [
      {
        "originalQuery": {},
        "modifications": [],
        "modifiedQuery": {},
        "modificationId": "string",
        "timestamp": "string"
      }
    ]
  }
}
```

## Error Handling

All agent operations include comprehensive error handling with specific error events:

- `agent_auth_error`: Authentication failures
- `agent_command_error`: Command execution failures
- `agent_query_error`: Query modification failures
- `agent_approval_error`: Change approval failures
- `agent_rejection_error`: Change rejection failures
- `agent_revert_error`: Query revert failures
- `agent_history_error`: History retrieval failures

## Usage Examples

### 1. Agent Authentication Flow
```javascript
// 1. Connect to WebSocket
const ws = new WebSocket('ws://localhost:3000/socket/websocket');

// 2. Join agent topic
ws.send(JSON.stringify({
  event: 'phx_join',
  topic: 'agent:session123',
  payload: { businessId: 'business123' },
  ref: '1'
}));

// 3. Authenticate agent
ws.send(JSON.stringify({
  event: 'agent_authenticate',
  topic: 'agent:session123',
  payload: {
    sessionId: 'session123',
    payload: {
      sessionId: 'session123',
      businessId: 'business123',
      operatorId: 'operator456',
      permissions: ['agent_access', 'data_query', 'draft_creation']
    }
  }
}));
```

### 2. Query Modification Flow
```javascript
// 1. Modify a query
ws.send(JSON.stringify({
  event: 'agent_query_modify',
  topic: 'agent:session123',
  payload: {
    sessionId: 'session123',
    repositoryType: 'appointments',
    modifications: [
      {
        field: 'filters',
        operation: 'add',
        value: { status: 'pending' }
      }
    ]
  }
}));

// 2. Get modification history
ws.send(JSON.stringify({
  event: 'agent_query_history',
  topic: 'agent:session123',
  payload: {
    sessionId: 'session123'
  }
}));

// 3. Revert if needed
ws.send(JSON.stringify({
  event: 'agent_query_revert',
  topic: 'agent:session123',
  payload: {
    sessionId: 'session123',
    modificationId: 'mod_1234567890_abc123'
  }
}));
```

## Security Considerations

1. **Authentication Required**: All agent operations require proper authentication
2. **Permission Validation**: Operations are validated against agent permissions
3. **Session Management**: Agent sessions are tracked and validated
4. **Business Isolation**: Operations are scoped to specific businesses
5. **Error Handling**: Comprehensive error handling prevents information leakage

## Integration Benefits

1. **Real-time Communication**: Instant feedback for agent operations
2. **Comprehensive Operations**: Full range of agent capabilities via WebSocket
3. **Error Handling**: Robust error handling with specific error events
4. **Session Management**: Proper session tracking and validation
5. **Query Management**: Advanced query modification and history tracking
6. **Change Management**: Complete change approval/rejection workflow

## Future Enhancements

- **Batch Operations**: Support for batch query modifications
- **Real-time Notifications**: Push notifications for agent operations
- **Advanced Permissions**: Granular permission system
- **Audit Logging**: Comprehensive audit trail for all operations
- **Performance Monitoring**: Real-time performance metrics
- **Multi-tenant Support**: Enhanced multi-tenant capabilities
