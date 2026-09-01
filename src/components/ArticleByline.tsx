import Link from 'next/link';
import prisma from '@/lib/prisma';
import { buildFirstNameIndex, namesMatch, splitBylineNames } from '@/lib/bylines';
import { authorPath } from '@/lib/author-slug';

const linkStyle: React.CSSProperties = { textDecoration: 'none', color: 'inherit' };

export default async function ArticleByline({
  authorId,
  authorName,
  customAuthor,
  authorSlug,
}: {
  authorId: string;
  authorName: string | null | undefined;
  customAuthor: string | null | undefined;
  authorSlug?: string | null;
}) {
  const display = (customAuthor || authorName || 'Staff').trim() || 'Staff';
  const parts = splitBylineNames(display);

  if (parts.length <= 1) {
    return (
      <span style={{ fontWeight: 600 }}>
        By{' '}
        <Link href={authorPath({ id: authorId, slug: authorSlug })} style={linkStyle} className="hover:text-primary transition-colors">
          {display}
        </Link>
      </span>
    );
  }

  const users = await prisma.user.findMany({
    where: {
      archivedAt: null,
      name: { not: null },
      role: { in: ['WRITER', 'EDITOR', 'ADMIN'] },
    },
    select: { id: true, name: true, slug: true },
  });
  const firstNameIndex = buildFirstNameIndex(users.map((u) => u.name || ''));

  return (
    <span style={{ fontWeight: 600 }}>
      By{' '}
      {parts.map((part, i) => {
        const user = users.find((u) => namesMatch(u.name || '', part, firstNameIndex));
        const sep = i === 0 ? '' : i === parts.length - 1 ? ' and ' : ', ';
        const node = user ? (
          <Link href={authorPath(user)} style={linkStyle} className="hover:text-primary transition-colors">
            {part}
          </Link>
        ) : (
          part
        );
        return (
          <span key={`${part}-${i}`}>
            {sep}
            {node}
          </span>
        );
      })}
    </span>
  );
}
