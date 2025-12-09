# OAuth 2.0 Integration Skill

## Overview

Nareshka supports OAuth 2.0 authentication with **Google** and **Telegram**, allowing users to sign in with their social accounts and link multiple OAuth providers to a single account.

## Architecture

```
User → OAuth Provider (Google/Telegram)
  ↓
Backend OAuth Endpoints
  ↓
OAuthAccount Model (database)
  ↓
User Account (link/create)
  ↓
JWT Token generation
```

### Backend Components

**Location:** `back/app/features/auth/`

- **`services/oauth_service.py`** - Authlib OAuth client configuration and flow handling
- **`router.py`** - OAuth endpoints (5 total)
- **`models/oauth_account.py`** - OAuthAccount SQLAlchemy model
- **`schemas.py`** - Pydantic DTOs for OAuth requests/responses

### Frontend Components

**Location:** `front/src/features/`

- **`LoginForm/`** - GoogleOAuthButton component (initiates Google flow)
- **`AccountManagement/`** - Manage linked accounts, unlink providers
- **`TelegramLoginButton`** - Official Telegram login widget

## OAuth Flows

### Google OAuth 2.0 Flow

**Step 1: Initiate Google Login**
```
User clicks GoogleOAuthButton
  ↓
GET /api/v2/auth/oauth/google
  ↓
Redirect to Google Consent Screen
  ↓
User grants permissions
```

**Step 2: Handle Google Callback**
```
GET /api/v2/auth/oauth/google/callback?code=...&state=...
  ↓
Exchange auth code for access_token + user info
  ↓
Check if OAuthAccount exists:
  - Yes → Log in user, return JWT
  - No → Create new User + OAuthAccount, return JWT
  ↓
Frontend receives JWT cookie, user logged in
```

**Frontend Implementation:**
```typescript
// LoginForm.tsx
<GoogleOAuthButton
  onClick={() => {
    window.location.href = '/api/v2/auth/oauth/google'
  }}
/>
```

### Telegram OAuth Flow

**Step 1: Telegram Widget**
```html
<script src="https://telegram.org/js/telegram-widget.js?22"></script>

<script
  async
  src="https://telegram.org/js/telegram-widget.js?22"
  data-telegram-login="YourBotUsername"
  data-size="large"
  data-onauth="onTelegramAuth(user)"
  data-request-access="write"
/>
```

**Step 2: Handle Telegram Auth**
```typescript
function onTelegramAuth(user) {
  // Send to backend
  fetch('/api/v2/auth/oauth/telegram', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user)
  })
  .then(r => r.json())
  .then(data => {
    // Set JWT cookie, redirect to home
    window.location.href = '/'
  })
}
```

**Backend Verification:**
```python
# Verify hash with TELEGRAM_BOT_TOKEN
expected_hash = hmac.new(
    hashlib.sha256(TELEGRAM_BOT_TOKEN.encode()).digest(),
    msg=data_check_string.encode(),
    digestmod=hashlib.sha256
).hexdigest()

if hash != expected_hash:
    raise HTTPException(status_code=401, detail="Invalid Telegram data")
```

## Database Model

**OAuthAccount:**
```python
class OAuthAccount(Base):
    __tablename__ = "oauth_accounts"

    id: int = Column(Integer, primary_key=True)
    user_id: int = Column(Integer, ForeignKey("users.id"), nullable=False)
    provider: str = Column(String(50), nullable=False)  # "google" or "telegram"
    provider_id: str = Column(String(255), nullable=False)  # OAuth provider user ID
    provider_email: str | None = Column(String(255))
    access_token: str | None = Column(String(1000))
    refresh_token: str | None = Column(String(1000))
    created_at: datetime = Column(DateTime, default=datetime.utcnow)
    updated_at: datetime = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="oauth_accounts")
```

**Linking Rules:**
- One User can have multiple OAuthAccounts
- One OAuthAccount belongs to one User
- Cannot link the same provider twice to one user
- Cannot unlink if user has no password AND only one OAuth

## API Endpoints

### 1. Initiate Google OAuth
```
GET /api/v2/auth/oauth/google
Response: 307 Redirect to Google consent screen
```

### 2. Google OAuth Callback
```
GET /api/v2/auth/oauth/google/callback?code=...&state=...
Response: 200 OK
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "user": {
    "id": 123,
    "email": "user@example.com",
    "username": "john_doe"
  }
}
```

### 3. Telegram OAuth
```
POST /api/v2/auth/oauth/telegram
Body: {
  "id": 123456789,
  "first_name": "John",
  "username": "johndoe",
  "photo_url": "https://...",
  "auth_date": 1677123456,
  "hash": "abc123..."
}
Response: 200 OK
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "user": {...}
}
```

### 4. Get Linked Accounts
```
GET /api/v2/auth/oauth/linked
Headers: Authorization: Bearer <token>
Response: 200 OK
[
  {
    "provider": "google",
    "provider_email": "user@gmail.com",
    "created_at": "2025-01-15T10:30:00"
  },
  {
    "provider": "telegram",
    "provider_email": null,
    "created_at": "2025-01-16T14:20:00"
  }
]
```

### 5. Unlink OAuth Account
```
DELETE /api/v2/auth/oauth/{provider}/unlink
Headers: Authorization: Bearer <token>
Response: 200 OK
{
  "message": "Successfully unlinked google account"
}
```

## Environment Variables

**Backend (.env):**
```bash
# Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# Telegram Bot
TELEGRAM_BOT_TOKEN=your-bot-token

# Frontend callback URL
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:4000
```

## Common Issues & Solutions

### Issue: "Redirect URI Mismatch"

**Cause:** Google Console doesn't have the callback URL registered.

**Fix:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to "Credentials" → Your OAuth 2.0 app
4. Add authorized redirect URIs:
   - Dev: `http://localhost:4000/api/v2/auth/oauth/google/callback`
   - Prod: `https://yourdomain.com/api/v2/auth/oauth/google/callback`

### Issue: "Telegram hash validation fails"

**Cause:**
- Bot token is incorrect
- auth_date is too old (> 24 hours)
- Data was modified in transit

**Fix:**
```python
# Check TELEGRAM_BOT_TOKEN in .env is correct
# Verify auth_date is recent: time.time() - auth_date < 86400
# Don't modify user data object after receiving it
```

### Issue: "Cannot unlink - user has no password"

**Cause:** User logged in with OAuth only, no password set.

**Solution:**
- User must set password first in Account Settings
- Or link another OAuth provider before unlinking this one

**Backend Check:**
```python
async def can_unlink_oauth(user: User) -> bool:
    """Check if user can unlink OAuth account"""
    # Must have password OR another OAuth
    has_password = user.hashed_password is not None
    other_oauth = len([acc for acc in user.oauth_accounts
                      if acc.provider != provider]) > 0
    return has_password or other_oauth
```

### Issue: "User signs in with Google, but different email than existing account"

**Expected:** Creates new account with Google email

**To merge:** User must sign in with existing account, then link Google OAuth

## Implementation Checklist

When implementing OAuth modifications:

- [ ] Update environment variables (GOOGLE_CLIENT_ID, TELEGRAM_BOT_TOKEN)
- [ ] Test Google redirect on dev server
- [ ] Test Telegram widget initialization
- [ ] Verify JWT token is set in cookies
- [ ] Test account linking (one user, multiple providers)
- [ ] Test unlinking (prevent if user has no password)
- [ ] Test expired token refresh
- [ ] Verify CORS headers allow OAuth callbacks

## Testing

### Test Google OAuth Flow

Use `/test-auth-endpoint` command:
```
/test-auth-endpoint /api/v2/auth/oauth/linked
```

This will:
1. Log in with test credentials (if provided)
2. Get JWT token
3. Test the authenticated endpoint

### Test Telegram Integration

1. Create Telegram bot via [@BotFather](https://t.me/BotFather)
2. Set TELEGRAM_BOT_TOKEN in .env
3. Test widget appears correctly
4. Send test auth data:
```bash
curl -X POST http://localhost:4000/api/v2/auth/oauth/telegram \
  -H "Content-Type: application/json" \
  -d '{
    "id": 123456789,
    "first_name": "Test",
    "auth_date": 1677123456,
    "hash": "abc123..."
  }'
```

### Manual Testing Steps

1. **Fresh login with Google:**
   - Navigate to login page
   - Click "Login with Google"
   - Accept permissions
   - Should be logged in

2. **Link additional OAuth:**
   - Go to Account Settings
   - Click "Link Google Account"
   - Grant permissions
   - Should see Google account in linked accounts list

3. **Unlink OAuth:**
   - Account Settings → Linked Accounts
   - Click "Unlink Google"
   - Should be removed from list

## Security Notes

- ⚠️ Never log access tokens (they grant account access)
- ✅ Always validate OAuth provider signatures
- ✅ Use HTTPS in production (OAuth won't work over HTTP)
- ✅ Store refresh tokens securely (never in localStorage)
- ✅ Validate state parameter to prevent CSRF attacks
- ✅ Check auth_date recency for Telegram (max 24 hours)

## File Locations

| Component | Location |
|-----------|----------|
| OAuth Service | `back/app/features/auth/services/oauth_service.py` |
| OAuth Router | `back/app/features/auth/router.py` |
| OAuth Models | `back/app/features/auth/models/oauth_account.py` |
| OAuth Schemas | `back/app/features/auth/schemas.py` |
| Google Button | `front/src/features/LoginForm/GoogleOAuthButton.tsx` |
| Telegram Button | `front/src/features/LoginForm/TelegramLoginButton.tsx` |
| Account Mgmt | `front/src/features/AccountManagement/LinkedAccounts.tsx` |

## Related Skills

- **fastapi-backend-guidelines** - How to build FastAPI endpoints
- **react-frontend-guidelines** - How to build React components
