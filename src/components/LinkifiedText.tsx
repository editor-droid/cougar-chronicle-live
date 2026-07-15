/**
 * Escape plain text and turn http(s) URLs into real links.
 * Used for video descriptions that store "Featured in: https://…" as plain text.
 */
export function linkifyToHtml(text: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  // Match URLs; peel trailing punctuation off the href
  return escaped
    .replace(
      /(https?:\/\/[^\s<]+)/g,
      (raw) => {
        const m = raw.match(/^(.*?)([.,;:!?)]*)$/);
        const core = m?.[1] || raw;
        const trail = m?.[2] || '';
        const href = core;
        const label = core
          .replace(/^https?:\/\/(www\.)?/i, '')
          .replace(/\/$/, '');
        return `<a href="${href}" style="color:var(--primary);text-decoration:underline;word-break:break-all;font-weight:600" rel="noopener noreferrer">${label}</a>${trail}`;
      }
    )
    .replace(/\n/g, '<br/>');
}

export default function LinkifiedText({
  text,
  className,
  style,
}: {
  text: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  if (!text) return null;
  return (
    <div
      className={className}
      style={style}
      dangerouslySetInnerHTML={{ __html: linkifyToHtml(text) }}
    />
  );
}
