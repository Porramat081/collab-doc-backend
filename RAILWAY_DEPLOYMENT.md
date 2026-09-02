# Railway Deployment Guide

This backend is configured for deployment on Railway.

## Quick Start

### Prerequisites

- Node.js 18+ (Railway will auto-detect)
- Railway account and CLI installed

### Deploy Steps

1. **Initialize Railway project**

   ```bash
   railway init
   ```

2. **Set environment variables in Railway dashboard**

   ```
   NODE_ENV=production
   PORT=3000

   # Database Configuration
   POSTGRES_USER=your_postgres_user
   POSTGRES_PASSWORD=your_postgres_password
   POSTGRES_DB=collaborative_docs
   DATABASE_URL=postgresql://user:password@host:port/db

   # MongoDB Configuration
   MONGO_USER=your_mongo_user
   MONGO_PASSWORD=your_mongo_password
   MONGO_DB=collaborative_docs
   MONGODB_URI=mongodb://user:password@host:27017/db

   # Redis Configuration
   REDIS_URL=redis://default:password@host:6379

   # JWT Secret
   JWT_SECRET=your_jwt_secret_key
   ```

3. **Link your repository**

   ```bash
   railway link
   ```

4. **Deploy**
   ```bash
   railway up
   ```

Or connect your GitHub repository directly in the Railway dashboard for automatic deployments.

## Build Process

The build command is automatically executed:

```bash
npm run build
```

This compiles TypeScript to JavaScript in the `dist/` directory.

## Start Command

The app starts with:

```bash
npm start
```

Which runs the Express server defined in `src/app.ts`.

## Database Migrations

Migrations run automatically on deploy via Prisma:

```bash
npm run db:deploy
```

Add this to your Railway pre-deploy script if needed.

## Available Services

The app requires these services to be linked in Railway:

- **PostgreSQL**: For relational data storage
- **MongoDB**: For document operations
- **Redis**: For WebSocket pub/sub and caching

## Configuration Files

- `railway.json` - Main Railway configuration (JSON format)
- `.railway.toml` - Alternative Railway configuration (TOML format)
- `Procfile` - Process types (web, worker)
- `.railwayignore` - Files to ignore during deployment
- `tsconfig.build.json` - TypeScript build configuration

## Monitoring

Check logs in Railway dashboard:

```bash
railway logs
```

View environment:

```bash
railway status
```

## Local Testing

Test the build locally:

```bash
npm run build
npm start
```

Make sure all databases are running locally via Docker:

```bash
docker-compose up -d
```
