import { Node, mergeAttributes } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import {
  ReactNodeViewRenderer,
  NodeViewWrapper,
  type ReactNodeViewProps,
} from "@tiptap/react";
import { ExternalLink, Trash2 } from "lucide-react";
import {
  canonicalTweetUrl,
  parseTweetInput,
  type TweetEmbedAttrs,
} from "./tweet-embed";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    tweetEmbed: {
      setTweetEmbed: (attrs: TweetEmbedAttrs) => ReturnType;
    };
  }
}

function XMark({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.008 3.974H5.059z" />
    </svg>
  );
}

function attrsFromElement(el: HTMLElement): TweetEmbedAttrs | false {
  const href =
    el.getAttribute("data-tweet-url") ||
    el.querySelector("a[href*='/status/']")?.getAttribute("href") ||
    el.querySelector("a[href*='/statuses/']")?.getAttribute("href") ||
    "";
  const idAttr = el.getAttribute("data-tweet-id") || "";
  const parsed =
    parseTweetInput(href) ||
    (/^\d{1,20}$/.test(idAttr)
      ? { url: canonicalTweetUrl(idAttr), tweetId: idAttr }
      : null) ||
    parseTweetInput(el.innerHTML);
  if (!parsed) return false;
  const text = el.querySelector("p")?.textContent?.trim() || "";
  const handle =
    el.getAttribute("data-tweet-handle") || parsed.handle || "";
  return {
    url: parsed.url,
    tweetId: parsed.tweetId,
    handle: handle || undefined,
    text,
    authorName: el.getAttribute("data-tweet-author") || "",
  };
}

function TweetEmbedNodeView({
  node,
  deleteNode,
  selected,
}: ReactNodeViewProps) {
  const attrs = node.attrs as TweetEmbedAttrs;
  const url =
    attrs.url || canonicalTweetUrl(attrs.tweetId, attrs.handle);
  const handle = attrs.handle ? `@${attrs.handle}` : null;
  const text = (attrs.text || "").trim();
  const author = (attrs.authorName || "").trim();

  return (
    <NodeViewWrapper
      as="div"
      className="tweet-embed-node"
      data-tweet-embed="true"
    >
      <div
        contentEditable={false}
        style={{
          maxWidth: 480,
          margin: "1.5rem auto",
          border: selected
            ? "1.5px solid var(--primary)"
            : "1px solid var(--border)",
          borderRadius: "0.85rem",
          background: "#fff",
          boxShadow: selected
            ? "0 0 0 3px color-mix(in srgb, var(--primary) 18%, transparent)"
            : "0 1px 2px rgba(15, 23, 42, 0.04)",
          overflow: "hidden",
          fontFamily: "var(--font-sans)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.55rem 0.75rem",
            borderBottom: "1px solid var(--border)",
            background: "var(--surface)",
          }}
        >
          <span style={{ color: "var(--foreground)", display: "flex" }}>
            <XMark size={13} />
          </span>
          <span
            className="font-sans"
            style={{
              fontSize: "0.7rem",
              fontWeight: 700,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              color: "var(--muted)",
              flex: 1,
            }}
          >
            X post
          </span>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              deleteNode();
            }}
            title="Remove embed"
            style={{
              background: "none",
              border: "none",
              color: "var(--muted)",
              cursor: "pointer",
              padding: 2,
              display: "inline-flex",
            }}
          >
            <Trash2 size={13} />
          </button>
        </div>
        <div style={{ padding: "0.85rem 1rem 1rem" }}>
          {(author || handle) && (
            <div
              className="font-sans"
              style={{
                fontSize: "0.85rem",
                fontWeight: 700,
                color: "var(--foreground)",
                marginBottom: text ? "0.4rem" : "0.65rem",
              }}
            >
              {author || handle}
              {author && handle ? (
                <span
                  style={{
                    fontWeight: 500,
                    color: "var(--muted)",
                    marginLeft: "0.35rem",
                  }}
                >
                  {handle}
                </span>
              ) : null}
            </div>
          )}
          {text ? (
            <p
              className="font-sans"
              style={{
                margin: "0 0 0.75rem",
                fontSize: "0.95rem",
                lineHeight: 1.45,
                color: "var(--foreground)",
                whiteSpace: "pre-wrap",
              }}
            >
              {text}
            </p>
          ) : (
            <p
              className="font-sans"
              style={{
                margin: "0 0 0.75rem",
                fontSize: "0.85rem",
                color: "var(--muted)",
                lineHeight: 1.4,
              }}
            >
              This post will render as an embed on the published article.
            </p>
          )}
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="font-sans"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.3rem",
              fontSize: "0.75rem",
              color: "#1d9bf0",
              wordBreak: "break-all",
            }}
          >
            View on X
            <ExternalLink size={11} />
          </a>
        </div>
      </div>
    </NodeViewWrapper>
  );
}

/**
 * Block embed for an X/Twitter post.
 * Saved as a .tweet-embed wrapper + blockquote.twitter-tweet so
 * TwitterEmbedHydrator can hydrate widgets.js on article pages.
 */
export const TweetEmbed = Node.create({
  name: "tweetEmbed",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,
  isolating: true,

  addAttributes() {
    return {
      url: { default: "" },
      tweetId: { default: "" },
      handle: { default: "" },
      text: { default: "" },
      authorName: { default: "" },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-tweet-embed]",
        priority: 60,
        getAttrs: (el) => attrsFromElement(el as HTMLElement),
      },
      {
        tag: "div.tweet-embed",
        priority: 60,
        getAttrs: (el) => attrsFromElement(el as HTMLElement),
      },
      {
        tag: "blockquote.twitter-tweet",
        priority: 60,
        getAttrs: (el) => {
          const parent = (el as HTMLElement).parentElement;
          if (
            parent?.hasAttribute("data-tweet-embed") ||
            parent?.classList.contains("tweet-embed")
          ) {
            return false;
          }
          return attrsFromElement(el as HTMLElement);
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const tweetId = String(HTMLAttributes.tweetId || "");
    const handle = String(HTMLAttributes.handle || "");
    const url =
      String(HTMLAttributes.url || "") ||
      (tweetId ? canonicalTweetUrl(tweetId, handle || undefined) : "");
    const text = String(HTMLAttributes.text || "");
    const authorName = String(HTMLAttributes.authorName || "");

    const quoteChildren: unknown[] = [];
    if (text) {
      quoteChildren.push(["p", {}, text]);
    }
    if (authorName) {
      quoteChildren.push(["span", {}, ` — ${authorName}`]);
    }
    quoteChildren.push(["a", { href: url }, url || "View on X"]);

    return [
      "div",
      mergeAttributes({
        class: "tweet-embed",
        "data-tweet-embed": "true",
        "data-tweet-url": url,
        "data-tweet-id": tweetId,
        ...(handle ? { "data-tweet-handle": handle } : {}),
        ...(authorName ? { "data-tweet-author": authorName } : {}),
      }),
      [
        "blockquote",
        {
          class: "twitter-tweet",
          "data-dnt": "true",
        },
        ...quoteChildren,
      ],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(TweetEmbedNodeView);
  },

  addCommands() {
    return {
      setTweetEmbed:
        (attrs) =>
        ({ commands }) => {
          const parsed = parseTweetInput(attrs.url) ||
            (attrs.tweetId
              ? {
                  url: canonicalTweetUrl(attrs.tweetId, attrs.handle),
                  tweetId: attrs.tweetId,
                  handle: attrs.handle,
                }
              : null);
          if (!parsed) return false;
          return commands.insertContent({
            type: this.name,
            attrs: {
              url: parsed.url,
              tweetId: parsed.tweetId,
              handle: parsed.handle || attrs.handle || "",
              text: attrs.text || "",
              authorName: attrs.authorName || "",
            },
          });
        },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("tweetEmbedPaste"),
        props: {
          handlePaste: (_view, event) => {
            const text = event.clipboardData?.getData("text/plain")?.trim() ?? "";
            if (!text || /\s/.test(text)) return false;
            const parsed = parseTweetInput(text);
            if (!parsed) return false;
            return this.editor.commands.setTweetEmbed(parsed);
          },
        },
      }),
    ];
  },
});
