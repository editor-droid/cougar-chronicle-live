'use client';

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

/** On account load, claim August $48+ fundraiser membership if eligible. */
export default function ClaimFundraiserMembership() {
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    fetch('/api/auth/claim-fundraiser-membership', { method: 'POST' })
      .then((r) => r.json())
      .then((data) => {
        if (data.granted) {
          toast.success('Your August gift unlocked a year of Chronicle Membership!');
          // soft refresh so membership UI updates
          window.location.reload();
        }
      })
      .catch(() => {
        /* ignore */
      });
  }, []);

  return null;
}
