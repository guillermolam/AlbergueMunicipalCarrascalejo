# Frontend - Albergue del Carrascalejo

Modern React + TypeScript frontend with WASM microservices integration for the Albergue management system.

## Architecture

- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite.js with monorepo support
- **Styling**: Tailwind CSS + shadcn/ui components
- **State Management**: Zustand stores
- **Backend Integration**: Rust WASM microservices

## Directory Structure

```
frontend/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── ui/             # shadcn/ui component library
│   │   ├── BedMap.tsx      # Interactive bed management
│   │   └── NotificationBadge.tsx
│   ├── pages/              # Route components
│   │   ├── BookingPage.tsx # Main booking interface
│   │   └── AdminDashboard.tsx
│   ├── contexts/           # React contexts
│   │   └── i18n-es.ts      # Spanish localization
│   ├── store/              # Zustand state stores
│   │   ├── bookingStore.ts # Booking state management
│   │   └── adminStore.ts   # Admin panel state
│   ├── hooks/              # Custom React hooks
│   │   └── useWasmService.ts # WASM service integration
│   ├── utils/              # Utility functions
│   │   └── wasmLoader.ts   # WASM module loading
│   ├── lib/                # Core utilities
│   │   └── utils.ts        # cn() helper and API utilities
│   ├── types/              # TypeScript definitions
│   │   └── global.d.ts     # Global type declarations
│   └── App.tsx             # Main application component
├── assets/                 # Static assets
│   └── icons/              # SVG icons for Tailwind
├── public/                 # Public static files
├── tests/                  # Frontend test files
├── vite.config.ts          # Vite configuration
├── tailwind.config.ts      # Tailwind CSS configuration
├── postcss.config.js       # PostCSS configuration
└── tsconfig.json           # TypeScript configuration
```

## Key Features

### Path Aliases
- `@` → `./src` (source code)
- `@assets` → `../tests/attached_assets` (test assets)
- `@shared` → `../services/shared/src` (shared Rust types)
- `@wasm` → `../pkg` (compiled WASM services)

### WASM Integration
```typescript
import { loadWasmService } from '@/lib/utils';

// Load booking service
const bookingService = await loadWasmService('booking-service');
```

### API Configuration
```typescript
import { getApiBaseUrl } from '@/lib/utils';

const apiUrl = getApiBaseUrl(); 
// Development: http://localhost:8000
// Production: https://www.alberguedelcarrascalejo.com/reservas/api
```

## Development

### Start Development Server
```bash
# From project root
npm run dev

# Or directly
cd frontend && npm run dev
```

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

## Environment Configuration

### Development
- **Host**: `0.0.0.0:5173`
- **Allowed Hosts**: `.replit.dev`
- **API Base**: `http://localhost:8000`
- **Hot Reload**: Enabled with service exclusions

### Production
- **Host**: `0.0.0.0:4173`
- **Allowed Hosts**: `www.alberguedelcarrascalejo.com`
- **API Base**: `https://www.alberguedelcarrascalejo.com/reservas/api`
- **Build Output**: `../dist/`

## WASM Services Integration

The frontend seamlessly integrates with Rust WASM microservices:

1. **booking-service**: Reservation management
2. **validation-service**: Document OCR and validation
3. **country-service**: Nationality and visa handling
4. **security-service**: Encryption and audit logging
5. **rate-limiter-service**: Request throttling

### Usage Example
```typescript
// Document validation
import { useWasmService } from '@/hooks/useWasmService';

const ValidationComponent = () => {
  const validationService = useWasmService('validation-service');
  
  const validateDocument = async (documentData: ArrayBuffer) => {
    return await validationService.validate_dni(documentData);
  };
};
```

## Performance Optimizations

- **Code Splitting**: WASM services bundled separately
- **Dependency Pre-bundling**: Core React modules optimized
- **Build Exclusions**: Heavy Rust artifacts ignored in watch mode
- **Source Maps**: Available in development mode
- **Manual Chunks**: WASM services split for optimal loading

## Styling System

- **Base**: Tailwind CSS utility classes
- **Components**: shadcn/ui component library
- **Dark Mode**: Class-based theme switching
- **Responsive**: Mobile-first design approach
- **Icons**: Lucide React icon library

## Type Safety

- **Global Types**: API and WASM module definitions
- **Shared Types**: Rust DTOs via wasm-bindgen
- **Strict Mode**: Full TypeScript strict checking
- **Path Mapping**: Type-safe imports across aliases