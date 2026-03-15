import { lazy, Suspense, type ReactNode } from "react";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { AdminRoute } from "@/components/AdminRoute";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import BottomTabBar from "@/components/BottomTabBar";
import {
  HomeSkeleton, CityPageSkeleton, LoungePageSkeleton, SearchPageSkeleton,
  ForYouSkeleton, AuthSkeleton, ProfileSkeleton, AdminSkeleton, GenericSkeleton,
} from "@/components/PageSkeletons";
import Index from "./pages/Index";

// Lazy-loaded routes
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
const ForYouPage = lazy(() => import("./pages/ForYouPage"));
const LeaderboardPage = lazy(() => import("./pages/LeaderboardPage"));
const VisitedPage = lazy(() => import("./pages/VisitedPage"));
const GuidePage = lazy(() => import("./pages/GuidePage"));
const GuidesIndexPage = lazy(() => import("./pages/GuidesIndexPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    },
  },
});

/** Wrap a lazy route with an error boundary and a page-specific skeleton */
const LazyRoute = ({ children, skeleton, errorTitle }: { children: ReactNode; skeleton: ReactNode; errorTitle?: string }) => (
  <RouteErrorBoundary fallbackTitle={errorTitle}>
    <Suspense fallback={skeleton}>
      {children}
    </Suspense>
  </RouteErrorBoundary>
);

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/city/:slug" element={<LazyRoute skeleton={<CityPageSkeleton />}><CityPage /></LazyRoute>} />
              <Route path="/search" element={<LazyRoute skeleton={<SearchPageSkeleton />}><SearchPage /></LazyRoute>} />
              <Route path="/lounge/:slug" element={<LazyRoute skeleton={<LoungePageSkeleton />}><LoungePage /></LazyRoute>} />
              <Route path="/auth" element={<LazyRoute skeleton={<AuthSkeleton />}><AuthPage /></LazyRoute>} />
              <Route path="/reset-password" element={<LazyRoute skeleton={<AuthSkeleton />}><ResetPasswordPage /></LazyRoute>} />
              <Route path="/explore" element={<LazyRoute skeleton={<CityPageSkeleton />}><ExplorePage /></LazyRoute>} />
              <Route path="/for-you" element={<LazyRoute skeleton={<ForYouSkeleton />}><ForYouPage /></LazyRoute>} />
              <Route path="/leaderboard" element={<LazyRoute skeleton={<GenericSkeleton />}><LeaderboardPage /></LazyRoute>} />
              <Route path="/favorites" element={<LazyRoute skeleton={<ProfileSkeleton />}><FavoritesPage /></LazyRoute>} />
              <Route path="/visited" element={<LazyRoute skeleton={<GenericSkeleton />}><VisitedPage /></LazyRoute>} />
              <Route path="/profile" element={<LazyRoute skeleton={<ProfileSkeleton />}><ProfilePage /></LazyRoute>} />
              <Route path="/user/:userId" element={<LazyRoute skeleton={<ProfileSkeleton />}><PublicProfilePage /></LazyRoute>} />
              <Route path="/suggest" element={<LazyRoute skeleton={<GenericSkeleton />}><SuggestLoungePage /></LazyRoute>} />
              <Route path="/admin/pending" element={<LazyRoute skeleton={<AdminSkeleton />}><AdminRoute><AdminPendingPage /></AdminRoute></LazyRoute>} />
              <Route path="/admin/generate-descriptions" element={<LazyRoute skeleton={<AdminSkeleton />}><AdminRoute><GenerateDescriptionsPage /></AdminRoute></LazyRoute>} />
              <Route path="/admin/generate-features" element={<LazyRoute skeleton={<AdminSkeleton />}><AdminRoute><GenerateFeaturesPage /></AdminRoute></LazyRoute>} />
              <Route path="/admin/bootstrap-scores" element={<LazyRoute skeleton={<AdminSkeleton />}><AdminRoute><BootstrapScoresPage /></AdminRoute></LazyRoute>} />
              <Route path="/admin/suggestions" element={<LazyRoute skeleton={<AdminSkeleton />}><AdminRoute><AdminSuggestionsPage /></AdminRoute></LazyRoute>} />
              <Route path="*" element={<LazyRoute skeleton={<GenericSkeleton />}><NotFound /></LazyRoute>} />
            </Routes>
            <BottomTabBar />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
