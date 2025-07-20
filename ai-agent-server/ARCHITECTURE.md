# AI Agent Server Architecture

## Overview

The AI Agent Server has been restructured to provide a comprehensive, scalable solution for business automation with intelligent decision-making capabilities. The new architecture addresses the requirements for conversation management, location support, action grouping, token management, and user permission inheritance.

## Core Architecture Components

### 1. Decision Engine Layer
**File**: `src/actions/decision-engine.service.ts`

The decision engine is the brain of the system that:
- Analyzes user messages using AI to understand intent
- Determines appropriate actions based on available capabilities
- Validates token availability before proposing actions
- Assigns decision levels (automatic, suggestion, consultation, approval)
- Considers conversation history and business context

**Key Features**:
- AI-powered intent recognition
- Token-aware action selection
- Permission-based action filtering
- Confidence scoring for decisions
- Context-aware reasoning

### 2. Action Registry
**File**: `src/actions/action-registry.service.ts`

Central registry that defines all available actions:
- **Communication Actions**: Email, SMS, WhatsApp, Phone calls
- **Resource Management**: CRUD operations on business resources
- **External Services**: Booking, payments, notifications
- **Internal APIs**: Data analysis, validation, reporting
- **Coordination**: Human approval, escalation, notifications

**Action Definition Structure**:
```typescript
interface ActionDefinition {
  type: ActionType;
  category: ActionCategory;
  name: string;
  description: string;
  requiredPermissions: string[];
  tokenCost: number;
  defaultDecisionLevel: DecisionLevel;
  parameters: ActionParameter[];
  isAsync?: boolean;
  requiresApproval?: boolean;
}
```

### 3. Action Executor
**File**: `src/actions/action-executor.service.ts`

Handles the execution of actions across different channels:
- **Email Service**: SMTP/IMAP integration
- **SMS Service**: Twilio integration
- **WhatsApp Service**: WhatsApp Business API
- **Phone Service**: ElevenLabs integration
- **Resource Service**: Database operations
- **External APIs**: Booking, payment systems

**Execution Flow**:
1. Validate action parameters
2. Check token availability
3. Execute action with appropriate service
4. Track execution results
5. Deduct tokens
6. Log usage for analytics

### 4. Token Management System
**Files**: `src/token/token.service.ts`, `src/token/token.entity.ts`

Comprehensive token management with:
- **Business Token Balances**: Per-tenant and per-location tracking
- **Usage Logging**: Detailed logs of all token consumption
- **Cost Structure**: Different costs for different operations
- **Monthly Fees**: Automatic deduction for internal API usage
- **Token Purchasing**: Add tokens to business accounts

**Token Costs**:
- WhatsApp Conversation: 10 tokens
- SMS: 1 token
- Email: 1 token
- ElevenLabs Call: 50 tokens
- Internal API LLM: 1 token
- Monthly Fee: 200 tokens

## Data Model

### Token Entities
```sql
-- Business token balances
CREATE TABLE business_tokens (
  id UUID PRIMARY KEY,
  tenantId VARCHAR NOT NULL,
  locationId VARCHAR,
  availableTokens INTEGER DEFAULT 0,
  totalTokensPurchased INTEGER DEFAULT 0,
  totalTokensUsed INTEGER DEFAULT 0,
  lastMonthlyFeeDate TIMESTAMP,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);

-- Token usage logs
CREATE TABLE token_usage_logs (
  id UUID PRIMARY KEY,
  tenantId VARCHAR NOT NULL,
  locationId VARCHAR,
  userId VARCHAR,
  sessionId VARCHAR,
  operationType ENUM(...) NOT NULL,
  tokensUsed INTEGER NOT NULL,
  description TEXT,
  metadata JSONB,
  createdAt TIMESTAMP DEFAULT NOW()
);
```

### Enhanced Session Entity
```sql
-- Added locationId to sessions
ALTER TABLE sessions ADD COLUMN locationId VARCHAR;
```

## API Endpoints

### Agent Processing
```http
POST /agent/process
Headers:
  x-tenant-id: string (required)
  x-user-id: string (required)
  x-location-id: string (optional)

Body:
{
  "message": "string",
  "context": {
    "userPermissions": ["email:send", "sms:send"],
    "businessContext": {...},
    "locationId": "string"
  },
  "sessionId": "string (optional)"
}

Response:
{
  "response": "string",
  "decisionLevel": "automatic|suggestion|consultation|approval_required",
  "actions": [...],
  "reasoning": "string",
  "confidence": 85
}
```

### Conversation Management
```http
GET /agent/conversations/:tenantId/users/:userId?limit=10
GET /agent/conversations/:tenantId/sessions/:sessionId
GET /agent/conversations/:tenantId/sessions/:sessionId/messages?limit=20&before=timestamp
```

### Token Management
```http
GET /tokens/balance/:tenantId?locationId=string
GET /tokens/usage/:tenantId?locationId=string&limit=50&offset=0
POST /tokens/add/:tenantId
Body: { "amount": 1000 }
GET /tokens/costs
```

## Decision Levels

### 1. Automatic
- Actions are executed immediately
- No human intervention required
- High confidence decisions
- Low-risk operations

### 2. Suggestion
- Actions are suggested to the user
- User can approve or modify
- Medium confidence decisions
- Moderate-risk operations

### 3. Consultation
- Actions require human consultation
- Coordinator review required
- Lower confidence decisions
- Higher-risk operations

### 4. Approval Required
- Explicit approval needed
- Human coordinator must approve
- Critical operations
- High-risk or high-cost actions

## User Permission Inheritance

The system implements a sophisticated permission inheritance model:

1. **Business-Level Permissions**: Base permissions defined at the business level
2. **User-Specific Permissions**: Individual user permissions
3. **Location-Specific Permissions**: Location-based access control
4. **Token-Based Limits**: Operations limited by available tokens

**Permission Structure**:
```typescript
interface UserPermissions {
  email: ['send', 'read'];
  sms: ['send'];
  whatsapp: ['send', 'read'];
  phone: ['call'];
  resources: ['create', 'read', 'update', 'delete'];
  booking: ['create', 'cancel'];
  // ... other permissions
}
```

## External Service Integrations

### Communication Services
- **Email**: Tenant-specific SMTP/IMAP configurations
- **SMS**: Twilio integration with template support
- **WhatsApp**: WhatsApp Business API with conversation management
- **Phone**: ElevenLabs integration for AI voice calls

### Business Services
- **Booking**: Appointment and reservation management
- **Resources**: Database operations with permission checks
- **Analytics**: Internal LLM for data analysis and insights

## Security and Compliance

### Authentication & Authorization
- Tenant-based isolation
- User permission validation
- Token-based access control
- Location-specific permissions

### Data Protection
- Encrypted communication channels
- Secure token storage
- Audit logging for all operations
- GDPR-compliant data handling

### Rate Limiting
- Per-tenant rate limits
- Token-based throttling
- API usage monitoring
- Abuse prevention

## Monitoring and Analytics

### Metrics Tracked
- Token usage patterns
- Action execution success rates
- Decision engine accuracy
- External service performance
- User interaction patterns

### Logging
- Structured logging for all operations
- Error tracking and debugging
- Performance monitoring
- Security event logging

## Scalability Considerations

### Horizontal Scaling
- Stateless service design
- Database connection pooling
- Redis caching for session data
- Kafka for event processing

### Performance Optimization
- Action execution batching
- Token validation caching
- Database query optimization
- External service connection pooling

## Future Enhancements

### Planned Features
- **Advanced AI Models**: Integration with more sophisticated LLMs
- **Voice Recognition**: Speech-to-text capabilities
- **Multi-language Support**: Internationalization
- **Advanced Analytics**: Business intelligence dashboards
- **Mobile SDK**: Native mobile integration
- **Webhook Support**: Real-time event notifications

### Integration Opportunities
- **CRM Systems**: Salesforce, HubSpot integration
- **ERP Systems**: SAP, Oracle integration
- **Payment Gateways**: Stripe, PayPal integration
- **Calendar Systems**: Google Calendar, Outlook integration 