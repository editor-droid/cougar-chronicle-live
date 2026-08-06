'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type TouchEvent as ReactTouchEvent,
} from 'react';

type GalleryImage = { src: string; alt: string };

type Segment =
  | { type: 'html'; html: string }
  | { type: 'carousel'; images: GalleryImage[]; id: string };

function parseImg(tag: string): GalleryImage | null {
  const srcM = tag.match(/\bsrc=(["'])([^"']+)\1/i);
  if (!srcM) return null;
  const altM = tag.match(/\balt=(["'])([^"']*)\1/i);
  return { src: srcM[2], alt: altM ? altM[2] : '' };
}

/** Split article HTML into static HTML + carousel blocks (depth-matched). */
export function splitArticleHtml(html: string): Segment[] {
  if (!html) return [];
  const segments: Segment[] = [];
  const re =
    /<div\b[^>]*class=["'][^"']*article-gallery--carousel[^"']*["'][^>]*>/gi;
  let last = 0;
  let match: RegExpExecArray | null;
  let carouselIdx = 0;

  while ((match = re.exec(html)) !== null) {
    const openStart = match.index;
    if (openStart > last) {
      segments.push({ type: 'html', html: html.slice(last, openStart) });
    }

    let depth = 0;
    let i = openStart;
    let closeEnd = -1;
    while (i < html.length) {
      if (
        (html.startsWith('<div', i) || html.startsWith('<DIV', i)) &&
        (html[i + 4] === ' ' || html[i + 4] === '>' || html[i + 4] === '\n')
      ) {
        depth++;
        i += 4;
        continue;
      }
      if (html.startsWith('</div>', i) || html.startsWith('</DIV>', i)) {
        depth--;
        i += 6;
        if (depth === 0) {
          closeEnd = i;
          break;
        }
        continue;
      }
      i++;
    }

    if (closeEnd < 0) {
      segments.push({ type: 'html', html: html.slice(openStart) });
      last = html.length;
      break;
    }

    const block = html.slice(openStart, closeEnd);
    const images = [...block.matchAll(/<img\b[^>]*>/gi)]
      .map((m) => parseImg(m[0]))
      .filter((x): x is GalleryImage => Boolean(x?.src));

    if (images.length >= 2) {
      segments.push({
        type: 'carousel',
        images,
        id: `carousel-${carouselIdx++}`,
      });
    } else if (images.length === 1) {
      const img = images[0];
      segments.push({
        type: 'html',
        html: `<img src="${img.src.replace(/"/g, '&quot;')}" alt="${img.alt.replace(/"/g, '&quot;')}" loading="lazy" />`,
      });
    } else {
      segments.push({ type: 'html', html: block });
    }

    last = closeEnd;
    re.lastIndex = closeEnd;
  }

  if (last < html.length) {
    segments.push({ type: 'html', html: html.slice(last) });
  }

  return segments;
}

/**
 * Single carousel for all viewports — stacked slides only.
 * No horizontal track (that caused infinite horizontal scroll on mobile).
 * Swipe is snap-based (touch start/end), not a multi-width strip.
 */
function Carousel({ images, id }: { images: GalleryImage[]; id: string }) {
  const n = images.length;
  const [index, setIndex] = useState(0);
  const [landscape, setLandscape] = useState(false);
  const aspectLocked = useRef(false);
  const touchX = useRef(0);
  const touchY = useRef(0);
  const axis = useRef<'x' | 'y' | null>(null);

  const go = useCallback(
    (next: number) => {
      setIndex((((next % n) + n) % n));
    },
    [n]
  );

  useEffect(() => {
    images.forEach((img) => {
      const pre = new window.Image();
      pre.src = img.src;
    });
  }, [images]);

  const onImgLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (!img.naturalWidth || !img.naturalHeight || aspectLocked.current) return;
    aspectLocked.current = true;
    setLandscape(img.naturalWidth >= img.naturalHeight * 1.05);
  };

  const onKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      go(index - 1);
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      go(index + 1);
    }
  };

  const onTouchStart = (e: ReactTouchEvent) => {
    const t = e.changedTouches[0];
    if (!t) return;
    touchX.current = t.clientX;
    touchY.current = t.clientY;
    axis.current = null;
  };

  const onTouchMove = (e: ReactTouchEvent) => {
    const t = e.changedTouches[0];
    if (!t || axis.current) return;
    const dx = Math.abs(t.clientX - touchX.current);
    const dy = Math.abs(t.clientY - touchY.current);
    if (dx < 10 && dy < 10) return;
    axis.current = dx >= dy ? 'x' : 'y';
  };

  const onTouchEnd = (e: ReactTouchEvent) => {
    if (axis.current === 'y') {
      axis.current = null;
      return;
    }
    const t = e.changedTouches[0];
    axis.current = null;
    if (!t) return;
    const dx = t.clientX - touchX.current;
    if (Math.abs(dx) < 40) return;
    if (dx < 0) go(index + 1);
    else go(index - 1);
  };

  return (
    <div
      className={`cc-carousel${landscape ? ' cc-carousel--wide' : ''}`}
      data-carousel-id={id}
      tabIndex={0}
      role="region"
      aria-roledescription="carousel"
      aria-label={`Image gallery, ${n} photos`}
      onKeyDown={onKeyDown}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div className="cc-carousel__stage">
        {images.map((img, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`${img.src}-${i}`}
            src={img.src}
            alt={img.alt || `Photo ${i + 1} of ${n}`}
            className={`cc-carousel__img${i === index ? ' is-active' : ''}`}
            draggable={false}
            loading={i === 0 ? 'eager' : 'lazy'}
            decoding="async"
            onLoad={onImgLoad}
            aria-hidden={i === index ? 'false' : 'true'}
          />
        ))}
        <button
          type="button"
          className="cc-carousel__btn cc-carousel__btn--prev"
          aria-label="Previous image"
          disabled={index === 0}
          onClick={(e) => {
            e.stopPropagation();
            go(index - 1);
          }}
        >
          ‹
        </button>
        <button
          type="button"
          className="cc-carousel__btn cc-carousel__btn--next"
          aria-label="Next image"
          disabled={index === n - 1}
          onClick={(e) => {
            e.stopPropagation();
            go(index + 1);
          }}
        >
          ›
        </button>
      </div>
      <div className="cc-carousel__bar">
        <div className="cc-carousel__dots" role="tablist" aria-label="Slides">
          {images.map((img, i) => (
            <button
              key={`${img.src}-dot-${i}`}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Go to image ${i + 1}`}
              className={`cc-carousel__dot${i === index ? ' is-active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                go(i);
              }}
            />
          ))}
        </div>
        <span className="cc-carousel__count" aria-live="polite">
          {index + 1} / {n}
        </span>
      </div>
    </div>
  );
}

export default function ArticleBody({
  html,
  className,
  style,
}: {
  html: string;
  className?: string;
  style?: CSSProperties;
}) {
  const segments = useMemo(() => splitArticleHtml(html), [html]);

  return (
    <div className={className} style={style}>
      {segments.map((seg, i) => {
        if (seg.type === 'html') {
          return (
            <div
              key={`h-${i}`}
              className="article-html-chunk"
              dangerouslySetInnerHTML={{ __html: seg.html }}
            />
          );
        }
        return <Carousel key={seg.id} images={seg.images} id={seg.id} />;
      })}
    </div>
  );
}
