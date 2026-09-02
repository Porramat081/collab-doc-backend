# Docker Setup & System Commands Guide

Complete guide for running the collaborative document editor backend with Docker.

## Prerequisites

- Docker Desktop installed ([Get Docker](https://www.docker.com/products/docker-desktop))
- Docker Compose installed (comes with Docker Desktop)
- `.env` file configured in the project root

## Environment Setup

Create a `.env` file in the project root with the following variables:

```env
# Backend
NODE_ENV=development
PORT=3000

# PostgreSQL
POSTGRES_USER=postgres
POSTGRES_PASSWORD=secure_password_here
POSTGRES_DB=collaborative_docs
POSTGRES_PORT=5432

# MongoDB
MONGO_USER=mongo
MONGO_PASSWORD=secure_password_here
MONGO_DB=collaborative_docs
MONGO_PORT=27017

# JWT
JWT_SECRET=your_very_long_and_secure_jwt_secret_key_here
JWT_EXPIRES_IN=7d
```

## Quick Start Commands

### 1. **Build and Start All Services**

```bash
# Build images and start all containers (database, backend)
docker-compose up --build

# Or run in background (detached mode)
docker-compose up --build -d
```

### 2. **Start Services (without rebuild)**

```bash
# Start existing containers
docker-compose up

# Start in background
docker-compose up -d
```

### 3. **Stop All Services**

```bash
# Stop all running containers
docker-compose down

# Stop and remove volumes (WARNING: deletes database data)
docker-compose down -v

# Stop and remove everything including images
docker-compose down -v --rmi all
```

### 4. **View Logs**

```bash
# View all logs
docker-compose logs

# View logs for specific service
docker-compose logs backend
docker-compose logs postgres
docker-compose logs mongodb
docker-compose logs redis

# Follow logs in real-time
docker-compose logs -f

# Follow logs for specific service
docker-compose logs -f backend
```

### 5. **Database Migrations**

```bash
# Run Prisma migrations
docker-compose exec backend npm run db:deploy

# Generate Prisma client
docker-compose exec backend npm run prisma:generate

# Create new migration
docker-compose exec backend npm run db:migrate -- --name migration_name
```

### 6. **Initialize MongoDB**

```bash
# Initialize MongoDB collections
docker-compose exec backend npm run db:init:mongo
```

### 7. **Check Service Status**

```bash
# List all running containers
docker-compose ps

# Check detailed container info
docker-compose stats

# Inspect a service
docker-compose logs backend --tail=50
```

### 8. **Access Services Directly**

#### PostgreSQL

```bash
# Access PostgreSQL CLI
docker-compose exec postgres psql -U postgres -d collaborative_docs

# Example queries inside psql:
\dt              # List tables
\l               # List databases
SELECT * FROM users;
```

#### MongoDB

```bash
# Access MongoDB shell
docker-compose exec mongodb mongosh -u mongo -p --authenticationDatabase admin

# Example commands inside mongosh:
use collaborative_docs
db.documents.find()
```

#### Redis

```bash
# Access Redis CLI
docker-compose exec redis redis-cli

# Example commands:
PING              # Check connection
KEYS *            # List all keys
GET key_name      # Get value
```

#### Backend Container

```bash
# Access bash shell in backend container
docker-compose exec backend sh

# Run commands inside container
docker-compose exec backend npm run build
docker-compose exec backend node src/app.ts
```

## Rebuild Commands

### 9. **Rebuild Specific Service**

```bash
# Rebuild backend
docker-compose build backend

# Rebuild without cache
docker-compose build --no-cache backend

# Rebuild all services
docker-compose build --no-cache
```

### 10. **Clean Up & Maintenance**

```bash
# Remove stopped containers
docker-compose rm

# Remove unused images
docker image prune

# Remove unused volumes
docker volume prune

# Complete cleanup (WARNING: removes data)
docker-compose down -v
docker system prune -a
```

## Development Workflow

### 11. **Development Commands**

```bash
# Start all services
docker-compose up -d

# Watch logs
docker-compose logs -f backend

# Make code changes in src/

# Changes are automatically reflected if you have hot-reload configured
# Or restart the service:
docker-compose restart backend

# Run tests inside container
docker-compose exec backend npm test

# Run specific test
docker-compose exec backend npm test -- protocol.test.ts
```

### 12. **Build for Production**

```bash
# Build production image
docker-compose -f docker-compose.prod.yml build

# Run production services
docker-compose -f docker-compose.prod.yml up -d
```

## Useful Troubleshooting Commands

### 13. **Troubleshooting**

```bash
# Check if port is in use
lsof -i :3000
lsof -i :5432
lsof -i :27017
lsof -i :6379

# View container resource usage
docker stats

# Inspect network
docker network ls
docker network inspect collab-doc_app-network

# View container details
docker inspect container_name

# Check backend health endpoint
curl http://localhost:3000/health

# View environment variables in container
docker-compose exec backend env

# Restart a specific service
docker-compose restart backend
docker-compose restart postgres
docker-compose restart mongodb
docker-compose restart redis

# View container logs with timestamps
docker-compose logs --timestamps backend
```

## Service URLs & Ports

| Service     | URL                   | Port  |
| ----------- | --------------------- | ----- |
| Backend API | http://localhost:3000 | 3000  |
| WebSocket   | ws://localhost:3001   | 3001  |
| PostgreSQL  | localhost:5432        | 5432  |
| MongoDB     | localhost:27017       | 27017 |
| Redis       | localhost:6379        | 6379  |

## Docker Files Structure

```
collab-doc/
├── Dockerfile              # Multi-stage build for backend
├── docker-compose.yaml     # All services (backend + databases)
├── .env                    # Environment variables (create from template)
├── .env.example            # Example env file
├── package.json            # Dependencies
├── tsconfig.json          # TypeScript config
├── tsconfig.build.json    # Build-specific TypeScript config
└── src/                    # Source code
```

## Network Configuration

All services communicate over the `app-network` bridge network:

- Backend connects to `postgres:5432`
- Backend connects to `mongodb:27017`
- Backend connects to `redis:6379`

## Volume Management

| Volume          | Service    | Path                       |
| --------------- | ---------- | -------------------------- |
| `postgres_data` | PostgreSQL | `/var/lib/postgresql/data` |
| `mongo_data`    | MongoDB    | `/data/db`                 |
| `redis_data`    | Redis      | `/data`                    |

To backup volumes:

```bash
docker-compose exec postgres pg_dump -U postgres collaborative_docs > backup.sql
```

## Health Checks

All services have health checks configured:

- Backend: HTTP health endpoint
- PostgreSQL: `pg_isready` check
- MongoDB: `mongosh` admin command
- Redis: `redis-cli ping`

View health status:

```bash
docker-compose ps
# Look at the STATUS column
```

## Common Issues & Solutions

### Issue: Port already in use

```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 PID

# Or change port in docker-compose.yaml
```

### Issue: Database connection failed

```bash
# Check if database service is running
docker-compose ps

# Check logs
docker-compose logs postgres

# Restart service
docker-compose restart postgres
```

### Issue: Volume permission denied

```bash
# Fix volume permissions
docker-compose exec postgres chown -R postgres:postgres /var/lib/postgresql/data
```

### Issue: Out of disk space

```bash
# Clean up Docker
docker system prune -a --volumes
```

## Performance Tips

1. **Use detached mode for background work**

   ```bash
   docker-compose up -d
   ```

2. **Monitor resource usage**

   ```bash
   docker stats
   ```

3. **Use `.dockerignore` to reduce image size**
   - Already configured for backend

4. **Multi-stage build reduces image size**
   - Already configured in Dockerfile

5. **Use health checks to auto-restart failed services**
   - Already configured in docker-compose.yaml

## Advanced Commands

### Scale Services (if configured)

```bash
# Scale backend instances (requires load balancer config)
docker-compose up -d --scale backend=3
```

### Export/Import Data

```bash
# Export PostgreSQL data
docker-compose exec postgres pg_dump -U postgres collaborative_docs > backup.sql

# Import PostgreSQL data
docker-compose exec -T postgres psql -U postgres collaborative_docs < backup.sql

# Export MongoDB data
docker-compose exec mongodb mongodump --uri="mongodb://mongo:password@localhost:27017" -d collaborative_docs -o ./backup

# Import MongoDB data
docker-compose exec mongodb mongorestore --uri="mongodb://mongo:password@localhost:27017" ./backup/collaborative_docs
```
