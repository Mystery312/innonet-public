import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Pages
import HomePage from './pages/Home/HomePage';
import LoginPage from './pages/Auth/LoginPage';
import SignupPage from './pages/Auth/SignupPage';
import ForgotPasswordPage from './pages/Auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/Auth/ResetPasswordPage';
import EventsListPage from './pages/Events/EventsListPage';
import { EventDetailPage } from './pages/Events/EventDetailPage';
import { ProfilePage } from './pages/Profile/ProfilePage';
import { ProfileSetupPage } from './pages/Profile/ProfileSetupPage';
import { SearchPage } from './pages/Search/SearchPage';
import { NetworkPage, ConnectionsPage } from './pages/Network';
import { CommunitiesPage, CommunityDetailPage, CreateCommunityPage } from './pages/Communities';
import { ChallengesPage, ChallengeDetailPage } from './pages/Challenges';
import { MessagesPage } from './pages/Messages';
import { CompaniesPage, CompanyDetailPage, CreateCompanyPage } from './pages/Companies';
import { RoadmapPage } from './pages/Roadmap';
import { NotificationsPage } from './pages/Notifications';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh'
      }}>
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

interface PublicOnlyRouteProps {
  children: React.ReactNode;
}

const PublicOnlyRoute: React.FC<PublicOnlyRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh'
      }}>
        Loading...
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/events" replace />;
  }

  return <>{children}</>;
};

export const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<HomePage />} />

        {/* Auth routes (redirect if already logged in) */}
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <LoginPage />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/signup"
          element={
            <PublicOnlyRoute>
              <SignupPage />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <PublicOnlyRoute>
              <ForgotPasswordPage />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/reset-password"
          element={
            <PublicOnlyRoute>
              <ResetPasswordPage />
            </PublicOnlyRoute>
          }
        />

        {/* Protected routes */}
        <Route
          path="/events"
          element={
            <ProtectedRoute>
              <EventsListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/events/:eventId"
          element={
            <ProtectedRoute>
              <EventDetailPage />
            </ProtectedRoute>
          }
        />

        {/* Profile routes */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile/setup"
          element={
            <ProtectedRoute>
              <ProfileSetupPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile/:userId"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />

        {/* Search/Discovery route */}
        <Route
          path="/discover"
          element={
            <ProtectedRoute>
              <SearchPage />
            </ProtectedRoute>
          }
        />

        {/* Network routes */}
        <Route
          path="/network"
          element={
            <ProtectedRoute>
              <NetworkPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/connections"
          element={
            <ProtectedRoute>
              <ConnectionsPage />
            </ProtectedRoute>
          }
        />

        {/* Roadmap routes */}
        <Route
          path="/roadmap"
          element={
            <ProtectedRoute>
              <RoadmapPage />
            </ProtectedRoute>
          }
        />

        {/* Communities routes */}
        <Route
          path="/communities"
          element={
            <ProtectedRoute>
              <CommunitiesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/communities/create"
          element={
            <ProtectedRoute>
              <CreateCommunityPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/communities/:communityId"
          element={
            <ProtectedRoute>
              <CommunityDetailPage />
            </ProtectedRoute>
          }
        />

        {/* Companies routes */}
        <Route
          path="/companies"
          element={
            <ProtectedRoute>
              <CompaniesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/companies/create"
          element={
            <ProtectedRoute>
              <CreateCompanyPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/companies/:companyId"
          element={
            <ProtectedRoute>
              <CompanyDetailPage />
            </ProtectedRoute>
          }
        />

        {/* Challenges routes */}
        <Route
          path="/challenges"
          element={
            <ProtectedRoute>
              <ChallengesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/challenges/:challengeId"
          element={
            <ProtectedRoute>
              <ChallengeDetailPage />
            </ProtectedRoute>
          }
        />

        {/* Messages routes */}
        <Route
          path="/messages"
          element={
            <ProtectedRoute>
              <MessagesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/messages/:conversationId"
          element={
            <ProtectedRoute>
              <MessagesPage />
            </ProtectedRoute>
          }
        />

        {/* Notifications route */}
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <NotificationsPage />
            </ProtectedRoute>
          }
        />

        {/* Catch all - redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;
