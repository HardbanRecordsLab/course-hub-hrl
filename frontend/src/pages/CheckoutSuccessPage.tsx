import { useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
export default function CheckoutSuccessPage() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  useEffect(() => { if (sessionId) console.log("Stripe checkout success, session:", sessionId); }, [sessionId]);
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md w-full text-center rounded-2xl border border-border bg-card p-8">
        <CheckCircle className="w-16 h-16 text-primary mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Płatność zakończona!</h1>
        <p className="text-muted-foreground mb-6">Dziękujemy za zakup. Dostęp do kursu został aktywowany.</p>
        <Link to="/portal"><Button asChild size="lg" className="gap-2"><span>Przejdź do kursów <ArrowRight /></span></Button></Link>
      </motion.div>
    </div>
  );
}