import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@albergue/components/ui/card";
import { Button } from "@albergue/components/ui/button";
import { Input } from "@albergue/components/ui/input";
import { Label } from "@albergue/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@albergue/components/ui/select";
import { Alert, AlertDescription } from "@albergue/components/ui/alert";
import {
  Calendar,
  User,
  FileText,
  CreditCard,
  CheckCircle,
  Plus,
  Minus,
} from "lucide-react";

const registrationSchema = z
  .object({
    // Personal Information
    firstName: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
    lastName1: z.string().min(2, "El primer apellido es obligatorio"),
    lastName2: z.string().optional(),
    birthDate: z.string().min(1, "La fecha de nacimiento es obligatoria"),
    gender: z.enum(["M", "F", "O"], {
      required_error: "El género es obligatorio",
    }),
    nationality: z.string().min(1, "La nacionalidad es obligatoria"),

    // Document Information
    documentType: z.enum(["DNI", "NIE", "PASSPORT"], {
      required_error: "Tipo de documento obligatorio",
    }),
    documentNumber: z.string().min(8, "Número de documento inválido"),

    // Contact Information
    phone: z.string().min(9, "Teléfono inválido"),
    email: z.string().email("Email inválido").optional(),

    // Address
    addressCountry: z.string().min(1, "País obligatorio"),
    addressProvince: z.string().min(1, "Provincia obligatoria"),
    addressCity: z.string().min(1, "Ciudad obligatoria"),
    addressStreet: z.string().min(1, "Dirección obligatoria"),
    addressPostalCode: z.string().min(5, "Código postal inválido"),

    // Stay Information
    arrivalDate: z.string().min(1, "Fecha de llegada obligatoria"),
    arrivalTime: z.string().min(1, "Hora de llegada obligatoria"),
    departureDate: z.string().min(1, "Fecha de salida obligatoria"),
    numberOfPeople: z.number().min(1, "Mínimo 1 persona"),
    accommodationType: z.enum(["albergue", "hostal"], {
      required_error: "Tipo de alojamiento obligatorio",
    }),

    // Payment
    paymentMethod: z.enum(["cash", "card"], {
      required_error: "Método de pago obligatorio",
    }),
  })
  .refine(
    (data) => {
      if (data.arrivalDate && data.departureDate) {
        return new Date(data.departureDate) > new Date(data.arrivalDate);
      }
      return true;
    },
    {
      message: "La fecha de salida debe ser posterior a la de llegada",
      path: ["departureDate"],
    }
  );

type RegistrationFormData = z.infer<typeof registrationSchema>;

export const RegistrationForm: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
  });

  const onSubmit = async (data: RegistrationFormData) => {
    setIsSubmitting(true);
    try {
      // In a real app, this would call the booking service
      console.log("Booking data:", data);
      // Redirect to confirmation page
      window.location.href = "/booking/confirmation";
    } catch (error) {
      console.error("Error submitting booking:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { id: 1, title: "Información Personal", icon: User },
    { id: 2, title: "Documentación", icon: FileText },
    { id: 3, title: "Estancia", icon: Calendar },
    { id: 4, title: "Pago", icon: CreditCard },
  ];

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="firstName">Nombre</Label>
              <Input id="firstName" {...register("firstName")} />
              {errors.firstName && (
                <p className="text-sm text-red-500">{errors.firstName.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="lastName1">Primer Apellido</Label>
              <Input id="lastName1" {...register("lastName1")} />
              {errors.lastName1 && (
                <p className="text-sm text-red-500">{errors.lastName1.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="lastName2">Segundo Apellido</Label>
              <Input id="lastName2" {...register("lastName2")} />
            </div>
            <div>
              <Label htmlFor="birthDate">Fecha de Nacimiento</Label>
              <Input id="birthDate" type="date" {...register("birthDate")} />
              {errors.birthDate && (
                <p className="text-sm text-red-500">{errors.birthDate.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="gender">Género</Label>
              <Select onValueChange={(value) => setValue("gender", value as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona género" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">Masculino</SelectItem>
                  <SelectItem value="F">Femenino</SelectItem>
                  <SelectItem value="O">Otro</SelectItem>
                </SelectContent>
              </Select>
              {errors.gender && (
                <p className="text-sm text-red-500">{errors.gender.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="nationality">Nacionalidad</Label>
              <Input id="nationality" {...register("nationality")} />
              {errors.nationality && (
                <p className="text-sm text-red-500">{errors.nationality.message}</p>
              )}
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="documentType">Tipo de Documento</Label>
              <Select
                onValueChange={(value) => setValue("documentType", value as any)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DNI">DNI</SelectItem>
                  <SelectItem value="NIE">NIE</SelectItem>
                  <SelectItem value="PASSPORT">Pasaporte</SelectItem>
                </SelectContent>
              </Select>
              {errors.documentType && (
                <p className="text-sm text-red-500">{errors.documentType.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="documentNumber">Número de Documento</Label>
              <Input id="documentNumber" {...register("documentNumber")} />
              {errors.documentNumber && (
                <p className="text-sm text-red-500">{errors.documentNumber.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="phone">Teléfono</Label>
              <Input id="phone" {...register("phone")} />
              {errors.phone && (
                <p className="text-sm text-red-500">{errors.phone.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="email">Email (opcional)</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="arrivalDate">Fecha de Llegada</Label>
              <Input id="arrivalDate" type="date" {...register("arrivalDate")} />
              {errors.arrivalDate && (
                <p className="text-sm text-red-500">{errors.arrivalDate.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="arrivalTime">Hora de Llegada</Label>
              <Input id="arrivalTime" type="time" {...register("arrivalTime")} />
              {errors.arrivalTime && (
                <p className="text-sm text-red-500">{errors.arrivalTime.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="departureDate">Fecha de Salida</Label>
              <Input id="departureDate" type="date" {...register("departureDate")} />
              {errors.departureDate && (
                <p className="text-sm text-red-500">{errors.departureDate.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="numberOfPeople">Número de Personas</Label>
              <Input
                id="numberOfPeople"
                type="number"
                min="1"
                {...register("numberOfPeople", { valueAsNumber: true })}
              />
              {errors.numberOfPeople && (
                <p className="text-sm text-red-500">{errors.numberOfPeople.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="accommodationType">Tipo de Alojamiento</Label>
              <Select
                onValueChange={(value) =>
                  setValue("accommodationType", value as any)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="albergue">Albergue</SelectItem>
                  <SelectItem value="hostal">Hostal</SelectItem>
                </SelectContent>
              </Select>
              {errors.accommodationType && (
                <p className="text-sm text-red-500">
                  {errors.accommodationType.message}
                </p>
              )}
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="paymentMethod">Método de Pago</Label>
              <Select
                onValueChange={(value) => setValue("paymentMethod", value as any)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona método" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Efectivo</SelectItem>
                  <SelectItem value="card">Tarjeta</SelectItem>
                </SelectContent>
              </Select>
              {errors.paymentMethod && (
                <p className="text-sm text-red-500">
                  {errors.paymentMethod.message}
                </p>
              )}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Registro de Estancia</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Progress Steps */}
        <div className="flex justify-between mb-6">
          {steps.map((step) => (
            <div
              key={step.id}
              className={`flex items-center ${
                currentStep >= step.id ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <step.icon className="w-5 h-5 mr-2" />
              <span className="text-sm">{step.title}</span>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {renderStep()}

          <div className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
              disabled={currentStep === 1}
            >
              Anterior
            </Button>
            <Button
              type={currentStep === 4 ? "submit" : "button"}
              onClick={() => {
                if (currentStep < 4) {
                  setCurrentStep(currentStep + 1);
                }
              }}
              disabled={isSubmitting}
            >
              {currentStep === 4 ? "Confirmar Reserva" : "Siguiente"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};