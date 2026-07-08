import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, Shield, Mail, Database, ChevronRight, Save } from "lucide-react";
import { integrations } from "@/lib/mockData";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import IntegrationConfigPanel, { configs } from "@/components/IntegrationConfigPanel";
import { useToast } from "@/hooks/use-toast";

const tabs = [
  { id: "general", label: "Ogólne", icon: Settings },
  { id: "security", label: "Bezpieczeństwo", icon: Shield },
  { id: "integrations", label: "Integracje", icon: Database },
  { id: "email", label: "Email", icon: Mail },
];

const integrationIdMap: Record<string, string> = {
  "MailerLite": "mailerlite",
  "Brevo SMTP": "brevo",
  "Slack": "slack",
  "Telegram Bot": "telegram",
  "Google Sheets": "google_sheets",
  "n8n / Make.com": "n8n",
};

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("general");
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null);
  const [integrationStates, setIntegrationStates] = useState<Record<string, boolean>>(
    Object.fromEntries(integrations.map((i) => [i.name, i.enabled]))
  );
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast({ title: "Zapisano", description: "Ustawienia zostały zaktualizowane" });
    }, 600);
  };

  const toggleIntegration = (name: string) => {
    setIntegrationStates((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ustawienia</h1>
          <p className="text-sm text-muted-foreground mt-1">Konfiguracja HRL Course Hub</p>
      </div>

      {!selectedIntegration && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-ch-surface-2 hover:text-foreground"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      )}

      <AnimatePresence mode="wait">
        {selectedIntegration ? (
          <IntegrationConfigPanel
            key={selectedIntegration}
            integrationId={selectedIntegration}
            onBack={() => setSelectedIntegration(null)}
          />
        ) : (
          <>
            {activeTab === "general" && (
              <motion.div key="general" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="rounded-xl bg-card border border-border p-6 space-y-5">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Nazwa platformy</label>
                  <input
                    defaultValue="HRL Course Hub"
                    className="w-full max-w-md px-4 py-2.5 rounded-lg bg-ch-surface-2 border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Domyślny czas wygaśnięcia linku dostępu</label>
                  <div className="flex gap-2 max-w-xs">
                    <input
                      defaultValue="24"
                      type="number"
                      className="w-20 px-4 py-2.5 rounded-lg bg-ch-surface-2 border border-border text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <select className="px-4 py-2.5 rounded-lg bg-ch-surface-2 border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary">
                      <option>godzin</option>
                      <option>minut</option>
                      <option>dni</option>
                    </select>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Czas ważności podpisanego linku JWT do kursu zewnętrznego
                  </p>
                </div>
                <div className="flex items-center justify-between max-w-md">
                  <div>
                    <p className="text-sm font-medium">Tryb debugowania</p>
                    <p className="text-[11px] text-muted-foreground">Loguj szczegóły wydanych linków JWT</p>
                  </div>
                  <Switch />
                </div>
                <Button onClick={handleSave} disabled={saving} className="gap-2 mt-4">
                  <Save className="w-4 h-4" /> {saving ? "Zapisywanie..." : "Zapisz ustawienia"}
                </Button>
              </motion.div>
            )}

            {activeTab === "security" && (
              <motion.div key="security" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="rounded-xl bg-card border border-border p-6 space-y-5">
                <div>
                  <p className="text-sm font-medium mb-1">Sekrety JWT kursów</p>
                  <p className="text-[11px] text-muted-foreground">
                    Każdy kurs ma własny <span className="font-mono">jwt_secret</span> przechowywany w bazie i niedostępny w przeglądarce.
                    Linki dostępu podpisuje edge function po stronie serwera.
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Retencja logów dostępu</label>
                  <div className="flex items-center gap-2 max-w-xs">
                    <input
                      defaultValue="90"
                      type="number"
                      className="w-20 px-4 py-2.5 rounded-lg bg-ch-surface-2 border border-border text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <span className="text-sm text-muted-foreground">dni</span>
                  </div>
                </div>
                <div className="flex items-center justify-between max-w-md">
                  <div>
                    <p className="text-sm font-medium">Wymuszaj HTTPS dla linków dostępu</p>
                    <p className="text-[11px] text-muted-foreground">Odrzucaj kursy z adresami http://</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Button onClick={handleSave} disabled={saving} className="gap-2 mt-4">
                  <Save className="w-4 h-4" /> {saving ? "Zapisywanie..." : "Zapisz ustawienia"}
                </Button>
              </motion.div>
            )}

            {activeTab === "integrations" && (
              <motion.div key="integrations" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="space-y-3">
                {integrations.map((integ) => {
                  const configId = integrationIdMap[integ.name];
                  const hasConfig = configId && configs[configId];
                  const isEnabled = integrationStates[integ.name] ?? integ.enabled;
                  return (
                    <div
                      key={integ.name}
                      onClick={() => hasConfig && setSelectedIntegration(configId)}
                      className={`flex items-center justify-between px-5 py-4 rounded-xl bg-card border border-border transition-colors ${
                        hasConfig ? "hover:border-primary/30 cursor-pointer" : ""
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-2xl">{integ.icon}</span>
                        <div>
                          <p className="text-sm font-medium">{integ.name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {isEnabled ? "Połączony i aktywny" : "Kliknij aby skonfigurować"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {isEnabled && <span className="text-[11px] text-primary font-mono">connected</span>}
                        <Switch
                          checked={isEnabled}
                          onCheckedChange={() => toggleIntegration(integ.name)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        {hasConfig && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            )}

            {activeTab === "email" && (
              <motion.div key="email" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="rounded-xl bg-card border border-border p-6 space-y-5">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Dostawca</label>
                  <select className="px-4 py-2.5 rounded-lg bg-ch-surface-2 border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary max-w-xs w-full">
                    <option>Brevo SMTP</option>
                    <option>Resend</option>
                    <option>Wyłączone</option>
                  </select>
                </div>
                <div className="grid md:grid-cols-2 gap-4 max-w-lg">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">From Name</label>
                    <input
                      defaultValue="HRL Course Hub"
                      className="w-full px-4 py-2.5 rounded-lg bg-ch-surface-2 border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">From Email</label>
                    <input
                      defaultValue="noreply@example.com"
                      className="w-full px-4 py-2.5 rounded-lg bg-ch-surface-2 border border-border text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
                <Button onClick={handleSave} disabled={saving} className="gap-2 mt-4">
                  <Save className="w-4 h-4" /> {saving ? "Zapisywanie..." : "Zapisz ustawienia"}
                </Button>
              </motion.div>
            )}
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
