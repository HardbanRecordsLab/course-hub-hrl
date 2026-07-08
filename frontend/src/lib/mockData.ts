export const courses = [
  { id: 1, title: "Cyfrowy Zen", slug: "cyfrowy-zen", url: "https://cyfrowy-zen.hardbanrecordslab.online", status: "active" as const, authMethod: "jwt" as const, pmpro_levels: [1, 2, 3, 4], activeUsers: 142, tokenExpiry: 86400, category: "Mindset" },
  { id: 2, title: "EFT po toksycznym związku", slug: "magdalena-iskra", url: "https://magdalena-iskra.vercel.app", status: "active" as const, authMethod: "jwt" as const, pmpro_levels: [2, 3, 4], activeUsers: 87, tokenExpiry: 86400, category: "Terapia" },
  { id: 3, title: "Architekt Popytu 4.0", slug: "architekt-popytu", url: "https://architekt-popytu.vercel.app", status: "active" as const, authMethod: "jwt" as const, pmpro_levels: [2, 3, 4], activeUsers: 215, tokenExpiry: 43200, category: "Marketing" },
  { id: 4, title: "Kurs SEO Masterclass", slug: "seo-masterclass", url: "https://seo-masterclass.example.com", status: "draft" as const, authMethod: "jwt" as const, pmpro_levels: [3, 4], activeUsers: 0, tokenExpiry: 86400, category: "Marketing" },
];

export const pmpro_levels = [
  { id: 1, name: "Starter", price: 97 },
  { id: 2, name: "Pro", price: 297 },
  { id: 3, name: "All Access", price: 497 },
  { id: 4, name: "VIP", price: 997 },
];

export const recentActivity = [
  { id: 1, action: "access.granted", user: "Anna Kowalska", email: "anna@example.com", course: "Cyfrowy Zen", time: "2 min temu", ip: "91.198.x.x" },
  { id: 2, action: "token.issued", user: "Marcin Nowak", email: "marcin@example.com", course: "Architekt Popytu 4.0", time: "5 min temu", ip: "83.12.x.x" },
  { id: 3, action: "token.failed", user: "Piotr Wiśniewski", email: "piotr@example.com", course: "Cyfrowy Zen", time: "12 min temu", ip: "185.43.x.x" },
  { id: 4, action: "course.completed", user: "Katarzyna Dąbrowska", email: "kasia@example.com", course: "EFT po toksycznym związku", time: "28 min temu", ip: "77.55.x.x" },
  { id: 5, action: "access.granted", user: "Tomasz Zieliński", email: "tomasz@example.com", course: "Architekt Popytu 4.0", time: "1h temu", ip: "195.150.x.x" },
  { id: 6, action: "pmpro.level_changed", user: "Ewa Szymańska", email: "ewa@example.com", course: "Pro → VIP", time: "2h temu", ip: "46.134.x.x" },
  { id: 7, action: "access.expired", user: "Jakub Lewandowski", email: "jakub@example.com", course: "Cyfrowy Zen", time: "3h temu", ip: "31.0.x.x" },
  { id: 8, action: "token.issued", user: "Magdalena Wójcik", email: "magda@example.com", course: "EFT po toksycznym związku", time: "4h temu", ip: "89.64.x.x" },
];

export const users = [
  { id: 1, name: "Anna Kowalska", email: "anna@example.com", level: "Pro", courses: 2, status: "active", lastAccess: "2 min temu", registeredAt: "2025-03-15" },
  { id: 2, name: "Marcin Nowak", email: "marcin@example.com", level: "All Access", courses: 3, status: "active", lastAccess: "5 min temu", registeredAt: "2025-01-22" },
  { id: 3, name: "Katarzyna Dąbrowska", email: "kasia@example.com", level: "Starter", courses: 1, status: "active", lastAccess: "28 min temu", registeredAt: "2025-06-01" },
  { id: 4, name: "Piotr Wiśniewski", email: "piotr@example.com", level: "Pro", courses: 2, status: "expired", lastAccess: "3 dni temu", registeredAt: "2024-11-10" },
  { id: 5, name: "Tomasz Zieliński", email: "tomasz@example.com", level: "VIP", courses: 4, status: "active", lastAccess: "1h temu", registeredAt: "2024-08-20" },
  { id: 6, name: "Ewa Szymańska", email: "ewa@example.com", level: "VIP", courses: 4, status: "active", lastAccess: "2h temu", registeredAt: "2025-02-14" },
];

export const tokens = [
  { id: 1, user: "Anna Kowalska", course: "Cyfrowy Zen", issuedAt: "2026-03-08 10:32", expiresAt: "2026-03-09 10:32", usedCount: 3, status: "active", ip: "91.198.x.x" },
  { id: 2, user: "Marcin Nowak", course: "Architekt Popytu 4.0", issuedAt: "2026-03-08 10:27", expiresAt: "2026-03-08 22:27", usedCount: 1, status: "active", ip: "83.12.x.x" },
  { id: 3, user: "Piotr Wiśniewski", course: "Cyfrowy Zen", issuedAt: "2026-03-08 10:20", expiresAt: "2026-03-09 10:20", usedCount: 0, status: "failed", ip: "185.43.x.x" },
  { id: 4, user: "Katarzyna Dąbrowska", course: "EFT po toksycznym związku", issuedAt: "2026-03-07 18:45", expiresAt: "2026-03-08 18:45", usedCount: 8, status: "expired", ip: "77.55.x.x" },
  { id: 5, user: "Tomasz Zieliński", course: "Cyfrowy Zen", issuedAt: "2026-03-08 09:10", expiresAt: "2026-03-09 09:10", usedCount: 2, status: "active", ip: "195.150.x.x" },
];

export const healthChecks = [
  { title: "Cyfrowy Zen", url: "https://cyfrowy-zen.hardbanrecordslab.online", ok: true, ms: 120 },
  { title: "EFT po toksycznym związku", url: "https://magdalena-iskra.vercel.app", ok: true, ms: 89 },
  { title: "Architekt Popytu 4.0", url: "https://architekt-popytu.vercel.app", ok: true, ms: 145 },
  { title: "SEO Masterclass", url: "https://seo-masterclass.example.com", ok: false, ms: 0 },
];

export const integrations = [
  { name: "WooCommerce", icon: "🛒", enabled: true, status: "connected" },
  { name: "MailerLite", icon: "✉️", enabled: true, status: "connected" },
  { name: "Brevo SMTP", icon: "📧", enabled: true, status: "connected" },
  { name: "Slack", icon: "💬", enabled: true, status: "connected" },
  { name: "Google Sheets", icon: "📊", enabled: true, status: "connected" },
  { name: "Telegram Bot", icon: "🤖", enabled: true, status: "connected" },
  { name: "n8n / Make.com", icon: "⚡", enabled: false, status: "disconnected" },
  { name: "Plausible", icon: "📈", enabled: false, status: "disconnected" },
  { name: "Discord", icon: "🎮", enabled: false, status: "disconnected" },
  { name: "Cal.com", icon: "📅", enabled: false, status: "disconnected" },
  { name: "Tawk.to", icon: "💭", enabled: false, status: "disconnected" },
  { name: "SliceWP", icon: "🔗", enabled: false, status: "disconnected" },
  { name: "Fakturownia", icon: "🧾", enabled: false, status: "disconnected" },
  { name: "Przelewy24", icon: "💳", enabled: false, status: "disconnected" },
  { name: "MS Clarity", icon: "🔍", enabled: false, status: "disconnected" },
  { name: "Certyfikaty PDF", icon: "🏆", enabled: false, status: "disconnected" },
];

export const chartData = [
  { name: "Pon", dostępy: 12, tokeny: 34, zakupy: 5 },
  { name: "Wt", dostępy: 8, tokeny: 28, zakupy: 3 },
  { name: "Śr", dostępy: 15, tokeny: 42, zakupy: 7 },
  { name: "Czw", dostępy: 11, tokeny: 38, zakupy: 4 },
  { name: "Pt", dostępy: 18, tokeny: 51, zakupy: 9 },
  { name: "Sob", dostępy: 6, tokeny: 19, zakupy: 2 },
  { name: "Ndz", dostępy: 4, tokeny: 14, zakupy: 1 },
];
