import ArticleBody from '@/components/ArticleBody';
import ArticleInlineNewsletter from '@/components/ArticleInlineNewsletter';
import DonateBlurb from '@/components/DonateBlurb';
import { ARTICLE_NEWSLETTER_AFTER_PARAGRAPH, offsetAfterNthParagraph } from '@/lib/article-insert';
import {
  DONATION_SOURCE,
  htmlSplitOffsetNearMidpoint,
  shouldInsertMidArticleDonate,
} from '@/lib/donations';
import type { CSSProperties, ReactNode } from 'react';

type Props = {
  html: string;
  articleSlug: string;
  className?: string;
  style?: CSSProperties;
  /**
   * When false, render body only (no mid/end blurbs).
   * Premium: only gift recipients; free articles: always on.
   */
  showDonate?: boolean;
};

/**
 * Renders article HTML with optional mid + end donate blurbs on long stories,
 * and a newsletter block after the fourth paragraph when the story has one.
 * Shorter stories keep the existing end-of-article signup instead of a second box.
 */
export default function ArticleDonateBlocks({
  html,
  articleSlug,
  className,
  style,
  showDonate = true,
}: Props) {
  const newsletterAt = offsetAfterNthParagraph(html, ARTICLE_NEWSLETTER_AFTER_PARAGRAPH);
  const donateAt =
    showDonate && shouldInsertMidArticleDonate(html) ? htmlSplitOffsetNearMidpoint(html) : null;

  const inserts: { at: number; kind: 'newsletter' | 'donate' }[] = [];
  if (newsletterAt != null && newsletterAt > 0) {
    inserts.push({ at: newsletterAt, kind: 'newsletter' });
  }
  if (donateAt != null) {
    inserts.push({ at: donateAt, kind: 'donate' });
  }
  inserts.sort((a, b) => a.at - b.at || (a.kind === 'newsletter' ? -1 : 1));

  const body = (chunk: string, key: string) => (
    <ArticleBody key={key} className={className} style={style} html={chunk} />
  );

  if (inserts.length === 0) {
    if (!showDonate) {
      return <ArticleBody className={className} style={style} html={html} />;
    }
    return (
      <>
        {body(html, 'html')}
        <DonateBlurb
          placement="end"
          source={DONATION_SOURCE.ARTICLE_END}
          sourceDetail={articleSlug}
        />
      </>
    );
  }

  const parts: ReactNode[] = [];
  let cursor = 0;
  inserts.forEach((insert, index) => {
    const chunk = html.slice(cursor, insert.at);
    if (chunk.trim()) parts.push(body(chunk, `html-${index}`));
    if (insert.kind === 'newsletter') {
      parts.push(<ArticleInlineNewsletter key={`nl-${index}`} />);
    } else {
      parts.push(
        <DonateBlurb
          key={`donate-${index}`}
          placement="mid"
          source={DONATION_SOURCE.ARTICLE_MID}
          sourceDetail={articleSlug}
        />
      );
    }
    cursor = insert.at;
  });
  const tail = html.slice(cursor);
  if (tail.trim()) parts.push(body(tail, 'html-tail'));
  if (showDonate) {
    parts.push(
      <DonateBlurb
        key="donate-end"
        placement="end"
        source={DONATION_SOURCE.ARTICLE_END}
        sourceDetail={articleSlug}
      />
    );
  }
  return <>{parts}</>;
}
