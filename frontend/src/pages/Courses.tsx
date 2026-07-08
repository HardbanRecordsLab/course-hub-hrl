import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, ExternalLink, Pencil, Trash2, Users, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";

type Course = {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  externalUrl: string;
  priceCents: number;
  currency: string;
  status: string;
  certificateEnabled: boolean;
  certificateIssueMode: string;
  createdAt: string;
};

type CourseForm = {
  title: string;
  description: string;
  imageUrl: string;
  externalUrl: string;
  priceCents: number;
  currency: string;
  status: string;
  certificateEnabled: boolean;
  certificateIssueMode: string;
};

const emptyForm: CourseForm = {
  title: "",
  description: "",
  imageUrl: "",
  externalUrl: "",
  priceCents: 0,
  currency: "PLN",
  status: "DRAFT",
  certificateEnabled: false,
  certificateIssueMode: "manual",
};

function formatPrice(cents: number, currency: string) {
  if (cents === 0) return "Darmowy";
  return `${(cents / 100).toFixed(2)} ${currency}`;
}

export default function Courses() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteCourse, setDeleteCourse] = useState<Course | null>(null);
  const [editing, setEditing] = useState<Course | null>(null);
  const [form, setForm] = useState<CourseForm>(emptyForm);

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ["courses-admin"],
    queryFn: async () => apiGet<Course[]>("/api/courses/admin"),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editing) {
        await apiPatch(`/api/courses/${editing.id}`, form);
      } else {
        await apiPost("/api/courses", form);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["courses-admin"] });
      toast({ title: editing ? "Zaktualizowano" : "Dodano kurs" });
      setDialogOpen(false);
      setEditing(null);
      setForm(emptyForm);
    },
    onError: (e: Error) =>
      toast({ title: "Błąd", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiDelete(`/api/courses/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["courses-admin"] });
      toast({ title: "Usunięto kurs" });
      setDeleteCourse(null);
    },
    onError: (e: Error) =>
      toast({ title: "Błąd", description: e.message, variant: "destructive" }),
  });

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (c: Course) => {
    setEditing(c);
    setForm({
      title: c.title,
      description: c.description || "",
      imageUrl: c.imageUrl || "",
      externalUrl: c.externalUrl,
      priceCents: c.priceCents,
      currency: c.currency,
      status: c.status,
      certificateEnabled: c.certificateEnabled,
      certificateIssueMode: c.certificateIssueMode,
    });
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Kursy</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Rejestr kursów zewnętrznych — zarządzaj wpisami, dostęp nadasz w zakładce „Dostępy”.
          </p>
        </div>
        <Button onClick={openAdd} className="gap-2">
          <Plus className="w-4 h-4" /> Dodaj kurs
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : courses.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          Brak kursów. Dodaj pierwszy kurs, podając jego zewnętrzny URL i cenę.
        </div>
      ) : (
        <div className="grid gap-4">
          {courses.map((course, i) => (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-xl bg-card border border-border p-5 hover:border-primary/30 transition-colors group"
            >
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-base font-semibold truncate">{course.title}</h3>
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded font-medium ${
                        course.status === "PUBLISHED"
                          ? "bg-primary/10 text-primary border border-primary/20"
                          : "bg-muted/30 text-muted-foreground border border-border"
                      }`}
                    >
                      {course.status === "PUBLISHED" ? "Opublikowany" : "Szkic"}
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded font-medium bg-ch-surface-2 text-foreground border border-border">
                      {formatPrice(course.priceCents, course.currency)}
                    </span>
                    {course.certificateEnabled && (
                      <span className="text-[11px] px-2 py-0.5 rounded font-medium bg-ch-purple/10 text-ch-purple border border-ch-purple/20">
                        Certyfikat
                      </span>
                    )}
                  </div>
                  {course.description && (
                    <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                      {course.description}
                    </p>
                  )}
                  <a
                    href={course.externalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-primary transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    {course.externalUrl}
                  </a>
                </div>

                <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEdit(course)}
                    className="p-2 rounded-lg hover:bg-ch-surface-2 text-muted-foreground hover:text-foreground transition-colors"
                    title="Edytuj"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteCourse(course)}
                    className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    title="Usuń"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg bg-card border-border">
          <DialogHeader>
            <DialogTitle>{editing ? "Edytuj kurs" : "Dodaj nowy kurs"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Tytuł</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Nazwa kursu"
              />
            </div>
            <div>
              <Label>URL kursu</Label>
              <Input
                value={form.externalUrl}
                onChange={(e) => setForm({ ...form, externalUrl: e.target.value })}
                placeholder="https://kurs.example.com"
                className="font-mono"
              />
            </div>
            <div>
              <Label>Opis</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                placeholder="Krótki opis kursu (opcjonalnie)"
              />
            </div>
            <div>
              <Label>Miniaturka (URL obrazu)</Label>
              <Input
                value={form.imageUrl}
                onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                placeholder="https://..."
                className="font-mono"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Cena (w groszach)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.priceCents}
                  onChange={(e) =>
                    setForm({ ...form, priceCents: Number(e.target.value) || 0 })
                  }
                  className="font-mono"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  0 = darmowy. {form.priceCents > 0 && `Wyświetli się jako ${(form.priceCents / 100).toFixed(2)} ${form.currency}`}
                </p>
              </div>
              <div>
                <Label>Waluta</Label>
                <Input
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
                  maxLength={3}
                  className="font-mono uppercase"
                />
              </div>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">Szkic</SelectItem>
                  <SelectItem value="PUBLISHED">Opublikowany</SelectItem>
                  <SelectItem value="ARCHIVED">Zarchiwizowany</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium">Certyfikaty</p>
                <p className="text-[11px] text-muted-foreground">
                  Włącz wystawianie certyfikatów ukończenia dla tego kursu
                </p>
              </div>
              <Switch
                checked={form.certificateEnabled}
                onCheckedChange={(v) => setForm({ ...form, certificateEnabled: v })}
              />
            </div>
            {form.certificateEnabled && (
              <div>
                <Label>Tryb wystawiania certyfikatów</Label>
                <Select value={form.certificateIssueMode} onValueChange={(v) => setForm({ ...form, certificateIssueMode: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Ręcznie (po oznaczeniu ukończenia)</SelectItem>
                    <SelectItem value="on_purchase">Automatycznie po zakupie</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Anuluj
            </Button>
            <Button
              onClick={() => {
                if (!form.title || !form.externalUrl) {
                  toast({
                    title: "Brak danych",
                    description: "Tytuł i URL kursu są wymagane",
                    variant: "destructive",
                  });
                  return;
                }
                saveMutation.mutate();
              }}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editing ? "Zapisz zmiany" : "Dodaj kurs"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteCourse} onOpenChange={() => setDeleteCourse(null)}>
        <DialogContent className="max-w-sm bg-card border-border">
          <DialogHeader>
            <DialogTitle>Usunąć kurs?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Wszystkie dostępy do <span className="font-medium text-foreground">„{deleteCourse?.title}”</span> zostaną usunięte. Tej operacji nie można cofnąć.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteCourse(null)}>
              Anuluj
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteCourse && deleteMutation.mutate(deleteCourse.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Usuń
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
