import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Link,
  Outlet,
} from "react-router-dom";
import { Toaster } from "sonner";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { useAuthStore } from "./stores/auth";
import { Login } from "./pages/Login";
import { Campaigns } from "./pages/Campaigns";
import { CampaignNew } from "./pages/CampaignNew";
import { CampaignDetail } from "./pages/CampaignDetail";

const queryClient = new QueryClient();

function Layout() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <Link to="/campaigns" className="text-lg font-bold text-gray-900">
            AI-FS
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">{user?.email}</span>
            <button
              onClick={() => {
                logout();
                queryClient.clear();
              }}
              className="text-sm text-red-600 hover:text-red-700"
            >
              Logout
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster position="top-right" richColors />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/campaigns" element={<Campaigns />} />
              <Route path="/campaigns/new" element={<CampaignNew />} />
              <Route path="/campaigns/:id" element={<CampaignDetail />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/campaigns" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
