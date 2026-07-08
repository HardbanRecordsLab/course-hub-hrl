import { Users, BookOpen, KeySquare, DollarSign, ShieldCheck, Database } from "lucide-react";
import { motion } from "framer-motion";
import StatCard from "@/components/StatCard";
import { integrations } from "@/lib/mockData";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";

const actionLabels: Record<string, string> = {
  granted: "Dostęp przyznany",
  revoked: "Dostęp odebrany",
  opened: "Otwarto kurs",
  link_issued: "Wydano link",
  link_used: "Link użyty",
  link_failed: "Link odrzucony",
  register: "Rejestracja",
  login: "Logowanie",
  certificate_issued: "Certyfikat wystawiony",
};

const actionColors: Record<string, string> = {
  granted: "bg-primary/10 text-primary",
  revoked: "bg-ch-red/10 text-ch-red",
  opened: "bg-ch-blue/10 text-ch-blue",
  link_issued: "bg-ch-purple/10 text-ch-purple",
  link_used: "bg-primary/10 text-primary",
  link_failed: "bg-ch-red/10 text-ch-red",
  register: "bg-ch-green/10 text-ch-green",
  login: "bg-ch-blue/10 text-ch-blue",
  certificate_issued: "bg-ch-amber/10 text-ch-amber",
};

export default function Dashboard() {
  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [users, courses, accesses] = await Promise.all([
        apiGet<{ id: string }[]>("/api/users"),
        apiGet<any[]>("/api/courses/admin"),
        apiGet<any[]>("/api/access"),
      ]);
      const activeCourses = courses.filter((c) => c.status === "PUBLISHED").length;
      const paidCourses = courses.filter((c) => c.priceCents > 0).length;
      return {
        users: users.length,
        activeCourses,
        activeAccesses: accesses.filter((a) => a.status === "ACTIVE").length,
        paidCourses,
      };
    },
  });

  const { data: recentLogs = [] } = useQuery({
    queryKey: ["recent-logs"],
    queryFn: async () => apiGet<any[]>("/api/logs"),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Przegląd platformy HRL Course Hub</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Użytkownicy" value={String(stats?.users ?? 0)} change="" color="green" delay={0} />
        <StatCard icon={BookOpen} label="Aktywne kursy" value={String(stats?.activeCourses ?? 0)} change="" color="blue" delay={0.05} />
        <StatCard icon={KeySquare} label="Aktywne dostępy" value={String(stats?.activeAccesses ?? 0)} change="" color="purple" delay={0.1} />
        <StatCard icon={DollarSign} label="Kursy płatne" value={String(stats?.paidCourses ?? 0)} change="" color="amber" delay={0.15} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="rounded-xl bg-card border border-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">Ostatnie zdarzenia</h3>
          </div>
          <div className="space-y-2">
            {recentLogs.length === 0 && (
              <p className="text-xs text-muted-foreground py-6 text-center">Brak zdarzeń</p>
            )}
            {recentLogs.map((log) => (
              <div key={log.id} className="flex items-center gap-3 text-xs px-3 py-2 rounded-lg bg-ch-surface-2/40 border border-border/50">
                <span className={`px-2 py-0.5 rounded font-mono ${actionColors[log.action] || "bg-muted text-muted-foreground"}`}>
                  {log.action}
                </span>
                <span className="flex-1 text-muted-foreground truncate">
                  {actionLabels[log.action] || log.action}
                </span>
                <span className="text-muted-foreground font-mono flex-shrink-0">
                  {new Date(log.createdAt).toLocaleString("pl-PL", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="rounded-xl bg-card border border-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <Database className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">Integracje</h3>
            <span className="ml-auto text-[11px] text-muted-foreground font-mono">
              {integrations.filter((i) => i.enabled).length}/{integrations.length} aktywnych
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {integrations.slice(0, 8).map((i) => (
              <div key={i.name} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs ${i.enabled ? "bg-ch-surface-2 border-border" : "bg-muted/30 border-transparent"}`}>
                <span className="text-sm">{i.icon}</span>
                <span className={i.enabled ? "text-foreground" : "text-muted-foreground"}>{i.name}</span>
                {i.enabled && <span className="w-1.5 h-1.5 rounded-full bg-primary ml-auto pulse-dot" />}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
