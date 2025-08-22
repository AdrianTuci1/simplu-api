# Database Migration: business_location_id Structure

## Overview

This migration updates the resources table structure to use a composite `business_location_id` key instead of separate `business_id` and `location_id` columns. It also adds JSON field indexes for efficient name-based searches.

## Changes Made

### 1. Table Structure Changes

**Before:**
```sql
CREATE TABLE resources (
  id BIGSERIAL PRIMARY KEY,
  business_id VARCHAR(255) NOT NULL,
  location_id VARCHAR(255) NOT NULL,
  resource_type VARCHAR(100) NOT NULL,
  resource_id VARCHAR(255) NOT NULL,
  data JSONB NOT NULL,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  shard_id VARCHAR(255)
);
```

**After:**
```sql
CREATE TABLE resources (
  id BIGSERIAL PRIMARY KEY,
  business_location_id VARCHAR(255) NOT NULL,
  resource_type VARCHAR(100) NOT NULL,
  resource_id VARCHAR(255) NOT NULL,
  data JSONB NOT NULL,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  shard_id VARCHAR(255)
);
```

### 2. New Indexes Added

```sql
-- Basic indexes
CREATE INDEX idx_resources_business_location ON resources(business_location_id);
CREATE INDEX idx_resources_business_type_start_date ON resources(business_location_id, resource_type, start_date);
CREATE INDEX idx_resources_business_type_end_date ON resources(business_location_id, resource_type, end_date);

-- JSON field indexes for name-based searches
CREATE INDEX idx_data_medic_name ON resources USING GIN ((data->>'medicName'));
CREATE INDEX idx_data_patient_name ON resources USING GIN ((data->>'patientName'));
CREATE INDEX idx_data_trainer_name ON resources USING GIN ((data->>'trainerName'));
CREATE INDEX idx_data_customer_name ON resources USING GIN ((data->>'customerName'));
```

### 3. Code Changes

#### Entity Updates
- `ResourceEntity` now uses `businessLocationId` instead of separate `businessId` and `locationId`
- Updated all TypeORM decorators and indexes

#### Service Updates
- `DatabaseService` updated to use `business_location_id` in all queries
- `ResourceDataService` updated to concatenate `businessId` and `locationId` into `businessLocationId`
- Added new methods for name-based searches

#### Controller Updates
- Added new endpoints for name-based searches:
  - `GET /resources/:businessId-:locationId/search/name/:nameField`
  - `POST /resources/:businessId-:locationId/search/names`

## Migration Process

### Running the Migration

1. **Backup your database first!**
   ```bash
   pg_dump your_database > backup_before_migration.sql
   ```

2. **Run the migration script:**
   ```bash
   cd resources-server
   node scripts/migrate-to-business-location-id.js
   ```

3. **Verify the migration:**
   ```bash
   # Check that the new structure is in place
   psql your_database -c "\d resources"
   
   # Verify data integrity
   psql your_database -c "SELECT COUNT(*) FROM resources;"
   ```

### Migration Steps

The migration script performs the following steps:

1. **Create backup table** - `resources_backup`
2. **Add new column** - `business_location_id`
3. **Migrate data** - Populate `business_location_id` with concatenated values
4. **Create new indexes** - Add all new indexes including JSON field indexes
5. **Drop old structure** - Remove old columns and indexes

## New API Endpoints

### Search by Single Name Field

```http
GET /resources/{businessId}-{locationId}/search/name/{nameField}?nameValue={value}&resourceType={type}&page={page}&limit={limit}
```

**Parameters:**
- `nameField`: One of `medicName`, `patientName`, `trainerName`, `customerName`
- `nameValue`: The name to search for (supports partial matches)
- `resourceType`: Optional filter by resource type
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 50)

**Example:**
```http
GET /resources/biz123-loc456/search/name/medicName?nameValue=Dr.%20Smith&resourceType=appointments
```

### Search by Multiple Name Fields

```http
POST /resources/{businessId}-{locationId}/search/names
```

**Request Body:**
```json
{
  "medicName": "Dr. Smith",
  "patientName": "John Doe",
  "trainerName": "Jane Trainer",
  "customerName": "Bob Customer",
  "resourceType": "appointments",
  "page": 1,
  "limit": 50
}
```

## Performance Benefits

1. **Reduced Index Size**: Single `business_location_id` index instead of composite `(business_id, location_id)`
2. **Faster Queries**: Direct lookup on `business_location_id` instead of two-column joins
3. **JSON Field Indexes**: Efficient searches on name fields within JSON data
4. **Better Sharding**: Simplified shard key management

## Rollback Plan

If you need to rollback the migration:

1. **Restore from backup:**
   ```sql
   DROP TABLE resources;
   ALTER TABLE resources_backup RENAME TO resources;
   ```

2. **Revert code changes** to use the old structure

3. **Update application configuration** to use old entity structure

## Testing

After migration, test the following:

1. **Basic CRUD operations** - Create, read, update, delete resources
2. **Name-based searches** - Test both single and multiple name field searches
3. **Performance** - Verify query performance with new indexes
4. **Data integrity** - Ensure all data is properly migrated

## Notes

- The migration is designed to be safe and reversible
- All existing data is preserved during migration
- New indexes are created before old ones are dropped
- The migration supports both RDS and Citrus sharding configurations
- JSON field indexes use GIN (Generalized Inverted Index) for efficient text search
