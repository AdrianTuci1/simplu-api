Create a production-grade NestJS monorepo project called `simplu-api` (navigate to /src). It must support the following:

1. Global Authentication + Multi-Tenant Context:
   - Shared user accounts across tenants
   - JWT-based authentication
   - Each user can belong to one or multiple tenants
   - Data such as preferences, bookings, or medical info is scoped per tenant ID
   - Auto-injected tenant context for all requests (via header or subdomain)
   - Endpoint: `POST /tenants` to create new tenants

2. Kafka Integration:
   - Kafka producer & consumer setup with topic-based event routing
   - Publish domain events like `reservation.created`, `client.updated`, etc.
   - Use `@nestjs/microservices` with Kafka transport and `nestjs-kafka` abstraction layer if needed

3. Public & Private API Separation:
   - Public API (no auth): `GET /public/:tenantSlug/info`, `services`, `gallery`
   - Private API (auth + tenantId): reservations, stock, clients, employees, services (e.g. treatments, rooms)
   - Apply tenant guard to restrict access and resolve `tenantId` contextually

4. Domain Modules:
   - `auth`, `tenants`, `clients`, `employees`, `reservations`, `stock`, `services`, `public-site`
   - Services should support dynamic schemas per industry (clinic/hotel/fitness)
   - Use DTOs, guards, interceptors, service classes, and repositories

5. Data Layer & Optimization:
   - PostgreSQL via TypeORM
   - Shared tables with `tenantId` indexing
   - Redis integration for caching tenant public data
   - Auto-indexing strategy on tenantId and frequently queried fields

6. Infrastructure-Ready:
   - Prepared for Kubernetes & Docker
   - Autoscalable API layer (5,000–10,000 req/sec)
   - Modular architecture
   - Environment-based configuration
   - Swagger-enabled

7. Bonus:
   - CI/CD and Kafka-triggered side-effects
   - Flexible strategy to fetch public data for each tenant's site
   - Future compatibility with LangChain agent events via Kafka