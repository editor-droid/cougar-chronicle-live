import prisma from '@/lib/prisma';
import { isValidEmail, sendOneEmail } from '@/lib/email';
import {
  denverToday,
  deskReminderSubject,
  daysUntilTarget,
  formatDeskDate,
  noticesForRecipient,
  parseDeskNotices,
  plainTextLength,
  planDeskReminders,
  type DeskState,
} from '@/lib/desk-plan';

function siteOrigin(): string {
  const candidates = [process.env.NEXTAUTH_URL, process.env.AUTH_URL, process.env.NEXT_PUBLIC_SITE_URL];
  for (const raw of candidates) {
    if (!raw) continue;
    try {
      const url = new URL(raw);
      const isLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
      if (isLocal && process.env.NODE_ENV === 'production') continue;
      return url.origin;
    } catch {
      // Ignore a malformed env value and try the next one.
    }
  }
  return 'https://thecougarchronicle.com';
}

function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function editorLink(postId: string): string {
  return `${siteOrigin()}/dashboard/editor/${postId}`;
}

function statusLines(input: {
  state: DeskState;
  textLength: number;
  targetDate: string;
  hasPublishTime: boolean;
  scheduled: boolean;
  today: string;
}): string[] {
  const when = formatDeskDate(input.targetDate);
  const days = daysUntilTarget(input.targetDate, input.today);
  const lines: string[] = [];
  if (days === 1) lines.push(`The target publish date is tomorrow, ${when}.`);
  else if (days === 0) lines.push(`The target publish date is today, ${when}.`);
  else if (days < 0) lines.push(`The target publish date was ${when}, and this story is still open.`);
  else lines.push(`The target publish date is ${when}.`);

  if (input.state === 'DRAFT' && input.textLength < 40) {
    lines.push('The draft still looks unstarted.');
  } else if (input.state === 'DRAFT') {
    lines.push('It is still a draft and has not been sent to an editor.');
  } else if (input.state === 'IN_REVIEW') {
    lines.push('It is currently with an editor.');
  } else if (input.state === 'APPROVED' && !input.hasPublishTime) {
    lines.push('It is approved, and no publish time is set.');
  } else if (input.state === 'APPROVED' && input.scheduled) {
    lines.push('It is approved and a publish time is already set.');
  }
  return lines;
}

export async function notifyWriterAssigned(input: {
  postId: string;
  title: string;
  targetDate: string | null;
  writerName: string | null;
  writerEmail: string | null;
  editorName: string | null;
}): Promise<'sent' | 'skipped' | 'failed'> {
  if (!input.writerEmail || !isValidEmail(input.writerEmail)) return 'skipped';
  const when = input.targetDate ? formatDeskDate(input.targetDate) : 'not set yet';
  const editor = input.editorName?.trim() || 'not assigned yet';
  const greeting = input.writerName?.trim() ? `Hi ${esc(input.writerName.trim())},` : 'Hi,';
  const html = `<p>${greeting}</p>
<p>You are the writer on "<strong>${esc(input.title)}</strong>".</p>
<p>Target publish date: <strong>${esc(when)}</strong><br/>Editor: <strong>${esc(editor)}</strong></p>
<p><a href="${editorLink(input.postId)}">Open the draft</a></p>`;
  const sent = await sendOneEmail({
    to: input.writerEmail,
    subject: `Assigned: ${input.title}`,
    html,
  });
  return sent.ok ? 'sent' : 'failed';
}

export async function recordEditorOpened(input: {
  postId: string;
  title: string;
  state: string;
  assignedWriterId: string | null;
  deskNotices: string | null;
  openerId: string;
  openerName: string | null | undefined;
  openerRole: string;
}): Promise<void> {
  if (input.openerRole !== 'EDITOR' && input.openerRole !== 'ADMIN') return;
  if (!input.assignedWriterId || input.assignedWriterId === input.openerId) return;
  if (input.state === 'PUBLISHED') return;

  const key = `opened:${input.assignedWriterId}`;
  const notices = parseDeskNotices(input.deskNotices);
  if (notices.includes(key)) return;

  const writer = await prisma.user.findUnique({
    where: { id: input.assignedWriterId },
    select: { email: true, name: true },
  });
  const next = JSON.stringify([...notices, key]);
  const updated = await prisma.$executeRaw`
    UPDATE "Post"
    SET "editorOpenedAt" = NOW(),
        "deskNotices" = ${next}
    WHERE "id" = ${input.postId}
      AND ("deskNotices" IS NULL OR "deskNotices" NOT LIKE ${`%${key}%`})
  `;
  if (updated === 0) return;
  if (!writer?.email || !isValidEmail(writer.email)) return;

  const opener = input.openerName?.trim() || 'An editor';
  const greeting = writer.name?.trim() ? `Hi ${esc(writer.name.trim())},` : 'Hi,';
  const html = `<p>${greeting}</p>
<p>${esc(opener)} opened "<strong>${esc(input.title)}</strong>".</p>
<p><a href="${editorLink(input.postId)}">Open the draft</a></p>`;
  await sendOneEmail({
    to: writer.email,
    subject: `An editor opened: ${input.title}`,
    html,
  });
}

async function saveNotices(postId: string, notices: string[]) {
  const unique = [...new Set(notices)];
  await prisma.$executeRaw`
    UPDATE "Post"
    SET "deskNotices" = ${JSON.stringify(unique)}
    WHERE "id" = ${postId}
  `;
}

type DeskRecipient = {
  email: string;
  name: string | null;
  ids: string[];
};

function addRecipient(
  groups: Map<string, DeskRecipient>,
  id: string | null,
  person: { name: string | null; email: string | null } | null
) {
  if (!id || !person?.email || !isValidEmail(person.email)) return;
  const key = person.email.toLowerCase();
  const existing = groups.get(key);
  if (existing) {
    if (!existing.ids.includes(id)) existing.ids.push(id);
    if (!existing.name && person.name) existing.name = person.name;
    return;
  }
  groups.set(key, { email: person.email, name: person.name, ids: [id] });
}

export async function runDeskReminders(now = new Date()): Promise<{ checked: number; sent: number }> {
  const today = denverToday(now);
  const posts = await prisma.post.findMany({
    where: {
      state: { in: ['DRAFT', 'IN_REVIEW', 'APPROVED'] },
      targetPublishDate: { not: null },
      OR: [{ assignedWriterId: { not: null } }, { assignedEditorId: { not: null } }],
    },
    select: {
      id: true,
      title: true,
      state: true,
      content: true,
      publishedAt: true,
      targetPublishDate: true,
      deskAssignedAt: true,
      deskNotices: true,
      assignedWriterId: true,
      assignedEditorId: true,
      assignedWriter: { select: { name: true, email: true } },
      assignedEditor: { select: { name: true, email: true } },
    },
  });

  let sent = 0;
  for (const post of posts) {
    if (post.state === 'PUBLISHED' || !post.targetPublishDate) continue;
    const targetDate = `${post.targetPublishDate.getUTCFullYear()}-${String(post.targetPublishDate.getUTCMonth() + 1).padStart(2, '0')}-${String(post.targetPublishDate.getUTCDate()).padStart(2, '0')}`;
    const hasPublishTime = post.publishedAt != null;
    const scheduled = Boolean(post.publishedAt && post.publishedAt.getTime() > now.getTime());
    const assignedOn = post.deskAssignedAt ? denverToday(post.deskAssignedAt) : null;
    const notices = parseDeskNotices(post.deskNotices);
    const textLength = plainTextLength(post.content);
    const snapshot = {
      state: post.state as DeskState,
      textLength,
      targetDate,
      scheduled,
      hasPublishTime,
      assignedOn,
    };

    const groups = new Map<string, DeskRecipient>();
    addRecipient(groups, post.assignedWriterId, post.assignedWriter);
    addRecipient(groups, post.assignedEditorId, post.assignedEditor);
    if (groups.size === 0) continue;

    const lines = statusLines({ ...snapshot, today });
    const link = editorLink(post.id);
    let recorded = [...notices];

    for (const recipient of groups.values()) {
      const seen = new Set<string>();
      for (const id of recipient.ids) {
        const includeLegacy = id === post.assignedWriterId;
        for (const key of noticesForRecipient(notices, id, includeLegacy)) seen.add(key);
      }
      const plan = planDeskReminders({ ...snapshot, notices: [...seen] }, today);
      if (plan.keys.length === 0) continue;

      const greeting = recipient.name?.trim() ? `Hi ${esc(recipient.name.trim())},` : 'Hi,';
      const html = `<p>${greeting}</p>
<p>"<strong>${esc(post.title)}</strong>" is on the drafts desk.</p>
<ul>${lines.map((line) => `<li>${esc(line)}</li>`).join('')}</ul>
<p><a href="${link}">Open the draft</a></p>`;
      const result = await sendOneEmail({
        to: recipient.email,
        subject: deskReminderSubject(post.title, plan.reasons),
        html,
      });
      if (!result.ok) continue;
      recorded = [
        ...recorded,
        ...recipient.ids.flatMap((id) => plan.keys.map((key) => `${key}:${id}`)),
      ];
      sent += 1;
    }

    if (recorded.length !== notices.length) {
      await saveNotices(post.id, recorded);
    }
  }

  return { checked: posts.length, sent };
}
