/** Shared byline matching: aliases, close spellings, and joint "A and B" credits. */

export const ORG_BYLINES = new Set([
  'the cougar chronicle',
  'cougar chronicle',
  'editorial board',
  'staff',
  'staff writer',
  'guest contributor',
]);

const FIRST_ALIASES: Record<string, string> = {
  alex: 'alexander',
  alexander: 'alexander',
  tommy: 'thomas',
  tom: 'thomas',
  thomas: 'thomas',
  sam: 'samuel',
  samuel: 'samuel',
  liz: 'elizabeth',
  eliza: 'elizabeth',
  elizabeth: 'elizabeth',
};

export function normName(value: string | null | undefined): string {
  return (value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function isOrgByline(name: string): boolean {
  return ORG_BYLINES.has(normName(name));
}

export function splitBylineNames(byline: string | null | undefined): string[] {
  const trimmed = (byline || '').trim();
  if (!trimmed) return [];
  return trimmed
    .split(/\s*(?:,\s*and\s+|,\s+|&|\band\b)\s*/i)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function isJointByline(name: string | null | undefined): boolean {
  return splitBylineNames(name).length > 1;
}

function canonFirst(first: string): string {
  return FIRST_ALIASES[first] || first;
}

function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const prev = new Array(b.length + 1);
  const cur = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    cur[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j++) prev[j] = cur[j];
  }
  return prev[b.length];
}

export function buildFirstNameIndex(names: string[]): Map<string, string[]> {
  const firstNameIndex = new Map<string, string[]>();
  for (const name of names) {
    const n = normName(name);
    const first = n.split(' ')[0];
    if (!first) continue;
    const list = firstNameIndex.get(first) || [];
    if (!list.includes(n)) list.push(n);
    firstNameIndex.set(first, list);
  }
  return firstNameIndex;
}

function singleNameMatch(
  person: string,
  byline: string,
  firstNameIndex: Map<string, string[]>
): boolean {
  const a = normName(person);
  const b = normName(byline);
  if (!a || !b) return false;
  if (a === b) return true;
  if (Math.max(a.length, b.length) >= 6 && editDistance(a, b) <= 2) return true;
  const aParts = a.split(' ');
  const bParts = b.split(' ');
  if (aParts.length >= 2 && bParts.length >= 2) {
    const aLast = aParts[aParts.length - 1];
    const bLast = bParts[bParts.length - 1];
    if (aLast === bLast && canonFirst(aParts[0]) === canonFirst(bParts[0])) return true;
    if (
      aLast.length >= 5 &&
      bLast.length >= 5 &&
      editDistance(aLast, bLast) <= 1 &&
      canonFirst(aParts[0]) === canonFirst(bParts[0])
    ) {
      return true;
    }
  }
  const first = bParts[0];
  if (bParts.length === 1 && firstNameIndex.get(first)?.length === 1) {
    return firstNameIndex.get(first)![0] === a;
  }
  return false;
}

/** Person matches a byline, including each name in "A and B". */
export function namesMatch(
  person: string,
  byline: string,
  firstNameIndex: Map<string, string[]>
): boolean {
  const parts = splitBylineNames(byline);
  if (parts.length > 1) {
    return parts.some((part) => singleNameMatch(person, part, firstNameIndex));
  }
  return singleNameMatch(person, byline, firstNameIndex);
}

export function schemaAuthors(byline: string): { '@type': 'Person'; name: string }[] {
  const parts = splitBylineNames(byline);
  const names = parts.length ? parts : [byline || 'Staff'];
  return names.map((name) => ({ '@type': 'Person' as const, name }));
}

/** Replace one credited name inside a byline, including joint "A and B". */
export function rewriteBylineName(
  byline: string,
  fromName: string,
  toName: string
): string {
  const from = normName(fromName);
  const to = (toName || '').trim();
  if (!from || !to) return byline;
  const parts = splitBylineNames(byline);
  if (!parts.length) {
    return normName(byline) === from ? to : byline;
  }
  let changed = false;
  const next = parts.map((part) => {
    if (normName(part) === from) {
      changed = true;
      return to;
    }
    return part;
  });
  if (!changed) return byline;
  if (next.length === 1) return next[0];
  if (next.length === 2) return `${next[0]} and ${next[1]}`;
  return `${next.slice(0, -1).join(', ')} and ${next[next.length - 1]}`;
}
