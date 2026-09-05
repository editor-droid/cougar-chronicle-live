/**
 * Optional Google Analytics 4 + Search Console live data.
 *
 * Env:
 * - GA4_PROPERTY_ID, GSC_SITE_URL, GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY
 */

import { GoogleAuth } from 'google-auth-library';

export type PerformanceRange = '1d' | '7d' | '28d' | '90d';

export const PERFORMANCE_RANGES: {
  id: PerformanceRange;
  label: string;
  shortLabel: string;
}[] = [
  { id: '1d', label: 'Last 1 day', shortLabel: '1 day' },
  { id: '7d', label: 'Last 7 days', shortLabel: '7 days' },
  { id: '28d', label: 'Last 28 days', shortLabel: '28 days' },
  { id: '90d', label: 'Last 3 months', shortLabel: '3 months' },
];

export function parsePerformanceRange(raw: unknown): PerformanceRange {
  if (raw === '1d' || raw === '7d' || raw === '28d' || raw === '90d') return raw;
  return '28d';
}

export type Ga4Summary = {
  visits: number;
  people: number;
  pagesOpened: number;
  readRate: number | null;
  topPages: { path: string; views: number }[];
};

export type GscSummary = {
  googleClicks: number;
  timesShown: number;
  clickRate: number;
  avgRank: number;
  topSearches: { query: string; clicks: number; shown: number }[];
};

export type GooglePerformance = {
  configured: boolean;
  ga4: Ga4Summary | null;
  gsc: GscSummary | null;
  errors: string[];
  range: PerformanceRange;
  rangeLabel: string;
};

type DateWindow = {
  /** GA4 relative start, e.g. 7daysAgo */
  gaStart: string;
  gaEnd: string;
  /** Absolute YYYY-MM-DD for Search Console */
  gscStart: string;
  gscEnd: string;
  label: string;
};

function daysAgoYmd(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

function windowForRange(range: PerformanceRange): DateWindow {
  switch (range) {
    case '1d':
      return {
        gaStart: 'yesterday',
        gaEnd: 'yesterday',
        gscStart: daysAgoYmd(1),
        gscEnd: daysAgoYmd(1),
        label: 'Yesterday',
      };
    case '7d':
      return {
        gaStart: '7daysAgo',
        gaEnd: 'yesterday',
        gscStart: daysAgoYmd(7),
        gscEnd: daysAgoYmd(1),
        label: 'Last 7 days',
      };
    case '90d':
      return {
        gaStart: '90daysAgo',
        gaEnd: 'yesterday',
        gscStart: daysAgoYmd(90),
        gscEnd: daysAgoYmd(1),
        label: 'Last 3 months',
      };
    case '28d':
    default:
      return {
        gaStart: '28daysAgo',
        gaEnd: 'yesterday',
        gscStart: daysAgoYmd(28),
        gscEnd: daysAgoYmd(1),
        label: 'Last 28 days',
      };
  }
}

function credentialsFromEnv(): { client_email: string; private_key: string } | null {
  const client_email = process.env.GOOGLE_CLIENT_EMAIL?.trim();
  let private_key = process.env.GOOGLE_PRIVATE_KEY?.trim();
  if (!client_email || !private_key) return null;
  private_key = private_key.replace(/\\n/g, '\n');
  return { client_email, private_key };
}

async function getAccessToken(scopes: string[]): Promise<string | null> {
  const creds = credentialsFromEnv();
  if (!creds) return null;
  const auth = new GoogleAuth({
    credentials: {
      client_email: creds.client_email,
      private_key: creds.private_key,
    },
    scopes,
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  return token.token || null;
}

async function fetchGa4(
  propertyId: string,
  token: string,
  win: DateWindow
): Promise<Ga4Summary> {
  const id = propertyId.replace(/^properties\//, '');
  const dateRanges = [{ startDate: win.gaStart, endDate: win.gaEnd }];

  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${id}:runReport`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dateRanges,
        metrics: [
          { name: 'sessions' },
          { name: 'totalUsers' },
          { name: 'screenPageViews' },
          { name: 'engagementRate' },
        ],
      }),
      next: { revalidate: 900 },
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GA4 ${res.status}: ${text.slice(0, 240)}`);
  }
  const data = await res.json();
  const row = data.rows?.[0]?.metricValues || [];
  const visits = Number(row[0]?.value || 0);
  const people = Number(row[1]?.value || 0);
  const pagesOpened = Number(row[2]?.value || 0);
  const readRate = row[3]?.value != null ? Number(row[3].value) : null;

  const pagesRes = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${id}:runReport`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dateRanges,
        dimensions: [{ name: 'pagePath' }],
        metrics: [{ name: 'screenPageViews' }],
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        limit: 10,
      }),
      next: { revalidate: 900 },
    }
  );
  let topPages: { path: string; views: number }[] = [];
  if (pagesRes.ok) {
    const pagesData = await pagesRes.json();
    topPages = (pagesData.rows || []).map((r: any) => ({
      path: r.dimensionValues?.[0]?.value || '/',
      views: Number(r.metricValues?.[0]?.value || 0),
    }));
  }

  return { visits, people, pagesOpened, readRate, topPages };
}

async function fetchGsc(
  siteUrl: string,
  token: string,
  win: DateWindow
): Promise<GscSummary> {
  const res = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        startDate: win.gscStart,
        endDate: win.gscEnd,
        dimensions: ['query'],
        rowLimit: 10,
        dataState: 'final',
      }),
      next: { revalidate: 900 },
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Search Console ${res.status}: ${text.slice(0, 240)}`);
  }
  const data = await res.json();
  const rows = data.rows || [];

  const totalRes = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        startDate: win.gscStart,
        endDate: win.gscEnd,
        dataState: 'final',
      }),
      next: { revalidate: 900 },
    }
  );

  let googleClicks = 0;
  let timesShown = 0;
  let clickRate = 0;
  let avgRank = 0;

  if (totalRes.ok) {
    const totalData = await totalRes.json();
    const t = totalData.rows?.[0];
    if (t) {
      googleClicks = t.clicks || 0;
      timesShown = t.impressions || 0;
      clickRate = t.ctr ?? (timesShown ? googleClicks / timesShown : 0);
      avgRank = t.position ?? 0;
    }
  } else {
    for (const r of rows) {
      googleClicks += r.clicks || 0;
      timesShown += r.impressions || 0;
    }
    clickRate = timesShown ? googleClicks / timesShown : 0;
  }

  return {
    googleClicks,
    timesShown,
    clickRate,
    avgRank,
    topSearches: rows.map((r: any) => ({
      query: r.keys?.[0] || '',
      clicks: r.clicks || 0,
      shown: r.impressions || 0,
    })),
  };
}

export function parseYmdParam(raw: unknown): string | null {
  if (typeof raw !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(raw.trim())) return null;
  const value = raw.trim();
  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) {
    return null;
  }
  return value;
}

function windowForCustom(start: string, end: string): DateWindow {
  return {
    gaStart: start,
    gaEnd: end,
    gscStart: start,
    gscEnd: end,
    label: `${start} – ${end}`,
  };
}

export async function getGooglePerformance(
  range: PerformanceRange = '28d',
  custom?: { startDate: string; endDate: string } | null
): Promise<GooglePerformance> {
  const errors: string[] = [];
  const propertyId = process.env.GA4_PROPERTY_ID?.trim();
  const siteUrl = process.env.GSC_SITE_URL?.trim();
  const creds = credentialsFromEnv();
  const win =
    custom?.startDate && custom?.endDate
      ? windowForCustom(custom.startDate, custom.endDate)
      : windowForRange(range);

  if (!creds) {
    return {
      configured: false,
      ga4: null,
      gsc: null,
      errors: [
        'Google service account not configured. Set GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY.',
      ],
      range,
      rangeLabel: win.label,
    };
  }

  const configured = Boolean(propertyId || siteUrl);
  let ga4: Ga4Summary | null = null;
  let gsc: GscSummary | null = null;

  if (propertyId) {
    try {
      const token = await getAccessToken([
        'https://www.googleapis.com/auth/analytics.readonly',
      ]);
      if (!token) throw new Error('Could not obtain GA4 access token');
      ga4 = await fetchGa4(propertyId, token, win);
    } catch (e) {
      errors.push(e instanceof Error ? e.message : 'Website traffic fetch failed');
    }
  } else {
    errors.push('GA4_PROPERTY_ID not set (use the numeric property id).');
  }

  if (siteUrl) {
    try {
      const token = await getAccessToken([
        'https://www.googleapis.com/auth/webmasters.readonly',
      ]);
      if (!token) throw new Error('Could not obtain Search Console access token');
      gsc = await fetchGsc(siteUrl, token, win);
    } catch (e) {
      errors.push(e instanceof Error ? e.message : 'Google Search fetch failed');
    }
  } else {
    errors.push('GSC_SITE_URL not set (e.g. sc-domain:thecougarchronicle.com).');
  }

  return {
    configured,
    ga4,
    gsc,
    errors,
    range,
    rangeLabel: win.label,
  };
}

/** Public site origin for building clickable page links */
export function publicSiteOrigin(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXTAUTH_URL ||
    'https://thecougarchronicle.com';
  return raw.replace(/\/$/, '');
}
