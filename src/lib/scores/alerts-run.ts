import webpush from 'web-push';
import prisma from '@/lib/prisma';
import { getResend, isResendConfigured, isValidEmail, NEWSLETTER_FROM } from '@/lib/email';
import { getByuScores } from './get-byu-scores';
import { listGames, type ListedGame } from './stories';
import { gameHref, SPORT_SPECS } from './paths';
import { siteOrigin } from './seo';
import { alertTokenSecret, signAlertToken, verifyAlertToken } from './alert-token';
import {
  alertCopy,
  alertsForRecipient,
  parseSportSelection,
  selectDueAlerts,
  type DueAlert,
  type SentMarker,
} from './alerts';
import type { SportKey } from './types';

export type AlertRunResult = {
  enabled: boolean;
  due: number;
  sent: number;
};

type Fail = { ok: false; status: number; error: string };

function audienceId(): string {
  return process.env.RESEND_ALERTS_AUDIENCE_ID?.trim() || '';
}

export function vapidSubject(raw: string | undefined): string | null {
  const value = (raw || '').trim();
  if (!value) return null;
  if (value.startsWith('mailto:') || value.startsWith('https://')) return value;
  if (value.includes('@') && !/\s/.test(value)) return `mailto:${value}`;
  return null;
}

export function alertChannels() {
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim() || '';
  const push = Boolean(publicKey && process.env.VAPID_PRIVATE_KEY?.trim() && vapidSubject(process.env.VAPID_SUBJECT));
  const email = Boolean(isResendConfigured() && audienceId() && alertTokenSecret());
  return { email, push, publicKey: push ? publicKey : null };
}

function isUnique(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: unknown }).code === 'P2002';
}

function pushStatus(error: unknown): number | null {
  if (typeof error === 'object' && error !== null && 'statusCode' in error) {
    const code = (error as { statusCode?: unknown }).statusCode;
    return typeof code === 'number' ? code : null;
  }
  return null;
}

function isHttpsEndpoint(value: string): boolean {
  if (value.length < 12 || value.length > 2000) return false;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

function isKey(value: string): boolean {
  return value.length >= 8 && value.length <= 200;
}

function idempotencyKey(value: string): string {
  return value.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 256);
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Adds the address to the alerts audience only.
 * Does not set the contact's global unsubscribe flag, and does not touch any other segment.
 */
async function addToAlertsAudience(email: string) {
  const id = audienceId();
  if (!id || !isResendConfigured()) return;
  try {
    const resend = getResend();
    const created = await resend.contacts.create({ email, segments: [{ id }] });
    if (!created.error) return;
    const added = await resend.contacts.segments.add({ email, segmentId: id });
    if (added.error) console.error('[sports-alerts] audience add failed', added.error.name);
  } catch {
    console.error('[sports-alerts] audience add failed');
  }
}

async function removeFromAlertsAudience(email: string) {
  const id = audienceId();
  if (!id || !isResendConfigured()) return;
  try {
    const removed = await getResend().contacts.segments.remove({ email, segmentId: id });
    if (removed.error && removed.error.name !== 'not_found') {
      console.error('[sports-alerts] audience remove failed', removed.error.name);
    }
  } catch {
    console.error('[sports-alerts] audience remove failed');
  }
}

async function sendAlertEmail(opts: {
  to: string;
  subject: string;
  html: string;
  listUnsubscribe: string;
  idempotencyKey: string;
}): Promise<boolean> {
  try {
    const result = await getResend().emails.send(
      {
        from: NEWSLETTER_FROM,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
        headers: {
          'List-Unsubscribe': `<${opts.listUnsubscribe}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      },
      { idempotencyKey: opts.idempotencyKey },
    );
    if (result.error || !result.data?.id) {
      console.error('[sports-alerts] email failed', result.error?.name || 'empty');
      return false;
    }
    return true;
  } catch {
    console.error('[sports-alerts] email failed');
    return false;
  }
}

function confirmHtml(labels: string, confirmUrl: string, unsubscribeUrl: string): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Confirm BYU game-day alerts</title></head><body style="margin:0;padding:24px;color:#1A1A1A;font-family:Georgia,serif;">
<h1 style="font-size:22px;line-height:1.3;color:#1B2253;">Confirm game-day alerts</h1>
<p style="font-size:16px;line-height:1.5;">Sports: ${escapeHtml(labels)}.</p>
<p style="font-size:16px;line-height:1.5;"><a href="${escapeHtml(confirmUrl)}" style="color:#1B2253;">Confirm these alerts</a></p>
<p style="font-size:13px;line-height:1.5;color:#444444;">The Cougar Chronicle is an independent student newspaper. It is not affiliated with Brigham Young University. Nothing is sent until you confirm.</p>
<p style="font-size:12px;line-height:1.5;"><a href="${escapeHtml(unsubscribeUrl)}" style="color:#1B2253;">Unsubscribe</a></p>
</body></html>`;
}

async function replaceEmailSports(emailId: string, sports: SportKey[]) {
  await prisma.sportsAlertEmailSport.deleteMany({ where: { emailId } });
  if (sports.length === 0) return;
  await prisma.sportsAlertEmailSport.createMany({
    data: sports.map((sport) => ({ emailId, sport })),
  });
}

export async function requestEmailAlerts(rawEmail: unknown, rawSports: unknown): Promise<
  { ok: true; status: 'confirm' | 'updated' } | Fail
> {
  const channels = alertChannels();
  if (!channels.email) return { ok: false, status: 503, error: 'Email alerts are not available.' };
  const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : '';
  const sports = parseSportSelection(rawSports);
  if (!isValidEmail(email) || sports.length === 0) {
    return { ok: false, status: 400, error: 'Enter an email and choose at least one sport.' };
  }
  const secret = alertTokenSecret();
  if (!secret) return { ok: false, status: 503, error: 'Email alerts are not available.' };

  const existing = await prisma.sportsAlertEmail.findUnique({ where: { email } });
  const row = existing ?? await prisma.sportsAlertEmail.create({ data: { email } });
  await replaceEmailSports(row.id, sports);
  if (existing?.unsubscribedAt) {
    await prisma.sportsAlertEmail.update({
      where: { id: row.id },
      data: { unsubscribedAt: null, confirmedAt: null },
    });
  }
  if (existing?.confirmedAt && !existing.unsubscribedAt) {
    await addToAlertsAudience(email);
    return { ok: true, status: 'updated' };
  }

  const origin = siteOrigin();
  const confirmToken = signAlertToken(email, 'confirm', secret);
  const unsubToken = signAlertToken(email, 'unsubscribe', secret);
  const confirmUrl = `${origin}/sports/alerts/confirm?token=${encodeURIComponent(confirmToken)}`;
  const pageUnsub = `${origin}/sports/alerts/unsubscribe?token=${encodeURIComponent(unsubToken)}`;
  const labels = sports.map((sport) => SPORT_SPECS[sport].label).join(', ');
  const hour = Math.floor(Date.now() / (60 * 60 * 1000));
  const sent = await sendAlertEmail({
    to: email,
    subject: 'Confirm BYU game-day alerts',
    html: confirmHtml(labels, confirmUrl, pageUnsub),
    listUnsubscribe: `${origin}/api/sports/alerts/unsubscribe?token=${encodeURIComponent(unsubToken)}`,
    idempotencyKey: idempotencyKey(`sports-confirm-${sports.join('-')}-${email}-${hour}`),
  });
  if (!sent) return { ok: false, status: 502, error: 'Could not send the confirmation email.' };
  return { ok: true, status: 'confirm' };
}

export async function confirmAlertEmail(token: string): Promise<'ok' | 'invalid' | 'disabled'> {
  const secret = alertTokenSecret();
  if (!secret) return 'disabled';
  const verified = verifyAlertToken(token, secret, 'confirm');
  if (!verified.ok) return 'invalid';
  const row = await prisma.sportsAlertEmail.findUnique({ where: { email: verified.email } });
  if (!row || row.unsubscribedAt) return 'invalid';
  await prisma.sportsAlertEmail.update({
    where: { id: row.id },
    data: { confirmedAt: row.confirmedAt ?? new Date() },
  });
  await addToAlertsAudience(verified.email);
  return 'ok';
}

export async function unsubscribeAlertEmail(token: string): Promise<'ok' | 'invalid' | 'disabled'> {
  const secret = alertTokenSecret();
  if (!secret) return 'disabled';
  const verified = verifyAlertToken(token, secret, 'unsubscribe');
  if (!verified.ok) return 'invalid';
  await prisma.sportsAlertEmail.updateMany({
    where: { email: verified.email },
    data: { unsubscribedAt: new Date(), confirmedAt: null },
  });
  await removeFromAlertsAudience(verified.email);
  return 'ok';
}

export async function savePushAlerts(body: {
  endpoint?: unknown;
  keys?: { p256dh?: unknown; auth?: unknown };
  p256dh?: unknown;
  auth?: unknown;
  sports?: unknown;
}): Promise<{ ok: true } | Fail> {
  if (!alertChannels().push) return { ok: false, status: 503, error: 'Browser alerts are not available.' };
  const endpoint = typeof body.endpoint === 'string' ? body.endpoint.trim() : '';
  const p256dh = typeof body.keys?.p256dh === 'string'
    ? body.keys.p256dh
    : typeof body.p256dh === 'string' ? body.p256dh : '';
  const authKey = typeof body.keys?.auth === 'string'
    ? body.keys.auth
    : typeof body.auth === 'string' ? body.auth : '';
  const sports = parseSportSelection(body.sports);
  if (!isHttpsEndpoint(endpoint) || !isKey(p256dh) || !isKey(authKey) || sports.length === 0) {
    return { ok: false, status: 400, error: 'Choose at least one sport and allow notifications.' };
  }
  const row = await prisma.sportsAlertPush.upsert({
    where: { endpoint },
    create: { endpoint, p256dh, auth: authKey },
    update: { p256dh, auth: authKey },
  });
  await prisma.sportsAlertPushSport.deleteMany({ where: { pushId: row.id } });
  await prisma.sportsAlertPushSport.createMany({
    data: sports.map((sport) => ({ pushId: row.id, sport })),
  });
  return { ok: true };
}

async function claimSend(alert: DueAlert, channel: 'email' | 'push', recipientId: string): Promise<boolean> {
  try {
    await prisma.sportsAlertSend.create({
      data: {
        eventId: alert.eventId,
        sport: alert.sport,
        kind: alert.kind,
        channel,
        recipientId,
      },
    });
    return true;
  } catch (error) {
    if (!isUnique(error)) console.error('[sports-alerts] claim failed', alert.kind);
    return false;
  }
}

async function releaseSend(alert: DueAlert, channel: 'email' | 'push', recipientId: string) {
  await prisma.sportsAlertSend.deleteMany({
    where: {
      eventId: alert.eventId,
      kind: alert.kind,
      channel,
      recipientId,
    },
  });
}

function listedGame(games: ListedGame[], alert: DueAlert): ListedGame | undefined {
  return games.find((item) => item.sport === alert.sport && item.game.id === alert.eventId);
}

async function sendDueEmail(due: DueAlert[], games: ListedGame[]): Promise<number> {
  const secret = alertTokenSecret();
  if (!secret) return 0;
  const rows = await prisma.sportsAlertEmail.findMany({
    where: { confirmedAt: { not: null }, unsubscribedAt: null },
    include: { sports: { select: { sport: true } } },
  });
  if (rows.length === 0) return 0;
  const markers: SentMarker[] = await prisma.sportsAlertSend.findMany({
    where: { channel: 'email', eventId: { in: [...new Set(due.map((alert) => alert.eventId))] } },
    select: { eventId: true, kind: true, recipientId: true },
  });
  const origin = siteOrigin();
  let sent = 0;
  for (const row of rows) {
    const pending = alertsForRecipient(due, row.sports.map((sport) => sport.sport), row.id, markers);
    for (const alert of pending) {
      const item = listedGame(games, alert);
      if (!item) continue;
      if (!await claimSend(alert, 'email', row.id)) continue;
      const token = signAlertToken(row.email, 'unsubscribe', secret);
      const pageUrl = `${origin}${gameHref(alert.sport, alert.eventId)}`;
      const unsubscribeUrl = `${origin}/sports/alerts/unsubscribe?token=${encodeURIComponent(token)}`;
      const copy = alertCopy({
        kind: alert.kind,
        sportLabel: SPORT_SPECS[alert.sport].label,
        game: item.game,
        pageUrl,
        unsubscribeUrl,
      });
      const ok = await sendAlertEmail({
        to: row.email,
        subject: copy.subject,
        html: copy.html,
        listUnsubscribe: `${origin}/api/sports/alerts/unsubscribe?token=${encodeURIComponent(token)}`,
        idempotencyKey: idempotencyKey(`sports-${alert.kind}-${alert.eventId}-${row.id}`),
      });
      if (!ok) {
        await releaseSend(alert, 'email', row.id);
        continue;
      }
      sent += 1;
      markers.push({ eventId: alert.eventId, kind: alert.kind, recipientId: row.id });
    }
  }
  return sent;
}

async function sendDuePush(due: DueAlert[], games: ListedGame[]): Promise<number> {
  const subject = vapidSubject(process.env.VAPID_SUBJECT);
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  if (!subject || !publicKey || !privateKey) return 0;
  webpush.setVapidDetails(subject, publicKey, privateKey);

  const rows = await prisma.sportsAlertPush.findMany({
    include: { sports: { select: { sport: true } } },
  });
  if (rows.length === 0) return 0;
  const markers: SentMarker[] = await prisma.sportsAlertSend.findMany({
    where: { channel: 'push', eventId: { in: [...new Set(due.map((alert) => alert.eventId))] } },
    select: { eventId: true, kind: true, recipientId: true },
  });
  const origin = siteOrigin();
  let sent = 0;
  for (const row of rows) {
    const pending = alertsForRecipient(due, row.sports.map((sport) => sport.sport), row.id, markers);
    for (const alert of pending) {
      const item = listedGame(games, alert);
      if (!item) continue;
      if (!await claimSend(alert, 'push', row.id)) continue;
      const pageUrl = `${origin}${gameHref(alert.sport, alert.eventId)}`;
      const copy = alertCopy({
        kind: alert.kind,
        sportLabel: SPORT_SPECS[alert.sport].label,
        game: item.game,
        pageUrl,
      });
      try {
        await webpush.sendNotification(
          { endpoint: row.endpoint, keys: { auth: row.auth, p256dh: row.p256dh } },
          JSON.stringify({ title: copy.title, message: copy.message, url: pageUrl }),
        );
        sent += 1;
        markers.push({ eventId: alert.eventId, kind: alert.kind, recipientId: row.id });
      } catch (error) {
        const status = pushStatus(error);
        if (status === 404 || status === 410) {
          await prisma.sportsAlertPush.delete({ where: { id: row.id } }).catch(() => undefined);
          break;
        }
        console.error('[sports-alerts] push failed', status);
        await releaseSend(alert, 'push', row.id);
      }
    }
  }
  return sent;
}

export async function runGameDayAlerts(now = Date.now()): Promise<AlertRunResult> {
  const channels = alertChannels();
  if (!channels.email && !channels.push) return { enabled: false, due: 0, sent: 0 };
  const payload = await getByuScores(now);
  if (!payload) return { enabled: true, due: 0, sent: 0 };
  const games = listGames(payload);
  const due = selectDueAlerts(games, now);
  if (due.length === 0) return { enabled: true, due: 0, sent: 0 };

  let sent = 0;
  if (channels.email) {
    try {
      sent += await sendDueEmail(due, games);
    } catch (error) {
      console.error('[sports-alerts] email run failed', error instanceof Error ? error.message : '');
    }
  }
  if (channels.push) {
    try {
      sent += await sendDuePush(due, games);
    } catch (error) {
      console.error('[sports-alerts] push run failed', error instanceof Error ? error.message : '');
    }
  }
  return { enabled: true, due: due.length, sent };
}
