import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import DashboardHeader from '@/components/DashboardHeader';
import { markPrintOrderFulfilled } from './actions';

export default async function PrintOrdersPage() {
  const session = await auth();
  if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'EDITOR')) {
    redirect('/dashboard');
  }

  const orders = await prisma.printPurchase.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { printEdition: true },
  });

  return (
    <div className="container animate-fade-in" style={{ marginTop: '2rem' }}>
      <DashboardHeader currentTab="print-editions" title="Print Orders" />
      <p className="font-sans text-sm text-muted" style={{ marginBottom: '1.5rem' }}>
        Physical Volume fulfillment. Mark fulfilled when you ship.
      </p>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.5rem', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ background: 'var(--surface-hover)' }}>
            <tr>
              <th style={{ padding: '0.85rem' }} className="font-sans text-sm text-muted">DATE</th>
              <th style={{ padding: '0.85rem' }} className="font-sans text-sm text-muted">TYPE</th>
              <th style={{ padding: '0.85rem' }} className="font-sans text-sm text-muted">EMAIL</th>
              <th style={{ padding: '0.85rem' }} className="font-sans text-sm text-muted">EDITION</th>
              <th style={{ padding: '0.85rem' }} className="font-sans text-sm text-muted">SHIPPING</th>
              <th style={{ padding: '0.85rem' }} className="font-sans text-sm text-muted">STATUS</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '2rem', textAlign: 'center' }} className="font-sans text-muted">
                  No print orders yet.
                </td>
              </tr>
            ) : (
              orders.map((o) => (
                <tr key={o.id} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.85rem' }} className="font-sans text-sm">
                    {new Date(o.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '0.85rem' }} className="font-sans text-sm">
                    {o.type} · ${o.amount.toFixed(2)}
                  </td>
                  <td style={{ padding: '0.85rem' }} className="font-sans text-sm font-bold">
                    {o.email}
                    {o.name ? <div className="text-muted" style={{ fontWeight: 400 }}>{o.name}</div> : null}
                  </td>
                  <td style={{ padding: '0.85rem' }} className="font-sans text-sm">
                    {o.printEdition?.title || '—'}
                  </td>
                  <td className="font-sans text-xs text-muted" style={{ padding: '0.85rem', maxWidth: 180 }}>
                    {o.shippingJson ? (
                      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: '0.7rem' }}>
                        {(() => {
                          try {
                            return JSON.stringify(JSON.parse(o.shippingJson), null, 0).slice(0, 200);
                          } catch {
                            return o.shippingJson.slice(0, 200);
                          }
                        })()}
                      </pre>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td style={{ padding: '0.85rem' }}>
                    {o.fulfilled ? (
                      <span className="font-sans text-sm" style={{ color: '#15803d' }}>Fulfilled</span>
                    ) : o.type === 'physical' ? (
                      <form action={markPrintOrderFulfilled}>
                        <input type="hidden" name="id" value={o.id} />
                        <button type="submit" className="btn btn-primary font-sans text-xs">
                          Mark shipped
                        </button>
                      </form>
                    ) : (
                      <span className="font-sans text-sm text-muted">Digital</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
