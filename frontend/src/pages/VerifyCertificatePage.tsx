import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Award, Search, Loader2, ShieldCheck, XCircle } from "lucide-react";
import { apiGet } from "@/lib/api";
import PublicBreadcrumbs from "@/components/PublicBreadcrumbs";

type VerifyResult = {
  isValid: boolean;
  studentName?: string;
  courseTitle?: string;
  issuedAt?: string;
  message?: string;
};

export default function VerifyCertificatePage() {
  const { code } = useParams<{ code: string }>();
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [inputCode, setInputCode] = useState(code || "");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (code) {
      verify(code);
    }
  }, [code]);

  const verify = async (verificationCode: string) => {
    setLoading(true);
    try {
      const data = await apiGet<VerifyResult>(`/api/certificates/verify/${verificationCode}`);
      setResult(data);
    } catch (e: any) {
      setResult({ isValid: false, message: e.message || "Nie znaleziono certyfikatu" });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputCode.trim()) {
      verify(inputCode.trim());
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="px-4 md:px-8 pt-4 md:pt-6 max-w-7xl">
        <PublicBreadcrumbs />
      </div>
      <div className="flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4">
            <Award className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground font-['Space_Grotesk']">HRL Course Hub</h1>
          <p className="text-muted-foreground text-sm mt-1">Weryfikacja certyfikatu ukończenia</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Kod weryfikacyjny</Label>
              <Input
                id="code"
                type="text"
                placeholder="Wklej kod z certyfikatu..."
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                required
                className="bg-muted border-border font-mono"
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
              Zweryfikuj certyfikat
            </Button>
          </form>

          {result && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mt-6 p-5 rounded-xl border ${
                result.isValid
                  ? "bg-primary/5 border-primary/20"
                  : "bg-destructive/5 border-destructive/20"
              }`}
            >
              {result.isValid ? (
                <div className="flex items-start gap-3">
                  <ShieldCheck className="w-6 h-6 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-primary">Certyfikat jest ważny</p>
                    <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                      <p><span className="font-medium text-foreground">Student:</span> {result.studentName}</p>
                      <p><span className="font-medium text-foreground">Kurs:</span> {result.courseTitle}</p>
                      <p><span className="font-medium text-foreground">Data:</span> {result.issuedAt ? new Date(result.issuedAt).toLocaleDateString("pl-PL") : "—"}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <XCircle className="w-6 h-6 text-destructive mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-destructive">Certyfikat nie znaleziony</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {result.message || "Sprawdź czy kod jest poprawny i spróbuj ponownie."}
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </motion.div>
      </div>
    </div>
  );
}
