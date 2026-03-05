import { Navigate } from "react-router-dom";
import { useAdminRole } from "@/hooks/useAdminRole";

const PageLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
  </div>
);

export const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { data: isAdmin, isLoading } = useAdminRole();

  if (isLoading) return <PageLoader />;
  if (!isAdmin) return <Navigate to="/" replace />;

  return <>{children}</>;
};
