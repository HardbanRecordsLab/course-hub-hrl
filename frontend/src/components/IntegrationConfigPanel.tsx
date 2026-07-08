import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, Loader2, Eye, EyeOff, ArrowLeft, ExternalLink } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

interface FieldConfig {
  key: string;
  label: string;
  type: "text" | "password" | "number" | "select";
  placeholder?: string;
  defaultValue?: string;
  options?: string[];
  description?: string;
  mono?: boolean;
}

interface EventToggle {
  key: string;
  label: string;
  description?: string;
  defaultChecked?: boolean;
}

interface IntegrationConfig {
  name: string;
  icon: string;
  description: string;
  docsUrl?: string;
  freeLimit?: string;
  fields: FieldConfig[];
  events?: EventToggle[];
  extraActions?: { label: string; description?: string }[];
}

const configs: Record<string, IntegrationConfig> = {
  mailerlite: {
    name: "MailerLite",
    icon: "✉️",
    description: "Email marketing — grupy per kurs, sekwencje automatyczne, tagowanie po ukończeniu",
    docsUrl: "https://developers.mailerlite.com/docs",
    freeLimit: "1 000 subskrybentów / 12 000 emaili miesięcznie",
    fields: [
      { key: "api_key", label: "API Key", type: "password", placeholder: "eyJ0eXAiOiJKV...", description: "Znajdziesz w MailerLite → Settings → API", mono: true },
      { key: "default_group", label: "Domyślna grupa (all-students)", type: "text", placeholder: "ID grupy", mono: true },
    ],
    events: [
      { key: "access_granted", label: "Dostęp przyznany", description: "Dodaj do grupy kursu + tag status:active", defaultChecked: true },
      { key: "access_expired", label: "Dostęp wygasł", description: "Usuń z grupy + tag status:expired", defaultChecked: true },
      { key: "course_completed", label: "Kurs ukończony", description: "Tag completed:{slug}", defaultChecked: true },
      { key: "token_failed_3x", label: "Token odrzucony 3x", description: "Tag needs-renewal → automatyzacja", defaultChecked: false },
      { key: "registration", label: "Rejestracja (PMPro)", description: "Dodaj do grupy all-students", defaultChecked: true },
    ],
    extraActions: [
      { label: "Synchronizuj grupy", description: "Pobierz listę grup z MailerLite" },
    ],
  },
  brevo: {
    name: "Brevo SMTP",
    icon: "📧",
    description: "SMTP relay zastępujący wp_mail() + szablony drag&drop z śledzeniem otwarć",
    docsUrl: "https://developers.brevo.com",
    freeLimit: "300 emaili/dzień, nieograniczone kontakty",
    fields: [
      { key: "api_key", label: "API Key", type: "password", placeholder: "xkeysib-...", description: "Brevo → Settings → SMTP & API", mono: true },
      { key: "smtp_login", label: "SMTP Login", type: "text", placeholder: "twoj@email.com", mono: true },
      { key: "smtp_key", label: "SMTP Key", type: "password", placeholder: "xsmtpsib-...", mono: true },
      { key: "from_email", label: "From Email", type: "text", placeholder: "kursy@twojadomena.pl", mono: true },
      { key: "from_name", label: "From Name", type: "text", placeholder: "Moja Platforma" },
      { key: "tpl_granted", label: "Template ID: Dostęp przyznany", type: "number", placeholder: "1", mono: true },
      { key: "tpl_expiring", label: "Template ID: 7 dni przed wygaśnięciem", type: "number", placeholder: "2", mono: true },
      { key: "tpl_expired", label: "Template ID: Dostęp wygasł", type: "number", placeholder: "3", mono: true },
      { key: "tpl_welcome", label: "Template ID: Email powitalny", type: "number", placeholder: "4", mono: true },
    ],
    events: [
      { key: "use_smtp", label: "Użyj Brevo SMTP zamiast wp_mail", description: "Zastąp domyślny system emailowy WordPress", defaultChecked: true },
    ],
  },
  slack: {
    name: "Slack",
    icon: "💬",
    description: "Powiadomienia push — sprzedaże, alerty bezpieczeństwa, health check, raporty dzienne",
    docsUrl: "https://api.slack.com/messaging/webhooks",
    freeLimit: "Incoming Webhooks darmowe bezterminowo",
    fields: [
      { key: "default_url", label: "Webhook URL (domyślny)", type: "password", placeholder: "https://hooks.slack.com/services/T.../B.../...", description: "Slack → Apps → Incoming Webhooks", mono: true },
      { key: "sales_url", label: "Webhook #sprzedaz", type: "password", placeholder: "https://hooks.slack.com/services/...", mono: true },
      { key: "alerts_url", label: "Webhook #alerty", type: "password", placeholder: "https://hooks.slack.com/services/...", mono: true },
      { key: "reports_url", label: "Webhook #raporty", type: "password", placeholder: "https://hooks.slack.com/services/...", mono: true },
      { key: "report_hour", label: "Godzina raportu dziennego", type: "select", options: ["06:00", "07:00", "08:00", "09:00", "10:00", "20:00", "21:00"], defaultValue: "08:00" },
    ],
    events: [
      { key: "new_order", label: "Nowy zakup", description: "→ #sprzedaz", defaultChecked: true },
      { key: "token_failure", label: "Token odrzucony 3x", description: "→ #alerty", defaultChecked: true },
      { key: "health_alert", label: "Kurs niedostępny", description: "→ #alerty", defaultChecked: true },
      { key: "new_registration", label: "Nowa rejestracja", description: "→ #aktywnosc", defaultChecked: false },
      { key: "daily_report", label: "Raport dzienny", description: "→ #raporty", defaultChecked: true },
    ],
  },
  telegram: {
    name: "Telegram Bot",
    icon: "🤖",
    description: "Powiadomienia push + interaktywny bot (/stats, /user, /revoke, /health) z telefonu",
    docsUrl: "https://core.telegram.org/bots",
    freeLimit: "Telegram Bot API — 100% darmowe, zero limitów",
    fields: [
      { key: "bot_token", label: "Bot Token", type: "password", placeholder: "123456:ABC-DEF...", description: "Utwórz bota przez @BotFather na Telegramie", mono: true },
      { key: "chat_id", label: "Chat ID admina", type: "text", placeholder: "-100123456789", description: "Uzyskaj przez @userinfobot", mono: true },
    ],
    events: [
      { key: "new_order", label: "Nowy zakup", defaultChecked: true },
      { key: "token_failure", label: "Token odrzucony 3x", defaultChecked: true },
      { key: "health_alert", label: "Kurs niedostępny", defaultChecked: true },
      { key: "daily_report", label: "Raport dzienny", defaultChecked: true },
    ],
    extraActions: [
      { label: "Zarejestruj Webhook", description: "Ustaw endpoint Telegrama do odbierania komend" },
    ],
  },
  google_sheets: {
    name: "Google Sheets",
    icon: "📊",
    description: "Live arkusz raportowy — dostępy, zamówienia, aktywność, statystyki dzienne",
    docsUrl: "https://developers.google.com/sheets/api",
    freeLimit: "Sheets API darmowe bezterminowo (300 req/min)",
    fields: [
      { key: "spreadsheet_id", label: "Spreadsheet ID", type: "text", placeholder: "1BxiMVs0XRA5nFMdKvBd...", description: "Z URL arkusza: docs.google.com/spreadsheets/d/{ID}/edit", mono: true },
    ],
    events: [
      { key: "tab_access", label: "Zakładka: Dostępy", description: "user_id, email, kurs, data, wygasa, status", defaultChecked: true },
      { key: "tab_orders", label: "Zakładka: Zamówienia", description: "order_id, email, kurs, kwota, waluta", defaultChecked: true },
      { key: "tab_activity", label: "Zakładka: Aktywność", description: "Buforowane co 15 min", defaultChecked: false },
      { key: "tab_stats", label: "Zakładka: Statystyki", description: "Codziennie 23:00", defaultChecked: true },
    ],
    extraActions: [
      { label: "Pełna synchronizacja teraz", description: "Wyślij wszystkie dane do arkusza" },
      { label: "Upload Service Account JSON", description: "Autoryzacja serwer-do-serwer bez OAuth" },
    ],
  },
  n8n: {
    name: "n8n / Make.com",
    icon: "⚡",
    description: "Webhook dispatcher — 10 eventów do no-code automatyzacji (Notion, Airtable, Discord...)",
    freeLimit: "n8n self-hosted darmowe · Make.com 1 000 ops/mies.",
    fields: [
      { key: "webhook_url", label: "Webhook URL", type: "text", placeholder: "https://n8n.twojserwer.pl/webhook/coursehub", mono: true },
      { key: "secret", label: "Webhook Secret (HMAC)", type: "password", placeholder: "whsec_...", mono: true },
    ],
    events: [
      { key: "access_granted", label: "access.granted", defaultChecked: true },
      { key: "access_revoked", label: "access.revoked", defaultChecked: true },
      { key: "access_expired", label: "access.expired", defaultChecked: true },
      { key: "token_issued", label: "token.issued", defaultChecked: true },
      { key: "token_failed", label: "token.failed", defaultChecked: true },
      { key: "course_completed", label: "course.completed", defaultChecked: true },
      { key: "lesson_completed", label: "lesson.completed", defaultChecked: false },
      { key: "user_registered", label: "user.registered", defaultChecked: true },
      { key: "pmpro_level_changed", label: "pmpro.level_changed", defaultChecked: true },
      { key: "health_alert", label: "health.alert", defaultChecked: true },
    ],
    extraActions: [
      { label: "Wyślij testowy webhook", description: "Sprawdź czy endpoint odpowiada" },
    ],
  },
};

interface Props {
  integrationId: string;
  onBack: () => void;
}

export default function IntegrationConfigPanel({ integrationId, onBack }: Props) {
  const config = configs[integrationId];
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  if (!config) return null;

  const handleTest = () => {
    setTestStatus("testing");
    setTimeout(() => {
      setTestStatus(Math.random() > 0.3 ? "success" : "error");
      setTimeout(() => setTestStatus("idle"), 3000);
    }, 1500);
  };

  const togglePassword = (key: string) => {
    setShowPasswords(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-start gap-4">
        <button onClick={onBack} className="mt-1 p-2 rounded-lg hover:bg-ch-surface-2 transition-colors text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-2xl">{config.icon}</span>
            <h2 className="text-xl font-bold">{config.name}</h2>
          </div>
          <p className="text-sm text-muted-foreground">{config.description}</p>
          {config.freeLimit && (
            <p className="text-[11px] text-primary font-mono mt-1">FREE: {config.freeLimit}</p>
          )}
        </div>
        {config.docsUrl && (
          <a href={config.docsUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
            <ExternalLink className="w-3 h-3" /> Docs
          </a>
        )}
      </div>

      {/* Fields */}
      <div className="rounded-xl bg-card border border-border p-6 space-y-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Dane uwierzytelniające</h3>
        {config.fields.map((field) => (
          <div key={field.key}>
            <label className="text-sm font-medium mb-1.5 block">{field.label}</label>
            {field.description && (
              <p className="text-[11px] text-muted-foreground mb-2">{field.description}</p>
            )}
            {field.type === "select" ? (
              <select
                defaultValue={field.defaultValue}
                className="w-full max-w-md px-4 py-2.5 rounded-lg bg-ch-surface-2 border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {field.options?.map(opt => <option key={opt}>{opt}</option>)}
              </select>
            ) : (
              <div className="relative max-w-md">
                <input
                  type={field.type === "password" && !showPasswords[field.key] ? "password" : field.type === "number" ? "number" : "text"}
                  placeholder={field.placeholder}
                  defaultValue={field.defaultValue}
                  className={`w-full px-4 py-2.5 rounded-lg bg-ch-surface-2 border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary ${field.mono ? "font-mono" : ""} ${field.type === "password" ? "pr-10" : ""}`}
                />
                {field.type === "password" && (
                  <button
                    onClick={() => togglePassword(field.key)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPasswords[field.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Events */}
      {config.events && config.events.length > 0 && (
        <div className="rounded-xl bg-card border border-border p-6 space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Zdarzenia</h3>
          {config.events.map((ev) => (
            <div key={ev.key} className="flex items-center justify-between py-1">
              <div>
                <p className="text-sm font-medium">{ev.label}</p>
                {ev.description && <p className="text-[11px] text-muted-foreground">{ev.description}</p>}
              </div>
              <Switch defaultChecked={ev.defaultChecked} />
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="rounded-xl bg-card border border-border p-6 space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Akcje</h3>

        <div className="flex flex-wrap gap-3">
          <Button onClick={handleTest} disabled={testStatus === "testing"} className="gap-2">
            {testStatus === "testing" && <Loader2 className="w-4 h-4 animate-spin" />}
            {testStatus === "success" && <CheckCircle2 className="w-4 h-4" />}
            {testStatus === "error" && <XCircle className="w-4 h-4" />}
            {testStatus === "idle" && "🔌"}
            {testStatus === "idle" ? "Testuj połączenie" : testStatus === "testing" ? "Testowanie..." : testStatus === "success" ? "Połączono!" : "Błąd połączenia"}
          </Button>

          {config.extraActions?.map((action) => (
            <button
              key={action.label}
              className="px-4 py-2.5 rounded-lg bg-ch-surface-2 border border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all"
              title={action.description}
            >
              {action.label}
            </button>
          ))}
        </div>

        {testStatus === "success" && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="p-3 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-sm text-primary font-medium">✓ Połączenie aktywne</p>
            <p className="text-[11px] text-muted-foreground">Odpowiedź: 200 OK · Czas: 142ms</p>
          </motion.div>
        )}
        {testStatus === "error" && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="p-3 rounded-lg bg-ch-red/5 border border-ch-red/20">
            <p className="text-sm text-ch-red font-medium">✗ Błąd połączenia</p>
            <p className="text-[11px] text-muted-foreground">401 Unauthorized — sprawdź API Key</p>
          </motion.div>
        )}
      </div>

      {/* Save */}
      <div className="flex gap-3">
        <Button className="px-8">Zapisz ustawienia</Button>
        <button onClick={onBack} className="px-4 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors">
          Anuluj
        </button>
      </div>
    </motion.div>
  );
}

export { configs };
