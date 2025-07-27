import { useAuth0 } from "@/hooks/useAuth0";
import { Auth0Login } from "@/components/Auth0Login";
import AdminDashboard from "@/components/AdminDashboard";

export default function AdminPage() {
  const { isAuthenticated, isLoading, user, login, logout } = useAuth0();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sage-50 to-sage-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sage-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sage-50 to-sage-100 flex items-center justify-center p-4">
        <Auth0Login
          onLogin={login}
          onLogout={logout}
          isAuthenticated={isAuthenticated}
          user={user}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sage-50 to-sage-100">
      <div className="container mx-auto py-8 px-4">
        <div className="mb-6">
          <Auth0Login
            onLogin={login}
            onLogout={logout}
            isAuthenticated={isAuthenticated}
            user={user}
          />
        </div>
        <AdminDashboard />
      </div>
    </div>
  );
}
