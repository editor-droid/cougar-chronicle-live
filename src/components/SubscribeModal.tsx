'use client';

import { useState } from 'react';
import SubscribeForm from './SubscribeForm';

export default function SubscribeModal() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)} 
        className="btn btn-primary font-sans" 
        style={{ borderRadius: '0', textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer' }}
      >
        Subscribe
      </button>

      {isOpen && (
        <div 
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem'
          }}
          onClick={() => setIsOpen(false)}
        >
          <div 
            style={{
              backgroundColor: 'var(--primary)',
              padding: '2rem',
              borderRadius: '0.5rem',
              width: '100%',
              maxWidth: '500px',
              position: 'relative',
              textAlign: 'center',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setIsOpen(false)}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: 'transparent',
                border: 'none',
                color: 'white',
                fontSize: '1.5rem',
                cursor: 'pointer',
                opacity: 0.7
              }}
            >
              &times;
            </button>
            
            <h3 className="font-serif" style={{ fontSize: '2rem', marginBottom: '0.5rem', color: '#fff' }}>Stay Connected</h3>
            <p className="font-sans text-sm" style={{ opacity: 0.9, marginBottom: '2rem', lineHeight: 1.4, color: '#fff' }}>
              Get our curated faith, campus news, and columns delivered straight to your inbox daily.
            </p>
            
            <SubscribeForm onSuccess={() => setIsOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
