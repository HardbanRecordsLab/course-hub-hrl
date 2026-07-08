import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Search, X, Loader2, ShieldCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";

type User = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
};

type AccessRow = { userId: string };

export default function UsersPage() {
  const [search, setSearch] = useState("");

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users-list"],
    queryFn: async () => apiGet<User[]>("/api/users"),
  });

  const { data: accesses = [] } = useQuery({
    queryKey: ["all-active-access"],
    queryFn: async () => apiGet<AccessRow[]>("/api/access"),
  });

  const accessCount = useMemo(() => {
    const map: Record<string, number> = {};
    accesses.forEach((a) => {
      map[a.userId] = (map[a.userId] || 0) + 1;
    });
    return map;
  }, [accesses]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.email?.toLowerCase().includes(q) ||
        u.name?.toLowerCase().includes(q)
    );
  }, [users, search]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Użytkownicy</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Zarejestrowani uczniowie i administratorzy.
        </p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Szukaj po emailu lub imieniu..."
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

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-xl bg-card border border-border overflow-hidden"
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Użytkownik</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Rola</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Aktywne kursy</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Rejestracja</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const isAdmin = u.role === "ADMIN";
                return (
                  <tr key={u.id} className="border-b border-border/50 hover:bg-ch-surface-2 transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-medium">{u.name || "—"}</p>
                      <p className="text-xs text-muted-foreground font-mono">{u.email || u.id.slice(0, 8)}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium border ${
                          isAdmin
                            ? "bg-ch-purple/10 text-ch-purple border-ch-purple/20"
                            : "bg-ch-surface-2 text-muted-foreground border-border"
                        }`}
                      >
                        {isAdmin && <ShieldCheck className="w-3 h-3" />}
                        {u.role.toLowerCase()}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-mono text-muted-foreground">{accessCount[u.id] || 0}</td>
                    <td className="px-5 py-4 text-xs text-muted-foreground font-mono">
                      {new Date(u.createdAt).toLocaleDateString("pl-PL")}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-12 text-center text-muted-foreground">
                    Brak wyników
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </motion.div>
      )}

      <p className="text-xs text-muted-foreground text-right">{filtered.length} użytkowników</p>
    </div>
  );
}
