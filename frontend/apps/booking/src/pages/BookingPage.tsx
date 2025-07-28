import { RegistrationForm } from "../components/RegistrationForm";

export default function BookingPage() {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          Reserva tu estancia
        </h1>
        <p className="text-muted-foreground">
          Albergue del Carrascalejo - Camino de Santiago
        </p>
      </div>

      <RegistrationForm />
    </div>
  );
}