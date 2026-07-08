import { Home } from "lucide-react";
import { Link } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";

const LABELS: Record<string, string> = {
  login: "Logowanie",
  register: "Rejestracja",
  verify: "Weryfikacja certyfikatu",
};

export default function PublicBreadcrumbs({ label }: { label?: string }) {
  const { pathname } = useLocation();
  const seg = pathname.split("/").filter(Boolean).pop() || "strona";
  const pageLabel = label || LABELS[seg] || seg.replace(/[-_]+/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to="/" className="flex items-center gap-1.5">
              <Home className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Panel</span>
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>{pageLabel}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
