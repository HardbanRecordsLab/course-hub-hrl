import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, ExternalLink, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiGet } from "@/lib/api";

type CourseView = {
  externalUrl: string;
  title: string;
};

export default function CourseViewer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [url, setUrl] = useState<string | null>(null);
  const [title, setTitle] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!id) return;
    setLoading(true);
    setError(null);
    apiGet<CourseView>(`/api/courses/${id}/view`)
      .then((data) => {
        if (!cancelled) {
          setUrl(data.externalUrl);
          setTitle(data.title);
        }
      })
      .catch((e: any) => {
        if (!cancelled) {
          setError(e?.message || "Nie udało się załadować kursu");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Powrót
          </Button>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold truncate max-w-md">{title || "Kurs"}</h1>
            <p className="text-xs text-muted-foreground">Widok osadzony</p>
          </div>
        </div>
        {url && (
          <Button variant="outline" size="sm" onClick={() => window.open(url, "_blank")} className="gap-2">
            <ExternalLink className="w-4 h-4" /> Otwórz w nowej karcie
          </Button>
        )}
      </div>

      <div className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-background">
            <div className="text-center">
              <ShieldCheck className="w-12 h-12 text-destructive mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          </div>
        )}
        {url && !loading && !error && (
          <iframe
            src={url}
            title={title}
            className="w-full h-full border-0 bg-white"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
            allow="accelerometer; camera; encrypted-media; geolocation; gyroscope; microphone"
          />
        )}
      </div>
    </div>
  );
}
