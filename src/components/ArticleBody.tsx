'use client';

import { useCallback, useMemo, useState } from 'react';

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

/**
 * Split article HTML into static chunks + carousel blocks we render in React.
 * Matching is brace-depth based so nested tags don't break multi-image galleries.
 */
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

    // Find matching closing </div> by depth
    let depth = 0;
    let i = openStart;
    let closeEnd = -1;
    while (i < html.length) {
      if (html.startsWith('<div', i) || html.startsWith('<DIV', i)) {
        // avoid matching </div
        if (html[i + 4] === ' ' || html[i + 4] === '>' || html[i + 4] === '\n') {
          depth++;
          i += 4;
          continue;
        }
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
      // Malformed — treat rest as HTML
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
      segments.push({
        type: 'html',
        html: `<img src="${images[0].src.replace(/"/g, '&quot;')}" alt="${images[0].alt.replace(/"/g, '&quot;')}" loading="lazy" />`,
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

function Carousel({ images, id }: { images: GalleryImage[]; id: string }) {
  const [index, setIndex] = useState(0);
  const n = images.length;
  const [landscape, setLandscape] = useState(false);

  const go = useCallback(
    (next: number) => {
      setIndex((((next % n) + n) % n));
    },
    [n]
  );

  const onImgLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (!img.naturalWidth || !img.naturalHeight) return;
    // Aspect from first loaded image
    setLandscape((prev) => {
      // only set from first real measurement to avoid flip-flopping
      if (prev) return prev;
      return img.naturalWidth >= img.naturalHeight * 1.05;
    });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      go(index - 1);
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      go(index + 1);
    }
  };

  let touchX = 0;
  const onTouchStart = (e: React.TouchEvent) => {
    touchX = e.changedTouches[0]?.clientX ?? 0;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const x = e.changedTouches[0]?.clientX ?? 0;
    const dx = x - touchX;
    if (Math.abs(dx) < 40) return;
    if (dx < 0) go(index + 1);
    else go(index - 1);
  };

  return (
    <div
      className={`article-carousel article-carousel--live${landscape ? ' article-carousel--landscape' : ' article-carousel--portrait'}`}
      data-carousel-id={id}
      tabIndex={0}
      role="region"
      aria-roledescription="carousel"
      aria-label={`Image gallery, ${n} photos`}
      onKeyDown={onKeyDown}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="article-carousel-stage">
        {/*
          Keep EVERY image mounted (hidden when inactive).
          Swapping a single <img key={src}> remounts and flashes until cache hits.
        */}
        {images.map((img, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`${img.src}-${i}`}
            src={img.src}
            alt={img.alt || `Photo ${i + 1} of ${n}`}
            className={`article-carousel-image${i === index ? ' is-active' : ''}`}
            draggable={false}
            loading={i === 0 ? 'eager' : 'eager'}
            decoding="async"
            onLoad={onImgLoad}
            aria-hidden={i === index ? 'false' : 'true'}
          />
        ))}
        <button
          type="button"
          className="article-carousel-btn article-carousel-prev"
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
          className="article-carousel-btn article-carousel-next"
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
      <div className="article-carousel-bar">
        <div className="article-carousel-dots" role="tablist" aria-label="Slides">
          {images.map((img, i) => (
            <button
              key={`${img.src}-${i}`}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Go to image ${i + 1}`}
              className={`article-carousel-dot${i === index ? ' is-active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                go(i);
              }}
            />
          ))}
        </div>
        <span className="article-carousel-counter" aria-live="polite">
          {index + 1} / {n}
        </span>
      </div>
    </div>
  );
}

/**
 * Renders article HTML with real React carousels for multi-image groups.
 */
export default function ArticleBody({
  html,
  className,
  style,
}: {
  html: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const segments = useMemo(() => splitArticleHtml(html), [html]);

  // Stop lightbox from treating arrow/dot clicks as image zooms is handled
  // by not putting chrome inside the zoomed img path.
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
