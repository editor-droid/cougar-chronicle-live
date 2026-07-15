import { Node, mergeAttributes } from '@tiptap/core';

export type VideoEmbedAttrs = {
  src: string;
  provider: 'youtube' | 'instagram' | 'stream' | 'unknown';
  aspectRatio: string;
};

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    videoEmbed: {
      setVideoEmbed: (attrs: Partial<VideoEmbedAttrs> & { src: string }) => ReturnType;
    };
  }
}

function providerFromSrc(src: string | null): VideoEmbedAttrs['provider'] {
  if (!src) return 'unknown';
  if (/youtube\.com|youtu\.be/i.test(src)) return 'youtube';
  if (/instagram\.com/i.test(src)) return 'instagram';
  if (/cloudflarestream|videodelivery/i.test(src)) return 'stream';
  return 'unknown';
}

/**
 * Block embed for YouTube, Instagram, and Cloudflare Stream.
 * Persists as data-video-embed wrapper so re-opening the editor keeps iframes.
 */
export const VideoEmbed = Node.create({
  name: 'videoEmbed',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (el) =>
          (el as HTMLElement).getAttribute('data-src') ||
          (el as HTMLElement).querySelector('iframe')?.getAttribute('src'),
      },
      provider: {
        default: 'unknown',
        parseHTML: (el) =>
          (el as HTMLElement).getAttribute('data-provider') ||
          providerFromSrc(
            (el as HTMLElement).querySelector('iframe')?.getAttribute('src') ||
              null
          ),
      },
      aspectRatio: {
        default: '16 / 9',
        parseHTML: (el) =>
          (el as HTMLElement).getAttribute('data-aspect') ||
          ((el as HTMLElement).getAttribute('data-provider') === 'instagram' ||
          (el as HTMLElement).hasAttribute('data-instagram-embed')
            ? '4 / 5'
            : '16 / 9'),
      },
    };
  },

  parseHTML() {
    return [
      { tag: 'div[data-video-embed]' },
      {
        tag: 'div[data-instagram-embed]',
        getAttrs: (el) => {
          const iframe = (el as HTMLElement).querySelector('iframe');
          return {
            src: iframe?.getAttribute('src'),
            provider: 'instagram',
            aspectRatio: '4 / 5',
          };
        },
      },
      {
        tag: 'div[data-youtube-video]',
        getAttrs: (el) => {
          const iframe = (el as HTMLElement).querySelector('iframe');
          return {
            src: iframe?.getAttribute('src'),
            provider: 'youtube',
            aspectRatio: '16 / 9',
          };
        },
      },
      {
        tag: 'iframe',
        getAttrs: (el) => {
          const src = (el as HTMLIFrameElement).getAttribute('src') || '';
          if (
            !/youtube\.com|youtu\.be|instagram\.com|cloudflarestream|videodelivery/i.test(
              src
            )
          ) {
            return false;
          }
          const provider = providerFromSrc(src);
          return {
            src,
            provider,
            aspectRatio: provider === 'instagram' ? '4 / 5' : '16 / 9',
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const src = (HTMLAttributes.src as string) || '';
    const provider = (HTMLAttributes.provider as string) || 'unknown';
    const aspectRatio =
      (HTMLAttributes.aspectRatio as string) ||
      (provider === 'instagram' ? '4 / 5' : '16 / 9');

    return [
      'div',
      mergeAttributes({
        'data-video-embed': 'true',
        'data-provider': provider,
        'data-src': src,
        'data-aspect': aspectRatio,
        class: `video-embed video-embed--${provider}`,
        style: `position:relative;width:100%;max-width:${
          provider === 'instagram' ? '400px' : '100%'
        };margin:1.75rem auto;aspect-ratio:${aspectRatio};background:#0a0a0a;border-radius:8px;overflow:hidden;`,
      }),
      [
        'iframe',
        {
          src,
          class: 'video-embed-iframe',
          style:
            'position:absolute;inset:0;width:100%;height:100%;border:0;',
          allow:
            'accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen',
          allowfullscreen: 'true',
          loading: 'lazy',
          referrerpolicy: 'strict-origin-when-cross-origin',
          title: `${provider} embed`,
          // Instagram-specific
          ...(provider === 'instagram'
            ? {
                scrolling: 'no',
                frameborder: '0',
              }
            : {}),
        },
      ],
    ];
  },

  addCommands() {
    return {
      setVideoEmbed:
        (attrs) =>
        ({ commands }) => {
          const provider = attrs.provider || providerFromSrc(attrs.src) || 'unknown';
          return commands.insertContent({
            type: this.name,
            attrs: {
              src: attrs.src,
              provider,
              aspectRatio:
                attrs.aspectRatio ||
                (provider === 'instagram' ? '4 / 5' : '16 / 9'),
            },
          });
        },
    };
  },
});
