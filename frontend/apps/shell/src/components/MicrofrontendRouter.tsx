import React from 'react';
import { Switch, Route } from 'wouter';
import { useI18n } from '../contexts/i18n-context';

const MicrofrontendRouter: React.FC = () => {
  const { t } = useI18n();

  return (
    <Switch>
      <Route path="/">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">{t('welcome.title')}</h1>
          <p className="text-lg text-gray-600 mb-8">
            {t('welcome.subtitle')}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <a href="/auth" className="p-6 bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-semibold mb-2">{t('auth.title')}</h3>
              <p className="text-gray-600">{t('auth.description')}</p>
            </a>
            <a href="/booking" className="p-6 bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-semibold mb-2">{t('booking.title')}</h3>
              <p className="text-gray-600">{t('booking.description')}</p>
            </a>
            <a href="/dashboard" className="p-6 bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-semibold mb-2">{t('dashboard.title')}</h3>
              <p className="text-gray-600">{t('dashboard.description')}</p>
            </a>
          </div>
        </div>
      </Route>

      <Route path="/auth/*">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">{t('auth.title')} Microfrontend</h2>
          <p className="text-gray-600">This would load the auth microfrontend</p>
        </div>
      </Route>

      <Route path="/booking/*">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">{t('booking.title')} Microfrontend</h2>
          <p className="text-gray-600">This would load the booking microfrontend</p>
        </div>
      </Route>

      <Route path="/dashboard/*">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">{t('dashboard.title')} Microfrontend</h2>
          <p className="text-gray-600">This would load the dashboard microfrontend</p>
        </div>
      </Route>
    </Switch>
  );
};

export default MicrofrontendRouter;