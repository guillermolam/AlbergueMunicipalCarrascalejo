import { Link, useLocation } from "wouter";
import { Button } from "./ui/button";
import { Home, Info, Calendar, User } from "lucide-react";

export default function Navigation() {
  const [location] = useLocation();

  const navItems = [
    { path: "/", icon: Home, label: "Inicio" },
    { path: "/info", icon: Info, label: "Información" },
    { path: "/booking", icon: Calendar, label: "Reservar" },
    { path: "/login", icon: User, label: "Admin" },
  ];

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold text-primary">
              Albergue del Carrascalejo
            </h1>
          </div>

          <div className="flex space-x-2">
            {navItems.map(({ path, icon: Icon, label }) => (
              <Link key={path} href={path}>
                <Button
                  variant={location === path ? "default" : "ghost"}
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden md:inline">{label}</span>
                </Button>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
