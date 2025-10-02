# RootEncoder Facebook Backend

This is the backend server for the RootEncoder Facebook Live integration, designed to run on Railway.app.

## Features

- **Token Exchange**: Exchange Facebook short-lived tokens for long-lived tokens
- **User Management**: Get user information and pages
- **Live Video Creation**: Create Facebook live videos and get streaming URLs
- **Security**: Rate limiting, CORS, helmet security headers
- **Health Checks**: Monitor server status and configuration

## Environment Variables

Copy `env.example` to `.env` and configure the following variables:

```bash
# Server Configuration
PORT=3000
NODE_ENV=production

# CORS Configuration (comma-separated list of allowed origins)
ALLOWED_ORIGINS=https://your-app-domain.com

# Facebook App Configuration
FACEBOOK_APP_ID=your_facebook_app_id_here
FACEBOOK_APP_SECRET=your_facebook_app_secret_here
FACEBOOK_CLIENT_TOKEN=your_facebook_client_token_here
```

## API Endpoints

### Health Check
- `GET /api/health` - Basic health check
- `GET /api/health/detailed` - Detailed health check with environment validation

### Facebook Integration
- `POST /api/facebook/exchange-token` - Exchange short-lived token for long-lived token
- `GET /api/facebook/user` - Get user information
- `GET /api/facebook/pages` - Get user's Facebook pages
- `POST /api/facebook/live-video` - Create a live video
- `GET /api/facebook/live-video/:videoId` - Get live video status
- `POST /api/facebook/live-video/:videoId/end` - End a live video

## Deployment on Railway

1. Connect your GitHub repository to Railway
2. Set the environment variables in Railway dashboard
3. Railway will automatically deploy the app

## Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Start production server
npm start
```

## Security Features

- Rate limiting (100 requests per 15 minutes per IP)
- CORS protection
- Helmet security headers
- Input validation
- Error handling without sensitive data leakage

## Facebook Graph API Integration

The backend integrates with Facebook Graph API v18.0 to:
- Exchange tokens for extended validity
- Retrieve user pages and access tokens
- Create live videos with RTMP streaming URLs
- Manage live video lifecycle

## Error Handling

All endpoints return consistent error responses:
```json
{
  "error": "Error type",
  "message": "Human-readable error message"
}
```

## Rate Limiting

API endpoints are rate-limited to prevent abuse:
- 100 requests per 15 minutes per IP address
- Custom error message for rate limit exceeded
