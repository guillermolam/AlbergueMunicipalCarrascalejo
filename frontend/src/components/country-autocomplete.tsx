// Country autocomplete component for nationality selection
import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface CountryAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
}

// Common countries for Spanish hostel - prioritize Spanish-speaking and European countries
const countries = [
  { code: "ES", name: "España", nameEn: "Spain" },
  { code: "DE", name: "Alemania", nameEn: "Germany" },
  { code: "FR", name: "Francia", nameEn: "France" },
  { code: "IT", name: "Italia", nameEn: "Italy" },
  { code: "PT", name: "Portugal", nameEn: "Portugal" },
  { code: "UK", name: "Reino Unido", nameEn: "United Kingdom" },
  { code: "US", name: "Estados Unidos", nameEn: "United States" },
  { code: "AR", name: "Argentina", nameEn: "Argentina" },
  { code: "BR", name: "Brasil", nameEn: "Brazil" },
  { code: "MX", name: "México", nameEn: "Mexico" },
  { code: "CO", name: "Colombia", nameEn: "Colombia" },
  { code: "PE", name: "Perú", nameEn: "Peru" },
  { code: "CL", name: "Chile", nameEn: "Chile" },
  { code: "UY", name: "Uruguay", nameEn: "Uruguay" },
  { code: "NL", name: "Países Bajos", nameEn: "Netherlands" },
  { code: "BE", name: "Bélgica", nameEn: "Belgium" },
  { code: "CH", name: "Suiza", nameEn: "Switzerland" },
  { code: "AT", name: "Austria", nameEn: "Austria" },
  { code: "IE", name: "Irlanda", nameEn: "Ireland" },
  { code: "PL", name: "Polonia", nameEn: "Poland" },
  { code: "CZ", name: "República Checa", nameEn: "Czech Republic" },
  { code: "HU", name: "Hungría", nameEn: "Hungary" },
  { code: "SK", name: "Eslovaquia", nameEn: "Slovakia" },
  { code: "SI", name: "Eslovenia", nameEn: "Slovenia" },
  { code: "HR", name: "Croacia", nameEn: "Croatia" },
  { code: "CA", name: "Canadá", nameEn: "Canada" },
  { code: "AU", name: "Australia", nameEn: "Australia" },
  { code: "NZ", name: "Nueva Zelanda", nameEn: "New Zealand" },
  { code: "JP", name: "Japón", nameEn: "Japan" },
  { code: "KR", name: "Corea del Sur", nameEn: "South Korea" },
  { code: "CN", name: "China", nameEn: "China" },
];

export const CountryAutocomplete: React.FC<CountryAutocompleteProps> = ({
  value,
  onChange,
  error,
  placeholder = "Selecciona nacionalidad",
}) => {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const selectedCountry = countries.find(
    (country) => country.name === value || country.nameEn === value,
  );

  const filteredCountries = countries.filter(
    (country) =>
      country.name.toLowerCase().includes(searchValue.toLowerCase()) ||
      country.nameEn.toLowerCase().includes(searchValue.toLowerCase()),
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between",
            error && "border-red-500",
            !value && "text-muted-foreground",
          )}
        >
          {selectedCountry ? selectedCountry.name : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput
            placeholder="Buscar país..."
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandEmpty>No se encontró el país.</CommandEmpty>
          <CommandGroup className="max-h-64 overflow-auto">
            {filteredCountries.map((country) => (
              <CommandItem
                key={country.code}
                value={country.name}
                onSelect={() => {
                  onChange(country.name);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === country.name ? "opacity-100" : "opacity-0",
                  )}
                />
                <div className="flex flex-col">
                  <span>{country.name}</span>
                  <span className="text-xs text-gray-500">
                    {country.nameEn}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
