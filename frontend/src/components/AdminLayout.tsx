import { NavLink, Outlet, useNavigate, useLocation, Link } from "react-router-dom";
import { Home, LayoutDashboard, BookOpen, Users, KeySquare, Activity, Settings, Zap, Menu, X, GraduationCap, LogOut, Award } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const adminNavItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/courses", icon: BookOpen, label: "Kursy" },
  { to: "/users", icon: Users, label: "Użytkownicy" },
  { to: "/access", icon: KeySquare, label: "Dostępy" },
  { to: "/certificates", icon: Award, label: "Certyfikaty" },
  { to: "/activity", icon: Activity, label: "Aktywność" },
  { to: "/settings", icon: Settings, label: "Ustawienia" },
  { to: "/portal", icon: GraduationCap, label: "Portal ucznia" },
];

const studentNavItems = [
  { to: "/portal", icon: GraduationCap, label: "Moje kursy" },
];

export default function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const navItems = user?.role === "admin" ? adminNavItems : studentNavItems;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col bg-sidebar border-r border-sidebar-border fixed inset-y-0 left-0 z-30">
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-sidebar-accent-foreground tracking-tight">HRL Course Hub</h1>
              <p className="text-[10px] text-sidebar-foreground font-mono uppercase tracking-widest">
                {user?.role === "admin" ? "Manager v1.0" : "Portal ucznia"}
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/" || to === "/portal"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User info + logout */}
        <div className="p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
              {user?.name?.charAt(0) || "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">{user?.name}</p>
              <p className="text-[10px] text-muted-foreground font-mono truncate">{user?.role}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground hover:text-destructive" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Wyloguj się
          </Button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-sidebar border-b border-sidebar-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
            <Zap className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="text-sm font-bold text-foreground">HRL Course Hub</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleLogout} className="text-muted-foreground hover:text-destructive">
            <LogOut className="w-4 h-4" />
          </button>
          <button onClick={() => setMobileOpen(!mobileOpen)} className="text-muted-foreground">
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-y-0 left-0 w-64 bg-sidebar border-r border-sidebar-border z-50 md:hidden pt-16"
          >
            <nav className="p-3 space-y-1">
              {navItems.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === "/" || to === "/portal"}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </NavLink>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
      {mobileOpen && <div className="fixed inset-0 bg-background/60 z-40 md:hidden" onClick={() => setMobileOpen(false)} />}

      {/* Main content */}
      <main className="flex-1 md:ml-64 mt-14 md:mt-0">
        <div className="px-4 md:px-8 pt-4 md:pt-6 max-w-7xl">
          <Breadcrumbs />
        </div>
        <div className="p-4 md:px-8 md:pb-8 md:pt-4 max-w-7xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

// Friendly labels for segments that are not in nav (dynamic routes, actions, ids)
const FALLBACK_LABELS: Record<string, string> = {
  new: "Nowy",
  create: "Tworzenie",
  edit: "Edycja",
  details: "Szczegóły",
  view: "Podgląd",
  settings: "Ustawienia",
  profile: "Profil",
  admin: "Panel",
  portal: "Portal",
  users: "Użytkownicy",
  courses: "Kursy",
  access: "Dostępy",
  activity: "Aktywność",
  dashboard: "Dashboard",
  login: "Logowanie",
  logout: "Wyloguj",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function humanize(segment: string) {
  let s = segment;
  try {
    s = decodeURIComponent(s);
  } catch {}
  const lower = s.toLowerCase();
  if (FALLBACK_LABELS[lower]) return FALLBACK_LABELS[lower];
  if (UUID_RE.test(s)) return `#${s.slice(0, 8)}`;
  if (/^\d+$/.test(s)) return `#${s}`;
  return s.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function Breadcrumbs() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const rootHref = user?.role === "student" ? "/portal" : "/";
  const rootLabel = user?.role === "student" ? "Portal" : "Panel";

  // Single source of truth for known route labels (auto-derived from nav)
  const labelMap = new Map<string, string>(
    [...adminNavItems, ...studentNavItems].map((i) => [i.to, i.label]),
  );

  // Strip query/hash + trailing slash, then split into segments.
  // filter(Boolean) drops empty segments from leading/trailing/double slashes (e.g. "//courses/").
  const cleanPath = pathname.split("?")[0].split("#")[0].replace(/\/+$/, "") || "/";
  const segments = cleanPath.split("/").filter(Boolean);
  const isRoot = cleanPath === rootHref || segments.length === 0;

  // Build cumulative crumbs. ID-like segments (UUID/number) always go through humanize
  // so shortening (#xxxxxxxx / #123) is consistent at every depth, regardless of labelMap hits.
  const rawCrumbs = segments.map((seg, idx) => {
    const href = "/" + segments.slice(0, idx + 1).join("/");
    const isIdLike = UUID_RE.test(seg) || /^\d+$/.test(seg);
    const label = isIdLike ? humanize(seg) : labelMap.get(href) ?? humanize(seg);
    return { href, label };
  });

  const crumbs = rawCrumbs.filter((c, i, arr) => {
    if (i === 0) return true;
    const prev = arr[i - 1];
    return prev.label.toLowerCase() !== c.label.toLowerCase() && prev.href !== c.href;
  });

  // On mobile, collapse middle crumbs behind an ellipsis dropdown when the chain gets long.
  // Always keep the root, the first crumb, and the last crumb visible.
  const COLLAPSE_AT = 3;
  const shouldCollapse = crumbs.length > COLLAPSE_AT;
  const firstCrumb = crumbs[0];
  const middleCrumbs = shouldCollapse ? crumbs.slice(1, -1) : [];
  const visibleCrumbs = shouldCollapse ? [crumbs[crumbs.length - 1]] : crumbs.slice(1);

  const renderCrumbItem = (c: { href: string; label: string }, isLast: boolean) => (
    <BreadcrumbItem key={c.href} className="max-w-[180px] sm:max-w-none truncate">
      {isLast ? (
        <BreadcrumbPage className="truncate">{c.label}</BreadcrumbPage>
      ) : (
        <BreadcrumbLink asChild>
          <Link to={c.href} className="truncate">{c.label}</Link>
        </BreadcrumbLink>
      )}
    </BreadcrumbItem>
  );

  return (
    <Breadcrumb className="mb-4">
      <BreadcrumbList className="text-xs sm:text-sm">
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to={rootHref} className="flex items-center gap-1.5">
              <Home className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{rootLabel}</span>
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {!isRoot && firstCrumb && (
          <>
            <BreadcrumbSeparator />
            {/* On small screens with deep paths, hide the first crumb to save space */}
            <div className={shouldCollapse ? "hidden sm:contents" : "contents"}>
              {renderCrumbItem(firstCrumb, crumbs.length === 1)}
            </div>
          </>
        )}

        {shouldCollapse && middleCrumbs.length > 0 && (
          <>
            <BreadcrumbSeparator className="hidden sm:flex" />
            <BreadcrumbItem>
              <DropdownMenu>
                <DropdownMenuTrigger
                  aria-label="Pokaż ukryte poziomy"
                  className="flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  <BreadcrumbEllipsis className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {middleCrumbs.map((c) => (
                    <DropdownMenuItem key={c.href} asChild>
                      <Link to={c.href}>{c.label}</Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </BreadcrumbItem>
          </>
        )}

        {!isRoot &&
          visibleCrumbs.map((c, i) => {
            const isLast = i === visibleCrumbs.length - 1;
            return (
              <span key={c.href} className="contents">
                <BreadcrumbSeparator />
                {renderCrumbItem(c, isLast)}
              </span>
            );
          })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

