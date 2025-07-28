// Original BookingPage from client/ - exact restoration with Zustand state management
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useRegistrationStore } from '@/stores/registration-store';
import { useI18n } from '@/contexts/i18n-context';
import { RegistrationStepper } from '@/components/registration-stepper';
import { StayInfoForm, StayData } from '@/components/stay-info-form';
import { RegistrationFormZustand } from '@/components/registration-form-zustand';
import { BedSelectionMap } from '@/components/bed-selection-map';
import { BookingConfirmation } from '@/components/booking-confirmation';
import { BookingSuccess } from '@/components/booking-success';

export default function BookingPageOriginal() {
  const { t } = useI18n();
  const {
    currentStep,
    completedSteps,
    formData,
    stayData,
    selectedBedId,
    bedInfo,
    isSubmitting,
    bookingReference,
    setCurrentStep,
    markStepCompleted,
    setStayData,
    setBedSelection,
    setSubmitting,
    setBookingReference,
    resetRegistration,
    validateStep
  } = useRegistrationStore();

  const handleStepClick = (step: number) => {
    if (validateStep(step - 1) || completedSteps.includes(step)) {
      setCurrentStep(step);
    }
  };

  const handleStayInfoContinue = (data: StayData) => {
    setStayData(data);
    markStepCompleted(0);
    setCurrentStep(1);
  };

  const handleRegistrationNext = () => {
    if (validateStep(currentStep)) {
      markStepCompleted(currentStep);
      if (currentStep < 6) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handleRegistrationBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleBedSelect = (bedId: number) => {
    // Mock bed info - in real app this would come from API
    const mockBedInfo = {
      roomName: 'Dormitorio A',
      bedNumber: bedId % 10 || 1,
      position: (bedId % 2 === 0 ? 'bottom' : 'top') as 'top' | 'bottom',
      bunkNumber: Math.floor((bedId % 10) / 2) + 1
    };
    setBedSelection(bedId, mockBedInfo);
  };

  const handleBedSelectionConfirm = () => {
    if (selectedBedId) {
      markStepCompleted(5);
      setCurrentStep(6);
    }
  };

  const handleBedSelectionBack = () => {
    setCurrentStep(4);
  };

  const handleBookingConfirm = async () => {
    setSubmitting(true);
    
    try {
      // Mock booking submission - in real app this would call the booking service
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const reference = `BK${Date.now().toString().slice(-6)}`;
      setBookingReference(reference);
      markStepCompleted(6);
      setCurrentStep(7); // Success step
    } catch (error) {
      console.error('Booking failed:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBookingBack = () => {
    setCurrentStep(5);
  };

  const handleNewBooking = () => {
    resetRegistration();
  };

  // Success page (step 7)
  if (currentStep === 7 && bookingReference) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <BookingSuccess
            bookingReference={bookingReference}
            onNewBooking={handleNewBooking}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t('booking.title')}
          </h1>
          <p className="text-gray-600">
            {t('booking.subtitle')}
          </p>
        </div>

        {/* Progress Stepper */}
        <Card className="mb-8">
          <CardContent className="p-0">
            <RegistrationStepper
              currentStep={currentStep}
              completedSteps={completedSteps}
              onStepClick={handleStepClick}
            />
          </CardContent>
        </Card>

        {/* Step Content */}
        <div className="max-w-4xl mx-auto">
          {/* Step 0: Stay Information */}
          {currentStep === 0 && (
            <StayInfoForm onContinue={handleStayInfoContinue} />
          )}

          {/* Steps 1-3: Registration Form (Personal, Contact, Arrival) */}
          {currentStep >= 1 && currentStep <= 3 && (
            <RegistrationFormZustand
              onNext={handleRegistrationNext}
              onBack={handleRegistrationBack}
            />
          )}

          {/* Step 4: Document Validation (Placeholder for now) */}
          {currentStep === 4 && (
            <Card className="w-full max-w-4xl mx-auto">
              <CardContent className="p-6">
                <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                  {t('stepper.document_validation')}
                </h3>
                <p className="text-gray-600 mb-6">
                  Document validation component will be implemented here.
                </p>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={handleRegistrationBack}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    {t('common.back')}
                  </button>
                  <button
                    type="button"
                    onClick={handleRegistrationNext}
                    className="flex-1 px-4 py-2 bg-[#45c655] text-white rounded-md hover:bg-[#3bb048]"
                  >
                    {t('common.continue')}
                  </button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 5: Bed Selection */}
          {currentStep === 5 && stayData && (
            <BedSelectionMap
              checkInDate={stayData.checkInDate}
              checkOutDate={stayData.checkOutDate}
              selectedBedId={selectedBedId}
              onBedSelect={handleBedSelect}
              onConfirm={handleBedSelectionConfirm}
              onBack={handleBedSelectionBack}
            />
          )}

          {/* Step 6: Booking Confirmation */}
          {currentStep === 6 && stayData && (
            <BookingConfirmation
              formData={formData}
              stayData={stayData}
              bedInfo={bedInfo}
              onConfirm={handleBookingConfirm}
              onBack={handleBookingBack}
              isSubmitting={isSubmitting}
            />
          )}
        </div>
      </div>
    </div>
  );
}