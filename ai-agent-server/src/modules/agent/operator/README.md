# Operator Agent Architecture

The Operator Agent is a specialized AI agent designed to interact with the frontend application, query data, and create drafts for operators/coordinators.

## Architecture Overview

### Flow: Start → Frontend Query → Draft Creation → Response

The operator agent follows a specialized flow optimized for frontend interaction:

1. **Start Flow**: Loads dynamic memory and system instructions
2. **Frontend Query Flow**: Generates queries to interrogate the frontend application
3. **Draft Creation Flow**: Creates useful drafts based on frontend data
4. **Response Flow**: Generates concise, professional responses for operators

## Components

### Core Nodes (`nodes/`)

#### `frontend-query.node.ts`
- **Purpose**: Generates queries to interrogate the frontend application
- **Input**: Agent state with business context and user message
- **Output**: Frontend queries with type, repository, filters, and purpose
- **Capabilities**: 
  - Data querying
  - Draft creation requests
  - Data analysis queries

#### `draft-creation.node.ts`
- **Purpose**: Creates useful drafts based on frontend data
- **Input**: Frontend query results and business context
- **Output**: Structured drafts with suggestions and priority
- **Draft Types**:
  - Appointment drafts
  - Patient drafts
  - Service drafts
  - Report drafts

#### `operator-response.node.ts`
- **Purpose**: Generates concise, professional responses for operators
- **Input**: All processed data and context
- **Output**: Professional response with actionable items
- **Features**:
  - Concise and professional tone
  - Includes relevant data
  - Suggests next steps
  - Generates actionable items

### Handlers (`handlers/`)

#### `agent-websocket.handler.ts`
- **Purpose**: Handles WebSocket communication for agent operations
- **Key Methods**:
  - `handleAuthentication()`: Authenticates agents with proper permissions
  - `handleExecuteCommand()`: Executes commands from agents
  - `handleModifyQuery()`: Modifies application queries
  - `handleApproveChanges()`: Approves changes made by agents
  - `handleRejectChanges()`: Rejects changes with reasons

#### `agent-query-modifier.ts`
- **Purpose**: Manages query modifications and history
- **Key Methods**:
  - `modifyQuery()`: Applies modifications to queries
  - `applyModificationsToQuery()`: Applies single modifications
  - `revertQueryModification()`: Reverts to original queries
  - `getModificationHistory()`: Retrieves modification history

## Key Features

### Frontend Integration
- **Query Generation**: Automatically generates appropriate queries for frontend data
- **Data Retrieval**: Simulates (or implements) frontend data retrieval
- **Real-time Communication**: Uses WebSocket for real-time frontend interaction

### Draft Management
- **Intelligent Draft Creation**: Creates contextually appropriate drafts
- **Priority Assignment**: Assigns priority levels to drafts
- **Suggestion Generation**: Provides actionable suggestions

### Query Modification
- **Flexible Modifications**: Supports add, remove, modify, and filter operations
- **History Tracking**: Maintains complete modification history
- **Revert Capability**: Allows reverting to original queries

### Security & Permissions
- **Authentication**: Validates agent authentication
- **Permission Checking**: Ensures proper permissions for operations
- **Session Management**: Tracks and validates agent sessions

## Usage Examples

### Basic Operator Interaction
```typescript
// Operator asks: "Show me today's appointments"
// Agent generates frontend query for appointments
// Retrieves data from frontend
// Creates appointment draft
// Responds with concise summary
```

### Query Modification
```typescript
// Operator asks: "Filter appointments by doctor"
// Agent modifies existing query with doctor filter
// Applies modification to frontend query
// Returns filtered results
```

### Draft Creation
```typescript
// Operator asks: "Create a patient summary"
// Agent queries patient data from frontend
// Creates structured patient draft
// Provides actionable suggestions
```

## Benefits

1. **Frontend Integration**: Direct interaction with application data
2. **Intelligent Drafting**: Context-aware draft creation
3. **Query Flexibility**: Dynamic query modification capabilities
4. **Professional Responses**: Concise, actionable responses for operators
5. **Security**: Proper authentication and permission management
6. **Real-time Communication**: WebSocket-based real-time updates

## Future Enhancements

- **Real Frontend Integration**: Replace simulation with actual frontend API calls
- **Advanced Draft Templates**: More sophisticated draft templates
- **Query Optimization**: Intelligent query optimization
- **Batch Operations**: Support for batch query modifications
- **Analytics Integration**: Integration with business analytics
