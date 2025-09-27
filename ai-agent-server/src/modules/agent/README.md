# Agent Module Architecture

This module has been refactored to separate operator and customer agents for better precision and maintainability.

## Structure

### Main Agent Service (`agent.service.ts`)
- **Purpose**: Routes messages to the appropriate specialized agent
- **WebSocket messages** → `OperatorAgentService` (operators/coordinators)
- **Webhook messages** → `CustomerAgentService` (customers)

### Operator Agent (`operator/`)
- **Purpose**: Handles messages from WebSocket coordinators (operators)
- **Capabilities**: Full access to all data, can modify reservations, view personal info
- **Response Style**: Concise and professional
- **Use Cases**: Internal operations, data analysis, customer support

### Customer Agent (`customer/`)
- **Purpose**: Handles messages from webhooks (customers)
- **Capabilities**: Limited access, can list general info, cannot view other customers' data
- **Response Style**: Friendly and guiding
- **Use Cases**: Booking assistance, service inquiries, general information

## Key Differences

| Aspect | Operator Agent | Customer Agent |
|--------|----------------|----------------|
| **Source** | WebSocket | Webhook |
| **Role** | `operator` | `customer` |
| **Data Access** | Full access | Limited access |
| **Personal Info** | Can view all | Cannot view others |
| **Reservations** | Can modify | Cannot modify |
| **Response Style** | Concise | Friendly guidance |

## Benefits

1. **Precision**: Each agent is optimized for its specific use case
2. **Security**: Clear separation of capabilities prevents data leaks
3. **Maintainability**: Easier to modify behavior for specific user types
4. **Performance**: Specialized agents can be optimized independently
5. **Clarity**: Clear separation of concerns makes the codebase easier to understand

## Usage

The main `AgentService` automatically routes messages based on their source:
- Messages from WebSocket are routed to the Operator Agent
- Messages from webhooks are routed to the Customer Agent

No changes are needed in the controllers or external interfaces - the routing is transparent.