# Innonet Backend API Documentation

## Overview

The Innonet backend is built with **FastAPI** (Python) and provides a RESTful API for a professional networking platform. It handles authentication, user management, events, payments, and waitlist functionality.

**Base URL:** `http://localhost:8000/api/v1`

---

## Technology Stack

| Component | Technology |
|-----------|------------|
| Framework | FastAPI |
| Database | PostgreSQL (async with SQLAlchemy 2.0) |
| Authentication | JWT (access + refresh tokens) |
| Password Hashing | Argon2 |
| Payments | Stripe (card, Alipay, WeChat Pay) |
| Email | SendGrid |
| Migrations | Alembic |

---

## API Endpoints

### Authentication (`/api/v1/auth`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/register` | Create new user account | No |
| POST | `/login` | Login with credentials | No |
| POST | `/refresh` | Refresh access token | No |
| POST | `/logout` | Invalidate refresh token | Yes |
| GET | `/me` | Get current user info | Yes |

#### POST `/register`
Create a new user account with username and either email or phone.

**Request Body:**
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "securepassword123"
}
```
Or with phone:
```json
{
  "username": "johndoe",
  "phone": "+1234567890",
  "password": "securepassword123"
}
```

**Response (201):**
```json
{
  "user": {
    "id": "uuid",
    "username": "johndoe",
    "email": "john@example.com",
    "phone": null,
    "is_active": true,
    "is_verified": false,
    "created_at": "2024-01-01T00:00:00"
  },
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer"
}
```

#### POST `/login`
Authenticate with username, email, or phone number.

**Request Body:**
```json
{
  "identifier": "john@example.com",
  "password": "securepassword123"
}
```

**Response (200):** Same as register response.

#### POST `/refresh`
Get new tokens using a valid refresh token.

**Request Body:**
```json
{
  "refresh_token": "eyJ..."
}
```

**Response (200):**
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer"
}
```

---

### Users (`/api/v1/users`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/me` | Get current user with profile | Yes |
| PATCH | `/me` | Update user profile | Yes |

#### PATCH `/me`
Update the current user's profile information.

**Request Body:**
```json
{
  "full_name": "John Doe",
  "bio": "Software developer",
  "location": "San Francisco, CA",
  "linkedin_url": "https://linkedin.com/in/johndoe",
  "github_url": "https://github.com/johndoe"
}
```

---

### Events (`/api/v1/events`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/` | List all published events | No |
| GET | `/{event_id}` | Get event details | No (optional) |
| POST | `/` | Create new event | Yes |
| POST | `/{event_id}/register` | Register for event | Yes |
| GET | `/{event_id}/status` | Check registration status | Yes |
| DELETE | `/{event_id}/register` | Cancel registration | Yes |

#### GET `/`
List events with optional filters.

**Query Parameters:**
- `page` (int, default: 1) - Page number
- `limit` (int, default: 20, max: 100) - Items per page
- `city` (string) - Filter by city
- `country` (string) - Filter by country
- `event_type` (string) - Filter by type (hackathon, meetup, workshop)
- `start_after` (datetime) - Events starting after date
- `start_before` (datetime) - Events starting before date

**Response (200):**
```json
{
  "events": [
    {
      "id": "uuid",
      "name": "Tech Hackathon 2024",
      "description": "Annual hackathon...",
      "event_type": "hackathon",
      "location_name": "Tech Hub",
      "location_city": "San Francisco",
      "location_country": "USA",
      "start_datetime": "2024-03-15T09:00:00",
      "end_datetime": "2024-03-17T18:00:00",
      "max_attendees": 100,
      "price_cents": 0,
      "currency": "USD",
      "is_published": true,
      "image_url": "https://..."
    }
  ],
  "total": 50,
  "page": 1,
  "pages": 3
}
```

#### GET `/{event_id}`
Get detailed information about a specific event.

**Response (200):**
```json
{
  "id": "uuid",
  "name": "Tech Hackathon 2024",
  "registration_count": 45,
  "is_registered": false,
  "spots_remaining": 55,
  ...
}
```

#### POST `/{event_id}/register`
Register for an event. For paid events, returns HTTP 402 with payment info.

**Response (200) - Free Event:**
```json
{
  "id": "uuid",
  "event_id": "uuid",
  "user_id": "uuid",
  "status": "confirmed",
  "ticket_code": "INNO-A1B2C3D4",
  "registered_at": "2024-01-01T00:00:00"
}
```

**Response (402) - Paid Event:**
```json
{
  "detail": {
    "message": "Payment required",
    "event_id": "uuid",
    "price_cents": 2500,
    "currency": "USD"
  }
}
```

---

### Payments (`/api/v1/payments`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/create-checkout-session` | Create Stripe checkout | Yes |
| POST | `/webhook` | Stripe webhook handler | No (Stripe signature) |
| GET | `/status/{payment_id}` | Check payment status | Yes |

#### POST `/create-checkout-session`
Create a Stripe Checkout session for event registration.

**Request Body:**
```json
{
  "event_id": "uuid",
  "payment_method": "card",
  "success_url": "https://yoursite.com/payment/success",
  "cancel_url": "https://yoursite.com/events/uuid"
}
```

**Payment Methods:**
- `card` - Credit/debit card
- `alipay` - Alipay
- `wechat_pay` - WeChat Pay

**Response (200):**
```json
{
  "session_id": "cs_xxx",
  "checkout_url": "https://checkout.stripe.com/..."
}
```

#### POST `/webhook`
Handles Stripe webhook events. Automatically confirms event registrations after successful payment.

**Handled Events:**
- `checkout.session.completed` - Confirms registration, generates ticket
- `payment_intent.payment_failed` - Marks payment as failed

---

### Waitlist (`/api/v1/waitlist`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/` | Join the waitlist | No |
| GET | `/status` | Check waitlist status | No |

#### POST `/`
Add email to the waitlist for future product launch.

**Request Body:**
```json
{
  "email": "user@example.com",
  "source": "homepage"
}
```

**Response (201):**
```json
{
  "message": "Successfully joined the waitlist! Check your email for confirmation.",
  "waitlist_position": 42
}
```

---

## Database Schema

### Users Table
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| username | VARCHAR(50) | Unique username |
| email | VARCHAR(255) | Email (optional if phone provided) |
| phone | VARCHAR(20) | Phone (optional if email provided) |
| password_hash | VARCHAR(255) | Argon2 hashed password |
| is_active | BOOLEAN | Account active status |
| is_verified | BOOLEAN | Email/phone verified |
| created_at | TIMESTAMP | Account creation time |

### User Profiles Table
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to users |
| full_name | VARCHAR(255) | Display name |
| bio | TEXT | User biography |
| location | VARCHAR(255) | Location |
| profile_image_url | VARCHAR(500) | Avatar URL |
| linkedin_url | VARCHAR(500) | LinkedIn profile |
| github_url | VARCHAR(500) | GitHub profile |

### Events Table
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | VARCHAR(255) | Event name |
| description | TEXT | Event description |
| event_type | VARCHAR(50) | hackathon, meetup, workshop |
| location_* | Various | Location details |
| start_datetime | TIMESTAMP | Event start |
| end_datetime | TIMESTAMP | Event end |
| max_attendees | INTEGER | Capacity limit |
| price_cents | INTEGER | Price in cents (0 = free) |
| currency | VARCHAR(3) | Currency code |
| is_published | BOOLEAN | Visibility status |

### Event Registrations Table
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| event_id | UUID | Foreign key to events |
| user_id | UUID | Foreign key to users |
| status | VARCHAR(20) | pending, confirmed, cancelled |
| ticket_code | VARCHAR(50) | Unique ticket code |
| payment_id | UUID | Foreign key to payments |

### Payments Table
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to users |
| stripe_payment_intent_id | VARCHAR(255) | Stripe reference |
| amount_cents | INTEGER | Amount charged |
| currency | VARCHAR(3) | Currency code |
| payment_method | VARCHAR(50) | card, alipay, wechat_pay |
| status | VARCHAR(20) | pending, succeeded, failed |

### Waitlist Table
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| email | VARCHAR(255) | Email address |
| source | VARCHAR(100) | Signup source |
| confirmation_sent | BOOLEAN | Email sent status |
| subscribed_at | TIMESTAMP | Signup time |

---

## Authentication Flow

1. **Registration/Login**: User receives `access_token` (15 min) and `refresh_token` (7 days)
2. **API Requests**: Include `Authorization: Bearer <access_token>` header
3. **Token Refresh**: When access token expires, use `/auth/refresh` with refresh token
4. **Logout**: Call `/auth/logout` to invalidate refresh token

---

## Error Responses

All errors follow this format:
```json
{
  "detail": "Error message here"
}
```

**Common Status Codes:**
- `400` - Bad Request (validation error)
- `401` - Unauthorized (invalid/expired token)
- `402` - Payment Required
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

---

## Running the Backend

```bash
# Start PostgreSQL and Redis
docker-compose up -d

# Install dependencies
cd backend
pip install -r requirements.txt

# Run migrations
alembic upgrade head

# Start server
uvicorn src.main:app --reload --port 8000
```

**Environment Variables (`.env`):**
```
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/innonet
SECRET_KEY=your-secret-key
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
SENDGRID_API_KEY=SG.xxx
```

---

## Future Features (CAP 1 & CAP 2)

### AI Profiling (CAP 1)
- `/api/v1/profiles/me` - Innovator profile management
- `/api/v1/profiles/me/analyze` - AI-powered profile analysis
- Skills, certifications, awards, projects tracking
- OpenAI embeddings for profile vectors

### AI Networking (CAP 2)
- `/api/v1/network/connections` - User connections
- `/api/v1/network/path/{user_id}` - Connection pathfinding
- `/api/v1/search/semantic` - Semantic search
- Neo4j graph database integration
- Network visualization data
