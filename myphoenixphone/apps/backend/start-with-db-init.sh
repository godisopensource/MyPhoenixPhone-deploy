#!/bin/bash
set -e

echo "🔧 Initializing database..."

# Push schema to database
npx prisma db push --accept-data-loss --schema=./prisma/schema.prisma

echo "✅ Database schema applied"

# Seed phone models
echo "📱 Seeding phone models..."
npm run seed:phone-models

echo "✅ Phone models seeded"

# Start the application
echo "🚀 Starting NestJS application..."
npm run start:prod
