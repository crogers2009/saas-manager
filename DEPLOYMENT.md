# SaaS Manager - Production Deployment Guide

## Overview
This guide will help you deploy the SaaS Manager application to your production server.

## What You Need to Upload

### 1. Frontend Files (Built)
Upload the entire `dist/` folder contents to your web server's public directory:
```
dist/
├── assets/
│   ├── index-2580e415.js
│   └── index-87586d0f.css
├── index.html
├── logo-blue.png
└── logo.png
```

### 2. Backend Files
Upload these server files to your production server:
```
server/
├── routes/
├── middleware/
├── database.js
├── config.js
├── server.js
└── package.json (backend dependencies)
```

### 3. Database
- Copy `server/saas_manager.db` to your production server
- Or start fresh and let the system seed initial data

## Production Setup Steps

### Step 1: Server Setup
1. Ensure Node.js is installed on your server (version 14+ recommended)
2. Install PM2 for process management: `npm install -g pm2`

### Step 2: Upload Files
1. Upload `dist/` contents to your web server's document root (e.g., `/var/www/html/`)
2. Upload `server/` folder to a separate directory (e.g., `/var/www/saas-manager-api/`)

### Step 3: Backend Configuration
1. Navigate to your backend directory
2. Install dependencies: `npm install`
3. Set production environment variables:
   ```bash
   export NODE_ENV=production
   export JWT_SECRET=your-secure-jwt-secret-here
   export PORT=3001
   ```

### Step 4: Database Setup
1. Copy your existing database file, or let the system create a new one
2. The system will automatically run migrations and seed data if needed

### Step 5: Start Backend
```bash
# Using PM2 (recommended)
pm2 start server.js --name "saas-manager-api"
pm2 save
pm2 startup

# Or using nohup
nohup node server.js > saas-manager.log 2>&1 &
```

### Step 6: Web Server Configuration

#### For Apache (.htaccess)
Create a `.htaccess` file in your web root:
```apache
Options -MultiViews
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteRule ^ index.html [QSA,L]

# API Proxy
RewriteCond %{REQUEST_URI} ^/api/(.*)
RewriteRule ^api/(.*)$ http://localhost:3001/api/$1 [P,L]
```

#### For Nginx
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/html;
    index index.html;

    # Frontend routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Environment Variables

Set these on your production server:
```bash
NODE_ENV=production
JWT_SECRET=your-very-secure-secret-key-at-least-32-characters
PORT=3001
```

## Security Checklist

- [ ] Change JWT_SECRET to a secure random string
- [ ] Enable HTTPS/SSL certificates
- [ ] Set up firewall rules
- [ ] Enable secure cookies (happens automatically in production)
- [ ] Regularly backup your database
- [ ] Update default admin password after first login

## Default Login (Temporary)
- Email: `admin@temp.com`
- Password: `testpass`

**Important**: Change this password immediately after deployment!

## Monitoring

Check if your application is running:
```bash
# Check backend process
pm2 status

# Check logs
pm2 logs saas-manager-api

# Restart if needed
pm2 restart saas-manager-api
```

## Database Backup

Regular backup command:
```bash
# Create backup
cp /path/to/saas_manager.db /backups/saas_manager_$(date +%Y%m%d_%H%M%S).db

# Restore from backup
cp /backups/saas_manager_20250728_123000.db /path/to/saas_manager.db
```

## Troubleshooting

1. **Backend not starting**: Check Node.js version and dependencies
2. **Frontend not loading**: Verify web server configuration and file permissions
3. **API calls failing**: Check if backend is running and proxy configuration is correct
4. **Database issues**: Verify file permissions and SQLite installation