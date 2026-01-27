import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Navbar } from "@/components/Navbar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { HomePage } from "./pages/HomePage";
import { TimelinePage } from "./pages/TimelinePage";
import { EntryDetailPage } from "./pages/EntryDetailPage";
import { LoginPage } from "./pages/LoginPage";
import NewEntryPage from "./pages/NewEntryPage";
import EditEntryPage from "./pages/EditEntryPage";
import NotFound from "./pages/NotFound";
import { SuuntoLandingPage } from "./pages/suunto/SuuntoLandingPage";
import { SuuntoViewerPage } from "./pages/suunto/SuuntoViewerPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10,   // 10 minutes (formerly cacheTime)
      retry: 1,
    },
  },
});

/** Main app layout with Navbar */
function MainLayout() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/admin" element={<LoginPage />} />
        <Route path="/entry/new" element={
          <ProtectedRoute>
            <NewEntryPage />
          </ProtectedRoute>
        } />
        {/* Keep old route for backwards compatibility */}
        <Route path="/entries/new" element={
          <ProtectedRoute>
            <NewEntryPage />
          </ProtectedRoute>
        } />
        <Route path="/timeline" element={<TimelinePage />} />
        <Route path="/entry/:id" element={<EntryDetailPage />} />
        <Route path="/entry/:id/edit" element={
          <ProtectedRoute>
            <EditEntryPage />
          </ProtectedRoute>
        } />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}

const App = () => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                {/* Suunto sub-project routes (no navbar, self-contained) */}
                <Route path="/suunto" element={<SuuntoLandingPage />} />
                <Route path="/suunto/view/:shareId" element={<SuuntoViewerPage />} />
                <Route path="/suunto/demo" element={<SuuntoViewerPage />} />

                {/* Main app routes with Navbar */}
                <Route path="/*" element={<MainLayout />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
