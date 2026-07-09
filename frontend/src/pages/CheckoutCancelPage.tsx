import { motion } from "framer-motion";
import { XCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function CheckoutCancelPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full text-center rounded-2xl border border-border bg-card p-8"
      >
        <XCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Płatność anulowana</h1>
        <p className="text-muted-foreground mb-6">
          Płatność nie została zrealizowana. Twoje dane są bezpieczne.
        </p>
        <Link to="/">
          <Button asChild size="lg" className="gap-2">
            <span>Powrót do kursów <ArrowRight /></span>
          </Button>
        </Link>
      </motion.div>
    </div>
  );
}
