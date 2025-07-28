import React, { createContext, useContext, ReactNode } from 'react';

interface I18nContextType {
  t: (key: string) => string;
  locale: string;
}

const I18nContext = createContext<I18nContextType>({
  t: (key: string) => key,
  locale: 'es',
});

interface I18nProviderProps {
  children: ReactNode;
}

export const I18nProvider: React.FC<I18nProviderProps> = ({ children }) => {
  const t = (key: string) => {
    const translations: Record<string, string> = {
      'nav.home': 'Inicio',
      'nav.login': 'Iniciar Sesión',
      'nav.bookings': 'Reservas',
      'nav.dashboard': 'Panel',
      'welcome.title': 'Bienvenido al Albergue Municipal',
      'welcome.subtitle': 'Selecciona un servicio para comenzar',
      'auth.title': 'Autenticación',
      'auth.description': 'Inicia sesión y gestiona tu cuenta',
      'booking.title': 'Reservas',
      'booking.description': 'Realiza y gestiona tus reservas',
      'dashboard.title': 'Panel de Control',
      'dashboard.description': 'Consulta tu historial de reservas',
    };
    return translations[key] || key;
  };

  return (
    <I18nContext.Provider value={{ t, locale: 'es' }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => useContext(I18nContext);