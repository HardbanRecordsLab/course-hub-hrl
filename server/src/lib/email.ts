import nodemailer from "nodemailer";

export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.EMAIL_FROM;

  if (!host || !user || !pass || !from) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  return transporter;
}

export async function sendMail(message: MailMessage): Promise<boolean> {
  const t = getTransporter();
  const from = process.env.EMAIL_FROM ?? "no-reply@hardbanrecordslab.online";

  if (!t) {
    console.warn("[email] SMTP not configured; email not sent:", message.subject);
    return false;
  }

  try {
    await t.sendMail({ from, to: message.to, subject: message.subject, html: message.html, text: message.text });
    return true;
  } catch (err) {
    console.error("[email] send error", err);
    return false;
  }
}

export async function sendPasswordResetEmail(email: string, name: string | null, resetLink: string): Promise<boolean> {
  const displayName = name ?? email;
  const subject = "Resetowanie hasła — HRL Course Hub";
  const html = `
    <p>Cześć ${displayName},</p>
    <p>Otrzymaliśmy prośbę o zresetowanie hasła do Twojego konta HRL Course Hub.</p>
    <p>Kliknij poniższy link, aby ustawić nowe hasło:</p>
    <p><a href="${resetLink}" style="display:inline-block;padding:10px 20px;background:#6366f1;color:#fff;text-decoration:none;border-radius:6px;margin:10px 0;">Resetuj hasło</a></p>
    <p>Link wygasa za 1 godzinę. Jeśli nie prosiłeś o reset, zignoruj tę wiadomość.</p>
    <p>— Zespół HRL Course Hub</p>
  `;
  return sendMail({ to: email, subject, html });
}

export async function sendEmailVerification(email: string, name: string | null, verificationLink: string): Promise<boolean> {
  const displayName = name ?? email;
  const subject = "Potwierdź swój email — HRL Course Hub";
  const html = `
    <p>Cześć ${displayName},</p>
    <p>Dziękujemy za rejestrację! Aby aktywować konto, potwierdź swój adres email:</p>
    <p><a href="${verificationLink}" style="display:inline-block;padding:10px 20px;background:#6366f1;color:#fff;text-decoration:none;border-radius:6px;margin:10px 0;">Potwierdź email</a></p>
    <p>Link wygasa za 24 godziny.</p>
    <p>— Zespół HRL Course Hub</p>
  `;
  return sendMail({ to: email, subject, html });
}

export async function sendWelcomeEmail(email: string, name: string | null): Promise<boolean> {
  const displayName = name ?? email;
  const subject = "Witaj na HRL Course Hub!";
  const html = `<p>Cześć ${displayName},</p><p>Dziękujemy za rejestrację na HRL Course Hub. Możesz teraz przeglądać dostępne kursy i kupować dostęp.</p><p>BTW, to jest domyślny szablon — skonfiguruj szablon w apps/nodemailer.</p>`;
  return sendMail({ to: email, subject, html });
}

export async function sendPurchaseConfirmation(email: string, name: string | null, courseTitle: string): Promise<boolean> {
  const displayName = name ?? email;
  const subject = `Potwierdzenie zakupu: ${courseTitle}`;
  const html = `<p>Cześć ${displayName},</p><p>Dziękujemy za zakup kursu <strong>${courseTitle}</strong>! Dostęp został przyznany automatycznie.</p><p>Zaloguj się na portal, aby rozpocząć naukę.</p>`;
  return sendMail({ to: email, subject, html });
}

export async function sendAccessGrantedEmail(email: string, name: string | null, courseTitle: string): Promise<boolean> {
  const displayName = name ?? email;
  const subject = `Dostęp przyznany: ${courseTitle}`;
  const html = `<p>Cześć ${displayName},</p><p>Otrzymałeś dostęp do kursu <strong>${courseTitle}</strong>. Przejdź do portalu, aby się do niego odnieść.</p>`;
  return sendMail({ to: email, subject, html });
}

export async function sendCertificateIssuedEmail(email: string, name: string | null, courseTitle: string): Promise<boolean> {
  const displayName = name ?? email;
  const subject = `Certyfikat wystawiony: ${courseTitle}`;
  const html = `<p>Cześć ${displayName},</p><p>Gratulacje! Twoje ukończenie kursu <strong>${courseTitle}</strong> zostało potwierdzone certyfikatem. Sprawdź go w portalu.</p>`;
  return sendMail({ to: email, subject, html });
}
