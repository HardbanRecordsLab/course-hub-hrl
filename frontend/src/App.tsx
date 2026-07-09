import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminLayout from "./components/AdminLayout";
import LandingPage from "./pages/LandingPage";
import Dashboard from "./pages/Dashboard";
import Courses from "./pages/Courses";
import UsersPage from "./pages/UsersPage";
import AccessPage from "./pages/AccessPage";
import ActivityPage from "./pages/ActivityPage";
import SettingsPage from "./pages/SettingsPage";
import StudentPortal from "./pages/StudentPortal";
import CertificatesPage from "./pages/CertificatesPage";
import CourseViewer from "./pages/CourseViewer";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import VerifyCertificatePage from "./pages/VerifyCertificatePage";
import CheckoutSuccessPage from "./pages/CheckoutSuccessPage";
import CheckoutCancelPage from "./pages/CheckoutCancelPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function RedirectByRole() {
  const { user } = useAuth();
  return <Navigate to={user?.role === "student" ? "/portal" : "/dashboard"} replace />;
}

function AppRoutes() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={isAuthenticated ? <RedirectByRole /> : <LoginPage />} />
      <Route path="/register" element={isAuthenticated ? <Navigate to="/portal" replace /> : <RegisterPage />} />
      
      <Route element={isAuthenticated ? <AdminLayout /> : <Navigate to="/login" replace />}>
        <Route path="/dashboard" element={<ProtectedRoute allowedRoles={["admin"]}><Dashboard /></ProtectedRoute>} />
        <Route path="/courses" element={<ProtectedRoute allowedRoles={["admin"]}><Courses /></ProtectedRoute>} />
        <Route path="/users" element={<ProtectedRoute allowedRoles={["admin"]}><UsersPage /></ProtectedRoute>} />
        <Route path="/access" element={<ProtectedRoute allowedRoles={["admin"]}><AccessPage /></ProtectedRoute>} />
        <Route path="/certificates" element={<ProtectedRoute allowedRoles={["admin"]}><CertificatesPage /></ProtectedRoute>} />
        <Route path="/activity" element={<ProtectedRoute allowedRoles={["admin"]}><ActivityPage /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute allowedRoles={["admin"]}><SettingsPage /></ProtectedRoute>} />
        <Route path="/portal" element={<ProtectedRoute allowedRoles={["admin", "student"]}><StudentPortal /></ProtectedRoute>} />
        <Route path="/course/:id" element={<ProtectedRoute allowedRoles={["admin", "student"]}><CourseViewer /></ProtectedRoute>} />
      </Route>
      <Route path="/verify/:code" element={<VerifyCertificatePage />} />
      <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
      <Route path="/checkout/cancel" element={<CheckoutCancelPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;