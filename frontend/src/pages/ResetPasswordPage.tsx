import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Zap, KeyRound, Eye, EyeOff, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import PublicBreadcrumbs from "@/components/PublicBreadcrumbs";
import { apiPost } from "@/lib/api";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const params = new URLSearchParams(window.location.search);
  const token = params.get("token") ?? "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Hasła nie są identyczne");
      return;
    }

    if (password.length < 8) {
      setError("Hasło musi mieć co najmniej 8 znaków");
      return;
    }

    if (!token) {
      setError("Brak tokenu resetowania. Sprawdź link.");
      return;
    }

    setLoading(true);
    try {
      await apiPost("/api/auth/reset-password", { token, password });
      setDone(true);
      setTimeout(() => navigate("/login"), 3000);
    } catch (err: any) {
      setError(err.message || "Wystąpił błąd podczas resetowania hasła");
    } finally {
      setLoading(false);
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
              <Zap className="w-7 h-7 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground font-['Space_Grotesk']">Nowe hasło</h1>
            <p className="text-muted-foreground text-sm mt-1">Ustaw nowe hasło dla swojego konta</p>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
            {done ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8 space-y-4"
              >
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
                <p className="text-foreground font-medium">Hasło zresetowane pomyślnie!</p>
                <p className="text-muted-foreground text-sm">Za chwilę zostaniesz przekierowany na stronę logowania...</p>
                <Link to="/login" className="text-sm text-primary hover:underline">
                  Przejdź do logowania
                </Link>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Nowe hasło</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="bg-muted border-border pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Potwierdź nowe hasło</Label>
                  <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="bg-muted border-border"
                  />
                </div>

                {error && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2"
                  >
                    {error}
                  </motion.p>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <KeyRound className="w-4 h-4 mr-2" />}
                  Ustaw nowe hasło
                </Button>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
