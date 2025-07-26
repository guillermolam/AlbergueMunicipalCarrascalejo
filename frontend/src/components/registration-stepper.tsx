import React from 'react';
import { Check, Circle } from 'lucide-react';
import { useI18n } from '@/contexts/i18n-context';

interface Step {
  id: number;
  titleKey: string;
  icon?: React.ReactNode;
}

interface RegistrationStepperProps {
  currentStep?: number;
  completedSteps?: number[];
  onStepClick?: (step: number) => void;
}

export const RegistrationStepper: React.FC<RegistrationStepperProps> = ({
  currentStep = 0,
  completedSteps = [],
  onStepClick
}) => {
  const { t } = useI18n();

  const steps: Step[] = [
    { id: 0, titleKey: 'stepper.stay_dates' },
    { id: 1, titleKey: 'stepper.personal_info' },
    { id: 2, titleKey: 'stepper.contact_info' },
    { id: 3, titleKey: 'stepper.arrival_info' },
    { id: 4, titleKey: 'stepper.document_validation' },
    { id: 5, titleKey: 'stepper.bed_selection' },
    { id: 6, titleKey: 'stepper.confirmation' }
  ];

  const getStepStatus = (stepId: number) => {
    if (completedSteps && completedSteps.includes(stepId)) return 'completed';
    if (stepId === currentStep) return 'current';
    if (stepId < currentStep) return 'available';
    return 'disabled';
  };

  const getStepClasses = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500 text-white border-green-500';
      case 'current':
        return 'bg-blue-500 text-white border-blue-500 ring-2 ring-blue-200';
      case 'available':
        return 'bg-white text-gray-700 border-gray-300 hover:border-gray-400 cursor-pointer';
      default:
        return 'bg-gray-100 text-gray-400 border-gray-200';
    }
  };

  const getConnectorClasses = (stepId: number) => {
    const isCompleted = (completedSteps && completedSteps.includes(stepId)) || stepId < currentStep;
    return isCompleted ? 'bg-green-500' : 'bg-gray-200';
  };

  return (
    <div className="w-full px-4 py-6">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const status = getStepStatus(step.id);
          const isClickable = status === 'available' || status === 'completed';

          return (
            <React.Fragment key={step.id}>
              {/* Step Circle */}
              <div className="flex flex-col items-center">
                <button
                  onClick={() => isClickable && onStepClick?.(step.id)}
                  disabled={!isClickable}
                  className={`
                    w-10 h-10 rounded-full border-2 flex items-center justify-center
                    text-sm font-medium transition-all duration-200
                    ${getStepClasses(status)}
                    ${!isClickable ? 'cursor-not-allowed' : ''}
                  `}
                >
                  {status === 'completed' ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <span>{step.id + 1}</span>
                  )}
                </button>

                {/* Step Label */}
                <div className="mt-2 text-center">
                  <p className={`
                    text-xs font-medium
                    ${status === 'current' ? 'text-blue-600' : 
                      status === 'completed' ? 'text-green-600' : 
                      'text-gray-500'}
                  `}>
                    {t(step.titleKey)}
                  </p>
                </div>
              </div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="flex-1 mx-2 mt-5 mb-auto">
                  <div className={`
                    h-0.5 transition-colors duration-200
                    ${getConnectorClasses(step.id)}
                  `} />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};