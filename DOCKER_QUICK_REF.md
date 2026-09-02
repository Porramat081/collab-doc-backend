# Docker Quick Reference

## Essential Commands

```bash
# START THE SYSTEM
docker-compose up --build -d

# STOP THE SYSTEM
docker-compose down

# VIEW LOGS
docker-compose logs -f backend

# RUN DATABASE MIGRATIONS
docker-compose exec backend npm run db:deploy

# INITIALIZE MONGODB
docker-compose exec backend npm run db:init:mongo

# CHECK STATUS
docker-compose ps

# REBUILD BACKEND
docker-compose build backend

# ACCESS SERVICES
docker-compose exec backend sh           # Backend shell
docker-compose exec postgres psql ...    # PostgreSQL
docker-compose exec mongodb mongosh ...  # MongoDB
docker-compose exec redis redis-cli      # Redis

# CLEAN UP
docker-compose down -v                   # Stop & remove volumes
docker system prune -a                   # Deep clean
```

## One-Liners

```bash
# Full restart
docker-compose down -v && docker-compose up --build -d

# Check all health
docker-compose ps

# Follow backend logs
docker-compose logs -f backend

# Test API
curl http://localhost:3000/health

# Export database
docker-compose exec postgres pg_dump -U postgres collaborative_docs > backup.sql
```

## Port Reference

```
3000   - Backend API
3001   - WebSocket
5432   - PostgreSQL
27017  - MongoDB
6379   - Redis
```
