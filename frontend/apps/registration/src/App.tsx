import React from 'react';
import { RegistrationForm } from '@components/registration-form';
import { Card } from '@ui';
import { AuthProvider } from '@auth';

const App = () => {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-2xl mx-auto">
            <RegistrationForm />
          </Card>
        </div>
      </div>
    </AuthProvider>
  );
};

export default App;
