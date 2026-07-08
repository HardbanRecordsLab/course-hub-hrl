import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Loader2, Plus, Trash2, Search, ExternalLink, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiDelete } from "@/lib/api";

type Profile = { id: string; name: string | null; email: string };
type CoursePublic = { id: string; title: string; externalUrl: string };
type CourseAccessRow = {
  id: string;
  userId: string;
  courseId: string;
  accessStartsAt: string;
  accessEndsAt: string | null;
  source: string;
  status: string;
};

export default function AccessPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    userId: "",
    courseId: "",
    expiresAt: "",
    source: "admin",
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => apiGet<Profile[]>("/api/users"),
  });

  const { data: courses = [] } = useQuery({
    queryKey: ["courses"],
    queryFn: async () => apiGet<CoursePublic[]>("/api/courses/admin"),
  });

  const { data: accesses = [], isLoading } = useQuery({
    queryKey: ["course-access"],
    queryFn: async () => apiGet<CourseAccessRow[]>("/api/access"),
  });

  const profileById = useMemo(
    () => Object.fromEntries(profiles.map((p) => [p.id, p])),
    [profiles]
  );
  const courseById = useMemo(
    () => Object.fromEntries(courses.map((c) => [c.id, c])),
    [courses]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return accesses;
    return accesses.filter((a) => {
      const p = profileById[a.userId];
      const c = courseById[a.courseId];
      return (
        p?.email?.toLowerCase().includes(q) ||
        p?.name?.toLowerCase().includes(q) ||
        c?.title?.toLowerCase().includes(q)
      );
    });
  }, [accesses, search, profileById, courseById]);

  const grantMutation = useMutation({
    mutationFn: async () => {
      if (!form.userId || !form.courseId) throw new Error("Wybierz użytkownika i kurs");
      await apiPost("/api/access", {
        userId: form.userId,
        courseId: form.courseId,
        expiresAt: form.expiresAt || undefined,
        source: form.source,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["course-access"] });
      toast({ title: "Dostęp nadany" });
      setDialogOpen(false);
      setForm({ userId: "", courseId: "", expiresAt: "", source: "admin" });
    },
    onError: (e: Error) =>
      toast({ title: "Błąd", description: e.message, variant: "destructive" }),
  });

  const revokeMutation = useMutation({
    mutationFn: async (row: CourseAccessRow) => {
      await apiDelete(`/api/access/${row.id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["course-access"] });
      toast({ title: "Dostęp odebrany" });
    },
    onError: (e: Error) =>
      toast({ title: "Błąd", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dostępy</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kto ma dostęp do którego kursu. Nadaj lub odbierz dostęp w jednym miejscu.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Nadaj dostęp
        </Button>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Szukaj po użytkowniku lub kursie…"
          className="pl-9 bg-card"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          Brak aktywnych dostępów.
        </div>
      ) : (
        <div className="rounded-xl bg-card border border-border overflow-hidden">
          <div className="grid grid-cols-12 gap-4 px-5 py-3 text-[11px] uppercase tracking-wider font-mono text-muted-foreground border-b border-border bg-ch-surface-2/40">
            <div className="col-span-4">Użytkownik</div>
            <div className="col-span-4">Kurs</div>
            <div className="col-span-2">Wygasa</div>
            <div className="col-span-1">Źródło</div>
            <div className="col-span-1 text-right">Akcje</div>
          </div>
          {filtered.map((row, i) => {
            const p = profileById[row.userId];
            const c = courseById[row.courseId];
            return (
              <motion.div
                key={row.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                className="grid grid-cols-12 gap-4 px-5 py-3 text-sm items-center border-b border-border last:border-b-0 hover:bg-ch-surface-2/30"
              >
                <div className="col-span-4 min-w-0">
                  <p className="font-medium truncate">
                    {p?.name || p?.email || row.userId.slice(0, 8)}
                  </p>
                  {p?.email && p?.name && (
                    <p className="text-xs text-muted-foreground truncate">{p.email}</p>
                  )}
                </div>
                <div className="col-span-4 min-w-0">
                  <p className="truncate">{c?.title || "—"}</p>
                  {c?.externalUrl && (
                    <a
                      href={c.externalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-mono text-muted-foreground hover:text-primary"
                    >
                      <ExternalLink className="w-3 h-3" /> {c.externalUrl}
                    </a>
                  )}
                </div>
                <div className="col-span-2 text-xs text-muted-foreground flex items-center gap-1.5">
                  {row.accessEndsAt ? (
                    <>
                      <CalendarClock className="w-3.5 h-3.5" />
                      {new Date(row.accessEndsAt).toLocaleDateString("pl-PL")}
                    </>
                  ) : (
                    <span className="text-primary">Bezterminowy</span>
                  )}
                </div>
                <div className="col-span-1">
                  <span className="text-[11px] px-2 py-0.5 rounded font-mono bg-ch-surface-2 text-muted-foreground border border-border">
                    {row.source}
                  </span>
                </div>
                <div className="col-span-1 text-right">
                  <button
                    onClick={() => revokeMutation.mutate(row)}
                    className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    title="Odbierz dostęp"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle>Nadaj dostęp do kursu</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Użytkownik</Label>
              <Select
                value={form.userId}
                onValueChange={(v) => setForm({ ...form, userId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz użytkownika" />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name || p.email || p.id.slice(0, 8)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Kurs</Label>
              <Select
                value={form.courseId}
                onValueChange={(v) => setForm({ ...form, courseId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz kurs" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Wygasa (opcjonalnie)</Label>
              <Input
                type="date"
                value={form.expiresAt}
                onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Puste = dostęp bezterminowy
              </p>
            </div>
            <div>
              <Label>Źródło</Label>
              <Select
                value={form.source}
                onValueChange={(v) => setForm({ ...form, source: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">admin (ręcznie)</SelectItem>
                  <SelectItem value="purchase">purchase (płatność)</SelectItem>
                  <SelectItem value="free">free (kurs darmowy)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Anuluj
            </Button>
            <Button onClick={() => grantMutation.mutate()} disabled={grantMutation.isPending}>
              {grantMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Nadaj dostęp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
