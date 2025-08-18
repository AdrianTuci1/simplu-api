# ResourceEntity - TypeORM Model

## Overview

`ResourceEntity` este modelul TypeORM pentru tabela `resources` din baza de date. Acest model permite operațiuni CRUD (Create, Read, Update, Delete) folosind TypeORM în loc de query-uri SQL directe.

## Structura Tabelei

```sql
CREATE TABLE resources (
  id VARCHAR(255) PRIMARY KEY,
  business_id VARCHAR(255) NOT NULL,
  location_id VARCHAR(255) NOT NULL,
  resource_type VARCHAR(100) NOT NULL,
  resource_id VARCHAR(255) NOT NULL,
  data JSONB NOT NULL,
  date DATE NOT NULL,
  operation VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  shard_id VARCHAR(255)
);
```

## Câmpuri

| Câmp | Tip | Descriere |
|------|-----|-----------|
| `id` | `VARCHAR(255)` | Cheia primară - ID-ul unic al resursei |
| `businessId` | `VARCHAR(255)` | ID-ul business-ului |
| `locationId` | `VARCHAR(255)` | ID-ul locației |
| `resourceType` | `VARCHAR(100)` | Tipul resursei (ex: 'clients', 'appointments', etc.) |
| `resourceId` | `VARCHAR(255)` | ID-ul specific al resursei |
| `data` | `JSONB` | Datele resursei în format JSON |
| `date` | `DATE` | Data de business pentru indexare |
| `operation` | `VARCHAR(50)` | Operația efectuată ('create', 'update', 'patch', 'delete') |
| `createdAt` | `TIMESTAMP` | Data și ora creării |
| `updatedAt` | `TIMESTAMP` | Data și ora ultimei actualizări |
| `shardId` | `VARCHAR(255)` | ID-ul shard-ului (pentru Citrus sharding) |

## Indexuri

Modelul include următoarele indexuri pentru optimizarea performanței:

- `idx_resources_business_location` - pe `business_id` și `location_id`
- `idx_resources_type` - pe `resource_type`
- `idx_resources_date` - pe `date`
- `idx_resources_business_type_date` - pe `business_id`, `location_id`, `resource_type`, `date`
- `idx_resources_created_at` - pe `created_at`

## Utilizare

### În ResourceDataService

```typescript
@InjectRepository(ResourceEntity)
private readonly resourceRepository: Repository<ResourceEntity>;

// Creare
const resourceEntity = this.resourceRepository.create({
  id: resourceId,
  businessId,
  locationId,
  resourceType,
  resourceId,
  data: resourceData,
  date: businessDate,
  operation: 'create',
  shardId,
});
const savedResource = await this.resourceRepository.save(resourceEntity);

// Actualizare
const existingResource = await this.resourceRepository.findOne({
  where: { id: resourceId }
});
Object.assign(existingResource, { data: newData, operation: 'update' });
await this.resourceRepository.save(existingResource);

// Ștergere
const resource = await this.resourceRepository.findOne({
  where: { id: resourceId }
});
await this.resourceRepository.remove(resource);
```

## Configurație TypeORM

Entitatea este configurată în `app.module.ts`:

```typescript
TypeOrmModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: (configService: ConfigService) => ({
    type: 'postgres',
    host: rdsConfig.host,
    port: rdsConfig.port,
    username: rdsConfig.username,
    password: rdsConfig.password,
    database: rdsConfig.database,
    ssl: rdsConfig.ssl ? { rejectUnauthorized: false } : false,
    entities: [__dirname + '/**/*.entity{.ts,.js}'],
    synchronize: false,
    logging: true,
  }),
  inject: [ConfigService],
})
```

## Avantaje

1. **Type Safety** - TypeORM oferă verificare de tipuri la compile time
2. **Query Builder** - Interfață fluentă pentru construirea query-urilor
3. **Relationships** - Suport pentru relații între entități
4. **Migrations** - Suport pentru migrații de bază de date
5. **Validation** - Validare automată a datelor
6. **Performance** - Optimizări și caching integrat

## Compatibilitate

Modelul este compatibil cu:
- PostgreSQL (RDS)
- Citrus Sharding (prin configurație dinamică)
- NestJS TypeORM Module
- JSONB pentru date flexibile
