# AI Agent Server

A sophisticated AI agent server with token management, decision engine, and multi-channel communication capabilities.

## Architecture Overview

The AI Agent Server is designed with a modular architecture that separates concerns and provides clear decision-making layers:

### Core Components

1. **Decision Engine** (`src/actions/decision-engine.service.ts`)
   - Analyzes user messages and determines appropriate actions
   - Uses AI to understand intent and context
   - Validates token availability before proposing actions
   - Determines decision levels (automatic, suggestion, consultation, approval)

2. **Action Registry** (`src/actions/action-registry.service.ts`)
   - Manages all available actions the agent can perform
   - Defines action categories, parameters, and token costs
   - Validates action parameters and permissions

3. **Action Executor** (`src/actions/action-executor.service.ts`)
   - Executes actions across different communication channels
   - Integrates with external services (email, SMS, WhatsApp, Twilio)
   - Tracks execution results and token usage

4. **Token Management** (`src/token/`)
   - Manages business token balances and usage
   - Tracks token consumption for different operations
   - Enforces token limits and monthly fees

## Action Categories

### Communication Actions
- **Email**: Send and read emails
- **SMS**: Send SMS messages
- **WhatsApp**: Send WhatsApp messages and manage conversations
- **Phone Calls**: Make calls using ElevenLabs integration

### Resource Management Actions
- **CRUD Operations**: Create, read, update, delete resources
- **Data Analysis**: Analyze business data using internal LLM
- **Reporting**: Generate reports and insights

### External Service Actions
- **Booking**: Book appointments and manage reservations
- **Payments**: Process payments and transactions
- **Notifications**: Send various types of notifications

### Coordination Actions
- **Human Approval**: Request approval from human coordinators
- **Escalation**: Escalate issues to appropriate personnel
- **Notifications**: Notify coordinators of important events

## Token System

### Token Costs
- **WhatsApp Conversation**: 10 tokens
- **SMS**: 1 token
- **Email**: 1 token
- **ElevenLabs Call**: 50 tokens
- **Internal API LLM**: 1 token
- **Monthly Fee**: 200 tokens

### Token Management
- Businesses purchase tokens in bulk
- Users inherit permissions from their business
- Token usage is tracked per operation
- Monthly fees are automatically deducted
- Operations are blocked when tokens are insufficient

## API Endpoints

### Agent Processing
```http
POST /agent/process
Headers:
  x-tenant-id: string
  x-user-id: string
  x-location-id: string (optional)

Body:
{
  "message": "string",
  "context": "object",
  "sessionId": "string (optional)"
}
```

### Conversation Management
```http
GET /agent/conversations/:tenantId/users/:userId
GET /agent/conversations/:tenantId/sessions/:sessionId
GET /agent/conversations/:tenantId/sessions/:sessionId/messages
```

### Token Management
```http
GET /tokens/balance/:tenantId
GET /tokens/usage/:tenantId
POST /tokens/add/:tenantId
GET /tokens/costs
```

## Decision Levels

1. **Automatic**: Actions are executed immediately without human intervention
2. **Suggestion**: Actions are suggested to the user for approval
3. **Consultation**: Actions require consultation with a human coordinator
4. **Approval Required**: Actions require explicit approval before execution

## User Permission Inheritance

The agent inherits user permissions from the business system:
- Users have specific permissions (email:send, sms:send, etc.)
- The agent can only perform actions the user has permission for
- Token limits are enforced at the business level
- Location-specific permissions are supported

## External Integrations

### Communication Services
- **Email**: SMTP/IMAP integration with tenant-specific configurations
- **SMS**: Twilio integration for SMS messaging
- **WhatsApp**: Twilio WhatsApp Business API
- **Phone Calls**: ElevenLabs integration for AI voice calls

### Business Services
- **Booking**: Integration with booking systems
- **Resources**: Database operations with permission checks
- **Analytics**: Internal LLM for data analysis

## Configuration

### Environment Variables
```env
# AI Model Configuration
OPENROUTER_API_KEY=your_openrouter_api_key

# Database Configuration (PostgreSQL for token management)
DATABASE_URL=your_database_url
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=password
DATABASE_NAME=ai_agent

# AWS Configuration (DynamoDB for conversations)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
DYNAMODB_SESSAGES_TABLE=ai-agent-messages
DYNAMODB_SESSIONS_TABLE=ai-agent-sessions

# API Server Configuration (for resource operations)
API_SERVER_URL=https://your-api-server.com
API_SERVER_KEY=your_api_server_key

# Other Services
REDIS_URL=your_redis_url
KAFKA_BROKERS=your_kafka_brokers
```

### Database Setup
```bash
# PostgreSQL tables will be auto-created for token management
# DynamoDB tables need to be created manually - see DYNAMODB_SETUP.md
```

## Development

### Prerequisites
1. **PostgreSQL**: For token management
2. **AWS DynamoDB**: For conversation storage (see `DYNAMODB_SETUP.md`)
3. **API Server**: For resource operations
4. **Redis**: For caching
5. **Kafka**: For event processing

### Running the Server
```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Start development server
npm run start:dev
```

### Testing
```bash
npm run test
npm run test:e2e
```

## Deployment

The server is containerized with Docker and includes:
- Health checks
- Graceful shutdown
- Environment-based configuration
- Database migrations on startup

## Monitoring

The system provides comprehensive logging for:
- Action execution results
- Token usage and balances
- Decision engine reasoning
- External service interactions
- Error tracking and debugging

## Security

- All external communications are authenticated
- Token usage is strictly controlled
- User permissions are validated for each action
- Sensitive data is encrypted in transit and at rest 