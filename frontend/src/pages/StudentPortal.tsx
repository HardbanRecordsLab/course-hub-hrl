import { motion } from "framer-motion";
import { ExternalLink, BookOpen, CalendarClock, Loader2, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { apiGet } from "@/lib/api";

type AccessWithCourse = {
  id: string;
  accessEndsAt: string | null;
  accessStartsAt: string;
  courseId: string;
  course: {
    id: string;
    title: string;
    description: string | null;
    imageUrl: string | null;
    externalUrl: string;
  };
};

type Certificate = {
  id: string;
  verificationCode: string;
  studentDisplayName: string;
  courseTitleSnapshot: string;
  issuedAt: string;
  courseId: string;
  course: { id: string; title: string };
};

export default function StudentPortal() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["my-access", user?.id],
    enabled: !!user,
    queryFn: async () => apiGet<AccessWithCourse[]>("/api/access/mine"),
  });

  const { data: certificates = [] } = useQuery({
    queryKey: ["my-certificates", user?.id],
    enabled: !!user,
    queryFn: async () => apiGet<Certificate[]>("/api/certificates/mine"),
  });

  const certByCourseId = new Map(certificates.map((c) => [c.courseId, c]));

  const openCourse = (courseId: string) => {
    navigate(`/course/${courseId}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-6">
          <h1 className="text-2xl font-bold tracking-tight">
            Witaj, <span className="text-primary">{user?.name?.split(" ")[0] || "uczniu"}</span> 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Twoje kursy, do których masz aktywny dostęp.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-8 py-8">
        <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" /> Moje kursy
        </h2>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
            Nie masz jeszcze żadnych kursów. Skontaktuj się z administratorem lub kup dostęp.
          </div>
        ) : (
          <div className="grid gap-5">
            {rows.map(({ course }, i) => {
              const cert = certByCourseId.get(course.id);
              return (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="rounded-xl bg-card border border-border hover:border-primary/30 transition-all p-5 md:p-6"
                >
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    {course.imageUrl ? (
                      <img
                        src={course.imageUrl}
                        alt=""
                        className="w-16 h-16 rounded-xl object-cover border border-border flex-shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-ch-surface-2 border border-border flex items-center justify-center text-2xl flex-shrink-0">
                        📚
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold mb-1">{course.title}</h3>
                      {course.description && (
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                          {course.description}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="text-primary">Dostęp bezterminowy</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                    {cert && (
                      <Button 
                        variant="outline" 
                        className="gap-2"
                        onClick={async () => {
                          try {
                            const { generateCertificatePDF } = await import("@/utils/CertificateGenerator");
                            await generateCertificatePDF({
                              studentName: cert.studentDisplayName,
                              courseTitle: cert.courseTitleSnapshot,
                              verificationCode: cert.verificationCode,
                              issuedAt: cert.issuedAt,
                            });
                          } catch (e) {
                            console.error("PDF generation failed", e);
                          }
                        }}
                      >
                        <Award className="w-4 h-4" /> Pobierz certyfikat
                      </Button>
                    )}
                      <Button
                        className="gap-2 shadow-[0_4px_20px_-4px_hsl(160_84%_44%_/_0.3)]"
                        onClick={() => openCourse(course.id)}
                      >
                        Otwórz kurs <ExternalLink className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
