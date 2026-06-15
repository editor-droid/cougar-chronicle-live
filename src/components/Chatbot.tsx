'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import Image from 'next/image';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

function InlineContactForm() {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      setSuccess(true);
    } catch(e) {
      console.error(e);
    }
    setSubmitting(false);
  };

  if (success) {
    return <div style={{ padding: '0.75rem', backgroundColor: '#e8f5e9', color: '#2e7d32', borderRadius: '0.5rem', fontSize: '0.85rem', marginTop: '0.5rem', border: '1px solid #c8e6c9' }}>Message sent successfully! We'll be in touch.</div>;
  }

  return (
    <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', backgroundColor: '#f8f9fa', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #ddd', marginTop: '0.75rem' }}>
      <p style={{ margin: '0 0 0.25rem 0', fontWeight: 'bold', fontSize: '0.9rem', color: '#333' }}>Contact Us</p>
      <input required placeholder="Your Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} style={{ padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid #ccc', fontSize: '0.85rem' }} />
      <input required type="email" placeholder="Your Email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} style={{ padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid #ccc', fontSize: '0.85rem' }} />
      <textarea required placeholder="How can we help?" value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} style={{ padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid #ccc', fontSize: '0.85rem', minHeight: '80px', fontFamily: 'inherit', resize: 'vertical' }} />
      <button type="submit" disabled={submitting} style={{ padding: '0.5rem', backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: submitting ? 'not-allowed' : 'pointer', fontSize: '0.85rem', fontWeight: 'bold', marginTop: '0.25rem' }}>
        {submitting ? 'Sending...' : 'Send Message'}
      </button>
    </form>
  );
}

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const pathname = usePathname();
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    
    const userMessage: Message = { id: `user-${Date.now()}`, role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMessage], pathname })
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      setMessages(prev => [...prev, { id: `ai-${Date.now()}`, role: 'assistant', content: '' }]);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          
          setMessages(prev => {
            const newMessages = [...prev];
            const lastMsgIndex = newMessages.length - 1;
            const lastMsg = newMessages[lastMsgIndex];
            if (lastMsg.role === 'assistant') {
              newMessages[lastMsgIndex] = { ...lastMsg, content: lastMsg.content + chunk };
            }
            return newMessages;
          });
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  if (!isOpen) {
    return (
      <div className="chatbot-launcher" style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 50, display: 'flex', alignItems: 'flex-end', flexDirection: 'column', gap: '1rem' }}>
        <div 
          className="animate-fade-in chatbot-bubble" 
          style={{ backgroundColor: 'white', border: '1px solid var(--border)', padding: '0.75rem 1rem', borderRadius: '1rem', borderBottomRightRadius: '0.25rem', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)', cursor: 'pointer' }} 
          onClick={() => setIsOpen(true)}
        >
          <p className="font-sans text-sm" style={{ fontWeight: 600, margin: 0 }}>Have a question? Ask our AI!</p>
        </div>
        <button 
          onClick={() => setIsOpen(true)}
          aria-label="Open AI Chatbot"
          style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)', border: 'none', boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.2s', overflow: 'hidden' }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <Image src="/chat-icon.png" alt="Chat" width={64} height={64} priority style={{ objectFit: 'cover' }} />
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ position: 'fixed', bottom: '2rem', right: '2rem', width: '380px', backgroundColor: '#e5ddd5', borderRadius: '1rem', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '600px', zIndex: 50 }}>
      {/* Header */}
      <div style={{ backgroundColor: 'var(--primary)', color: 'white', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', zIndex: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Image src="/chat-icon.png" alt="Logo" width={40} height={40} style={{ borderRadius: '50%', backgroundColor: 'white', objectFit: 'contain', padding: '2px', border: '2px solid rgba(255,255,255,0.2)' }} />
          <div>
            <div style={{ fontWeight: 600, fontSize: '1.1rem', lineHeight: 1.2 }} className="font-sans">Cougar Chronicle AI</div>
            <div style={{ fontSize: '0.8rem', opacity: 0.9, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }} className="font-sans">
              <div style={{ width: '8px', height: '8px', backgroundColor: '#4ade80', borderRadius: '50%' }}></div>
              Online
            </div>
          </div>
        </div>
        <button onClick={() => setIsOpen(false)} aria-label="Close AI Chatbot" style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1.5rem', opacity: 0.8 }}>&times;</button>
      </div>
      
      {/* Messages Window */}
      <div style={{ padding: '1.25rem 1rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem', minHeight: '350px', backgroundColor: '#efeae2', backgroundImage: 'url("https://www.transparenttextures.com/patterns/cubes.png")' }}>
        
        {/* Welcome Message */}
        {messages.length === 0 && (
          <div style={{ display: 'flex', gap: '0.5rem', alignSelf: 'flex-start', maxWidth: '85%', marginBottom: '0.5rem' }}>
            <Image src="/chat-icon.png" alt="AI" width={28} height={28} style={{ borderRadius: '50%', flexShrink: 0, marginTop: 'auto', backgroundColor: 'white', padding: '2px', border: '1px solid #ddd' }} />
            <div style={{ backgroundColor: 'white', color: '#111', padding: '0.75rem 1rem', borderRadius: '1.2rem', borderBottomLeftRadius: '0.2rem', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
              <p className="font-sans text-sm" style={{ whiteSpace: 'pre-wrap', margin: 0, lineHeight: 1.5 }}>
                Hi! I am the Cougar Chronicle AI. I can help answer questions about our articles or the BYU community. How can I help you today?
              </p>
            </div>
          </div>
        )}

        {messages.map(m => {
          const isUser = m.role === 'user';
          const hasForm = m.content.includes('[CONTACT_FORM]');
          const content = m.content.replace('[CONTACT_FORM]', '');
          
          return (
            <div key={m.id} style={{ display: 'flex', gap: '0.5rem', alignSelf: isUser ? 'flex-end' : 'flex-start', maxWidth: '85%', marginBottom: '0.5rem' }}>
              {!isUser && (
                <Image src="/chat-icon.png" alt="AI" width={28} height={28} style={{ borderRadius: '50%', flexShrink: 0, marginTop: 'auto', backgroundColor: 'white', padding: '2px', border: '1px solid #ddd' }} />
              )}
              <div style={{
                backgroundColor: isUser ? '#1B2253' : 'white',
                color: isUser ? 'white' : '#111',
                padding: '0.75rem 1rem',
                borderRadius: '1.2rem',
                borderBottomRightRadius: isUser ? '0.2rem' : '1.2rem',
                borderBottomLeftRadius: !isUser ? '0.2rem' : '1.2rem',
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                width: hasForm ? '100%' : 'auto',
                minWidth: hasForm ? '250px' : 'auto'
              }}>
                {isUser ? (
                  <p className="font-sans text-sm" style={{ whiteSpace: 'pre-wrap', margin: 0, lineHeight: 1.5 }}>{m.content}</p>
                ) : (
                  <>
                    <div className="markdown-chat font-sans text-sm" style={{ lineHeight: 1.5 }}>
                      <ReactMarkdown>
                        {content}
                      </ReactMarkdown>
                    </div>
                    {hasForm && <InlineContactForm />}
                  </>
                )}
              </div>
            </div>
          );
        })}
        {isLoading && (
          <div style={{ display: 'flex', gap: '0.5rem', alignSelf: 'flex-start', maxWidth: '85%' }}>
            <Image src="/chat-icon.png" alt="AI" width={28} height={28} style={{ borderRadius: '50%', flexShrink: 0, marginTop: 'auto', backgroundColor: 'white', padding: '2px', border: '1px solid #ddd' }} />
            <div style={{ backgroundColor: 'white', padding: '0.75rem 1rem', borderRadius: '1.2rem', borderBottomLeftRadius: '0.2rem', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
              <div className="text-muted text-sm font-sans" style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                Typing...
              </div>
            </div>
          </div>
        )}
        
        {error && (
          <div style={{ color: 'red', alignSelf: 'center', fontSize: '0.8rem', marginTop: '1rem' }} className="font-sans">
            Connection Error. Please try again.
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSubmit} style={{ backgroundColor: '#f0f2f5', padding: '0.75rem', display: 'flex', gap: '0.5rem', alignItems: 'center', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Type a message..."
          style={{ flex: 1, border: 'none', padding: '0.75rem 1.25rem', borderRadius: '2rem', outline: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
          className="font-sans text-sm"
        />
        <button type="submit" aria-label="Send message" disabled={isLoading || !input?.trim()} style={{ backgroundColor: '#1B2253', color: 'white', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', opacity: (isLoading || !input?.trim()) ? 0.5 : 1, transition: 'opacity 0.2s', flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'translateX(-1px) translateY(1px)' }} aria-hidden="true">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </form>
    </div>
  );
}
