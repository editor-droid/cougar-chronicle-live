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
    <div className="container animate-fade-in" style={{ marginTop: '1rem', marginBottom: '3rem' }}>
      <DashboardHeader currentTab="print-editions" title="Print orders" />
      <p className="font-sans text-muted" style={{ marginBottom: '1.25rem', lineHeight: 1.5, maxWidth: '40rem' }}>
        Physical print purchases (email, shipping, fulfillment). Mark fulfilled when you ship.
        Article lineups and covers are under <strong>Editions</strong>.
      </p>

      <div className="dash-card">
        <div className="dash-card-header">
          <h2 className="dash-section-title">Orders</h2>
          <span className="dash-badge dash-badge-navy">{orders.length}</span>
        </div>
        <div className="dashboard-table-scroll">
          {orders.length === 0 ? (
            <div className="dash-empty">No print orders yet.</div>
          ) : (
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Email</th>
                  <th>Edition</th>
                  <th>Shipping</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td className="text-muted">
                      {new Date(o.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      {o.type} · ${o.amount.toFixed(2)}
                    </td>
                    <td style={{ fontWeight: 700 }}>
                      {o.email}
                      {o.name ? (
                        <div className="text-muted" style={{ fontWeight: 400, fontSize: '0.8rem' }}>
                          {o.name}
                        </div>
                      ) : null}
                    </td>
                    <td>{o.printEdition?.title || '—'}</td>
                    <td className="text-muted" style={{ maxWidth: 180, fontSize: '0.75rem' }}>
                      {o.shippingJson ? (
                        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
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
                    <td>
                      {o.fulfilled ? (
                        <span className="dash-badge dash-badge-green">Fulfilled</span>
                      ) : o.type === 'physical' ? (
                        <form action={markPrintOrderFulfilled}>
                          <input type="hidden" name="id" value={o.id} />
                          <button type="submit" className="dash-btn dash-btn-primary">
                            Mark shipped
                          </button>
                        </form>
                      ) : (
                        <span className="dash-badge">Digital</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
