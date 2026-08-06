'use client';

import { useEffect, useState } from 'react';

export default function ClientLightbox() {
  const [isOpen, setIsOpen] = useState(false);
  const [imgSrc, setImgSrc] = useState('');

  useEffect(() => {
    const handleImageClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.article-carousel-btn, .article-carousel-dot, .article-carousel-bar')) return;
      if (target.tagName === 'IMG' && target.closest('.article-content')) {
        setImgSrc((target as HTMLImageElement).src);
        setIsOpen(true);
        document.body.style.overflow = 'hidden';
      }
    };

    document.addEventListener('click', handleImageClick);

    return () => {
      document.removeEventListener('click', handleImageClick);
      document.body.style.overflow = '';
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        zIndex: 9999,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '2rem',
        cursor: 'zoom-out'
      }}
      onClick={() => {
        setIsOpen(false);
        document.body.style.overflow = '';
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img 
        src={imgSrc} 
        alt="Fullscreen view" 
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          objectFit: 'contain',
          borderRadius: '0.25rem'
        }}
      />
      <button 
        style={{
          position: 'absolute',
          top: '2rem',
          right: '2rem',
          background: 'none',
          border: 'none',
          color: 'white',
          fontSize: '2rem',
          cursor: 'pointer',
          padding: '0.5rem'
        }}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(false);
          document.body.style.overflow = '';
        }}
      >
        &times;
      </button>
    </div>
  );
}
