import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Zap, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import PublicBreadcrumbs from "@/components/PublicBreadcrumbs";
import { apiPost } from "@/lib/api";

export default function VerifyEmailPage() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [error, setError] = useState("");

  const params = new URLSearchParams(window.location.search);
  const token = params.get("token") ?? "";

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setError("Brak tokenu weryfikacji.");
      return;
    }

    apiPost("/api/auth/verify-email", { token })
      .then(() => setStatus("success"))
      .catch((err: any) => {
        setStatus("error");
        setError(err.message || "Nieprawidłowy lub wygasły token.");
      });
  }, []);

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
              <Zap className="w-7 h-7 text-primary-foreground" />
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 shadow-lg text-center py-8 space-y-4">
            {status === "loading" && (
              <>
                <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
                <p className="text-foreground font-medium">Weryfikowanie emaila...</p>
              </>
            )}

            {status === "success" && (
              <>
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
                <p className="text-foreground font-medium">Email zweryfikowany pomyślnie!</p>
                <p className="text-muted-foreground text-sm">Możesz teraz w pełni korzystać z konta.</p>
                <Link to="/">
                  <Button className="mt-4">Przejdź do panelu</Button>
                </Link>
              </>
            )}

            {status === "error" && (
              <>
                <XCircle className="w-12 h-12 text-destructive mx-auto" />
                <p className="text-foreground font-medium">Błąd weryfikacji</p>
                <p className="text-muted-foreground text-sm">{error}</p>
                <Link to="/">
                  <Button className="mt-4" variant="outline">
                    Powrót na stronę główną
                  </Button>
                </Link>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
