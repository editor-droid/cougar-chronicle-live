'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <form onSubmit={handleSearch} style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--surface)', borderRadius: '2rem', padding: '0.25rem 0.5rem', border: '1px solid var(--border)' }}>
      <input 
        type="text" 
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search articles..."
        className="font-sans"
        style={{ border: 'none', background: 'transparent', padding: '0.5rem', fontSize: '0.9rem', outline: 'none', color: 'var(--foreground)', width: '150px' }}
      />
      <button type="submit" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.25rem' }}>
        <Search size={16} />
      </button>
    </form>
  );
}
