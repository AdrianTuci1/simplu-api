# Resource Model Setup - Rezolvarea problemei business_id

## Problema Identificată

Eroarea "business_id does not exist" apărea pentru că:
1. Tabela "resources" era creată în baza de date RDS
2. Nu exista un model TypeORM definit pentru această tabelă
3. ResourceDataService încerca să folosească query-uri SQL directe în loc de TypeORM

## Soluția Implementată

### 1. Instalarea TypeORM

```bash
npm install typeorm @nestjs/typeorm
```

### 2. Crearea Entității ResourceEntity

**Fișier:** `src/modules/resources/models/resource.entity.ts`

```typescript
@Entity('resources')
@Index(['business_id', 'location_id'])
@Index(['resource_type'])
@Index(['date'])
@Index(['business_id', 'location_id', 'resource_type', 'date'])
@Index(['created_at'])
export class ResourceEntity {
  @PrimaryColumn({ type: 'varchar', length: 255 })
  id: string;

  @Column({ type: 'varchar', length: 255, name: 'business_id' })
  businessId: string;

  @Column({ type: 'varchar', length: 255, name: 'location_id' })
  locationId: string;

  @Column({ type: 'varchar', length: 100, name: 'resource_type' })
  resourceType: string;

  @Column({ type: 'varchar', length: 255, name: 'resource_id' })
  resourceId: string;

  @Column({ type: 'jsonb', name: 'data' })
  data: any;

  @Column({ type: 'date', name: 'date' })
  date: string;

  @Column({ type: 'varchar', length: 50, name: 'operation' })
  operation: string;

  @CreateDateColumn({ type: 'timestamp with time zone', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone', name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'varchar', length: 255, name: 'shard_id', nullable: true })
  shardId?: string;
}
```

### 3. Configurarea TypeORM în AppModule

**Fișier:** `src/app.module.ts`

```typescript
TypeOrmModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: (configService: ConfigService) => {
    const dbType = configService.get<string>('database.type');
    
    if (dbType === 'rds') {
      const rdsConfig = configService.get('database.rds');
      return {
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
      };
    }
    // ... configurație pentru citrus
  },
  inject: [ConfigService],
})
```

### 4. Actualizarea ResourcesModule

**Fișier:** `src/modules/resources/resources.module.ts`

```typescript
@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([ResourceEntity]),
    NotificationModule,
  ],
  // ...
})
```

### 5. Refactorizarea ResourceDataService

**Fișier:** `src/modules/resources/services/resource-data.service.ts`

#### Importuri adăugate:
```typescript
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResourceEntity } from '../models/resource.entity';
```

#### Constructor actualizat:
```typescript
constructor(
  @InjectRepository(ResourceEntity)
  private readonly resourceRepository: Repository<ResourceEntity>,
  // ... alte dependențe
) { }
```

#### Metode actualizate pentru a folosi TypeORM:

**createResource:**
```typescript
// Create resource entity
const resourceEntity = this.resourceRepository.create({
  id: resourceId,
  businessId,
  locationId,
  resourceType,
  resourceId,
  data: data,
  date: businessDate,
  operation: 'create',
  shardId: shardId,
});

// Save using TypeORM repository
const savedResource = await this.resourceRepository.save(resourceEntity);
```

**updateResource:**
```typescript
// Find existing resource
const existingResource = await this.resourceRepository.findOne({
  where: { id: resourceId }
});

// Update resource entity
Object.assign(existingResource, {
  data: data,
  date: businessDate,
  operation: 'update',
  shardId: shardId,
});

// Save using TypeORM repository
const savedResource = await this.resourceRepository.save(existingResource);
```

**deleteResource:**
```typescript
// Find and delete using TypeORM repository
const existingResource = await this.resourceRepository.findOne({
  where: { id: resourceId }
});

await this.resourceRepository.remove(existingResource);
```

**patchResource:**
```typescript
// Find existing resource using TypeORM repository
const existingResource = await this.resourceRepository.findOne({
  where: { id: resourceId }
});

// Merge existing data with patch data
const mergedData = {
  ...existingResource.data,
  ...data,
};

// Update resource entity
Object.assign(existingResource, {
  data: mergedData,
  date: businessDate,
  operation: 'patch',
  shardId: shardId,
});

// Save using TypeORM repository
const savedResource = await this.resourceRepository.save(existingResource);
```

## Beneficii Obținute

1. **Type Safety** - Verificare de tipuri la compile time
2. **Query Builder** - Interfață fluentă pentru construirea query-urilor
3. **Performance** - Optimizări și caching integrat
4. **Maintainability** - Cod mai curat și mai ușor de întreținut
5. **Error Handling** - Gestionarea mai bună a erorilor
6. **Validation** - Validare automată a datelor

## Structura Finală

```
resources-server/
├── src/
│   ├── modules/
│   │   └── resources/
│   │       ├── models/
│   │       │   ├── resource.entity.ts          # ✅ NOU - Entitatea TypeORM
│   │       │   ├── resource.entity.spec.ts     # ✅ NOU - Teste
│   │       │   ├── RESOURCE_ENTITY.md          # ✅ NOU - Documentație
│   │       │   └── index.ts                    # ✅ ACTUALIZAT - Export nou
│   │       ├── services/
│   │       │   └── resource-data.service.ts    # ✅ ACTUALIZAT - Folosește TypeORM
│   │       └── resources.module.ts             # ✅ ACTUALIZAT - Include TypeORM
│   └── app.module.ts                           # ✅ ACTUALIZAT - Configurație TypeORM
├── package.json                                # ✅ ACTUALIZAT - Dependențe TypeORM
└── RESOURCE_MODEL_SETUP.md                     # ✅ NOU - Acest fișier
```

## Testare

Pentru a testa implementarea:

```bash
cd resources-server
npm run build  # ✅ Compilare reușită
npm test       # ✅ Teste pentru entitate
```

## Următorii Pași

1. **Testare în producție** - Verificarea că totul funcționează cu baza de date RDS reală
2. **Migrații** - Crearea migrațiilor TypeORM pentru schimbări viitoare
3. **Optimizări** - Adăugarea de indexuri suplimentare dacă este necesar
4. **Monitoring** - Monitorizarea performanței cu noua implementare
