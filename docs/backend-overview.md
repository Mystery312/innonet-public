# Innonet Backend - What It Does

## What is the Backend?

Think of the backend as the "brain" of our application. While users interact with the website (the frontend), the backend works behind the scenes to:

- Store and retrieve information from the database
- Verify who users are (login/signup)
- Process payments
- Send emails
- Make sure everything runs securely

---

## Main Features

### 1. User Accounts

**What it does:** Lets people create accounts and sign in.

**How it works:**
- Users can sign up with a username and either an email OR phone number
- Passwords are securely encrypted (we never store the actual password)
- When someone logs in, they get a digital "key" (token) that proves who they are
- This key expires after 15 minutes for security, but refreshes automatically

**Why it matters:** This keeps user data safe and ensures only the right people can access their accounts.

---

### 2. User Profiles

**What it does:** Stores personal information about each user.

**Information stored:**
- Full name
- Bio/description
- Location
- Profile picture
- Links to LinkedIn, GitHub, portfolio

**Why it matters:** This information will be used later for AI-powered networking and matching users with similar interests.

---

### 3. Events

**What it does:** Manages hackathons, meetups, and workshops that users can browse and register for.

**Capabilities:**
- List all upcoming events
- Filter events by city, country, or type
- Show event details (date, location, price, spots available)
- Track how many people have registered
- Handle event registration

**Event types supported:**
- Hackathons
- Meetups
- Workshops

**Why it matters:** This is the core feature for our February launch - letting users discover and sign up for local events.

---

### 4. Payments

**What it does:** Processes payments when users register for paid events.

**Payment methods accepted:**
- Credit/Debit cards (Visa, Mastercard, etc.)
- Alipay (popular in China)
- WeChat Pay (popular in China)

**How it works:**
1. User clicks "Register" on a paid event
2. They're redirected to a secure Stripe checkout page
3. They complete payment
4. System automatically confirms their registration
5. User receives a unique ticket code

**Security:** We never see or store credit card numbers. Stripe (a trusted payment company used by Amazon, Google, etc.) handles all sensitive payment data.

**Why it matters:** This allows us to monetize events while supporting payment methods popular in our target markets.

---

### 5. Waitlist

**What it does:** Collects emails from people interested in the full Innonet platform (AI features coming later).

**How it works:**
1. User enters their email on the homepage
2. Email is saved to our database
3. Confirmation email is automatically sent
4. We can notify them when new features launch

**Why it matters:** Builds our user base before the full product launches.

---

### 6. Email Notifications

**What it does:** Sends automated emails to users.

**Emails sent:**
- Waitlist confirmation ("You're on the list!")
- Event ticket confirmation (with ticket code)

**Why it matters:** Keeps users informed and provides them with important information like their event tickets.

---

## Data We Store

### User Information
| What | Example | Why We Need It |
|------|---------|----------------|
| Username | "johndoe" | Unique identifier |
| Email | "john@email.com" | Contact & login |
| Phone | "+1234567890" | Alternative login |
| Password | (encrypted) | Security |

### Event Information
| What | Example | Why We Need It |
|------|---------|----------------|
| Event name | "Tech Hackathon 2024" | Display to users |
| Description | "Join us for..." | Inform users |
| Location | "San Francisco, CA" | Help users find events |
| Date & time | "March 15, 2024 9:00 AM" | Scheduling |
| Price | "$25.00" or "Free" | Payment processing |
| Capacity | "100 spots" | Manage attendance |

### Registration Information
| What | Example | Why We Need It |
|------|---------|----------------|
| Who registered | User ID | Track attendees |
| Which event | Event ID | Link user to event |
| Ticket code | "INNO-A1B2C3D4" | Entry verification |
| Payment status | "Paid" or "Pending" | Financial tracking |

---

## Security Measures

1. **Password Protection** - Passwords are encrypted using military-grade encryption (Argon2). Even we can't see them.

2. **Secure Tokens** - Login sessions use secure tokens that expire regularly.

3. **Payment Security** - Credit card data is handled entirely by Stripe, a PCI-compliant payment processor.

4. **HTTPS** - All data transmitted is encrypted.

---

## How Everything Connects

```
User's Browser (Frontend)
         ↓
    [Internet]
         ↓
   Our Backend Server
    ↙    ↓    ↘
Database  Stripe  SendGrid
(stores   (handles (sends
 data)    payments) emails)
```

---

## Future Features (Coming Later)

### AI Profile Analysis (CAP 1)
- Users input their skills, projects, certifications
- AI analyzes their profile and gives a "score"
- Suggests areas for improvement
- Enables searching for users by skills

### AI Networking (CAP 2)
- Visual map showing connections between users
- "Find a path" to connect with someone through mutual connections
- AI-powered recommendations ("People you should meet")
- Search by skills, project interests, or location

---

## Quick Reference: What Each Part Does

| Component | Simple Explanation |
|-----------|-------------------|
| **Authentication** | "Who are you?" - Handles login/signup |
| **Users** | "Tell me about yourself" - Stores profile info |
| **Events** | "What's happening?" - Lists events and registrations |
| **Payments** | "That'll be $25" - Processes money |
| **Waitlist** | "Stay tuned!" - Collects interested emails |
| **Email** | "You've got mail" - Sends notifications |

---

## Common Questions

**Q: Where is the data stored?**
A: In a PostgreSQL database, a widely-used, reliable database system.

**Q: Is user data safe?**
A: Yes. Passwords are encrypted, payment data is handled by Stripe (never touches our servers), and all connections use HTTPS encryption.

**Q: What happens if the server goes down?**
A: We'll deploy on AWS (Amazon Web Services) with automatic backups and redundancy.

**Q: Can we see who signed up?**
A: Yes, all user and registration data is in our database and can be queried for reports.

**Q: How do we add new events?**
A: Currently through the API (will need a developer). An admin dashboard for non-technical users can be built later.

---

## Glossary

| Term | Meaning |
|------|---------|
| **API** | A way for different software to talk to each other |
| **Backend** | The server-side code that processes data |
| **Frontend** | The website users see and interact with |
| **Database** | Where all information is permanently stored |
| **Token** | A digital "key" that proves a user is logged in |
| **Endpoint** | A specific URL that performs a specific action |
| **Stripe** | A company that processes online payments |
| **SendGrid** | A company that sends emails on our behalf |
