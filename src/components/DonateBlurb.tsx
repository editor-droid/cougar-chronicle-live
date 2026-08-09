'use client';

import Link from 'next/link';
import { Heart } from 'lucide-react';
import {
  DONATION_CAMPAIGN,
  DONATION_SOURCE,
  type DonationCampaign,
  type DonationSource,
} from '@/lib/donations';
import { isAugustFundraiserWindow } from '@/lib/membership-constants';

const QUICK_AMOUNTS = [10, 25, 50, 100] as const;

type Placement = 'mid' | 'end';

type Props = {
  placement?: Placement;
  /** Override campaign; default follows August window vs general. */
  campaign?: DonationCampaign | string;
  source?: DonationSource | string;
  /** e.g. article slug */
  sourceDetail?: string;
  className?: string;
};

export default function DonateBlurb({
  placement = 'end',
  campaign: campaignProp,
  source: sourceProp,
  sourceDetail,
  className,
}: Props) {
  const inAugust = isAugustFundraiserWindow();
  const campaign =
    campaignProp ||
    (inAugust ? DONATION_CAMPAIGN.AUGUST_FUNDRAISER : DONATION_CAMPAIGN.GENERAL);
  const source =
    sourceProp ||
    (placement === 'mid' ? DONATION_SOURCE.ARTICLE_MID : DONATION_SOURCE.ARTICLE_END);

  const metadata = JSON.stringify({
    campaign,
    source,
    sourceDetail: sourceDetail || '',
  });

  const isMid = placement === 'mid';

  return (
    <aside
      className={className}
      aria-label="Support The Cougar Chronicle"
      style={{
        margin: isMid ? '2.25rem 0' : '2.75rem 0 1.5rem',
        padding: '1.25rem 1.35rem',
        background:
          'linear-gradient(135deg, rgba(27, 34, 83, 0.04) 0%, rgba(27, 34, 83, 0.08) 100%)',
        border: '1px solid var(--border)',
        borderLeft: '4px solid var(--primary)',
        borderRadius: '0.5rem',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.75rem',
          marginBottom: '0.85rem',
        }}
      >
        <span
          aria-hidden
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '2rem',
            height: '2rem',
            borderRadius: '999px',
            backgroundColor: 'var(--primary)',
            color: 'white',
            flexShrink: 0,
          }}
        >
          <Heart size={14} fill="currentColor" />
        </span>
        <div>
          <p
            className="font-sans"
            style={{
              margin: 0,
              fontSize: '0.7rem',
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--primary)',
            }}
          >
            {inAugust ? 'August fundraising drive' : 'Support independent journalism'}
          </p>
          <p
            className="font-serif"
            style={{
              margin: '0.35rem 0 0',
              fontSize: isMid ? '1.15rem' : '1.25rem',
              lineHeight: 1.35,
              color: 'var(--foreground)',
            }}
          >
            {inAugust
              ? 'Help us keep rigorous campus coverage free of advertiser pressure.'
              : 'If this reporting mattered to you, chip in — it only takes a minute.'}
          </p>
          <p
            className="font-sans text-muted"
            style={{ margin: '0.4rem 0 0', fontSize: '0.875rem', lineHeight: 1.5 }}
          >
            {inAugust
              ? 'Gifts of $48+ unlock a year of Founding Member perks when you use the same email as your account.'
              : 'Your gift keeps The Cougar Chronicle accountable to readers, not advertisers.'}
          </p>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.5rem',
          alignItems: 'center',
        }}
      >
        {QUICK_AMOUNTS.map((tier) => (
          <form key={tier} action="/api/stripe/checkout" method="POST" style={{ margin: 0 }}>
            <input type="hidden" name="type" value="donate" />
            <input type="hidden" name="amount" value={tier} />
            <input type="hidden" name="metadata" value={metadata} />
            <button
              type="submit"
              className="font-sans"
              style={{
                padding: '0.55rem 0.95rem',
                fontSize: '0.95rem',
                fontWeight: 700,
                borderRadius: '0.4rem',
                border: '1px solid var(--primary)',
                backgroundColor: tier === 25 || tier === 50 ? 'var(--primary)' : 'transparent',
                color: tier === 25 || tier === 50 ? 'white' : 'var(--primary)',
                cursor: 'pointer',
              }}
            >
              ${tier}
            </button>
          </form>
        ))}
        <Link
          href={
            inAugust
              ? `/fundraiser?from=${encodeURIComponent(source)}${
                  sourceDetail ? `&article=${encodeURIComponent(sourceDetail)}` : ''
                }`
              : `/donate?from=${encodeURIComponent(source)}${
                  sourceDetail ? `&article=${encodeURIComponent(sourceDetail)}` : ''
                }`
          }
          className="font-sans"
          style={{
            marginLeft: '0.15rem',
            fontSize: '0.875rem',
            fontWeight: 600,
            color: 'var(--primary)',
            textDecoration: 'underline',
            textUnderlineOffset: '3px',
          }}
        >
          Other amount →
        </Link>
      </div>
    </aside>
  );
}
