import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import PublicBreadcrumbs from "@/components/PublicBreadcrumbs";
import { Home } from "lucide-react";
import { Link } from "react-router-dom";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background">
      <div className="px-4 md:px-8 pt-4 md:pt-6 max-w-7xl">
        <PublicBreadcrumbs label="Strona nie znaleziona" />
      </div>
      <div className="flex min-h-[calc(100vh-120px)] items-center justify-center p-4">
        <div className="text-center">
          <h1 className="mb-4 text-4xl font-bold">404</h1>
          <p className="mb-4 text-xl text-muted-foreground">Strona nie została znaleziona</p>
          <Link to="/" className="text-primary underline hover:text-primary/90 flex items-center justify-center gap-2">
            <Home className="w-4 h-4" />
            Powrót do panelu
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
