import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { MapPin, Phone, Star, Clock, Car, Utensils } from "lucide-react";

export default function InfoCardsPage() {
  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">Información para Peregrinos</h1>
        <p className="text-muted-foreground">
          Todo lo que necesitas saber para disfrutar de tu estancia en Mérida y alrededores
        </p>
      </div>

      {/* Restaurants Section */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <Utensils className="h-6 w-6" />
          Dónde Comer en Mérida
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Atrio Restaurante</CardTitle>
              <div className="flex items-center gap-2">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <Badge variant="secondary">€€€€</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Restaurante galardonado con estrella Michelin. Experiencia gastronómica única.
              </p>
              <div className="flex items-center gap-1 text-sm">
                <MapPin className="h-4 w-4" />
                Plaza de Santa Clara, 10, Cáceres
              </div>
              <div className="flex items-center gap-1 text-sm">
                <Phone className="h-4 w-4" />
                +34 927 242 928
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tabula Calda</CardTitle>
              <div className="flex items-center gap-2">
                <div className="flex items-center">
                  {[...Array(4)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                  <Star className="h-4 w-4 text-gray-300" />
                </div>
                <Badge variant="secondary">€€</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Cocina romana tradicional cerca del Teatro Romano. Ambiente histórico.
              </p>
              <div className="flex items-center gap-1 text-sm">
                <MapPin className="h-4 w-4" />
                Calle José Ramón Mélida, 40
              </div>
              <div className="flex items-center gap-1 text-sm">
                <Phone className="h-4 w-4" />
                +34 924 304 512
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Restaurante Rex Numitor</CardTitle>
              <div className="flex items-center gap-2">
                <div className="flex items-center">
                  {[...Array(4)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                  <Star className="h-4 w-4 text-gray-300" />
                </div>
                <Badge variant="secondary">€€€</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Especialidades locales extremeñas. Ambiente acogedor y familiar.
              </p>
              <div className="flex items-center gap-1 text-sm">
                <MapPin className="h-4 w-4" />
                Plaza de Santa Eulalia, 13
              </div>
              <div className="flex items-center gap-1 text-sm">
                <Phone className="h-4 w-4" />
                +34 924 304 910
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Taxis Section */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <Car className="h-6 w-6" />
          Servicios de Taxi
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Radio Taxi Mérida</CardTitle>
              <Badge variant="outline" className="w-fit">24 Horas</Badge>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Servicio de taxi oficial de Mérida. Cobertura completa de la ciudad y alrededores.
              </p>
              <div className="flex items-center gap-1 text-sm font-medium">
                <Phone className="h-4 w-4" />
                +34 924 371 111
              </div>
              <div className="flex items-center gap-1 text-sm">
                <Clock className="h-4 w-4" />
                Disponible 24/7
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Taxi Aeropuerto Badajoz</CardTitle>
              <Badge variant="outline" className="w-fit">Traslados</Badge>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Servicio especializado en traslados al aeropuerto de Badajoz y otras ciudades.
              </p>
              <div className="flex items-center gap-1 text-sm font-medium">
                <Phone className="h-4 w-4" />
                +34 924 456 789
              </div>
              <div className="flex items-center gap-1 text-sm">
                <Clock className="h-4 w-4" />
                Previa reserva
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Car Rentals Section */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <Car className="h-6 w-6" />
          Alquiler de Coches
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Hertz Mérida</CardTitle>
              <Badge variant="secondary">Internacional</Badge>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Alquiler de vehículos con cobertura internacional. Amplia flota disponible.
              </p>
              <div className="flex items-center gap-1 text-sm">
                <MapPin className="h-4 w-4" />
                Estación de Tren de Mérida
              </div>
              <div className="flex items-center gap-1 text-sm font-medium">
                <Phone className="h-4 w-4" />
                +34 924 372 208
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Europcar</CardTitle>
              <Badge variant="secondary">Aeropuerto</Badge>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Servicio en aeropuerto de Badajoz y oficinas en la ciudad.
              </p>
              <div className="flex items-center gap-1 text-sm">
                <MapPin className="h-4 w-4" />
                Aeropuerto de Badajoz
              </div>
              <div className="flex items-center gap-1 text-sm font-medium">
                <Phone className="h-4 w-4" />
                +34 924 420 834
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Avis Extremadura</CardTitle>
              <Badge variant="secondary">Local</Badge>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Empresa local con conocimiento de la zona. Precios competitivos.
              </p>
              <div className="flex items-center gap-1 text-sm">
                <MapPin className="h-4 w-4" />
                Centro de Mérida
              </div>
              <div className="flex items-center gap-1 text-sm font-medium">
                <Phone className="h-4 w-4" />
                +34 924 315 677
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}