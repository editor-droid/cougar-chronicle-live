'use client';

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

/** On account load, claim August $48+ America 250 Founding Membership if eligible. */
export default function ClaimFundraiserMembership() {
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    fetch('/api/auth/claim-fundraiser-membership', { method: 'POST' })
      .then((r) => r.json())
      .then((data) => {
        if (data.granted) {
          toast.success('You’re an America 250 Founding Member for one year — thank you!');
          window.location.reload();
        }
      })
      .catch(() => {
        /* ignore */
      });
  }, []);

  return null;
}
