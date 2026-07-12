'use client';
import { useState, useEffect } from 'react';
import { requestPushSubscription, unsubscribePush } from './PushManager';

export default function PushSettings() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setSupported(false);
      return;
    }
    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        setIsSubscribed(!!sub);
      });
    });
  }, []);

  if (!supported) {
    return <p className="font-sans text-sm" style={{ opacity: 0.7 }}>Push notifications are not supported on this browser/device.</p>;
  }

  const handleToggle = async () => {
    if (isSubscribed) {
      await unsubscribePush();
      setIsSubscribed(false);
    } else {
      const success = await requestPushSubscription();
      if (success) setIsSubscribed(true);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
      <button 
        onClick={handleToggle} 
        className="btn btn-secondary font-sans text-sm"
      >
        {isSubscribed ? 'Disable Notifications on this Device' : 'Enable Notifications on this Device'}
      </button>
      <span className="font-sans text-sm" style={{ opacity: 0.7 }}>
        {isSubscribed ? 'You will receive alerts for new articles and videos.' : 'Stay up to date with breaking news.'}
      </span>
    </div>
  );
}
