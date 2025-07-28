import React, { Fragment } from 'react';
import { Router } from 'wouter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useI18n } from '@i18n';
import { useAuth } from '@auth';
import Navigation from './components/Navigation';
import MicrofrontendRouter from './components/MicrofrontendRouter';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

export const ShellApp: React.FC = () => {
  const { t } = useI18n();
  const { isAuthenticated, user, token } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <MicrofrontendRouter />
      </main>
    </div>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <AuthProvider>
          <Router>
            <Navigation />
            <ShellApp />
          </Router>
        </AuthProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}

export default App;