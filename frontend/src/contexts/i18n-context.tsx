// I18n context for Spanish localization
import React, { createContext, useContext, ReactNode } from 'react';

interface I18nContextType {
  t: (key: string, params?: Record<string, any>) => string;
  formatDate: (date: string) => string;
  currentLanguage: string;
}

const translations = {
  // Common
  'common.back': 'Atrás',
  'common.continue': 'Continuar',
  'common.optional': 'opcional',
  'common.loading': 'Cargando...',
  
  // Booking
  'booking.title': 'Reserva tu Cama',
  'booking.subtitle': 'Albergue del Carrascalejo - Camino de Santiago',
  
  // Hero
  'hero.welcome': 'Bienvenido Peregrino',
  'hero.subtitle': 'Registro rápido y seguro para tu estancia en el Camino',
  'hero.beds_available': 'Camas disponibles',
  'hero.price_per_night': 'Por persona/noche',
  
  // Stepper
  'stepper.stay_dates': 'Fechas',
  'stepper.personal_info': 'Datos Personales',
  'stepper.contact_info': 'Contacto',
  'stepper.arrival_info': 'Llegada',
  'stepper.document_validation': 'Documentos',
  'stepper.bed_selection': 'Cama',
  'stepper.confirmation': 'Confirmación',
  
  // Stay
  'stay.title': 'Selecciona las fechas de tu estancia',
  'stay.dates': 'Fechas',
  'stay.nights': 'Noches',
  'stay.guests': 'Huéspedes',
  'stay.guest_single': 'huésped',
  'stay.individual_only': 'Solo reservas individuales',
  'stay.continue': 'Continuar',
  'stay.check_in': 'Entrada',
  'stay.check_out': 'Salida',
  'stay.available': 'Disponible - {count} camas libres',
  'stay.not_available': 'No disponible para estas fechas',
  'stay.next_available': 'Próxima fecha disponible: {date}',
  
  // Registration
  'registration.personal_info': 'Información Personal',
  'registration.contact_info': 'Información de Contacto',
  'registration.arrival_info': 'Información de Llegada',
  'registration.first_name': 'Nombre',
  'registration.first_name_placeholder': 'Tu nombre',
  'registration.last_name_1': 'Primer Apellido',
  'registration.last_name_1_placeholder': 'Tu primer apellido',
  'registration.last_name_2': 'Segundo Apellido',
  'registration.last_name_2_placeholder': 'Tu segundo apellido',
  'registration.document_type': 'Tipo de Documento',
  'registration.document_number': 'Número de Documento',
  'registration.document': 'Documento',
  'registration.passport': 'Pasaporte',
  'registration.birth_date': 'Fecha de Nacimiento',
  'registration.nationality': 'Nacionalidad',
  'registration.email': 'Email',
  'registration.phone': 'Teléfono',
  'registration.payment_method': 'Método de Pago',
  'registration.payment_method_placeholder': 'Selecciona método de pago',
  'registration.contact_privacy_notice': 'Tu información de contacto se utilizará únicamente para confirmar tu reserva y enviarte detalles importantes.',
  
  // Validation
  'validation.required': 'Este campo es obligatorio',
  'validation.email_invalid': 'Email no válido',
  
  // Arrival
  'arrival.estimated_time': 'Hora Estimada de Llegada',
  'arrival.select_time': 'Selecciona hora de llegada',
  'arrival.time_note': 'Hora aproximada de llegada al albergue',
  'arrival.cancellation_policy': 'Cancelación gratuita hasta 24h antes',
  
  // Payment
  'payment.card': 'Tarjeta de Crédito/Débito',
  'payment.bizum': 'Bizum',
  'payment.cash': 'Efectivo (en el albergue)',
  
  // Pricing
  'pricing.night': 'noche',
  'pricing.nights': 'noches',
  'pricing.total': 'total',
  'pricing.payment_due': 'Pago al llegar',
  'pricing.accepted_methods': 'Métodos de pago aceptados:',
  
  // Bed Selection
  'bed_selection.title': 'Selecciona tu Cama',
  'bed_selection.dates': 'Estancia: {checkIn} - {checkOut}',
  'bed_selection.available': 'disponibles',
  'bed_selection.occupied': 'Ocupada',
  'bed_selection.selected': 'Seleccionada',
  'bed_selection.selected_bed': 'Cama Seleccionada',
  'bed_selection.back': 'Atrás',
  'bed_selection.confirm': 'Confirmar Cama',
  'bed_selection.confirmed': 'Confirmada',
  
  // Confirmation
  'confirmation.review_booking': 'Revisa tu Reserva',
  'confirmation.review_details': 'Por favor revisa todos los detalles antes de confirmar',
  'confirmation.personal_info': 'Información Personal',
  'confirmation.contact_info': 'Información de Contacto',
  'confirmation.stay_info': 'Información de Estancia',
  'confirmation.bed_assignment': 'Asignación de Cama',
  'confirmation.payment_info': 'Información de Pago',
  'confirmation.important_notice': 'Aviso Importante',
  'confirmation.cancellation_policy': 'Cancelación gratuita hasta 24h antes',
  'confirmation.check_in_time': 'Check-in desde las 15:00h',
  'confirmation.payment_due': 'Pago al llegar al albergue',
  'confirmation.back': 'Modificar',
  'confirmation.confirm_booking': 'Confirmar Reserva',
  'confirmation.processing': 'Procesando...',
  
  // Success
  'success.congratulations': '¡Enhorabuena!',
  'success.booking_confirmed': 'Tu reserva ha sido confirmada',
  'success.reference_number': 'Número de Referencia',
  'success.what_happens_next': '¿Qué ocurre ahora?',
  'success.email_sent': 'Recibirás un email de confirmación',
  'success.owner_notified': 'El albergue ha sido notificado',
  'success.government_submitted': 'Datos enviados a las autoridades',
  'success.bed_reserved': 'Tu cama está reservada',
  'success.explore_area': 'Explora la Zona',
  'success.recommendations': 'Lugares de interés cerca del albergue',
  'success.attractions': 'Lugares de Interés',
  'success.dining': 'Restaurantes',
  'success.services': 'Servicios',
  'success.need_help': '¿Necesitas Ayuda?',
  'success.contact_reception': 'Contacta con recepción para cualquier duda:',
  'success.new_booking': 'Nueva Reserva',
  
  // Loading and errors
  'loading.processing': 'Procesando tu solicitud...',
  'notifications.error': 'Ha ocurrido un error. Por favor inténtalo de nuevo.',
};

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const t = (key: string, params?: Record<string, any>) => {
    let translation = translations[key as keyof typeof translations] || key;
    
    if (params) {
      Object.entries(params).forEach(([paramKey, value]) => {
        translation = translation.replace(`{${paramKey}}`, String(value));
      });
    }
    
    return translation;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <I18nContext.Provider value={{
      t,
      formatDate,
      currentLanguage: 'es'
    }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};