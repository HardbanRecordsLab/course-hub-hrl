import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Zap, BookOpen, Award, Users, ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

type Course = {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  priceCents: number;
  currency: string;
  certificateEnabled: boolean;
};

function formatPrice(cents: number, currency: string) {
  if (cents === 0) return "Darmowy";
  return `${(cents / 100).toFixed(2)} ${currency}`;
}

export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const { data: courses = [], isLoading } = useQuery({
    queryKey: ["public-courses"],
    queryFn: async () => apiGet<Course[]>("/api/courses"),
  });

  const handleBuy = async (courseId: string) => {
    if (!isAuthenticated) {
      navigate("/register");
      return;
    }
    setBuyingId(courseId);
    try {
      const { url } = await apiPost<{ url: string }>("/api/checkout", { courseId });
      if (url) window.location.href = url;
      else throw new Error("Brak URL sesji checkout");
    } catch (err) {
      toast({ title: "Błąd płatności", description: (err as Error).message, variant: "destructive" });
    } finally {
      setBuyingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">HRL Course Hub</h1>
              <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">
                Platforma kursów
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button asChild variant="ghost" size="sm">
                <span>Zaloguj się</span>
              </Button>
            </Link>
            <Link to="/register">
              <Button asChild size="sm">
                <span>Rejestracja</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 py-16 md:py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto"
        >
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
            Rozwijaj umiejętności z{" "}
            <span className="text-primary">HRL Course Hub</span>
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Profesjonalne kursy online z certyfikatami ukończenia. Dołącz do społeczności uczących się i zdobywaj wiedzę w swoim tempie.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/register">
              <Button asChild size="lg" className="gap-2">
                <span>Zacznij teraz <ArrowRight className="w-4 h-4" /></span>
              </Button>
            </Link>
            <a href="#courses">
              <Button asChild variant="outline" size="lg">
                <span>Zobacz kursy</span>
              </Button>
            </a>
          </div>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid md:grid-cols-3 gap-6 mt-20"
        >
          <div className="rounded-xl bg-card border border-border p-6">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Profesjonalne kursy</h3>
            <p className="text-sm text-muted-foreground">
              Starannie wybrane kursy prowadzone przez ekspertów z branży.
            </p>
          </div>
          <div className="rounded-xl bg-card border border-border p-6">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <Award className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Certyfikaty ukończenia</h3>
            <p className="text-sm text-muted-foreground">
              Po ukończeniu kursu otrzymasz certyfikat weryfikowalny online.
            </p>
          </div>
          <div className="rounded-xl bg-card border border-border p-6">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <ShieldCheck className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Bezpieczny dostęp</h3>
            <p className="text-sm text-muted-foreground">
              Twoje dane i dostęp do kursów są chronione najwyższymi standardami.
            </p>
          </div>
        </motion.div>
      </section>

      {/* Courses */}
      <section id="courses" className="max-w-7xl mx-auto px-4 md:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight mb-4">Dostępne kursy</h2>
          <p className="text-muted-foreground">
            Wybierz kurs i zacznij naukę już dziś
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : courses.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center">
            <p className="text-muted-foreground">Brak dostępnych kursów. Sprawdź ponownie później.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course, i) => (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="rounded-xl bg-card border border-border overflow-hidden hover:border-primary/30 transition-all group"
              >
                {course.imageUrl ? (
                  <img src={course.imageUrl} alt="" className="w-full h-48 object-cover" />
                ) : (
                  <div className="w-full h-48 bg-ch-surface-2 flex items-center justify-center">
                    <BookOpen className="w-12 h-12 text-muted-foreground" />
                  </div>
                )}
                <div className="p-5">
                  <h3 className="text-lg font-semibold mb-2 line-clamp-2">{course.title}</h3>
                  {course.description && (
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-3">{course.description}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-primary">
                        {formatPrice(course.priceCents, course.currency)}
                      </span>
                      {course.certificateEnabled && (
                        <span className="text-[11px] px-2 py-0.5 rounded bg-ch-purple/10 text-ch-purple border border-ch-purple/20">Certyfikat</span>
                      )}
                    </div>
                    <Button size="sm" variant="outline" className="gap-2" disabled={buyingId === course.id} onClick={() => handleBuy(course.id)}>
                      {buyingId === course.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <>Kup <ArrowRight className="w-3 h-3" /></>}
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 py-16">
        <div className="rounded-2xl bg-primary/5 border border-primary/20 p-8 md:p-12 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Gotowy na naukę?</h2>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            Dołącz do HRL Course Hub i zacznij rozwijać swoje umiejętności już dziś.
          </p>
          <Link to="/register">
            <Button asChild size="lg" className="gap-2">
              <span>Utwórz konto <ArrowRight className="w-4 h-4" /></span>
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card/50">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
                <Zap className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="text-sm font-semibold">HRL Course Hub</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link to="/verify" className="hover:text-foreground transition-colors">Weryfikacja certyfikatów</Link>
              <Link to="/login" className="hover:text-foreground transition-colors">Logowanie</Link>
            </div>
            <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} HRL Course Hub</p>
          </div>
        </div>
      </footer>
    </div>
  );
}