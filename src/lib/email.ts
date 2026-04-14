import { db } from '@/lib/db';
import nodemailer from 'nodemailer';

type SMTPConfig = {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
};

async function getSMTPConfig(): Promise<SMTPConfig> {
  const configs = await db.aIConfig.findMany({
    where: {
      key: { in: ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'] },
    },
  });
  const map: Record<string, string> = {};
  for (const c of configs) map[c.key] = c.value;

  const host = map.SMTP_HOST || process.env.SMTP_HOST || '';
  const port = Number(map.SMTP_PORT || process.env.SMTP_PORT || 587);
  const user = map.SMTP_USER || process.env.SMTP_USER || '';
  const pass = map.SMTP_PASS || process.env.SMTP_PASS || '';
  const from = map.SMTP_FROM || process.env.SMTP_FROM || user;

  if (!host || !user || !pass || !from) {
    throw new Error('SMTP is not configured (SMTP_HOST/SMTP_USER/SMTP_PASS/SMTP_FROM)');
  }

  return { host, port: Number.isFinite(port) ? port : 587, user, pass, from };
}

export async function sendEmailText(params: { to: string; subject: string; body: string }) {
  const cfg = await getSMTPConfig();
  const transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.port === 465,
    auth: { user: cfg.user, pass: cfg.pass },
  });

  await transporter.sendMail({
    from: cfg.from,
    to: params.to,
    subject: params.subject,
    text: params.body,
  });
}

