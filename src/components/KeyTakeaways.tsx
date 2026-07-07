'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Lightbulb } from 'lucide-react';

export default function KeyTakeaways({ content }: { content: string }) {
  const [expanded, setExpanded] = useState(false);

  if (!content) return null;

  return (
    <div style={{
      marginTop: '2rem',
      marginBottom: '0.5rem',
      backgroundColor: 'var(--surface-hover)',
      border: '1px solid var(--border)',
      borderLeft: '4px solid var(--primary)',
      borderRadius: '0.5rem',
      overflow: 'hidden'
    }}>
      <button 
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1rem 1.5rem',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Lightbulb size={20} style={{ color: 'var(--primary)' }} />
          <h3 className="font-sans" style={{ margin: 0, fontSize: '1rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Key Takeaways</h3>
        </div>
        {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </button>

      {expanded && (
        <div 
          className="font-sans"
          style={{ 
            padding: '0 1.5rem 1.5rem 1.5rem',
            fontSize: '0.95rem',
            lineHeight: 1.6,
            color: 'var(--foreground)'
          }}
          dangerouslySetInnerHTML={{ __html: content }}
        />
      )}
    </div>
  );
}
