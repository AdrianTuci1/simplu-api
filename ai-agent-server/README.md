# AI Agent Server

An event-aware and rule-based AI agent server built with TypeScript, NestJS, LangChain, and Kafka.

## Features

- LangChain agents with OpenRouter integration
- Kafka event processing
- PostgreSQL database with Prisma ORM
- Rule-based policy system
- WebSocket support for real-time communication
- Multi-tenant support
- Docker and Docker Compose support

## Prerequisites

- Node.js 20.x or later
- Docker and Docker Compose
- PostgreSQL 15.x (if running locally)
- Kafka (if running locally)

## Local Development Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd agent-server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy the environment file:
   ```bash
   cp .env.example .env
   ```

4. Update the `.env` file with your configuration values.

5. Start the development server:
   ```bash
   npm run start:dev
   ```

## Docker Setup

1. Build and start the containers:
   ```bash
   docker-compose up --build
   ```

2. To run in detached mode:
   ```bash
   docker-compose up -d
   ```

3. To stop the containers:
   ```bash
   docker-compose down
   ```

## Project Structure

```
src/
├── agent/        # LangChain agents and LangGraph workflows
├── events/       # Kafka event consumers and producers
├── db/          # PostgreSQL access via Prisma
├── policy/      # Rule-based access control
├── routes/      # API endpoints
└── conversations/ # Message storage and context
```

## API Documentation

The API documentation is available at `/api` when running the server.

## Environment Variables

See `.env.example` for all required environment variables.

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

This project is licensed under the MIT License. 