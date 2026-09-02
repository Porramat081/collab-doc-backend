#!/bin/sh
set -e

echo "Starting application initialization..."

echo "Waiting for PostgreSQL..."
until node -e "
  const {Client}=require('pg');
  const c=new Client({connectionString:process.env.DATABASE_URL});
  c.connect().then(()=>c.end()).catch(()=>process.exit(1));
" 2>/dev/null; do
  echo "  waiting for postgres..."
  sleep 2
done
echo "✓ PostgreSQL ready"

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
