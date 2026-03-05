import { lazy, Suspense } from "react";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { AdminRoute } from "@/components/AdminRoute";
import Index from "./pages/Index";

// Lazy-loaded routes for code splitting
const CityPage = lazy(() => import("./pages/CityPage"));
const SearchPage = lazy(() => import("./pages/SearchPage"));
const LoungePage = lazy(() => import("./pages/LoungePage"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const ExplorePage = lazy(() => import("./pages/ExplorePage"));
const FavoritesPage = lazy(() => import("./pages/FavoritesPage"));
const AdminPendingPage = lazy(() => import("./pages/AdminPendingPage"));
const GenerateDescriptionsPage = lazy(() => import("./pages/GenerateDescriptionsPage"));
const GenerateFeaturesPage = lazy(() => import("./pages/GenerateFeaturesPage"));
const BootstrapScoresPage = lazy(() => import("./pages/BootstrapScoresPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const PublicProfilePage = lazy(() => import("./pages/PublicProfilePage"));
const SuggestLoungePage = lazy(() => import("./pages/SuggestLoungePage"));
const AdminSuggestionsPage = lazy(() => import("./pages/AdminSuggestionsPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 min — avoid refetching on every mount
      gcTime: 10 * 60 * 1000,
    },
  },
});

const PageLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
  </div>
);

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/city/:slug" element={<CityPage />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/lounge/:slug" element={<LoungePage />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/explore" element={<ExplorePage />} />
                <Route path="/favorites" element={<FavoritesPage />} />
                <Route path="/admin/pending" element={<AdminRoute><AdminPendingPage /></AdminRoute>} />
                <Route path="/admin/generate-descriptions" element={<AdminRoute><GenerateDescriptionsPage /></AdminRoute>} />
                <Route path="/admin/generate-features" element={<AdminRoute><GenerateFeaturesPage /></AdminRoute>} />
                <Route path="/admin/bootstrap-scores" element={<AdminRoute><BootstrapScoresPage /></AdminRoute>} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/user/:userId" element={<PublicProfilePage />} />
                <Route path="/suggest" element={<SuggestLoungePage />} />
                <Route path="/admin/suggestions" element={<AdminRoute><AdminSuggestionsPage /></AdminRoute>} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
