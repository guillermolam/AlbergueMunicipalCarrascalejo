import { Route, Switch } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { TooltipProvider } from "./components/ui/tooltip";
import { I18nProvider } from "./contexts/i18n-context";
import HomePage from "./pages/HomePage";
import InfoCardsPage from "./pages/InfoCardsPage";
import BookingPage from "./pages/BookingPage";
import AdminPage from "./pages/AdminPage";
import { AdminDashboard } from "./pages/AdminDashboard";
import { LoginPage } from "./pages/LoginPage";
import { LogoutPage } from "./pages/LogoutPage";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Toaster } from "./components/ui/toaster";
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <TooltipProvider>
          <div className="min-h-screen bg-background">
            <main>
              <Switch>
                <Route path="/" component={HomePage} />
                <Route path="/info" component={InfoCardsPage} />
                <Route path="/booking" component={BookingPage} />
                <Route path="/login" component={LoginPage} />
                <Route path="/logout" component={LogoutPage} />
                <Route path="/admin">
                  <ProtectedRoute>
                    <AdminDashboard />
                  </ProtectedRoute>
                </Route>
                <Route path="/admin-old" component={AdminPage} />
                <Route>
                  <div className="text-center py-20">
                    <h1 className="text-2xl font-bold mb-4">
                      Página no encontrada
                    </h1>
                    <p className="text-muted-foreground">
                      La página que buscas no existe.
                    </p>
                  </div>
                </Route>
              </Switch>
            </main>
            <Toaster />
          </div>
        </TooltipProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}

export default App;
