import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Award, Search, Download, Loader2, Eye, XCircle } from "lucide-react";
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
import { apiGet, apiPost, apiPatch } from "@/lib/api";

type Certificate = {
  id: string;
  verificationCode: string;
  studentDisplayName: string;
  courseTitleSnapshot: string;
  issuedAt: string;
  revokedAt: string | null;
  user: { id: string; email: string; name: string | null };
  course: { id: string; title: string };
};

type AccessRow = {
  id: string;
  userId: string;
  courseId: string;
  status: string;
  course: { id: string; title: string; certificateEnabled: boolean; certificateIssueMode: string };
};

export default function CertificatesPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [selectedAccess, setSelectedAccess] = useState<AccessRow | null>(null);

  const { data: certificates = [], isLoading } = useQuery({
    queryKey: ["certificates"],
    queryFn: async () => apiGet<Certificate[]>("/api/certificates"),
  });

  const { data: accesses = [] } = useQuery({
    queryKey: ["access-for-certs"],
    queryFn: async () => apiGet<AccessRow[]>("/api/access"),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return certificates;
    return certificates.filter((c) =>
      c.studentDisplayName.toLowerCase().includes(q) ||
      c.courseTitleSnapshot.toLowerCase().includes(q) ||
      c.verificationCode.toLowerCase().includes(q)
    );
  }, [certificates, search]);

  const completable = useMemo(
    () =>
      accesses.filter(
        (a) =>
          a.status === "ACTIVE" &&
          a.course.certificateEnabled &&
          a.course.certificateIssueMode === "manual"
      ),
    [accesses]
  );

  const completeMutation = useMutation({
    mutationFn: async (accessId: string) => {
      await apiPatch(`/api/access/${accessId}/complete`, {});
    },
    onSuccess: () => {
      qc.invalidateQueries();
      toast({ title: "Ukończenie oznaczone, certyfikat wystawiony" });
      setCompleteDialogOpen(false);
      setSelectedAccess(null);
    },
    onError: (e: Error) =>
      toast({ title: "Błąd", description: e.message, variant: "destructive" }),
  });

  const revokeMutation = useMutation({
    mutationFn: async (certId: string) => {
      await apiPatch(`/api/certificates/${certId}/revoke`, {});
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["certificates"] });
      toast({ title: "Certyfikat unieważniony" });
    },
    onError: (e: Error) =>
      toast({ title: "Błąd", description: e.message, variant: "destructive" }),
  });

  const downloadCertificate = async (cert: Certificate) => {
    try {
      const { generateCertificatePDF } = await import("@/utils/CertificateGenerator");
      await generateCertificatePDF({
        studentName: cert.studentDisplayName,
        courseTitle: cert.courseTitleSnapshot,
        verificationCode: cert.verificationCode,
        issuedAt: cert.issuedAt,
      });
      toast({ title: "PDF pobrany", description: cert.courseTitleSnapshot });
    } catch (e) {
      toast({ title: "Błąd generowania PDF", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Certyfikaty</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Wystawione certyfikaty ukończenia kursów.
          </p>
        </div>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Szukaj po studencie, kursie lub kodzie..."
          className="pl-9 bg-card"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          Brak certyfikatów.
        </div>
      ) : (
        <div className="rounded-xl bg-card border border-border overflow-hidden">
          <div className="grid grid-cols-12 gap-4 px-5 py-3 text-[11px] uppercase tracking-wider font-mono text-muted-foreground border-b border-border bg-ch-surface-2/40">
            <div className="col-span-3">Student</div>
            <div className="col-span-3">Kurs</div>
            <div className="col-span-2">Kod weryfikacji</div>
            <div className="col-span-2">Data wystawienia</div>
            <div className="col-span-2 text-right">Akcje</div>
          </div>
          {filtered.map((cert, i) => (
            <motion.div
              key={cert.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className="grid grid-cols-12 gap-4 px-5 py-3 text-sm items-center border-b border-border last:border-b-0 hover:bg-ch-surface-2/30"
            >
              <div className="col-span-3 min-w-0">
                <p className="font-medium truncate">{cert.studentDisplayName}</p>
                <p className="text-xs text-muted-foreground truncate">{cert.user.email}</p>
              </div>
              <div className="col-span-3 min-w-0">
                <p className="truncate">{cert.courseTitleSnapshot}</p>
              </div>
              <div className="col-span-2 text-xs font-mono text-muted-foreground">
                {cert.verificationCode.slice(0, 12)}...
              </div>
              <div className="col-span-2 text-xs text-muted-foreground">
                {new Date(cert.issuedAt).toLocaleDateString("pl-PL")}
                {cert.revokedAt && (
                  <span className="block text-destructive text-[10px] mt-0.5">
                    Unieważniony: {new Date(cert.revokedAt).toLocaleDateString("pl-PL")}
                  </span>
                )}
              </div>
              <div className="col-span-2 text-right flex justify-end gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1"
                  onClick={() => downloadCertificate(cert)}
                >
                  <Download className="w-3.5 h-3.5" /> PDF
                </Button>
                {!cert.revokedAt && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1 text-destructive hover:text-destructive"
                    onClick={() => {
                      if (window.confirm(`Czy na pewno chcesz unieważnić certyfikat dla "${cert.studentDisplayName}"?`)) {
                        revokeMutation.mutate(cert.id);
                      }
                    }}
                    disabled={revokeMutation.isPending}
                  >
                    <XCircle className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {completable.length > 0 && (
        <div className="rounded-xl bg-card border border-border p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">Oznacz ukończenie (ręcznie)</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Kursy z trybem certyfikatu „ręczny” — po oznaczeniu ukończenia certyfikat zostanie wystawiony automatycznie.
          </p>
          <div className="space-y-2">
            {completable.map((a) => (
              <div key={a.id} className="flex items-center justify-between px-4 py-3 rounded-lg bg-ch-surface-2/40 border border-border">
                <div>
                  <p className="text-sm font-medium">{a.course.title}</p>
                  <p className="text-xs text-muted-foreground">{a.user.email}</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    setSelectedAccess(a);
                    setCompleteDialogOpen(true);
                  }}
                >
                  Oznacz jako ukończony
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <DialogContent className="max-w-sm bg-card border-border">
          <DialogHeader>
            <DialogTitle>Oznaczyć jako ukończony?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Dla <span className="font-medium text-foreground">{selectedAccess?.course.title}</span> — certyfikat zostanie wystawiony automatycznie.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteDialogOpen(false)}>
              Anuluj
            </Button>
            <Button
              onClick={() => selectedAccess && completeMutation.mutate(selectedAccess.id)}
              disabled={completeMutation.isPending}
            >
              {completeMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Oznacz ukończenie
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
