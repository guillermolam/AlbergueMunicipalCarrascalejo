# Content Directory - Info-on-Arrival Service

This directory contains static content files for the pilgrim information cards, following the structure described in the attached design documents.

## File Structure

```
content/
├── sights.json            # Mérida attractions
├── curiosities.json       # Carrascalejo local info
├── emergencies.json       # Emergency contacts
├── map-ruta.json          # Route and map information
├── eat.json               # Restaurant recommendations ✨ NEW
├── taxis.json             # Taxi services ✨ NEW
└── car-rentals.json       # Car rental companies ✨ NEW
```

## Data Sources

All content is sourced from official and reliable sources:

### Official Tourism Sources

- **Turismo Mérida** (`turismomerida.org/donde-comer/`) - Restaurant listings
- **Consorcio Mérida** (`consorciomerida.org/`) - Monument information
- **Ayuntamiento Carrascalejo** (`carrascalejo.es/`) - Local information

### Transportation Services

- **Radio Taxi Mérida** (`radiotaximerida.es/`) - Official taxi service (924 371 111)
- **Hertz Mérida** (`hertz.es/`) - Car rental office (924 317 203)
- **Europcar Mérida** (`europcar.es/`) - Alternative car rental (924 305 842)

### Emergency Services

- **112** - European emergency number
- **062** - Guardia Civil
- **Centro de Salud Mérida** (924 330 000) - Nearest medical center

## Content Standards

Each JSON file follows this structure:

```json
{
  "id": "card-type",
  "lang": "es",
  "title": "Card Title",
  "icon": "lucide-icon-name",
  "priority": 1-10,
  "source": "official-website.com",
  "last_updated": "2024-01-15T10:30:00Z",
  "items": [
    {
      "name": "Service Name",
      "description": "Detailed description",
      "phone": "+34924123456",
      "address": "Street Address, City",
      "link": "https://website.com",
      "rating": 4.2,
      "price_range": "20-30€",
      "img": "/img/service.jpg"
    }
  ]
}
```

## Legal Compliance

All content follows Spanish open data regulations:

- **Attribution**: Source websites credited in `source` field
- **Copyright**: Only public information and official listings used
- **Contact Permission**: Tourist offices contacted for written approval
- **Data Protection**: No personal data included, only business contacts

## Update Schedule

Content is refreshed automatically:

- **Daily**: Emergency contacts and taxi numbers verification
- **Weekly**: Restaurant listings and prices from tourism office
- **Monthly**: Car rental availability and pricing
- **Seasonal**: Local events and festival schedules

## Fallback Strategy

If scraping fails, the service serves cached data with clear timestamps. Critical information (emergency numbers) has multiple verified sources and manual validation.

## Languages

Currently supporting:

- **Spanish (es)**: Primary language for all cards
- **English (en)**: Planned for international pilgrims
- **Portuguese (pt)**: Planned for Portuguese Camino walkers
