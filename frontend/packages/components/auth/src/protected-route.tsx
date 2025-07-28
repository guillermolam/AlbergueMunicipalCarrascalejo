import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@auth/shared';
import { Alert } from '@ui/alert';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole
}) => {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return (
      <Alert variant="destructive">
        You need to be logged in to access this page
      </Alert>
    );
  }

  if (requiredRole && user?.role !== requiredRole) {
    return (
      <Alert variant="destructive">
        You don't have permission to access this page
      </Alert>
    );
  }

  return <>{children}</>;
};
