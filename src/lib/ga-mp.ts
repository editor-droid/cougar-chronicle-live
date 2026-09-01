const MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_ID || 'G-QTRB8KFLZX';
const MP_URL = 'https://www.google-analytics.com/mp/collect';

let warnedMissingSecret = false;

export type GaMpItem = {
  item_id?: string;
  item_name?: string;
  price?: number;
  quantity?: number;
};

export type GaMpPurchaseParams = {
  clientId?: string;
  transactionId: string;
  value: number;
  items?: GaMpItem[];
  campaign?: string;
  source?: string;
};

/**
 * GA4 Measurement Protocol purchase event.
 * Returns immediately (no throw) when GA4_API_SECRET is unset so webhooks still succeed.
 */
export async function sendGa4Purchase(params: GaMpPurchaseParams): Promise<void> {
  const apiSecret = process.env.GA4_API_SECRET?.trim();
  if (!apiSecret) {
    if (!warnedMissingSecret) {
      warnedMissingSecret = true;
      console.warn('[ga-mp] GA4_API_SECRET is not set; skipping Measurement Protocol events');
    }
    return;
  }

  const clientId = params.clientId || params.transactionId || crypto.randomUUID();
  const url = `${MP_URL}?measurement_id=${encodeURIComponent(MEASUREMENT_ID)}&api_secret=${encodeURIComponent(apiSecret)}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        events: [
          {
            name: 'purchase',
            params: {
              currency: 'USD',
              value: params.value,
              transaction_id: params.transactionId,
              items: params.items ?? [],
              campaign: params.campaign,
              source: params.source,
            },
          },
        ],
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error('[ga-mp] purchase event failed', res.status, text.slice(0, 200));
    }
  } catch (e) {
    console.error('[ga-mp] purchase event error', e);
  }
}
