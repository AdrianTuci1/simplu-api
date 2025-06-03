#!/bin/sh

# Wait for database to be ready
echo "Waiting for database to be ready..."
while ! nc -z $DATABASE_HOST $DATABASE_PORT; do
  sleep 1
done
echo "Database is ready!"

# Run migrations
echo "Running database migrations..."
cd /app && npx typeorm-ts-node-commonjs migration:run -d src/config/typeorm.config.ts

# Check if migration was successful
if [ $? -eq 0 ]; then
    echo "Migration completed successfully"
    # Remove migration file after successful run
    echo "Removing migration file..."
    rm -f src/migrations/1712345567890-UpdateSessionsId.ts
else
    echo "Migration failed"
    exit 1
fi

# Start the application
echo "Starting application..."
node dist/main.js 