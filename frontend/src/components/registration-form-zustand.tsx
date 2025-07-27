// Original registration form from client/ - exact restoration with Zustand
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
  FileText,
  AlertCircle,
} from "lucide-react";
import { useRegistrationStore } from "@/stores/registration-store";
import { useI18n } from "@/contexts/i18n-context";
import { CountryAutocomplete } from "./country-autocomplete";
import { ArrivalTimePicker } from "./arrival-time-picker";

interface RegistrationFormZustandProps {
  onNext: () => void;
  onBack: () => void;
}

export const RegistrationFormZustand: React.FC<
  RegistrationFormZustandProps
> = ({ onNext, onBack }) => {
  const { t } = useI18n();
  const { formData, updateFormData, currentStep, validateStep } =
    useRegistrationStore();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateCurrentStep = (): boolean => {
    const newErrors: Record<string, string> = {};

    switch (currentStep) {
      case 1: // Personal Information
        if (!formData.firstName.trim()) {
          newErrors.firstName = t("validation.required");
        }
        if (!formData.lastName1.trim()) {
          newErrors.lastName1 = t("validation.required");
        }
        if (!formData.documentNumber.trim()) {
          newErrors.documentNumber = t("validation.required");
        }
        if (!formData.birthDate) {
          newErrors.birthDate = t("validation.required");
        }
        if (!formData.nationality) {
          newErrors.nationality = t("validation.required");
        }
        break;

      case 2: // Contact Information
        if (!formData.email.trim()) {
          newErrors.email = t("validation.required");
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
          newErrors.email = t("validation.email_invalid");
        }
        if (!formData.phone.trim()) {
          newErrors.phone = t("validation.required");
        }
        break;

      case 3: // Arrival Information
        if (!formData.estimatedArrivalTime) {
          newErrors.estimatedArrivalTime = t("validation.required");
        }
        if (!formData.paymentType) {
          newErrors.paymentType = t("validation.required");
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      onNext();
    }
  };

  const handleInputChange = (field: string, value: string) => {
    updateFormData({ [field]: value });
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  // Personal Information Step (Step 1)
  if (currentStep === 1) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            {t("registration.personal_info")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">{t("registration.first_name")}</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => handleInputChange("firstName", e.target.value)}
                className={errors.firstName ? "border-red-500" : ""}
                placeholder={t("registration.first_name_placeholder")}
              />
              {errors.firstName && (
                <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>
              )}
            </div>

            <div>
              <Label htmlFor="lastName1">{t("registration.last_name_1")}</Label>
              <Input
                id="lastName1"
                value={formData.lastName1}
                onChange={(e) => handleInputChange("lastName1", e.target.value)}
                className={errors.lastName1 ? "border-red-500" : ""}
                placeholder={t("registration.last_name_1_placeholder")}
              />
              {errors.lastName1 && (
                <p className="text-red-500 text-sm mt-1">{errors.lastName1}</p>
              )}
            </div>

            <div>
              <Label htmlFor="lastName2">
                {t("registration.last_name_2")} ({t("common.optional")})
              </Label>
              <Input
                id="lastName2"
                value={formData.lastName2 || ""}
                onChange={(e) => handleInputChange("lastName2", e.target.value)}
                placeholder={t("registration.last_name_2_placeholder")}
              />
            </div>

            <div>
              <Label htmlFor="birthDate">{t("registration.birth_date")}</Label>
              <Input
                id="birthDate"
                type="date"
                value={formData.birthDate}
                onChange={(e) => handleInputChange("birthDate", e.target.value)}
                className={errors.birthDate ? "border-red-500" : ""}
                max={
                  new Date(Date.now() - 18 * 365 * 24 * 60 * 60 * 1000)
                    .toISOString()
                    .split("T")[0]
                }
              />
              {errors.birthDate && (
                <p className="text-red-500 text-sm mt-1">{errors.birthDate}</p>
              )}
            </div>

            <div>
              <Label htmlFor="documentType">
                {t("registration.document_type")}
              </Label>
              <Select
                value={formData.documentType}
                onValueChange={(value: "dni" | "nie" | "passport") =>
                  handleInputChange("documentType", value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dni">DNI</SelectItem>
                  <SelectItem value="nie">NIE</SelectItem>
                  <SelectItem value="passport">
                    {t("registration.passport")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="documentNumber">
                {t("registration.document_number")}
              </Label>
              <Input
                id="documentNumber"
                value={formData.documentNumber}
                onChange={(e) =>
                  handleInputChange(
                    "documentNumber",
                    e.target.value.toUpperCase(),
                  )
                }
                className={errors.documentNumber ? "border-red-500" : ""}
                placeholder={
                  formData.documentType === "dni"
                    ? "12345678A"
                    : formData.documentType === "nie"
                      ? "X1234567A"
                      : "AB123456"
                }
              />
              {errors.documentNumber && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.documentNumber}
                </p>
              )}
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="nationality">
                {t("registration.nationality")}
              </Label>
              <CountryAutocomplete
                value={formData.nationality}
                onChange={(value) => handleInputChange("nationality", value)}
                error={errors.nationality}
              />
              {errors.nationality && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.nationality}
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              className="flex-1"
            >
              {t("common.back")}
            </Button>
            <Button type="button" onClick={handleNext} className="flex-1">
              {t("common.continue")}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Contact Information Step (Step 2)
  if (currentStep === 2) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            {t("registration.contact_info")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">{t("registration.email")}</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                className={errors.email ? "border-red-500" : ""}
                placeholder="ejemplo@email.com"
              />
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email}</p>
              )}
            </div>

            <div>
              <Label htmlFor="phone">{t("registration.phone")}</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                className={errors.phone ? "border-red-500" : ""}
                placeholder="+34 600 123 456"
              />
              {errors.phone && (
                <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
              )}
            </div>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t("registration.contact_privacy_notice")}
            </AlertDescription>
          </Alert>

          <div className="flex gap-4 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              className="flex-1"
            >
              {t("common.back")}
            </Button>
            <Button type="button" onClick={handleNext} className="flex-1">
              {t("common.continue")}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Arrival Information Step (Step 3)
  if (currentStep === 3) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            {t("registration.arrival_info")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <ArrivalTimePicker
            checkInDate="2024-01-01" // This would come from stay data
            value={formData.estimatedArrivalTime}
            onChange={(time) => handleInputChange("estimatedArrivalTime", time)}
            error={errors.estimatedArrivalTime}
          />

          <div>
            <Label htmlFor="paymentType">
              {t("registration.payment_method")}
            </Label>
            <Select
              value={formData.paymentType}
              onValueChange={(value: "cash" | "card" | "bizum") =>
                handleInputChange("paymentType", value)
              }
            >
              <SelectTrigger
                className={errors.paymentType ? "border-red-500" : ""}
              >
                <SelectValue
                  placeholder={t("registration.payment_method_placeholder")}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="card">{t("payment.card")}</SelectItem>
                <SelectItem value="bizum">{t("payment.bizum")}</SelectItem>
                <SelectItem value="cash">{t("payment.cash")}</SelectItem>
              </SelectContent>
            </Select>
            {errors.paymentType && (
              <p className="text-red-500 text-sm mt-1">{errors.paymentType}</p>
            )}
          </div>

          <div className="flex gap-4 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              className="flex-1"
            >
              {t("common.back")}
            </Button>
            <Button type="button" onClick={handleNext} className="flex-1">
              {t("common.continue")}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
};
