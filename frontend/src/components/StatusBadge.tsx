const statusStyles: Record<string, string> = {
  active: "bg-primary/10 text-primary border-primary/20",
  draft: "bg-ch-amber/10 text-ch-amber border-ch-amber/20",
  archived: "bg-muted text-muted-foreground border-border",
  expired: "bg-ch-red/10 text-ch-red border-ch-red/20",
  revoked: "bg-ch-red/10 text-ch-red border-ch-red/20",
  failed: "bg-ch-red/10 text-ch-red border-ch-red/20",
  connected: "bg-primary/10 text-primary border-primary/20",
  disconnected: "bg-muted text-muted-foreground border-border",
  pending: "bg-ch-amber/10 text-ch-amber border-ch-amber/20",
};

const statusLabels: Record<string, string> = {
  active: "Aktywny",
  draft: "Szkic",
  archived: "Archiwum",
  expired: "Wygasł",
  revoked: "Odwołany",
  failed: "Błąd",
  connected: "Połączony",
  disconnected: "Wyłączony",
  pending: "Oczekuje",
};

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium border ${statusStyles[status] || statusStyles.archived}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${status === "active" || status === "connected" ? "bg-primary pulse-dot" : status === "failed" || status === "expired" || status === "revoked" ? "bg-ch-red" : status === "draft" || status === "pending" ? "bg-ch-amber" : "bg-muted-foreground"}`} />
      {statusLabels[status] || status}
    </span>
  );
}
