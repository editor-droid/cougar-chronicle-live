'use client';

import { useMemo, useState } from "react";
import { List, ChevronDown, ChevronUp } from "lucide-react";

interface TocItem {
  id: string;
  text: string;
  level: number;
}

/**
 * Parse headings (h2, h3, h4) from raw HTML content.
 * Returns an array of { id, text, level } objects.
 */
function extractHeadings(html: string): TocItem[] {
  const regex = /<h([2-4])[^>]*>(.*?)<\/h[2-4]>/gi;
  const headings: TocItem[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(html)) !== null) {
    const level = parseInt(match[1], 10);
    // Strip HTML tags from heading text
    const text = match[2].replace(/<[^>]*>/g, "").trim();
    if (!text) continue;
    // Create a URL-friendly slug from the heading text
    const id = text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .substring(0, 80);
    headings.push({ id, text, level });
  }

  return headings;
}

/**
 * Inject id attributes into heading tags in the HTML content
 * so the TOC links can scroll to them.
 */
export function injectHeadingIds(html: string): string {
  const regex = /<h([2-4])([^>]*)>(.*?)<\/h([2-4])>/gi;
  return html.replace(regex, (_match, level, attrs, content, closeLevel) => {
    const text = content.replace(/<[^>]*>/g, "").trim();
    if (!text) return _match;
    const id = text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .substring(0, 80);
    // Preserve existing attributes but add/replace id
    const cleanAttrs = attrs.replace(/\s*id="[^"]*"/g, "");
    return `<h${level}${cleanAttrs} id="${id}">${content}</h${closeLevel}>`;
  });
}

interface TableOfContentsProps {
  content: string;
  /** Minimum number of headings to show TOC (default: 3) */
  minHeadings?: number;
}

export default function TableOfContents({
  content,
  minHeadings = 2,
}: TableOfContentsProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const headings = useMemo(() => extractHeadings(content), [content]);

  if (headings.length < minHeadings) return null;

  const handleClick = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const offset = 100; // account for fixed header
      const top = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  // Determine the minimum heading level to normalize indentation
  const minLevel = Math.min(...headings.map(h => h.level));

  return (
    <nav style={{ marginBottom: '2rem', borderRadius: '0.5rem', border: '1px solid var(--border)', backgroundColor: 'var(--surface-hover)', overflow: 'hidden' }}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', fontSize: '1rem', fontWeight: 600, color: 'var(--foreground)', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'background-color 0.2s ease' }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} className="font-sans">
          <List size={18} style={{ color: 'var(--primary)' }} />
          Key Takeaways
        </span>
        {isExpanded ? (
          <ChevronUp size={18} style={{ color: 'var(--muted)' }} />
        ) : (
          <ChevronDown size={18} style={{ color: 'var(--muted)' }} />
        )}
      </button>

      {isExpanded && (
        <ol style={{ padding: '0 1.25rem 1rem 1.25rem', margin: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.25rem' }} className="font-sans">
          {headings.map((heading, i) => {
            const indent = heading.level - minLevel;
            return (
              <li
                key={`${heading.id}-${i}`}
                style={{ paddingLeft: `${indent * 1}rem` }}
              >
                <button
                  onClick={() => handleClick(heading.id)}
                  style={{ textAlign: 'left', fontSize: '0.95rem', color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem 0', lineHeight: 1.4, transition: 'color 0.2s ease' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--primary)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--muted)')}
                >
                  {heading.text}
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </nav>
  );
}
