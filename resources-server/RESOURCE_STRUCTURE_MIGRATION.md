# Resource Structure Migration

## Overview

This document describes the migration from the old resource structure to the new optimized structure with composite primary keys and improved ID generation.

## Changes Made

### 1. Database Structure Changes

#### Old Structure
```sql
CREATE TABLE resources (
  id VARCHAR(255) PRIMARY KEY,                    -- Single primary key
  business_id VARCHAR(255) NOT NULL,
  location_id VARCHAR(255) NOT NULL,
  resource_type VARCHAR(100) NOT NULL,
  resource_id VARCHAR(255) NOT NULL,
  data JSONB NOT NULL,                            -- Generic JSON data
  date DATE NOT NULL,                             -- Single date field
  operation VARCHAR(50) NOT NULL,                 -- Operation field
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  shard_id VARCHAR(255)
);
```

#### New Structure
```sql
CREATE TABLE resources (
  business_id VARCHAR(255) NOT NULL,              -- Part of composite primary key
  location_id VARCHAR(255) NOT NULL,              -- Part of composite primary key
  resource_type VARCHAR(100) NOT NULL,
  resource_id VARCHAR(255) NOT NULL,              -- Auto-generated with pattern
  start_date DATE NOT NULL,                       -- Start date for time-based queries
  end_date DATE NOT NULL,                         -- End date for time-based queries
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  shard_id VARCHAR(255),
  PRIMARY KEY (business_id, location_id)          -- Composite primary key
);
```

### 2. Resource ID Generation

#### New ID Pattern
```
{first 2 letters of resource type}{last 2 digits of year}{month}-{5 unique digits}
```

#### Examples
- **Appointments** in January 2024: `ap24-00001`, `ap24-00002`, etc.
- **Invoices** in December 2024: `in24-00001`, `in24-00002`, etc.
- **Clients** in March 2024: `cl24-00001`, `cl24-00002`, etc.
- **Members** in June 2024: `me24-00001`, `me24-00002`, etc.

#### Benefits
- **Predictable**: Easy to understand and sort
- **Time-based**: Includes year and month for temporal organization
- **Unique**: 5-digit sequence ensures uniqueness within month
- **Scalable**: Supports up to 99,999 resources per type per month

### 3. API Changes

#### Old Endpoints
```
POST   /resources/:businessId-:locationId/:resourceId
PUT    /resources/:businessId-:locationId/:resourceId
PATCH  /resources/:businessId-:locationId/:resourceId
DELETE /resources/:businessId-:locationId/:resourceId
GET    /resources/:businessId-:locationId/:resourceType/:resourceId
```

#### New Endpoints
```
POST   /resources/:businessId-:locationId
PUT    /resources/:businessId-:locationId
PATCH  /resources/:businessId-:locationId
DELETE /resources/:businessId-:locationId
GET    /resources/:businessId-:locationId
```

#### Request Body Changes
```json
// Old
{
  "data": {
    "name": "Appointment",
    "date": "2024-01-15",
    "clientId": "123"
  }
}

// New
{
  "startDate": "2024-01-15",
  "endDate": "2024-01-15",
  "resourceId": "ap24-00001"  // Optional, auto-generated if not provided
}
```

### 4. Query Improvements

#### Date Range Queries
```bash
# Query appointments between dates
http GET "http://localhost:3000/resources/business123-location456/appointments" \
  startDate=="2024-01-01" \
  endDate=="2024-01-31"

# Optimized date range endpoint
http GET "http://localhost:3000/resources/business123-location456/appointments/date-range" \
  startDate=="2024-01-01" \
  endDate=="2024-01-31"
```

#### New Indexes
- `idx_resources_business_location` - Composite key queries
- `idx_resources_start_date` - Start date filtering
- `idx_resources_end_date` - End date filtering
- `idx_resources_business_type_start_date` - Optimized date range queries
- `idx_resources_business_type_end_date` - Optimized date range queries

## Migration Process

### 1. Backup Existing Data
```bash
# The migration script automatically creates a backup
CREATE TABLE resources_backup AS SELECT * FROM resources;
```

### 2. Run Migration
```bash
# From resources-server directory
npm run migrate:resources
```

### 3. Verify Migration
```bash
# Test the new structure
node scripts/test-new-resources.js
```

### 4. Rollback (if needed)
```bash
# Rollback to previous structure
npm run migrate:rollback
```

## Benefits of New Structure

### 1. Performance
- **Composite primary key**: Faster joins and lookups
- **Optimized indexes**: Better query performance for date ranges
- **Reduced data size**: No JSONB overhead for simple date storage

### 2. Scalability
- **Predictable ID generation**: No UUID collisions
- **Time-based organization**: Natural partitioning by time
- **Efficient queries**: Optimized for common access patterns

### 3. Maintainability
- **Simplified schema**: Clear, purpose-built fields
- **Type safety**: Strong typing for dates and IDs
- **Consistent patterns**: Standardized across all resource types

### 4. Query Optimization
- **Date range queries**: Native support for time-based filtering
- **Business location queries**: Optimized for multi-tenant access
- **Resource type queries**: Efficient filtering by type

## Testing

### Manual Testing
```bash
# Test resource creation
http POST "http://localhost:3000/resources/business123-location456" \
  "X-Resource-Type: appointments" \
  startDate=="2024-01-15" \
  endDate=="2024-01-15"

# Test resource query
http GET "http://localhost:3000/resources/business123-location456/appointments" \
  startDate=="2024-01-01" \
  endDate=="2024-01-31"

# Test date range query
http GET "http://localhost:3000/resources/business123-location456/appointments/date-range" \
  startDate=="2024-01-01" \
  endDate=="2024-01-31"
```

### Automated Testing
```bash
# Run the test script
node scripts/test-new-resources.js
```

## Rollback Plan

If issues arise during migration:

1. **Stop all services** using the resources API
2. **Run rollback script**: `npm run migrate:rollback`
3. **Verify data integrity** with backup comparison
4. **Restart services** with old structure
5. **Investigate and fix** issues before re-migrating

## Monitoring

### Key Metrics to Watch
- **Query performance**: Monitor response times for date range queries
- **ID generation**: Ensure no conflicts in resource ID generation
- **Data integrity**: Verify all data migrated correctly
- **API errors**: Monitor for any new error patterns

### Logs to Monitor
- Resource ID generation logs
- Migration process logs
- Query performance logs
- Error logs for any issues

## Future Enhancements

### Potential Improvements
1. **Partitioning**: Time-based table partitioning for large datasets
2. **Caching**: Redis caching for frequently accessed resources
3. **Analytics**: Enhanced reporting on resource usage patterns
4. **Batch operations**: Bulk insert/update operations for efficiency

### Considerations
- **Backward compatibility**: Ensure old API clients can be updated
- **Data retention**: Policies for old resource data
- **Performance tuning**: Continuous optimization based on usage patterns
