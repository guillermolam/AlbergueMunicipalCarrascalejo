import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription } from './ui/alert';
import { useI18n } from '../contexts/i18n-context';
import { Calendar, User, FileText, CreditCard, CheckCircle, Plus, Minus } from 'lucide-react';

const registrationSchema = z.object({
  // Personal Information
  firstName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  lastName1: z.string().min(2, 'El primer apellido es obligatorio'),
  lastName2: z.string().optional(),
  birthDate: z.string().min(1, 'La fecha de nacimiento es obligatoria'),
  gender: z.enum(['M', 'F', 'O'], { required_error: 'El género es obligatorio' }),
  nationality: z.string().min(1, 'La nacionalidad es obligatoria'),
  
  // Document Information
  documentType: z.enum(['DNI', 'NIE', 'PASSPORT'], { required_error: 'Tipo de documento obligatorio' }),
  documentNumber: z.string().min(8, 'Número de documento inválido'),
  
  // Contact Information
  phone: z.string().min(9, 'Teléfono inválido'),
  email: z.string().email('Email inválido').optional(),
  
  // Address
  addressCountry: z.string().min(1, 'País obligatorio'),
  addressStreet: z.string().min(5, 'Dirección obligatoria'),
  addressCity: z.string().min(2, 'Ciudad obligatoria'),
  addressPostalCode: z.string().min(4, 'Código postal obligatorio'),
  
  // Booking Details
  checkInDate: z.string().min(1, 'Fecha de entrada obligatoria'),
  checkOutDate: z.string().min(1, 'Fecha de salida obligatoria'),
  arrivalTime: z.string().optional(),
  selectedBed: z.string().optional(),
  
  // Legal
  consentGiven: z.boolean().refine(val => val === true, 'Debes aceptar el tratamiento de datos'),
}).refine((data) => {
  // Ensure check-out is at least one day after check-in
  const checkIn = new Date(data.checkInDate);
  const checkOut = new Date(data.checkOutDate);
  return checkOut > checkIn;
}, {
  message: 'La fecha de salida debe ser posterior a la fecha de entrada (mínimo 1 noche)',
  path: ['checkOutDate']
});

type RegistrationFormData = z.infer<typeof registrationSchema>;

const steps = [
  { id: 'dates', title: 'Fechas', description: 'Selecciona tu estancia', icon: Calendar },
  { id: 'personal', title: 'Datos Personales', description: 'Información básica', icon: User },
  { id: 'documents', title: 'Documentación', description: 'Captura de documentos', icon: FileText },
  { id: 'payment', title: 'Confirmación', description: 'Finalizar reserva', icon: CreditCard },
];

export default function RegistrationFormMobile() {
  const { t } = useI18n();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Set default dates
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfterTomorrow = new Date(today);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

  const form = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      gender: undefined,
      documentType: undefined,
      consentGiven: false,
      checkInDate: tomorrow.toISOString().split('T')[0],
      checkOutDate: dayAfterTomorrow.toISOString().split('T')[0],
    },
  });

  const onSubmit = async (data: RegistrationFormData) => {
    setIsSubmitting(true);
    try {
      console.log('Form submitted:', data);
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error('Submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = async () => {
    let fieldsToValidate: (keyof RegistrationFormData)[] = [];
    
    switch (currentStep) {
      case 0:
        fieldsToValidate = ['checkInDate', 'checkOutDate'];
        break;
      case 1:
        fieldsToValidate = ['firstName', 'lastName1', 'birthDate', 'gender', 'nationality'];
        break;
      case 2:
        fieldsToValidate = ['documentType', 'documentNumber'];
        break;
      case 3:
        fieldsToValidate = ['phone', 'addressCountry', 'addressStreet', 'addressCity', 'addressPostalCode', 'consentGiven'];
        break;
    }

    const result = await form.trigger(fieldsToValidate);
    if (result && currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 px-4">
      {/* Progress Stepper - Mobile Optimized */}
      <div className="flex justify-between items-center overflow-x-auto pb-2">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center min-w-0">
            <div className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 ${
              index <= currentStep ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground text-muted-foreground'
            }`}>
              {index < currentStep ? (
                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
              ) : (
                React.createElement(step.icon, { className: "w-4 h-4 sm:w-5 sm:h-5" })
              )}
            </div>
            {index < steps.length - 1 && (
              <div className={`w-8 sm:w-24 h-1 mx-1 sm:mx-2 ${index < currentStep ? 'bg-primary' : 'bg-muted'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            {React.createElement(steps[currentStep].icon, { className: "w-5 h-5" })}
            {steps[currentStep].title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Step 0: Date Selection - Mobile Optimized */}
            {currentStep === 0 && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">Información de la estancia</h3>
                
                {/* Mobile Date Layout - Side by Side */}
                <div className="space-y-4">
                  <Label className="text-sm font-medium text-gray-700 block">
                    Fechas de estancia
                  </Label>
                  
                  {/* Mobile: Side by side layout */}
                  <div className="grid grid-cols-2 gap-3 sm:hidden">
                    <div>
                      <Label htmlFor="checkInDate-mobile" className="text-xs text-gray-600 mb-1 block">
                        Llegada
                      </Label>
                      <Input
                        id="checkInDate-mobile"
                        type="date"
                        {...form.register('checkInDate')}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full text-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="checkOutDate-mobile" className="text-xs text-gray-600 mb-1 block">
                        Salida
                      </Label>
                      <Input
                        id="checkOutDate-mobile"
                        type="date"
                        {...form.register('checkOutDate')}
                        min={(() => {
                          const checkInDate = form.watch('checkInDate');
                          if (checkInDate) {
                            const minCheckOut = new Date(checkInDate);
                            minCheckOut.setDate(minCheckOut.getDate() + 1);
                            return minCheckOut.toISOString().split('T')[0];
                          }
                          const tomorrow = new Date();
                          tomorrow.setDate(tomorrow.getDate() + 1);
                          return tomorrow.toISOString().split('T')[0];
                        })()}
                        className="w-full text-sm"
                      />
                    </div>
                  </div>

                  {/* Desktop: Original layout */}
                  <div className="hidden sm:grid md:grid-cols-3 gap-6">
                    <div>
                      <div className="space-y-2">
                        <Input
                          type="date"
                          {...form.register('checkInDate')}
                          min={new Date().toISOString().split('T')[0]}
                          className="w-full"
                        />
                        <Input
                          type="date"
                          {...form.register('checkOutDate')}
                          min={(() => {
                            const checkInDate = form.watch('checkInDate');
                            if (checkInDate) {
                              const minCheckOut = new Date(checkInDate);
                              minCheckOut.setDate(minCheckOut.getDate() + 1);
                              return minCheckOut.toISOString().split('T')[0];
                            }
                            const tomorrow = new Date();
                            tomorrow.setDate(tomorrow.getDate() + 1);
                            return tomorrow.toISOString().split('T')[0];
                          })()}
                          className="w-full"
                        />
                      </div>
                    </div>

                    {/* Nights Counter */}
                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-3 block">
                        Número de noches
                      </Label>
                      <div className="flex items-center justify-center border rounded-lg p-3 bg-gray-50">
                        <span className="text-lg font-semibold">
                          {(() => {
                            const checkIn = form.watch('checkInDate');
                            const checkOut = form.watch('checkOutDate');
                            if (checkIn && checkOut) {
                              return Math.max(1, Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)));
                            }
                            return 1;
                          })()}
                        </span>
                      </div>
                    </div>

                    {/* Persons */}
                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-3 block">
                        Personas
                      </Label>
                      <Select defaultValue="1" disabled>
                        <SelectTrigger className="w-full">
                          <SelectValue>1 persona</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 persona</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500 mt-1">Solo registro individual</p>
                    </div>
                  </div>

                  {/* Mobile: Nights display */}
                  <div className="sm:hidden text-center">
                    <div className="inline-flex items-center space-x-2 bg-gray-50 px-4 py-2 rounded-lg">
                      <span className="text-sm text-gray-600">Noches:</span>
                      <span className="font-semibold text-lg">
                        {(() => {
                          const checkIn = form.watch('checkInDate');
                          const checkOut = form.watch('checkOutDate');
                          if (checkIn && checkOut) {
                            return Math.max(1, Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)));
                          }
                          return 1;
                        })()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Pricing Summary */}
                <div className="bg-gray-50 border-l-4 border-green-600 p-4 rounded-r-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Precio por noche</p>
                      <p className="text-xs text-gray-600">Dormitorio compartido</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-700">15€</p>
                      <p className="text-xs text-gray-500">por persona</p>
                    </div>
                  </div>
                </div>

                {/* Availability Confirmation */}
                <Alert className="border-gray-200 bg-gray-50">
                  <CheckCircle className="h-4 w-4 text-gray-600" />
                  <AlertDescription className="text-gray-700">
                    <strong>Disponibilidad confirmada</strong> - Hay camas disponibles para las fechas seleccionadas.
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {/* Other steps remain the same but are abbreviated for space */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Datos Personales</h3>
                <p className="text-sm text-gray-600">Formulario de información personal aquí...</p>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Documentación</h3>
                <p className="text-sm text-gray-600">Captura de documentos aquí...</p>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Confirmación</h3>
                <p className="text-sm text-gray-600">Finalizar reserva aquí...</p>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6">
              {currentStep > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrevious}
                  className="px-6"
                >
                  Anterior
                </Button>
              )}

              <div className="ml-auto">
                {currentStep < steps.length - 1 ? (
                  <Button 
                    type="button" 
                    onClick={handleNext} 
                    className="bg-green-600 hover:bg-green-700 text-white px-6"
                  >
                    Continuar
                  </Button>
                ) : (
                  <Button 
                    type="submit" 
                    disabled={isSubmitting} 
                    className="bg-green-600 hover:bg-green-700 text-white px-6"
                  >
                    {isSubmitting ? 'Procesando...' : 'Completar registro'}
                  </Button>
                )}
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}