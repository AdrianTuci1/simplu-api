import { DocumentBuilder } from '@nestjs/swagger';

export const swaggerConfig = new DocumentBuilder()
  .setTitle('Simplu API')
  .setDescription('Multi-tenant API for managing businesses')
  .setVersion('1.0')
  .addBearerAuth()
  .addTag('auth', 'Authentication endpoints')
  .addTag('tenants', 'Tenant management endpoints')
  .addTag('clients', 'Client management endpoints')
  .addTag('employees', 'Employee management endpoints')
  .addTag('reservations', 'Reservation management endpoints')
  .addTag('stock', 'Stock management endpoints')
  .addTag('services', 'Service management endpoints')
  .addTag('public', 'Public endpoints')
  .build();
