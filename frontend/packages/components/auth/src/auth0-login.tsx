import React from 'react';
import { Button } from '@albergue/components/ui';
import { useAuth } from '@contexts/auth';
import { Lock } from 'lucide-react';

interface Auth0LoginProps {
  onSuccess?: () => void;
}

export const Auth0Login: React.FC<Auth0LoginProps> = ({ onSuccess }) => {
  const { loginWithRedirect } = useAuth();

  const handleLogin = async () => {
    try {
      await loginWithRedirect();
      onSuccess?.();
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <Button
      onClick={handleLogin}
      className="w-full"
    >
      <Lock className="mr-2 h-4 w-4" />
      Login with Auth0
    </Button>
  );
};
