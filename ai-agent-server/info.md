# Agent Server

A TypeScript server that provides intelligent communication and booking management for various business types.

## Project Structure

```
src/
├── agent/           # LangChain agents and LangGraph workflows
├── communications/  # Communication services and integrations
│   ├── booking/     # Booking management
│   ├── email/       # Email handling
│   ├── kafka/       # Event streaming
│   ├── sms/         # SMS notifications
│   ├── twilio/      # WhatsApp and SMS via Twilio
│   └── whatsapp/    # WhatsApp conversation handling
├── events/          # Kafka event consumers and producers
├── db/              # PostgreSQL access via TypeORM
├── policy/          # Rule-based access control
└── routes/          # Public API endpoints
```

## Features

### 1. Multi-tenant Business Support
- Support for different business types:
  - Hotels
  - Clinics
  - Fitness centers
  - Restaurants
  - Spas
- Per-tenant feature configuration
- Customizable communication channels

### 2. Communication Channels
- WhatsApp integration via Twilio
- Email handling (SMTP/IMAP)
- SMS notifications
- Booking.com integration
- Customizable templates per business type

### 3. Agent Stack
- LangChain with OpenRouter as LLM
- LangGraph for workflow management
- Multi-turn conversation support
- Function calling capabilities
- Context-aware responses

### 4. Event Processing
- Kafka integration for event streaming
- Topics:
  - `agent.actions`: Agent-initiated actions
  - `agent.suggestions`: AI-generated suggestions
  - `booking.events`: Booking-related events
  - `communication.events`: Communication events

### 5. Database Integration
- PostgreSQL with TypeORM
- Tenant-specific data access
- Policy-based data access control
- Business configuration storage

### 6. Policy System
- Action-based access control
- Resource-level permissions
- Tenant-specific policies
- Audit logging

### 7. Business Intelligence
- Occupancy analysis
- Booking patterns
- Communication analytics
- Marketing channel effectiveness

### 8. Logging and Audit
- Comprehensive action logging
- Tenant-specific audit trails
- Performance monitoring
- Error tracking

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env
```

3. Start the development server:
```bash
npm run start:dev
```

4. For production:
```bash
npm run build
npm run start:prod
```

## Docker Support

Build and run with Docker:
```bash
docker-compose up --build
```

## Performance

- Handles 5,000+ events/second
- Asynchronous processing
- Caching for frequently accessed data
- Connection pooling for database access

## Security

- Tenant isolation
- Policy-based access control
- Secure credential storage
- Rate limiting
- Input validation

## Monitoring

- Health check endpoints
- Performance metrics
- Error tracking
- Usage statistics

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request