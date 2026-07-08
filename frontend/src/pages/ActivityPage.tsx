import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Download, Search, X, Filter, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";

type LogRow = {
  id: string;
  action: string;
  userId: string | null;
  courseId: string | null;
  createdAt: string;
  meta: unknown;
};

type Profile = { id: string; name: string | null; email: string };
type Course = { id: string; title: string };

const actionLabels: Record<string, string> = {
  granted: "Dostęp przyznany",
  revoked: "Dostęp odebrany",
  opened: "Otwarto kurs",
  link_issued: "Wydano link",
  link_used: "Link użyty",
  link_failed: "Link odrzucony",
};

const actionColors: Record<string, string> = {
  granted: "bg-primary/10 text-primary",
  revoked: "bg-ch-red/10 text-ch-red",
  opened: "bg-ch-blue/10 text-ch-blue",
  link_issued: "bg-ch-purple/10 text-ch-purple",
  link_used: "bg-primary/10 text-primary",
  link_failed: "bg-ch-red/10 text-ch-red",
};

export default function ActivityPage() {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const { toast } = useToast();

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["access-logs"],
    queryFn: async () => apiGet<LogRow[]>("/api/logs"),
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles-min"],
    queryFn: async () => apiGet<Profile[]>("/api/users"),
  });

  const { data: courses = [] } = useQuery({
    queryKey: ["courses-min"],
    queryFn: async () => apiGet<Course[]>("/api/courses/admin"),
  });

  const profileById = useMemo(
    () => Object.fromEntries(profiles.map((p) => [p.id, p])),
    [profiles]
  );
  const courseById = useMemo(
    () => Object.fromEntries(courses.map((c) => [c.id, c])),
    [courses]
  );

  const actionTypes = useMemo(
    () => ["all", ...Array.from(new Set(logs.map((l) => l.action)))],
    [logs]
  );

  const enriched = useMemo(
    () =>
      logs.map((l) => ({
        ...l,
        userName:
          (l.userId && (profileById[l.userId]?.name || profileById[l.userId]?.email)) ||
          (l.userId ? l.userId.slice(0, 8) : "system"),
        courseName: (l.courseId && courseById[l.courseId]?.title) || "—",
      })),
    [logs, profileById, courseById]
  );

  const filtered = useMemo(
    () =>
      enriched.filter((a) => {
        const q = search.toLowerCase();
        const matchSearch =
          !q ||
          a.userName.toLowerCase().includes(q) ||
          a.courseName.toLowerCase().includes(q) ||
          a.action.toLowerCase().includes(q);
        const matchAction = actionFilter === "all" || a.action === actionFilter;
        return matchSearch && matchAction;
      }),
    [enriched, search, actionFilter]
  );

  const exportCSV = () => {
    const headers = ["ID", "Akcja", "Użytkownik", "Kurs", "Czas"];
    const rows = filtered.map((a) => [a.id, a.action, a.userName, a.courseName, a.createdAt]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((v) => `"${v}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `activity-log-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast({ title: "Wyeksportowano", description: `${filtered.length} wpisów zapisano jako CSV` });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Aktywność</h1>
          <p className="text-sm text-muted-foreground mt-1">Log zdarzeń dostępów do kursów</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={exportCSV}>
          <Download className="w-4 h-4" /> Eksport CSV
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtruj po akcji, użytkowniku..."
            className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-card border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowFilters(!showFilters)}>
          <Filter className="w-4 h-4" /> Filtry
        </Button>
      </div>

      {showFilters && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="flex flex-wrap gap-1.5">
          {actionTypes.map((type) => (
            <button
              key={type}
              onClick={() => setActionFilter(type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                actionFilter === type
                  ? type === "all"
                    ? "bg-primary/10 text-primary"
                    : actionColors[type] || "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-ch-surface-2"
              }`}
            >
              {type === "all" ? "Wszystkie" : actionLabels[type] || type}
            </button>
          ))}
        </motion.div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
          {filtered.map((a, i) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(i * 0.02, 0.3) }}
              className="flex items-center gap-4 px-5 py-3.5 rounded-xl bg-card border border-border hover:border-primary/20 transition-colors"
            >
              <span className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-medium ${actionColors[a.action] || "bg-muted text-muted-foreground"}`}>
                {a.action}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm">
                  <span className="font-medium">{a.userName}</span>
                  <span className="text-muted-foreground"> — {actionLabels[a.action] || a.action}</span>
                </p>
                <p className="text-xs text-muted-foreground truncate">{a.courseName}</p>
              </div>
              <span className="text-xs text-muted-foreground font-mono flex-shrink-0">
                {new Date(a.createdAt).toLocaleString("pl-PL")}
              </span>
            </motion.div>
          ))}
          {filtered.length === 0 && (
            <div className="py-12 text-center text-muted-foreground text-sm">Brak pasujących wyników</div>
          )}
        </motion.div>
      )}

      <p className="text-xs text-muted-foreground text-right">{filtered.length} z {logs.length} zdarzeń</p>
    </div>
  );
}
