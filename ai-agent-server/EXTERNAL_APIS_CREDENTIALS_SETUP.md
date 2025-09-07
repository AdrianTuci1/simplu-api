## External APIs credentials setup

This guide explains how to obtain and configure credentials for:
- Google (Gmail OAuth)
- Meta (Facebook/Instagram Messaging)
- AWS SNS (SMS)
- ElevenLabs (Realtime voice)
- Twilio (optional fallback for SMS)

Environment variables to add in `ai-agent-server/.env`:

```
# Google
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3001/external/gmail/callback

# Meta
META_APP_ID=
META_APP_SECRET=
META_REDIRECT_URI=http://localhost:3001/external/meta/callback
META_WEBHOOK_VERIFY_TOKEN=choose-a-random-string

# AWS (used for DynamoDB and SNS)
AWS_REGION=eu-central-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=

# ElevenLabs
ELEVENLABS_API_KEY=

# Twilio (optional fallback for SMS)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
```

### 1) Google (Gmail OAuth)

1. Go to Google Cloud Console → APIs & Services → Credentials.
2. Create OAuth 2.0 Client ID (type Web application).
3. Add Authorized redirect URI: `http://localhost:3001/external/gmail/callback` (and your prod URL too).
4. Copy `Client ID` and `Client Secret` into `.env`.
5. Enable APIs: Gmail API and Google People API.

Notes:
- If refresh_token is missing on subsequent connects, Google may re-use consent; ensure `prompt=consent` and `access_type=offline` (already configured in backend).

### 2) Meta (Facebook/Instagram Messaging)

1. Go to Meta for Developers → create an app (e.g., "Business").
2. Add products:
   - Facebook Login
   - WhatsApp Cloud API (for WhatsApp) or Messenger / Instagram Messaging as needed
3. Configure Facebook Login → Valid OAuth Redirect URIs: `http://localhost:3001/external/meta/callback`.
4. Get `App ID` and `App Secret` → put them in `.env`.
5. Webhooks: set `META_WEBHOOK_VERIFY_TOKEN` and add webhook subscription endpoints pointing to your server (e.g., `/webhooks/meta/:businessId`).
6. In production, complete App Review for requested scopes (pages_messaging, instagram_manage_messages, etc.).

### 3) AWS SNS (SMS)

1. In AWS Console, create an IAM user with programmatic access and attach policy allowing SNS publish (e.g., `AmazonSNSFullAccess` in dev).
2. Put `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `AWS_REGION` in `.env`.
3. In some regions, you may need to request SMS spending limit increase and production access.
4. Optionally set default SMS type to Transactional via SNS settings.

### 4) ElevenLabs (Realtime voice)

1. Create an account on ElevenLabs and get an API key.
2. Add `ELEVENLABS_API_KEY` to `.env`.
3. The backend endpoint `GET /external/voice/elevenlabs/session` mints ephemeral keys to use from the browser.

### 5) Twilio (optional SMS fallback)

1. Create a Twilio account, buy a phone number capable of SMS.
2. Copy `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` to `.env`.
3. If you plan to send via Twilio per business, save business Twilio credentials using the existing credentials endpoints.

### Verification checklist

- Can call `GET /external/gmail/auth-url` and be redirected to Google OAuth.
- Can call `GET /external/meta/auth-url` and be redirected to Meta OAuth.
- `GET /external/voice/elevenlabs/session` returns `{ key: "..." }`.
- SMS sends using SNS in your region; check CloudWatch or delivery reports; Twilio fallback only if SNS fails.


