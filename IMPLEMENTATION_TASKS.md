# Implementation Tasks - Missing Frontend Integrations

This document provides step-by-step implementation tasks for completing the frontend integrations.

---

## TASK 1: View Other User Profiles (HIGH PRIORITY)

**Estimated Time:** 2-3 hours  
**Priority:** HIGH - Required for networking features

### Implementation Steps:

#### Step 1: Modify ProfilePage to detect user context
```typescript
// frontend/src/pages/Profile/ProfilePage.tsx

// Add at the top of the component:
const { userId } = useParams<{ userId?: string }>();
const { user: currentUser } = useAuth();

// Determine if viewing own profile
const isOwnProfile = !userId || userId === currentUser?.id;

// Update useEffect to load appropriate profile:
useEffect(() => {
  const loadData = async () => {
    try {
      let profileData;
      if (isOwnProfile) {
        profileData = await profileApi.getMyProfile();
      } else {
        profileData = await profileApi.getPublicProfile(userId!);
      }
      
      // ... rest of loading logic
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  };
  loadData();
}, [userId, isOwnProfile]);
```

#### Step 2: Conditional rendering for actions
```typescript
// Hide edit button when viewing others
{isOwnProfile && (
  <Link to="/profile/setup">
    <Button variant="secondary">Edit Profile</Button>
  </Link>
)}

// Show connect button when viewing others
{!isOwnProfile && (
  <Button onClick={handleConnect}>
    Connect
  </Button>
)}
```

#### Step 3: Add connection action handler
```typescript
const [connectionStatus, setConnectionStatus] = useState<string | null>(null);

const handleConnect = async () => {
  if (!userId) return;
  try {
    await networkApi.sendConnectionRequest(userId);
    setConnectionStatus('pending');
  } catch (error) {
    console.error('Failed to send connection request:', error);
  }
};
```

### Files to Modify:
- [ ] `frontend/src/pages/Profile/ProfilePage.tsx`
- [ ] `frontend/src/pages/Profile/ProfilePage.module.css` (add .connectButton styles)

### Testing:
- [ ] Navigate to your own profile (`/profile`)
- [ ] Navigate to another user's profile (`/profile/{user_id}`)
- [ ] Verify edit button only shows on own profile
- [ ] Verify connect button appears on other profiles
- [ ] Test sending connection request

---

## TASK 2: Companies List Page (MEDIUM PRIORITY)

**Estimated Time:** 3-4 hours  
**Priority:** MEDIUM - Completes companies feature

### Implementation Steps:

#### Step 1: Create CompaniesPage component
```typescript
// frontend/src/pages/Companies/CompaniesPage.tsx

export const CompaniesPage: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState<string>('');

  const loadCompanies = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await companiesApi.getCompanies({
        page,
        limit: 12,
        industry: selectedIndustry || undefined,
        search: searchQuery || undefined,
      });
      setCompanies(response.companies);
    } catch (error) {
      console.error('Failed to load companies:', error);
    } finally {
      setIsLoading(false);
    }
  }, [page, selectedIndustry, searchQuery]);

  // Render grid of company cards with logo, name, industry, size
};
```

#### Step 2: Create company card component
```typescript
// frontend/src/features/companies/components/CompanyCard.tsx

interface CompanyCardProps {
  company: Company;
}

export const CompanyCard: React.FC<CompanyCardProps> = ({ company }) => {
  return (
    <Link to={`/companies/${company.id}`} className={styles.card}>
      {company.logo_url && (
        <img src={company.logo_url} alt={company.name} />
      )}
      <h3>{company.name}</h3>
      <p>{company.description}</p>
      <div className={styles.meta}>
        <Badge>{company.size}</Badge>
        <Badge>{company.industry}</Badge>
      </div>
    </Link>
  );
};
```

#### Step 3: Add filters and search
```tsx
<div className={styles.filters}>
  <Input
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    placeholder="Search companies..."
  />
  <select
    value={selectedIndustry}
    onChange={(e) => setSelectedIndustry(e.target.value)}
  >
    <option value="">All Industries</option>
    <option value="Technology">Technology</option>
    <option value="Healthcare">Healthcare</option>
    {/* Add more industries */}
  </select>
</div>
```

### Files to Create:
- [ ] `frontend/src/pages/Companies/CompaniesPage.tsx`
- [ ] `frontend/src/pages/Companies/CompaniesPage.module.css`
- [ ] `frontend/src/features/companies/components/CompanyCard.tsx`
- [ ] `frontend/src/features/companies/components/CompanyCard.module.css`

### Files to Modify:
- [ ] `frontend/src/pages/Companies/index.ts` (export CompaniesPage)
- [ ] `frontend/src/router.tsx` (add /companies route)
- [ ] `frontend/src/components/common/Navbar/Navbar.tsx` (optional: add Companies link)

---

## TASK 3: Company Detail Page (MEDIUM PRIORITY)

**Estimated Time:** 3-4 hours  
**Priority:** MEDIUM

### Implementation Steps:

#### Step 1: Create CompanyDetailPage
```typescript
// frontend/src/pages/Companies/CompanyDetailPage.tsx

export const CompanyDetailPage: React.FC = () => {
  const { companyId } = useParams<{ companyId: string }>();
  const [company, setCompany] = useState<CompanyDetail | null>(null);
  const [challenges, setChallenges] = useState<Challenge[]>([]);

  const loadCompany = useCallback(async () => {
    if (!companyId) return;
    const data = await companiesApi.getCompany(companyId);
    setCompany(data);
  }, [companyId]);

  const loadChallenges = useCallback(async () => {
    if (!companyId) return;
    const response = await companiesApi.getChallenges({
      company_id: companyId,
      limit: 10,
    });
    setChallenges(response.challenges);
  }, [companyId]);

  // Render company header, about, challenges, members
};
```

#### Step 2: Create layout sections
```tsx
<div className={styles.header}>
  <img src={company.logo_url} alt={company.name} />
  <div>
    <h1>{company.name}</h1>
    <p>{company.industry} • {company.size}</p>
    <a href={company.website} target="_blank">Visit Website</a>
  </div>
  {isAdmin && (
    <Button onClick={() => navigate(`/companies/${companyId}/edit`)}>
      Edit Company
    </Button>
  )}
</div>

<section>
  <h2>About</h2>
  <p>{company.description}</p>
</section>

<section>
  <h2>Active Challenges</h2>
  <div className={styles.challengesGrid}>
    {challenges.map(challenge => (
      <ChallengeCard key={challenge.id} challenge={challenge} />
    ))}
  </div>
</section>
```

### Files to Create:
- [ ] `frontend/src/pages/Companies/CompanyDetailPage.tsx`
- [ ] `frontend/src/pages/Companies/CompanyDetailPage.module.css`

### Files to Modify:
- [ ] `frontend/src/router.tsx` (add /companies/:companyId route)

---

## TASK 4: Notifications UI (LOW-MEDIUM PRIORITY)

**Estimated Time:** 3-4 hours  
**Priority:** LOW-MEDIUM

### Implementation Steps:

#### Step 1: Create NotificationBell component
```typescript
// frontend/src/features/messaging/components/NotificationBell.tsx

export const NotificationBell: React.FC = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Poll for unread count
    const fetchUnreadCount = async () => {
      try {
        const data = await messagingApi.getNotificationCount();
        setUnreadCount(data.unread_count);
      } catch (error) {
        console.error('Failed to fetch notification count:', error);
      }
    };

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000); // Poll every 30s

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={styles.notificationBell}>
      <button onClick={() => setIsOpen(!isOpen)}>
        <BellIcon />
        {unreadCount > 0 && (
          <span className={styles.badge}>{unreadCount}</span>
        )}
      </button>
      {isOpen && <NotificationDropdown onClose={() => setIsOpen(false)} />}
    </div>
  );
};
```

#### Step 2: Create NotificationDropdown
```typescript
// frontend/src/features/messaging/components/NotificationDropdown.tsx

export const NotificationDropdown: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const loadNotifications = async () => {
      const data = await messagingApi.getNotifications({ limit: 20 });
      setNotifications(data.notifications);
    };
    loadNotifications();
  }, []);

  const handleMarkAsRead = async (id: string) => {
    await messagingApi.markNotificationRead(id);
    setNotifications(prev => prev.map(n => 
      n.id === id ? { ...n, is_read: true } : n
    ));
  };

  return (
    <div className={styles.dropdown}>
      <div className={styles.header}>
        <h3>Notifications</h3>
        <button onClick={async () => {
          await messagingApi.markAllNotificationsRead();
          setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        }}>
          Mark all as read
        </button>
      </div>
      <div className={styles.list}>
        {notifications.map(notification => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onMarkAsRead={handleMarkAsRead}
          />
        ))}
      </div>
    </div>
  );
};
```

#### Step 3: Add to Navbar
```typescript
// frontend/src/components/common/Navbar/Navbar.tsx

import { NotificationBell } from '../../features/messaging/components/NotificationBell';

// In the authenticated user section:
<NotificationBell />
<Link to="/messages" className={styles.link}>
  Messages
</Link>
```

### Files to Create:
- [ ] `frontend/src/features/messaging/components/NotificationBell.tsx`
- [ ] `frontend/src/features/messaging/components/NotificationBell.module.css`
- [ ] `frontend/src/features/messaging/components/NotificationDropdown.tsx`
- [ ] `frontend/src/features/messaging/components/NotificationDropdown.module.css`
- [ ] `frontend/src/features/messaging/components/NotificationItem.tsx`
- [ ] `frontend/src/features/messaging/components/NotificationItem.module.css`

### Files to Modify:
- [ ] `frontend/src/components/common/Navbar/Navbar.tsx`

---

## TASK 5: Payment Integration (HIGH PRIORITY)

**Estimated Time:** 4-6 hours  
**Priority:** HIGH - Enables event monetization

### Implementation Steps:

#### Step 1: Create PaymentModal component
```typescript
// frontend/src/features/events/components/PaymentModal.tsx

interface PaymentModalProps {
  event: EventDetail;
  onClose: () => void;
  onSuccess: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ 
  event, 
  onClose, 
  onSuccess 
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCheckout = async () => {
    setIsProcessing(true);
    try {
      const response = await api.post('/payments/create-checkout-session', {
        event_id: event.id,
        payment_method: 'stripe',
        success_url: `${window.location.origin}/events/${event.id}?payment=success`,
        cancel_url: `${window.location.origin}/events/${event.id}?payment=cancelled`,
      });
      
      // Redirect to Stripe Checkout
      window.location.href = response.data.checkout_url;
    } catch (error) {
      console.error('Payment failed:', error);
      alert('Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose}>
      <div className={styles.paymentModal}>
        <h2>Complete Registration</h2>
        <div className={styles.eventInfo}>
          <h3>{event.name}</h3>
          <p className={styles.price}>
            {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: event.currency,
            }).format(event.price_cents / 100)}
          </p>
        </div>
        <p className={styles.info}>
          You will be redirected to Stripe to complete your payment securely.
        </p>
        <div className={styles.actions}>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleCheckout} isLoading={isProcessing}>
            Proceed to Payment
          </Button>
        </div>
      </div>
    </Modal>
  );
};
```

#### Step 2: Update EventDetailPage
```typescript
// frontend/src/pages/Events/EventDetailPage.tsx

const [showPaymentModal, setShowPaymentModal] = useState(false);

// Check for payment result on mount
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const paymentStatus = params.get('payment');
  
  if (paymentStatus === 'success') {
    alert('Payment successful! You are now registered.');
    loadEvent(); // Refresh to show registration status
  } else if (paymentStatus === 'cancelled') {
    alert('Payment cancelled.');
  }
}, []);

const handleRegister = async () => {
  if (!eventId || !event) return;

  // For paid events, show payment modal
  if (event.price_cents > 0) {
    setShowPaymentModal(true);
    return;
  }

  // Free event registration
  setIsRegistering(true);
  try {
    await eventsApi.registerForEvent(eventId);
    await loadEvent();
  } catch (err) {
    alert('Failed to register');
  } finally {
    setIsRegistering(false);
  }
};

// In the JSX:
{showPaymentModal && (
  <PaymentModal
    event={event}
    onClose={() => setShowPaymentModal(false)}
    onSuccess={() => {
      setShowPaymentModal(false);
      loadEvent();
    }}
  />
)}
```

#### Step 3: Add payment API methods (optional)
```typescript
// frontend/src/features/events/api/eventsApi.ts

export const paymentsApi = {
  createCheckoutSession: async (data: {
    event_id: string;
    payment_method: string;
    success_url: string;
    cancel_url: string;
  }) => {
    const response = await api.post('/payments/create-checkout-session', data);
    return response.data;
  },

  getPaymentStatus: async (paymentId: string) => {
    const response = await api.get(`/payments/status/${paymentId}`);
    return response.data;
  },
};
```

### Files to Create:
- [ ] `frontend/src/features/events/components/PaymentModal.tsx`
- [ ] `frontend/src/features/events/components/PaymentModal.module.css`

### Files to Modify:
- [ ] `frontend/src/pages/Events/EventDetailPage.tsx`
- [ ] `frontend/src/features/events/api/eventsApi.ts` (optional)

### Testing:
- [ ] Create a paid event in the backend
- [ ] Navigate to event detail page
- [ ] Click register button
- [ ] Verify payment modal opens
- [ ] Test Stripe redirect (requires Stripe test keys)
- [ ] Test success callback after payment
- [ ] Test cancel callback

---

## Priority Summary

### Implement First (Critical):
1. ✅ View Other User Profiles
2. ✅ Payment Integration

### Implement Second (Important):
3. ✅ Companies List Page
4. ✅ Company Detail Page

### Implement Third (Nice to Have):
5. ✅ Notifications UI

---

## Completion Checklist

- [ ] Task 1: View Other User Profiles
- [ ] Task 2: Companies List Page  
- [ ] Task 3: Company Detail Page
- [ ] Task 4: Notifications UI
- [ ] Task 5: Payment Integration

---

## Additional Notes

- All tasks are independent and can be implemented in any order
- Each task includes complete code examples
- TypeScript types should already exist in the types files
- CSS modules should follow existing patterns in the codebase
- Test each feature thoroughly before moving to the next
