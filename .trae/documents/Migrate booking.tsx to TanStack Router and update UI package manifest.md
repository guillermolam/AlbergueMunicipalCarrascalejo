# What I Will Change
1) Replace react-router-dom navigation in the UI component `booking.tsx` with TanStack Router’s `useRouter`.
- Update import to `import { useRouter } from "@tanstack/react-router"`.
- Replace `useNavigate()` usages with `const router = useRouter()` and `router.navigate({ to: "/path" })` calls for both the auth redirect and the button handler.

2) Update the UI package manifest to declare TanStack Router.
- Add `@tanstack/react-router` as a peerDependency (so apps control the router version) and as a devDependency to allow local type-check/build.
- Keep existing React 19/TypeScript versions intact.

# Notes
- No other files will be changed in this step; `BookingSuccess.tsx` will remain as-is until you confirm a broader migration.
- This keeps the UI package un-opinionated about app routing while enabling the new technique where used.

# Result
- `booking.tsx` compiles without `react-router-dom` and uses the modern TanStack Router API.
- `frontend/packages/components/ui/package.json` declares proper peer/dev deps for TanStack Router.