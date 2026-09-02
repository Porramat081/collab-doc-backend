#!/bin/sh
set -e

echo "Starting application initialization..."

# Wait for databases to be ready with retries
echo "Waiting for PostgreSQL..."
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  if node -e "require('http').get('http://localhost:3000/health', () => {}).on('error', () => {})" 2>/dev/null; then
    echo "✓ Ready to proceed"
    break
  fi
  RETRY_COUNT=$((RETRY_COUNT + 1))
  echo "  Attempt $RETRY_COUNT/$MAX_RETRIES... waiting..."
  sleep 2
done

# Run Prisma migrations
echo "Running database migrations..."
if npm run db:deploy; then
  echo "✓ Migrations completed successfully"
else
  echo "Migrations failed, continuing..."
fi

# Initialize MongoDB
echo "🗄️  Initializing MongoDB..."
if npm run db:init:mongo; then
  echo "MongoDB initialized successfully"
else
  echo "MongoDB initialization failed, continuing..."
fi

# Generate Prisma client
echo "Generating Prisma client..."
if npm run prisma:generate; then
  echo "Prisma client generated"
else
  echo "Prisma generation skipped"
fi

echo "Initialization complete, starting application..."
echo ""

# Start the application
exec npm start
