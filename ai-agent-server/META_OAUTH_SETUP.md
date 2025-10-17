# Meta OAuth Setup Guide

## Overview
This guide explains how to configure Meta (Facebook) OAuth permissions for your application.

## Required Environment Variables

```bash
META_APP_ID=your-meta-app-id
META_APP_SECRET=your-meta-app-secret
META_REDIRECT_URI=http://localhost:3003/external/meta/callback
META_OAUTH_SCOPES=public_profile,email,pages_show_list,pages_read_engagement,pages_manage_posts,pages_manage_engagement
```

## Meta App Dashboard Configuration

### 1. Create/Access Your Meta App
1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Navigate to **My Apps** and select your app (or create a new one)

### 2. Configure OAuth Settings
1. In the left sidebar, go to **Settings** → **Basic**
2. Add your **App Domains** (e.g., `localhost`, your production domain)
3. Scroll down to **Add Platform** and select **Website**
4. Add your Site URL (e.g., `http://localhost:3003`)

### 3. Configure Facebook Login
1. In the left sidebar, go to **Products** and add **Facebook Login** if not already added
2. Go to **Facebook Login** → **Settings**
3. Add your **Valid OAuth Redirect URIs**:
   - Development: `http://localhost:3003/external/meta/callback`
   - Production: `https://yourdomain.com/external/meta/callback`

### 4. Request Permissions
To use the permissions in `META_OAUTH_SCOPES`, you need to request them through App Review:

1. Go to **App Review** → **Permissions and Features**
2. Request the following permissions:

#### Standard Permissions (Available by Default)
- ✅ `public_profile` - Basic user information
- ✅ `email` - User's email address

#### Pages Permissions (Require App Review)
- 📋 `pages_show_list` - List Pages the user manages
- 📋 `pages_read_engagement` - Read Page engagement data
- 📋 `pages_manage_posts` - Create, edit, and delete Posts
- 📋 `pages_manage_engagement` - Manage comments and reactions

#### Instagram Permissions (Optional, Require App Review)
- 📋 `instagram_basic` - Basic Instagram account info
- 📋 `instagram_manage_comments` - Manage Instagram comments
- 📋 `instagram_manage_insights` - Read Instagram insights

#### WhatsApp Business
- **Note**: WhatsApp Business API permissions are configured through Business Manager, not OAuth scopes

### 5. Development vs Production

#### Development Mode
- In development mode, only app admins, developers, and testers can use the app
- Go to **Roles** to add test users
- Most permissions work without App Review in development mode

#### Production Mode
- To make your app public, submit it for App Review
- Go to **App Review** → **Requests** to submit permissions for review
- Provide detailed use cases for each permission

## Available OAuth Scopes

### Recommended Scopes for Facebook Pages Integration
```
public_profile,email,pages_show_list,pages_read_engagement,pages_manage_posts,pages_manage_engagement
```

### Add for Instagram Integration
```
public_profile,email,pages_show_list,instagram_basic,instagram_manage_comments,instagram_manage_insights
```

### For Messenger Integration
```
public_profile,email,pages_show_list,pages_messaging,pages_manage_metadata
```

**Note**: As of 2024, some older permissions like `pages_messaging` and `pages_manage_metadata` may be deprecated or restricted. Always check the [Meta Permissions Reference](https://developers.facebook.com/docs/permissions/reference) for the latest information.

## Customizing Scopes

You can customize the OAuth scopes by modifying the `META_OAUTH_SCOPES` environment variable:

```bash
# Example: Basic Facebook Pages access
META_OAUTH_SCOPES=public_profile,email,pages_show_list

# Example: Full Pages management
META_OAUTH_SCOPES=public_profile,email,pages_show_list,pages_read_engagement,pages_manage_posts,pages_manage_engagement

# Example: Instagram + Pages
META_OAUTH_SCOPES=public_profile,email,pages_show_list,instagram_basic,instagram_manage_comments
```

## Testing OAuth Flow

### 1. Start the Server
```bash
cd ai-agent-server
npm run start:dev
```

### 2. Generate Auth URL
```bash
curl "http://localhost:3003/external/meta/auth-url?businessId=test-business&locationId=test-location"
```

Response:
```json
{
  "url": "https://www.facebook.com/v19.0/dialog/oauth?client_id=...",
  "clientId": "your-app-id",
  "redirectUri": "http://localhost:3003/external/meta/callback"
}
```

### 3. Open the URL in Browser
- The URL will redirect to Facebook login
- After login, user will be asked to grant permissions
- After granting, Facebook redirects to your callback URL

### 4. Check Credentials Status
```bash
curl "http://localhost:3003/external/meta/status?businessId=test-business&locationId=test-location"
```

## Common Issues

### "Invalid Scopes" Error
- **Cause**: Permissions not enabled in your Meta App Dashboard
- **Solution**: Go to App Review and request the permissions, or remove them from `META_OAUTH_SCOPES`

### "Invalid OAuth Redirect URI" Error
- **Cause**: Redirect URI not whitelisted in Facebook Login settings
- **Solution**: Add your redirect URI to Valid OAuth Redirect URIs in Facebook Login Settings

### "App Not Set Up" Error
- **Cause**: Facebook Login product not added to your app
- **Solution**: Go to Products and add Facebook Login

### Permissions Denied in Production
- **Cause**: App not approved for advanced permissions
- **Solution**: Submit your app for App Review with detailed use cases

## Resources

- [Meta for Developers](https://developers.facebook.com/)
- [Facebook Login Documentation](https://developers.facebook.com/docs/facebook-login)
- [Permissions Reference](https://developers.facebook.com/docs/permissions/reference)
- [App Review Process](https://developers.facebook.com/docs/app-review)
- [WhatsApp Business API](https://developers.facebook.com/docs/whatsapp)

## Support

For issues specific to Meta API and permissions, refer to:
- [Meta Community Forum](https://developers.facebook.com/community/)
- [Meta Business Help Center](https://www.facebook.com/business/help)

