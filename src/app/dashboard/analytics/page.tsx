import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import DashboardHeader from '@/components/DashboardHeader';
import { getSiteAnalyticsSnapshot } from '@/lib/site-analytics';
import {
  getGooglePerformance,
  parsePerformanceRange,
  PERFORMANCE_RANGES,
  publicSiteOrigin,
} from '@/lib/google-performance';
import { getArticleUrl } from '@/lib/routes';
import styles from './Analytics.module.css';

function fmt(n: number) {
  return n.toLocaleString();
}

function pct(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}

function pageHref(path: string, origin: string) {
  if (!path) return origin;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
}

export default async function AnalyticsPage(props: {
  searchParams?: Promise<{ range?: string }>;
}) {
  const session = await auth();
  if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'EDITOR')) {
    redirect('/dashboard');
  }

  const sp = await props.searchParams;
  const range = parsePerformanceRange(sp?.range);
  const siteOrigin = publicSiteOrigin();

  const [site, google] = await Promise.all([
    getSiteAnalyticsSnapshot(),
    getGooglePerformance(range),
  ]);

  const t = site.totals;
  const maxCatViews = Math.max(1, ...site.viewsByCategory.map((c) => c.views));

  const kpis = [
    { label: 'Article views', value: fmt(t.totalArticleViews), hint: 'Times people opened stories' },
    { label: 'Published stories', value: fmt(t.publishedPosts), hint: 'Live on the site' },
    { label: 'Still in progress', value: fmt(t.draftPosts), hint: 'Drafts & in review' },
    { label: 'Email list', value: fmt(t.activeSubscribers), hint: 'Active subscribers' },
    { label: 'Video page opens', value: fmt(t.videoPageViews), hint: 'Watch page views' },
    { label: 'Donations raised', value: `$${fmt(Math.round(t.donationsTotal))}`, hint: 'Fundraiser total' },
    { label: 'Print orders', value: fmt(t.printOrders), hint: 'Physical / digital print buys' },
    { label: 'Videos online', value: fmt(t.videos), hint: 'Active videos' },
  ];

  return (
    <div className={`container animate-fade-in ${styles.page}`} style={{ marginTop: '1rem' }}>
      <DashboardHeader currentTab="analytics" title="Performance" />

      <p className={styles.intro}>
        A clear snapshot of the Chronicle — what&apos;s live on our site, and what Google is sending us.
      </p>

      {/* —— Our site (all time) —— */}
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <div>
            <p className={styles.sectionEyebrow}>Chronicle</p>
            <h2 className={styles.sectionTitle}>On our site</h2>
          </div>
          <p className={styles.sectionHint}>All-time totals from the newsroom database</p>
        </div>

        <div className={styles.kpiGrid}>
          {kpis.map((k) => (
            <div key={k.label} className={styles.kpi} title={k.hint}>
              <p className={styles.kpiLabel}>{k.label}</p>
              <p className={styles.kpiValue}>{k.value}</p>
              <p className={styles.kpiHint}>{k.hint}</p>
            </div>
          ))}
        </div>
      </section>

      {/* —— Google (filtered) —— */}
      <section className={styles.section}>
        <div className={styles.googleShell}>
          <div className={styles.googleHead}>
            <div className={styles.googleTitleRow}>
              <p className={styles.sectionEyebrow}>Google</p>
              <h2 className={styles.sectionTitle}>Traffic &amp; search</h2>
            </div>

            <div className={styles.rangePills} role="navigation" aria-label="Date range for Google numbers">
              {PERFORMANCE_RANGES.map((r) => {
                const active = range === r.id;
                return (
                  <Link
                    key={r.id}
                    href={`/dashboard/analytics?range=${r.id}`}
                    className={`${styles.rangePill} ${active ? styles.rangePillActive : ''}`}
                    scroll={false}
                  >
                    {r.shortLabel}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className={styles.googleGrid}>
            {/* Website traffic */}
            <article className={styles.panel}>
              <div className={styles.panelHead}>
                <h3 className={styles.panelTitle}>Website traffic</h3>
                <span className={styles.panelBadge}>{google.rangeLabel}</span>
              </div>
              <div className={styles.panelBody}>
                {google.ga4 ? (
                  <>
                    <div className={styles.metricGrid}>
                      <Metric
                        label="Visits"
                        value={fmt(google.ga4.visits)}
                        hint="How many times people came to the site"
                      />
                      <Metric
                        label="People"
                        value={fmt(google.ga4.people)}
                        hint="Roughly how many different people"
                      />
                      <Metric
                        label="Pages opened"
                        value={fmt(google.ga4.pagesOpened)}
                        hint="Total pages loaded"
                      />
                      <Metric
                        label="Stuck around"
                        value={google.ga4.readRate != null ? pct(google.ga4.readRate) : '—'}
                        hint="Share of visits that actually engaged"
                      />
                    </div>

                    {google.ga4.topPages.length > 0 && (
                      <div className={styles.listBlock}>
                        <p className={styles.listTitle}>Most-opened pages</p>
                        <ul className={styles.list}>
                          {google.ga4.topPages.map((p) => (
                            <li key={p.path} className={styles.listItem}>
                              <a
                                href={pageHref(p.path, siteOrigin)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.listLink}
                                title={p.path}
                              >
                                {p.path}
                              </a>
                              <span className={styles.listCount}>{fmt(p.views)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                ) : (
                  <p className={styles.empty}>Website traffic not available for this range.</p>
                )}
              </div>
            </article>

            {/* Google search */}
            <article className={styles.panel}>
              <div className={styles.panelHead}>
                <h3 className={styles.panelTitle}>Google search</h3>
                <span className={styles.panelBadge}>{google.rangeLabel}</span>
              </div>
              <div className={styles.panelBody}>
                {google.gsc ? (
                  <>
                    <div className={styles.metricGrid}>
                      <Metric
                        label="Clicks from Google"
                        value={fmt(google.gsc.googleClicks)}
                        hint="People who clicked our site in Google"
                      />
                      <Metric
                        label="Times shown"
                        value={fmt(google.gsc.timesShown)}
                        hint="How often we appeared in results"
                      />
                      <Metric
                        label="Click rate"
                        value={pct(google.gsc.clickRate)}
                        hint="Of the times we showed up, how often people clicked"
                      />
                      <Metric
                        label="Avg. place in results"
                        value={google.gsc.avgRank.toFixed(1)}
                        hint="Lower is better (1 = top of page 1)"
                      />
                    </div>

                    {google.gsc.topSearches.length > 0 && (
                      <div className={styles.listBlock}>
                        <p className={styles.listTitle}>What people searched</p>
                        <ul className={styles.list}>
                          {google.gsc.topSearches.map((q) => (
                            <li key={q.query} className={styles.listItem}>
                              <a
                                href={`https://www.google.com/search?q=${encodeURIComponent(q.query)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.listLink}
                                title={q.query}
                              >
                                {q.query}
                              </a>
                              <span className={styles.listCount}>{fmt(q.clicks)} clicks</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <p className={styles.footnote}>Google search numbers can lag by a day or two.</p>
                  </>
                ) : (
                  <p className={styles.empty}>Google search not available for this range.</p>
                )}
              </div>
            </article>
          </div>

          {google.errors.length > 0 && (
            <div className={styles.notes}>
              <strong>Connection notes</strong>
              <ul>
                {google.errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      {/* —— Stories / sections —— */}
      <div className={styles.split}>
        <div className="dash-card">
          <div className="dash-card-header">
            <h2 className="dash-section-title">Top stories</h2>
            <span className="dash-badge dash-badge-navy">All time</span>
          </div>
          <div className="dashboard-table-scroll">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Views</th>
                </tr>
              </thead>
              <tbody>
                {site.topPosts.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link href={getArticleUrl(p)} className="dash-title-link" target="_blank">
                        {p.title}
                      </Link>
                    </td>
                    <td>
                      <span className="dash-badge dash-badge-navy">{fmt(p.views)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="dash-card">
          <div className="dash-card-header">
            <h2 className="dash-section-title">Views by section</h2>
            <span className="dash-badge dash-badge-navy">All time</span>
          </div>
          <div style={{ padding: '1.1rem 1.2rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            {site.viewsByCategory.map((c) => (
              <div key={c.category} className={styles.barRow}>
                <div className={styles.barMeta}>
                  <span style={{ fontWeight: 700, textTransform: 'capitalize' }}>{c.category}</span>
                  <span className="text-muted" style={{ fontSize: '0.8rem' }}>
                    {fmt(c.views)} · {c.count} posts
                  </span>
                </div>
                <div className={styles.barTrack}>
                  <div
                    className={styles.barFill}
                    style={{ width: `${(c.views / maxCatViews) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className={styles.metric} title={hint}>
      <p className={styles.metricLabel}>{label}</p>
      <p className={styles.metricValue}>{value}</p>
      {hint ? <p className={styles.metricHint}>{hint}</p> : null}
    </div>
  );
}
