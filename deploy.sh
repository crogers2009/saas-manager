#!/bin/bash

# SaaS Manager Deployment Script
# Usage: ./deploy.sh [server-path]

echo "🚀 SaaS Manager Deployment Script"
echo "=================================="

# Build frontend
echo "📦 Building frontend..."
npm run build

# Create deployment package
echo "📋 Creating deployment package..."
mkdir -p deployment/frontend
mkdir -p deployment/backend

# Copy frontend files
cp -r dist/* deployment/frontend/

# Copy backend files
cp -r server/* deployment/backend/
cp server/package.json deployment/backend/

# Create archive
echo "🗜️  Creating deployment archive..."
tar -czf saas-manager-deployment.tar.gz deployment/

echo "✅ Deployment package created: saas-manager-deployment.tar.gz"
echo ""
echo "📋 Next steps:"
echo "1. Upload saas-manager-deployment.tar.gz to your server"
echo "2. Extract: tar -xzf saas-manager-deployment.tar.gz"
echo "3. Copy frontend/ contents to your web root"
echo "4. Copy backend/ contents to your API directory"
echo "5. Run: cd backend && npm install && npm start"
echo ""
echo "📖 See DEPLOYMENT.md for detailed instructions"

# Cleanup
rm -rf deployment/