'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
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

function subscribeMobile(cb: () => void) {
  if (typeof window === 'undefined') return () => {};
  const mq = window.matchMedia('(max-width: 768px)');
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
}

function getMobileSnapshot() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(max-width: 768px)').matches;
}

function useIsMobile() {
  return useSyncExternalStore(subscribeMobile, getMobileSnapshot, () => false);
}

function rubber(offset: number, max: number): number {
  if (offset > 0) return offset * 0.32;
  if (offset < -max) return -max + (offset + max) * 0.32;
  return offset;
}

function useLandscape(images: GalleryImage[]) {
  const [landscape, setLandscape] = useState(false);
  const locked = useRef(false);

  const onImgLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (!img.naturalWidth || !img.naturalHeight || locked.current) return;
    locked.current = true;
    setLandscape(img.naturalWidth >= img.naturalHeight * 1.05);
  }, []);

  // Preload
  useEffect(() => {
    images.forEach((img) => {
      const pre = new window.Image();
      pre.src = img.src;
    });
  }, [images]);

  return { landscape, onImgLoad };
}

/** Desktop: simple stacked slides — proven stable layout. */
function DesktopCarousel({
  images,
  id,
  landscape,
  onImgLoad,
}: {
  images: GalleryImage[];
  id: string;
  landscape: boolean;
  onImgLoad: (e: React.SyntheticEvent<HTMLImageElement>) => void;
}) {
  const n = images.length;
  const [index, setIndex] = useState(0);

  const go = useCallback(
    (next: number) => setIndex((((next % n) + n) % n)),
    [n]
  );

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

  // Light swipe on desktop trackpads / touch laptops without a full track
  const touchX = useRef(0);
  const onTouchStart = (e: ReactTouchEvent) => {
    touchX.current = e.changedTouches[0]?.clientX ?? 0;
  };
  const onTouchEnd = (e: ReactTouchEvent) => {
    const x = e.changedTouches[0]?.clientX ?? 0;
    const dx = x - touchX.current;
    if (Math.abs(dx) < 50) return;
    if (dx < 0) go(index + 1);
    else go(index - 1);
  };

  return (
    <div
      className={`cc-carousel cc-carousel--desktop${landscape ? ' cc-carousel--wide' : ''}`}
      data-carousel-id={id}
      tabIndex={0}
      role="region"
      aria-roledescription="carousel"
      aria-label={`Image gallery, ${n} photos`}
      onKeyDown={onKeyDown}
      onTouchStart={onTouchStart}
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
      <CarouselBar n={n} index={index} images={images} go={go} />
    </div>
  );
}

/**
 * Mobile only: horizontal track inside a hard-clipped card.
 * Never used on desktop — avoids the layout blow-up.
 */
function MobileCarousel({
  images,
  id,
  landscape,
  onImgLoad,
}: {
  images: GalleryImage[];
  id: string;
  landscape: boolean;
  onImgLoad: (e: React.SyntheticEvent<HTMLImageElement>) => void;
}) {
  const n = images.length;
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const indexRef = useRef(0);
  const widthRef = useRef(0);

  const [index, setIndex] = useState(0);
  const [width, setWidth] = useState(0);
  const [dragging, setDragging] = useState(false);

  const startX = useRef(0);
  const startY = useRef(0);
  const startOffset = useRef(0);
  const lastX = useRef(0);
  const lastT = useRef(0);
  const velocity = useRef(0);
  const axisLock = useRef<'x' | 'y' | null>(null);
  const pointerId = useRef<number | null>(null);
  const didDrag = useRef(false);

  const applyTransform = useCallback((offset: number, animate: boolean) => {
    const track = trackRef.current;
    if (!track) return;
    track.style.transition = animate
      ? 'transform 0.36s cubic-bezier(0.22, 1, 0.36, 1)'
      : 'none';
    track.style.transform = `translate3d(${offset}px, 0, 0)`;
  }, []);

  const settleTo = useCallback(
    (next: number, animate = true) => {
      const w = widthRef.current;
      const i = Math.max(0, Math.min(n - 1, next));
      indexRef.current = i;
      setIndex(i);
      applyTransform(-i * w, animate);
    },
    [applyTransform, n]
  );

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const measure = () => {
      // clientWidth of the clipped viewport = one slide width
      const w = Math.round(el.getBoundingClientRect().width);
      if (w <= 0) return;
      const changed = widthRef.current !== w;
      widthRef.current = w;
      setWidth(w);
      if (changed) applyTransform(-indexRef.current * w, false);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [applyTransform]);

  const onPointerDown = (e: ReactPointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    const w = widthRef.current;
    if (!w) return;

    pointerId.current = e.pointerId;
    startX.current = e.clientX;
    startY.current = e.clientY;
    startOffset.current = -indexRef.current * w;
    lastX.current = e.clientX;
    lastT.current = performance.now();
    velocity.current = 0;
    axisLock.current = null;
    didDrag.current = false;
    setDragging(true);
    try {
      viewportRef.current?.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    if (pointerId.current !== e.pointerId || !dragging) return;
    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;

    if (!axisLock.current) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      axisLock.current = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
      if (axisLock.current === 'y') {
        // Abort horizontal drag — allow native scroll
        setDragging(false);
        pointerId.current = null;
        return;
      }
    }
    if (axisLock.current !== 'x') return;

    e.preventDefault();
    didDrag.current = true;

    const now = performance.now();
    const dt = Math.max(1, now - lastT.current);
    velocity.current = ((e.clientX - lastX.current) / dt) * 1000;
    lastX.current = e.clientX;
    lastT.current = now;

    const w = widthRef.current;
    const maxOff = Math.max(0, (n - 1) * w);
    applyTransform(rubber(startOffset.current + dx, maxOff), false);
  };

  const endDrag = (e: ReactPointerEvent) => {
    if (pointerId.current !== e.pointerId) return;
    pointerId.current = null;
    const wasDrag = didDrag.current;
    const lock = axisLock.current;
    axisLock.current = null;
    setDragging(false);

    if (lock === 'y' || !wasDrag) {
      settleTo(indexRef.current, true);
      return;
    }

    const w = widthRef.current || 1;
    const dx = e.clientX - startX.current;
    const v = velocity.current;
    let next = indexRef.current;

    if (Math.abs(v) > 450) {
      next = v < 0 ? indexRef.current + 1 : indexRef.current - 1;
    } else if (Math.abs(dx) > w * 0.18) {
      next = dx < 0 ? indexRef.current + 1 : indexRef.current - 1;
    } else {
      next = Math.round((-startOffset.current - dx) / w);
    }

    settleTo(next, true);

    if (wasDrag) {
      const block = (ev: Event) => {
        ev.stopPropagation();
        ev.preventDefault();
        document.removeEventListener('click', block, true);
      };
      document.addEventListener('click', block, true);
      window.setTimeout(() => document.removeEventListener('click', block, true), 100);
    }
  };

  const go = useCallback((next: number) => settleTo(next, true), [settleTo]);

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

  const slideW = width || undefined;

  return (
    <div
      className={`cc-carousel cc-carousel--mobile${landscape ? ' cc-carousel--wide' : ''}${
        dragging ? ' is-dragging' : ''
      }`}
      data-carousel-id={id}
      tabIndex={0}
      role="region"
      aria-roledescription="carousel"
      aria-label={`Image gallery, ${n} photos`}
      onKeyDown={onKeyDown}
    >
      <div
        ref={viewportRef}
        className="cc-carousel__viewport"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div
          ref={trackRef}
          className="cc-carousel__track"
          style={{
            width: width ? width * n : '100%',
            // Critical: never inherit max-width:100% from .article-content *
            maxWidth: 'none',
          }}
        >
          {images.map((img, i) => (
            <div
              key={`${img.src}-${i}`}
              className={`cc-carousel__slide${i === index ? ' is-active' : ''}`}
              style={
                slideW
                  ? { width: slideW, flex: `0 0 ${slideW}px`, maxWidth: 'none' }
                  : { width: '100%', flex: '0 0 100%', maxWidth: 'none' }
              }
              aria-hidden={i === index ? 'false' : 'true'}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.src}
                alt={img.alt || `Photo ${i + 1} of ${n}`}
                className="cc-carousel__img"
                draggable={false}
                loading={i <= 1 ? 'eager' : 'lazy'}
                decoding="async"
                onLoad={onImgLoad}
              />
            </div>
          ))}
        </div>

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
      <CarouselBar n={n} index={index} images={images} go={go} />
    </div>
  );
}

function CarouselBar({
  n,
  index,
  images,
  go,
}: {
  n: number;
  index: number;
  images: GalleryImage[];
  go: (i: number) => void;
}) {
  return (
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
  );
}

function Carousel({ images, id }: { images: GalleryImage[]; id: string }) {
  const isMobile = useIsMobile();
  const { landscape, onImgLoad } = useLandscape(images);
  // Avoid SSR/client HTML mismatch: server + first paint = desktop, then upgrade on phone
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);

  // Desktop path is the layout-safe default. Mobile track only after hydrate.
  if (hydrated && isMobile) {
    return (
      <MobileCarousel
        images={images}
        id={id}
        landscape={landscape}
        onImgLoad={onImgLoad}
      />
    );
  }
  return (
    <DesktopCarousel
      images={images}
      id={id}
      landscape={landscape}
      onImgLoad={onImgLoad}
    />
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
