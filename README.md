# Multi-Tenant Backend Architecture for Business AI Agent

This document outlines the backend architecture based on the provided diagram, focusing exclusively on the Dockerized container components. This architecture supports a multi-tenant application, featuring an AI assistant agent designed for various business types (e.g., dental clinics, gyms, hotels).

## Backend Architecture Overview

The backend architecture is built upon a series of interconnected services, predominantly running in Docker containers, to ensure scalability, isolation, and efficient resource management. Key components include:

* **API Layer (Scalable):** The primary entry point for most backend interactions.
* **WebSocket Layer:** Manages persistent connections for real-time communication.
* **Events (Kafka Bus):** A distributed messaging system for asynchronous communication between services.
* **AI Agent (Scalable):** The intelligent component that processes requests and interacts with external APIs.
* **DB Layer:** The persistence layers for application data and sessions.
* **Auth (SSO):** The authentication service.

## Dockerized Components

The following backend components are designed to run within Docker containers, facilitating deployment and scaling.

### 1. API Server (Node.js)

* **Description:** The main API service, responsible for handling HTTP requests from the frontend and coordinating operations with other backend services. Built with Node.js for performance and scalability.
* **Technology:** Node.js
* **Connections:** Interacts with the WebSocket Layer, Kafka Bus, Auth, and DB Layer.

### 2. Phoenix (Elixir) WebSocket Server

* **Description:** A dedicated server for managing WebSocket connections, providing real-time, bidirectional communication. The use of Elixir/Phoenix ensures high fault tolerance and excellent scalability for concurrent connections.
* **Technology:** Elixir, Phoenix
* **Connections:** Receives requests from the API Layer and can send events to connected clients.

### 3. Kafka Bus (Events)

* **Description:** A distributed message bus used to facilitate asynchronous and decoupled communication between various services (microservices). It ensures message durability and allows for independent scaling of producers and consumers of events.
* **Technology:** Apache Kafka
* **Connections:** API Server, WebSocket Server, and LangGraph AI Agent services publish and/or consume events from the Kafka Bus.

### 4. LangGraph AI Agent

* **Description:** The intelligent business assistance agent. This service processes complex requests, utilizes language models, and applies business logic to provide tailored responses and actions for each business type (dental clinics, gyms, hotels). It interacts with external APIs to retrieve information or execute actions.
* **Technology:** LangGraph (or similar), Python (likely)
* **Connections:** Consumes events from the Kafka Bus, interacts with PostgreSQL (for tenant-specific data), and communicates with External APIs (Meta Graph API, Twilio, Booking.com / Email Ingest).

### 5. auth.simptu.io (SSO)

* **Description:** A dedicated Single Sign-On (SSO) authentication service. It manages authentication and authorization processes, ensuring secure access to backend resources.
* **Technology:** Unspecified (but functions as a standalone authentication service)
* **Connections:** The API Server and other services requiring authentication interact with this service.

### 6. PostgreSQL (multi-tenant, encrypted per tenant)

* **Description:** The primary relational database, designed to support the multi-tenant architecture. Each tenant's data is separately encrypted to ensure isolation and security. It stores the application's operational data.
* **Technology:** PostgreSQL
* **Connections:** Most backend services (API Server, LangGraph AI Agent, Auth) interact with this database.

### 7. Redis (cache + sessions)

* **Description:** An in-memory database used for fast caching and user session storage. It contributes to the overall system performance by reducing latency for frequently accessed data.
* **Technology:** Redis
* **Connections:** The API Server and likely other services (e.g., WebSocket Server) interact with Redis for caching and sessions.

### 8. External APIs (Integration)

* **Description:** While not containers run within the system, these external APIs are integrated by the LangGraph AI Agent to extend functionality and provide specific services:
    * **Meta Graph API:** For interactions with Meta platforms (Facebook, Instagram).
    * **Twilio (SMS / Voice):** For communication functionalities (SMS messages, voice calls).
    * **Booking.com / Email Ingest:** For integration with booking platforms or email processing.
* **Technology:** Third-party APIs
* **Connections:** The LangGraph AI Agent initiates requests to these APIs.

## Multi-Tenant Architecture

The system is designed to support multiple clinics, gyms, or hotels as independent **"tenants,"** all running on the same shared backend infrastructure. Data isolation and security are ensured through:

* **Per-Tenant Encryption:** Each tenant's data within PostgreSQL is individually encrypted.
* **Separate Login:** The authentication system (auth.simptu.io) manages access specific to each tenant.
* **Business Logic:** The AI Agent and API Server contain the necessary logic to distinguish and process requests within the context of the corresponding tenant.

## Deployment and Running (Docker Compose / Kubernetes)

This architecture is ideal for deployment using:

* **Docker Compose:** For local development environments or small-scale deployments, a `docker-compose.yml` file would define all services and their dependencies.
* **Kubernetes:** For production, a container orchestrator like Kubernetes would manage the complex scaling, availability, and deployment of these services.

---

## 📚 Documentation & Guides

### AI Agent & Chat System

| Guide | Description | Link |
|-------|-------------|------|
| **Chat Session Management** | HTTP REST API pentru managementul sesiunilor (creare, listare, istoric) | [CHAT_SESSION_MANAGEMENT_GUIDE.md](./CHAT_SESSION_MANAGEMENT_GUIDE.md) |
| **Elixir Frontend Interaction** | WebSocket streaming în timp real și function calls | [ELIXIR_FRONTEND_INTERACTION_GUIDE.md](./ELIXIR_FRONTEND_INTERACTION_GUIDE.md) |
| **AI Agent Session Management** | Integrare AI Agent cu sesiuni WebSocket | [elixir/AI_AGENT_SESSION_MANAGEMENT.md](./elixir/AI_AGENT_SESSION_MANAGEMENT.md) |

### Features & Integration

| Guide | Description | Link |
|-------|-------------|------|
| **Patient Booking** | Sistem de rezervări pentru pacienți | [PATIENT_BOOKING_FRONTEND_INTEGRATION.md](./PATIENT_BOOKING_FRONTEND_INTEGRATION.md) |
| **Invitations System** | Sistem de invitații pentru utilizatori | [INVITATIONS_SYSTEM_GUIDE.md](./INVITATIONS_SYSTEM_GUIDE.md) |
| **Rating System** | Sistem de rating pentru servicii | [RATING_SYSTEM_IMPLEMENTATION.md](./RATING_SYSTEM_IMPLEMENTATION.md) |
| **Patient Access Code** | Sistem de coduri de acces pentru pacienți | [PATIENT_ACCESS_CODE_FRONTEND_INTEGRATION.md](./PATIENT_ACCESS_CODE_FRONTEND_INTEGRATION.md) |

### Architecture Separation

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND                              │
└──────────────┬──────────────────────┬────────────────────┘
               │                      │
       ┌───────▼────────┐    ┌────────▼──────────┐
       │  HTTP REST     │    │  WebSocket        │
       │  (Sessions)    │    │  (Streaming)      │
       └───────┬────────┘    └────────┬──────────┘
               │                      │
       ┌───────▼────────────┐  ┌──────▼──────────┐
       │ AI Agent Server    │  │ Elixir Hub      │
       │ Port: 3003         │  │ Port: 4000      │
       │                    │  │                 │
       │ - Session CRUD     │  │ - Streaming     │
       │ - Message History  │  │ - Real-time     │
       │ - Business Logic   │  │ - Broadcast     │
       └────────────────────┘  └─────────────────┘
```

**Key Principles:**
- 🔴 **Real-time messaging** → Elixir WebSocket (low latency, streaming)
- 🟢 **Session management** → AI Agent Server HTTP REST (reliable, queryable)
- 🔵 **Business logic** → AI Agent Server (Bedrock integration, tools)

---