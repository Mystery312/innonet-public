import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Layout
import { AppShell } from './components/layout/AppShell';

// Pages
import HomePage from './pages/Home/HomePage';
import LoginPage from './pages/Auth/LoginPage';
import SignupPage from './pages/Auth/SignupPage';
import ForgotPasswordPage from './pages/Auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/Auth/ResetPasswordPage';
import VerifyEmailPage from './pages/Auth/VerifyEmailPage';
import CheckEmailPage from './pages/Auth/CheckEmailPage';
import OAuthCallbackPage from './pages/Auth/OAuthCallbackPage';
import EventsListPage from './pages/Events/EventsListPage';
import { EventDetailPage } from './pages/Events/EventDetailPage';
import { ProfilePage } from './pages/Profile/ProfilePage';
import { ProfileSetupPage } from './pages/Profile/ProfileSetupPage';
import { SearchPage } from './pages/Search/SearchPage';
import DiscoverPage from './pages/Discover/DiscoverPage';
import { NetworkPage, ConnectionsPage } from './pages/Network';
import { CommunitiesPage, CommunityDetailPage, CreateCommunityPage, PostDetailPage } from './pages/Communities';
import { ChallengesPage, ChallengeDetailPage } from './pages/Challenges';
import { MessagesPage } from './pages/Messages';
import { CompaniesPage, CompanyDetailPage, CreateCompanyPage } from './pages/Companies';
import { RoadmapPage } from './pages/Roadmap';
import { NotificationsPage } from './pages/Notifications';

// ──────────────────────────────────────────────────────────────────
// Auth guards
// ──────────────────────────────────────────────────────────────────
const LoadingFallback: React.FC = () => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
  }}>
    Loading...
  </div>
);

/** Gate: requires auth. Renders its children (or <Outlet/> when used as a layout route). */
const RequireAuth: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <LoadingFallback />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children ?? <Outlet />}</>;
};

/** Gate: only for unauthenticated users (login/signup pages). */
const PublicOnly: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <LoadingFallback />;
  if (isAuthenticated) return <Navigate to="/events" replace />;
  return <>{children}</>;
};

/** Layout route: auth + sidebar/topbar shell, then renders the matched child route. */
const ProtectedShell: React.FC = () => (
  <RequireAuth>
    <AppShell />
  </RequireAuth>
);

// Legacy alias — kept so any imports from outside still resolve.
// You can delete this once nothing else imports ProtectedRoute.
export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <RequireAuth>{children}</RequireAuth>
);

// ──────────────────────────────────────────────────────────────────
// Router
// ──────────────────────────────────────────────────────────────────
export const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public marketing home */}
        <Route path="/" element={<HomePage />} />

        {/* Auth (redirect away if already signed in) */}
        <Route path="/login"            element={<PublicOnly><LoginPage /></PublicOnly>} />
        <Route path="/signup"           element={<PublicOnly><SignupPage /></PublicOnly>} />
        <Route path="/forgot-password"  element={<PublicOnly><ForgotPasswordPage /></PublicOnly>} />
        <Route path="/reset-password"   element={<PublicOnly><ResetPasswordPage /></PublicOnly>} />
        <Route path="/verify-email"     element={<VerifyEmailPage />} />
        <Route path="/check-email"      element={<CheckEmailPage />} />
        <Route path="/auth/callback"    element={<OAuthCallbackPage />} />

        {/* Profile setup runs OUTSIDE the shell (full-screen onboarding flow) */}
        <Route path="/profile/setup" element={<RequireAuth><ProfileSetupPage /></RequireAuth>} />

        {/* All other authenticated routes live inside the AppShell layout */}
        <Route element={<ProtectedShell />}>
          <Route path="/events"                       element={<EventsListPage />} />
          <Route path="/events/:eventId"              element={<EventDetailPage />} />

          <Route path="/profile"                      element={<ProfilePage />} />
          <Route path="/profile/:userId"              element={<ProfilePage />} />

          <Route path="/search"                       element={<SearchPage />} />
          <Route path="/discover"                     element={<DiscoverPage />} />

          <Route path="/network"                      element={<NetworkPage />} />
          <Route path="/connections"                  element={<ConnectionsPage />} />

          <Route path="/roadmap"                      element={<RoadmapPage />} />

          <Route path="/communities"                  element={<CommunitiesPage />} />
          <Route path="/communities/create"           element={<CreateCommunityPage />} />
          <Route path="/communities/:communityId"     element={<CommunityDetailPage />} />
          <Route path="/communities/:communityId/posts/:postId" element={<PostDetailPage />} />

          <Route path="/companies"                    element={<CompaniesPage />} />
          <Route path="/companies/create"             element={<CreateCompanyPage />} />
          <Route path="/companies/:companyId"         element={<CompanyDetailPage />} />

          <Route path="/challenges"                   element={<ChallengesPage />} />
          <Route path="/challenges/:challengeId"      element={<ChallengeDetailPage />} />

          <Route path="/messages"                     element={<MessagesPage />} />
          <Route path="/messages/:conversationId"     element={<MessagesPage />} />

          <Route path="/notifications"                element={<NotificationsPage />} />
        </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;
