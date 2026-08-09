import ArticleBody from '@/components/ArticleBody';
import DonateBlurb from '@/components/DonateBlurb';
import {
  DONATION_SOURCE,
  shouldInsertMidArticleDonate,
  splitHtmlNearMidpoint,
} from '@/lib/donations';
import type { CSSProperties } from 'react';

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
 * Renders article HTML with optional mid + end donate blurbs on long stories.
 */
export default function ArticleDonateBlocks({
  html,
  articleSlug,
  className,
  style,
  showDonate = true,
}: Props) {
  if (!showDonate) {
    return <ArticleBody className={className} style={style} html={html} />;
  }

  const mid =
    shouldInsertMidArticleDonate(html) ? splitHtmlNearMidpoint(html) : null;

  if (mid) {
    return (
      <>
        <ArticleBody className={className} style={style} html={mid.before} />
        <DonateBlurb
          placement="mid"
          source={DONATION_SOURCE.ARTICLE_MID}
          sourceDetail={articleSlug}
        />
        <ArticleBody className={className} style={style} html={mid.after} />
        <DonateBlurb
          placement="end"
          source={DONATION_SOURCE.ARTICLE_END}
          sourceDetail={articleSlug}
        />
      </>
    );
  }

  return (
    <>
      <ArticleBody className={className} style={style} html={html} />
      <DonateBlurb
        placement="end"
        source={DONATION_SOURCE.ARTICLE_END}
        sourceDetail={articleSlug}
      />
    </>
  );
}
