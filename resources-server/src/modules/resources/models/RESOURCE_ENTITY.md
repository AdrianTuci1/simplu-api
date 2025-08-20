# ResourceEntity - TypeORM Model

## Overview

`ResourceEntity` este modelul TypeORM pentru tabela `resources` din baza de date. Acest model permite operațiuni CRUD (Create, Read, Update, Delete) folosind TypeORM în loc de query-uri SQL directe.

## Structura Tabelei

```sql
CREATE TABLE resources (
  business_id VARCHAR(255) NOT NULL,
  location_id VARCHAR(255) NOT NULL,
  resource_type VARCHAR(100) NOT NULL,
  resource_id VARCHAR(255) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  shard_id VARCHAR(255),
  PRIMARY KEY (business_id, location_id)
);
```

## Câmpuri

| Câmp | Tip | Descriere |
|------|-----|-----------|
| `businessId` | `VARCHAR(255)` | Partea din cheia primară compusă - ID-ul business-ului |
| `locationId` | `VARCHAR(255)` | Partea din cheia primară compusă - ID-ul locației |
| `resourceType` | `VARCHAR(100)` | Tipul resursei (ex: 'clients', 'appointments', etc.) |
| `resourceId` | `VARCHAR(255)` | ID-ul specific al resursei (format: {typePrefix}{year}{month}-{sequence}) |
| `startDate` | `DATE` | Data de început pentru resursă |
| `endDate` | `DATE` | Data de sfârșit pentru resursă |
| `createdAt` | `TIMESTAMP` | Data și ora creării |
| `updatedAt` | `TIMESTAMP` | Data și ora ultimei actualizări |
| `shardId` | `VARCHAR(255)` | ID-ul shard-ului (pentru Citrus sharding) |

## Cheia Primară Compusă

Tabela folosește o cheie primară compusă formată din `businessId` și `locationId`. Aceasta permite:
- Unicitatea pe nivel de business și locație
- Query-uri optimizate pentru multi-tenancy
- Structură simplificată fără ID-uri artificiale

## Generarea ID-urilor Resurselor

ID-urile resurselor urmează pattern-ul: `{primele 2 litere din resource type}{ultimele 2 cifre ale anului}{luna}-{5 cifre unice}`

### Exemple:
- **Appointments** în Ianuarie 2024: `ap24-00001`, `ap24-00002`
- **Invoices** în Decembrie 2024: `in24-00001`, `in24-00002`
- **Clients** în Martie 2024: `cl24-00001`, `cl24-00002`

## Indexuri

Modelul include următoarele indexuri pentru optimizarea performanței:

- `idx_resources_business_location` - pe `business_id` și `location_id`
- `idx_resources_type` - pe `resource_type`
- `idx_resources_start_date` - pe `start_date`
- `idx_resources_end_date` - pe `end_date`
- `idx_resources_business_type_start_date` - pe `business_id`, `location_id`, `resource_type`, `start_date`
- `idx_resources_business_type_end_date` - pe `business_id`, `location_id`, `resource_type`, `end_date`
- `idx_resources_created_at` - pe `created_at`

## Utilizare

### În ResourceDataService

```typescript
@InjectRepository(ResourceEntity)
private readonly resourceRepository: Repository<ResourceEntity>;

// Creare
const resourceEntity = this.resourceRepository.create({
  businessId,
  locationId,
  resourceType,
  resourceId: 'ap24-00001', // Auto-generat de ResourceIdService
  startDate: '2024-01-15',
  endDate: '2024-01-15',
  shardId,
});
const savedResource = await this.resourceRepository.save(resourceEntity);

// Actualizare
const existingResource = await this.resourceRepository.findOne({
  where: { businessId, locationId }
});
Object.assign(existingResource, { 
  resourceType: 'appointments',
  resourceId: 'ap24-00002',
  startDate: '2024-01-20',
  endDate: '2024-01-20'
});
await this.resourceRepository.save(existingResource);

// Ștergere
const resource = await this.resourceRepository.findOne({
  where: { businessId, locationId }
});
await this.resourceRepository.remove(resource);
```

### Query-uri Optimizate

```typescript
// Query pe interval de date
const resources = await this.resourceRepository.find({
  where: {
    businessId,
    locationId,
    resourceType: 'appointments',
    startDate: MoreThanOrEqual('2024-01-01'),
    endDate: LessThanOrEqual('2024-01-31')
  },
  order: { startDate: 'ASC' }
});

// Query pe tip de resursă
const appointments = await this.resourceRepository.find({
  where: { businessId, locationId, resourceType: 'appointments' },
  order: { createdAt: 'DESC' }
});
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
    entities: [ResourceEntity],
    synchronize: false, // Disabled in production
    logging: configService.get('NODE_ENV') === 'development',
  }),
  inject: [ConfigService],
}),
```

## Migrarea de la Structura Veche

Pentru migrarea de la structura veche cu `id`, `data`, `date`, și `operation`, folosește scriptul de migrare:

```bash
npm run migrate:resources
```

Acest script va:
1. Crea o backup a datelor existente
2. Crea noua structură de tabel
3. Migra datele în formatul nou
4. Actualiza indexurile

## Beneficii ale Noii Structuri

1. **Performanță**: Cheia primară compusă permite query-uri mai rapide
2. **Scalabilitate**: ID-urile predictibile și organizarea temporală
3. **Mentenabilitate**: Structură simplificată și tipizată
4. **Query-uri optimizate**: Suport nativ pentru intervale de date
