# RDS Sharding Fix

## Problem
The resource class wasn't executing properly when using RDS instead of Citrus because the code was always trying to get a shard from the Citrus sharding service, even in RDS mode.

## Root Cause
In the original implementation, `ResourceDataService` was calling `citrusShardingService.getShardForBusiness(businessId, locationId)` for all database operations, regardless of the database type. This caused failures when using RDS because:

1. No Citrus server was running
2. The shard concept doesn't apply to RDS - the primary key is `businessId-locationId-resourceId`

## Solution
Modified `ResourceDataService` to handle both RDS and Citrus modes properly:

### Key Changes

1. **Added ConfigService injection** to check database type
2. **Created `getShardInfo()` method** that:
   - Returns `{ shardId: null, isRDS: true }` for RDS mode
   - Returns `{ shardId: shardConnection.shardId, isRDS: false }` for Citrus mode
3. **Updated all resource operations** to use the new shard info method
4. **Improved logging** to show which mode is being used

### Code Changes

```typescript
// Before: Always called Citrus sharding service
const shardConnection = await citrusShardingService.getShardForBusiness(businessId, locationId);

// After: Check database type first
const { shardId, isRDS } = await this.getShardInfo(businessId, locationId);
```

### Database Behavior

- **RDS Mode**: Uses single database connection, primary key is `businessId-locationId-resourceId`
- **Citrus Mode**: Uses sharding service to determine which database shard to use

## Testing

To test the fix:

1. Set `DATABASE_TYPE=rds` in environment
2. Run the test script: `node test-rds-resource.js`
3. Verify that resources can be created without Citrus sharding errors

## Files Modified

- `src/modules/resources/services/resource-data.service.ts` - Main fix implementation
- `test-rds-resource.js` - Test script to verify the fix

## Environment Configuration

```bash
# For RDS mode
DATABASE_TYPE=rds
RDS_HOST=localhost
RDS_PORT=5432
RDS_USERNAME=postgres
RDS_PASSWORD=your-password
RDS_DATABASE=resources_db
RDS_SSL=false

# For Citrus mode (default)
DATABASE_TYPE=citrus
CITRUS_SERVER_URL=http://localhost:8080
CITRUS_API_KEY=your-api-key
```
