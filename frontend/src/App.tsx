import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Login } from "./pages/Login";
import { Campaigns } from "./pages/Campaigns";
import { CampaignNew } from "./pages/CampaignNew";
import { CampaignDetail } from "./pages/CampaignDetail";

const queryClient = new QueryClient();

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/campaigns" element={<Campaigns />} />
            <Route path="/campaigns/new" element={<CampaignNew />} />
            <Route path="/campaigns/:id" element={<CampaignDetail />} />
          </Route>
          <Route path="*" element={<Navigate to="/campaigns" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
