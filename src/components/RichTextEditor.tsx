import { useEditor, EditorContent, Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Heading from "@tiptap/extension-heading";
import Link from "@tiptap/extension-link";
import { ResizableImage } from "../lib/ResizableImageExtension";
import { GalleryExtension } from "../lib/GalleryExtension";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import Highlight from "@tiptap/extension-highlight";
import { VideoEmbed } from "../lib/VideoEmbedExtension";
import { parseVideoEmbedInput, type EmbedProvider } from "../lib/embed-utils";
import { streamEmbedUrl, youtubeEmbedUrl } from "../lib/videos";
import * as tus from "tus-js-client";
import {
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
  useState,
  useRef,
  useMemo,
} from "react";
import {
  Bold,
  Italic,
  UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  Image as ImageIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo,
  Redo,
  Minus,
  TableIcon,
  Video, Camera,
  Plus,
  Trash2,
  Columns,
  Rows,
  X,
  ExternalLink,
  AlertCircle,
  MousePointerClick,
  MessageSquareQuote,
  ChevronDown,
  Highlighter,
  Pencil,
  Unlink,
  Upload,
  Loader2,
} from "lucide-react";

export interface RichTextEditorHandle {
  insertImage: (url: string, alt?: string) => void;
  insertGallery: (images: {src: string, alt: string}[], columns: number) => void;
  getEditor: () => Editor | null;
}

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  onImageInsert?: () => void;
  onGalleryInsert?: () => void;
  placeholder?: string;
  className?: string;
  viewMode?: "edit" | "split" | "preview";
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
  size = "normal",
}: {
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
  size?: "normal" | "small";
}) {
  return (
    <button
      type="button"
      onMouseDown={e => {
        // Keep editor focus so caret stays where the author is working
        e.preventDefault();
        onClick(e);
      }}
      disabled={disabled}
      title={title}
      className={`rounded transition-colors ${size === "small" ? "p-1" : "p-1.5"}`}
      style={{
        color: active ? "var(--primary)" : "var(--muted)",
        background: active ? "var(--surface)" : "transparent",
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
        border: "none",
        outline: "none",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {children}
    </button>
  );
}

// ── Floating embed popover near cursor / toolbar ─────────────────────────────
type EmbedDialogMode = "video" | "link";
type EmbedAnchor = { top: number; left: number; bottom: number };

function clampPopoverPosition(anchor: EmbedAnchor, width: number, height: number) {
  const pad = 8;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  // Prefer just below the caret; flip above if not enough room
  let top = anchor.bottom + 8;
  if (top + height > vh - pad) {
    top = Math.max(pad, anchor.top - height - 8);
  }
  let left = anchor.left;
  if (left + width > vw - pad) left = vw - width - pad;
  if (left < pad) left = pad;
  return { top, left };
}

type EmbedVideoTab = "upload" | "paste" | "library";

const STREAM_MAX_BYTES = 4 * 1024 * 1024 * 1024;

function EmbedDialog({
  open,
  onClose,
  onInsertVideo,
  onInsertLink,
  mode,
  initialUrl = "",
  preferredProvider,
  anchor,
}: {
  open: boolean;
  onClose: () => void;
  onInsertVideo: (attrs: {
    src: string;
    provider: EmbedProvider;
    aspectRatio: string;
  }) => void;
  onInsertLink: (url: string) => void;
  mode: EmbedDialogMode;
  initialUrl?: string;
  preferredProvider?: EmbedProvider;
  anchor: EmbedAnchor | null;
}) {
  // Instagram → URL only; general video → Upload default
  const defaultTab: EmbedVideoTab =
    preferredProvider === "instagram" || preferredProvider === "youtube"
      ? "paste"
      : "upload";

  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [tab, setTab] = useState<EmbedVideoTab>(defaultTab);
  const [library, setLibrary] = useState<
    { id: string; title: string; platform: string; externalId: string; thumbnailUrl: string | null; embedUrl: string }[]
  >([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadPhase, setUploadPhase] = useState<
    "idle" | "preparing" | "uploading" | "done" | "error"
  >("idle");
  const [uploadFileName, setUploadFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const tusUploadRef = useRef<tus.Upload | null>(null);
  const uploadGenRef = useRef(0);
  const [pos, setPos] = useState({ top: 80, left: 80 });

  const isUploading = uploadPhase === "preparing" || uploadPhase === "uploading";

  const abortUpload = useCallback(() => {
    uploadGenRef.current += 1;
    try {
      // abort(false) = stop client only. abort(true) sends DELETE, which
      // Cloudflare Stream blocks via CORS and can break a finished upload.
      tusUploadRef.current?.abort(false);
    } catch {
      /* ignore */
    }
    tusUploadRef.current = null;
  }, []);

  const resetUploadState = useCallback(() => {
    abortUpload();
    setUploadProgress(0);
    setUploadPhase("idle");
    setUploadFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [abortUpload]);

  useEffect(() => {
    if (open) {
      setUrl(initialUrl);
      setError("");
      setTab(
        preferredProvider === "instagram" || preferredProvider === "youtube"
          ? "paste"
          : "upload"
      );
      resetUploadState();
      setTimeout(() => {
        if (preferredProvider === "instagram" || preferredProvider === "youtube") {
          inputRef.current?.focus();
        }
      }, 50);
    } else if (tusUploadRef.current) {
      // Stop only in-flight client uploads (never DELETE remote Stream media)
      abortUpload();
    }
  }, [open, initialUrl, preferredProvider, resetUploadState, abortUpload]);

  // Position near caret / anchor; remeasure after paint
  useEffect(() => {
    if (!open) return;
    const place = () => {
      const a = anchor || {
        top: 120,
        left: 80,
        bottom: 150,
      };
      const rect = panelRef.current?.getBoundingClientRect();
      const w = rect?.width || 360;
      const h = rect?.height || 280;
      setPos(clampPopoverPosition(a, w, h));
    };
    place();
    const t = requestAnimationFrame(place);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      cancelAnimationFrame(t);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, anchor, tab, url, error, uploadPhase, uploadProgress]);

  useEffect(() => {
    if (!open || mode !== "video" || tab !== "library") return;
    let cancelled = false;
    setLibraryLoading(true);
    fetch("/api/videos?limit=30")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setLibrary(data.videos || []);
      })
      .catch(() => {
        if (!cancelled) setLibrary([]);
      })
      .finally(() => {
        if (!cancelled) setLibraryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, mode, tab]);

  // Click outside to close (blocked while uploading)
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (isUploading) return;
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, onClose, isUploading]);

  const insertStreamUid = useCallback(
    (uid: string) => {
      onInsertVideo({
        src: streamEmbedUrl(uid, {
          letterboxColor: "transparent",
          primaryColor: "#1b2253",
        }),
        provider: "stream",
        aspectRatio: "16 / 9",
      });
      onClose();
    },
    [onInsertVideo, onClose]
  );

  const startStreamUpload = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("video/") && !/\.(mp4|mov|webm|m4v|mkv)$/i.test(file.name)) {
        setError("Choose a video file (MP4, MOV, WebM…).");
        setUploadPhase("error");
        return;
      }
      if (file.size > STREAM_MAX_BYTES) {
        setError("File is larger than 4 GB. Export at 1080p or trim the clip.");
        setUploadPhase("error");
        return;
      }

      abortUpload();
      const generation = uploadGenRef.current;
      setError("");
      setUploadFileName(file.name);
      setUploadProgress(0);
      setUploadPhase("preparing");

      try {
        const setupRes = await fetch("/api/videos/stream-upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            protocol: "tus",
            uploadLength: file.size,
            maxDurationSeconds: 1800,
            name: file.name || "editor-upload",
          }),
        });
        const setup = await setupRes.json();
        if (!setupRes.ok) throw new Error(setup.error || "Upload unavailable");
        if (generation !== uploadGenRef.current) return;

        setUploadPhase("uploading");

        await new Promise<void>((resolve, reject) => {
          const upload = new tus.Upload(file, {
            uploadUrl: setup.uploadURL,
            retryDelays: [0, 1000, 3000, 5000, 10000],
            chunkSize: 50 * 1024 * 1024,
            metadata: {
              filename: file.name,
              filetype: file.type || "video/mp4",
            },
            onError: (err) => reject(err),
            onProgress: (bytesUploaded, bytesTotal) => {
              if (generation !== uploadGenRef.current) return;
              if (bytesTotal > 0) {
                setUploadProgress(Math.round((bytesUploaded / bytesTotal) * 100));
              }
            },
            onSuccess: () => resolve(),
          });
          tusUploadRef.current = upload;
          upload.start();
        });

        if (generation !== uploadGenRef.current) return;

        setUploadProgress(100);
        setUploadPhase("done");
        // Detach tus handle so dialog close does not touch a finished upload
        tusUploadRef.current = null;
        // Auto-insert into the article at the caret
        insertStreamUid(setup.uid as string);
      } catch (err) {
        if (generation !== uploadGenRef.current) return;
        if ((err as Error).message === "Upload cancelled") return;
        setUploadPhase("error");
        setError((err as Error).message || "Upload failed");
      }
    },
    [abortUpload, insertStreamUid]
  );

  const onFilePicked = (file: File | null) => {
    if (!file) return;
    startStreamUpload(file);
  };

  if (!open) return null;

  const isLink = mode === "link";
  const showUploadTab =
    !isLink && preferredProvider !== "instagram" && preferredProvider !== "youtube";
  const parsed = !isLink && url.trim() ? parseVideoEmbedInput(url.trim()) : null;
  const showMiniPreview = Boolean(parsed?.embedSrc && tab === "paste");

  const title = isLink
    ? "Insert link"
    : preferredProvider === "instagram"
      ? "Instagram"
      : preferredProvider === "youtube"
        ? "YouTube"
        : "Insert video";

  const placeholder = isLink
    ? "https://example.com"
    : preferredProvider === "instagram"
      ? "instagram.com/p/… or /reel/…"
      : preferredProvider === "youtube"
        ? "YouTube URL…"
        : "YouTube or Instagram URL…";

  const handleInsert = () => {
    const trimmed = url.trim();
    if (!trimmed) {
      setError("URL is required");
      return;
    }
    if (isLink) {
      try {
        new URL(trimmed);
        onInsertLink(trimmed);
        onClose();
      } catch {
        setError("Enter a valid URL (https://…)");
      }
      return;
    }
    const embed = parseVideoEmbedInput(trimmed);
    if (!embed) {
      setError("Use a YouTube or Instagram link (Stream: use Upload).");
      return;
    }
    // Prefer upload path for Stream IDs pasted by mistake
    if (embed.provider === "stream") {
      setError("For Cloudflare Stream, switch to Upload and pick a video file.");
      return;
    }
    onInsertVideo({
      src: embed.embedSrc,
      provider: embed.provider,
      aspectRatio: embed.aspectRatio,
    });
    onClose();
  };

  const insertFromLibrary = (v: (typeof library)[0]) => {
    if (v.platform === "STREAM" && v.externalId) {
      onInsertVideo({
        src: streamEmbedUrl(v.externalId, {
          letterboxColor: "transparent",
          primaryColor: "#1b2253",
        }),
        provider: "stream",
        aspectRatio: "16 / 9",
      });
    } else if (v.platform === "YOUTUBE" && v.externalId) {
      onInsertVideo({
        src: youtubeEmbedUrl(v.externalId),
        provider: "youtube",
        aspectRatio: "16 / 9",
      });
    } else if (v.embedUrl) {
      const embed = parseVideoEmbedInput(v.embedUrl);
      if (embed) {
        onInsertVideo({
          src: embed.embedSrc,
          provider: embed.provider,
          aspectRatio: embed.aspectRatio,
        });
      } else {
        setError("Could not embed that library video.");
        return;
      }
    }
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleInsert();
    }
    if (e.key === "Escape" && !isUploading) onClose();
  };

  const handleClose = () => {
    if (isUploading) return;
    onClose();
  };

  const videoTabs: { id: EmbedVideoTab; label: string }[] = showUploadTab
    ? [
        { id: "upload", label: "Upload" },
        { id: "paste", label: "URL" },
        { id: "library", label: "Library" },
      ]
    : [
        { id: "paste", label: "URL" },
        { id: "library", label: "Library" },
      ];

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label={title}
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        zIndex: 200,
        width: "min(380px, calc(100vw - 16px))",
        maxHeight: "min(460px, calc(100vh - 24px))",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "0.65rem",
        boxShadow: "0 12px 40px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08)",
      }}
    >
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{ borderBottom: "1px solid var(--border)", flexShrink: 0 }}
      >
        <div className="flex items-center gap-2">
          <span style={{ color: "var(--primary)" }}>
            {isLink ? (
              <LinkIcon size={16} />
            ) : preferredProvider === "instagram" ? (
              <Camera size={16} />
            ) : (
              <Video size={16} />
            )}
          </span>
          <span className="font-sans text-xs font-bold" style={{ color: "var(--foreground)" }}>
            {title}
          </span>
          {parsed && tab === "paste" && (
            <span className="font-sans text-xs" style={{ color: "var(--muted)" }}>
              · {parsed.provider}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={handleClose}
          className="p-1 rounded"
          style={{
            color: "var(--muted)",
            background: "none",
            border: "none",
            cursor: isUploading ? "not-allowed" : "pointer",
            opacity: isUploading ? 0.4 : 1,
          }}
          aria-label="Close"
          disabled={isUploading}
        >
          <X size={14} />
        </button>
      </div>

      {!isLink && (
        <div className="flex gap-0 px-2" style={{ borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          {videoTabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                if (isUploading) return;
                setTab(t.id);
                setError("");
              }}
              className="font-sans text-xs font-bold px-2.5 py-1.5"
              style={{
                background: "transparent",
                border: "none",
                borderBottom: tab === t.id ? "2px solid var(--primary)" : "2px solid transparent",
                color: tab === t.id ? "var(--primary)" : "var(--muted)",
                cursor: isUploading ? "not-allowed" : "pointer",
                opacity: isUploading && tab !== t.id ? 0.5 : 1,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      <div className="px-3 py-2.5 space-y-2" style={{ overflowY: "auto", flex: 1 }}>
        {/* ── Stream file upload (default) ───────────────────────────── */}
        {!isLink && tab === "upload" && showUploadTab && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
            <p className="font-sans text-xs" style={{ margin: 0, color: "var(--muted)", lineHeight: 1.4 }}>
              Upload a video to Cloudflare Stream. It inserts into the article when the upload finishes.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*,.mp4,.mov,.webm,.m4v"
              style={{ display: "none" }}
              onChange={(e) => onFilePicked(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="font-sans text-xs font-bold"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.4rem",
                padding: "1.25rem 0.75rem",
                border: "1.5px dashed var(--border)",
                borderRadius: "0.5rem",
                background: "var(--background)",
                color: "var(--foreground)",
                cursor: isUploading ? "wait" : "pointer",
                width: "100%",
              }}
            >
              {isUploading ? (
                <Loader2 size={22} style={{ animation: "spin 1s linear infinite", color: "var(--primary)" }} />
              ) : (
                <Upload size={22} style={{ color: "var(--primary)" }} />
              )}
              <span>
                {isUploading
                  ? uploadPhase === "preparing"
                    ? "Preparing…"
                    : `Uploading… ${uploadProgress}%`
                  : "Choose video file"}
              </span>
              {uploadFileName && (
                <span style={{ fontWeight: 500, color: "var(--muted)", fontSize: "0.7rem", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {uploadFileName}
                </span>
              )}
            </button>
            {isUploading && (
              <div
                style={{
                  height: 6,
                  borderRadius: 999,
                  background: "var(--border)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${uploadProgress}%`,
                    background: "var(--primary)",
                    transition: "width 0.2s ease",
                  }}
                />
              </div>
            )}
            {error && (
              <p className="text-xs font-sans" style={{ color: "#b91c1c", margin: 0 }}>
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2 pt-1">
              {isUploading ? (
                <button
                  type="button"
                  onClick={() => {
                    resetUploadState();
                    setError("");
                  }}
                  className="font-sans text-xs font-bold px-3 py-1.5 rounded-md"
                  style={{
                    background: "transparent",
                    border: "1px solid var(--border)",
                    color: "var(--muted)",
                    cursor: "pointer",
                  }}
                >
                  Cancel upload
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleClose}
                  className="font-sans text-xs font-bold px-3 py-1.5 rounded-md"
                  style={{
                    background: "transparent",
                    border: "1px solid var(--border)",
                    color: "var(--muted)",
                    cursor: "pointer",
                  }}
                >
                  Close
                </button>
              )}
            </div>
          </div>
        )}

        {(isLink || tab === "paste") && (
          <>
            {!isLink && showUploadTab && (
              <p className="font-sans text-xs" style={{ margin: 0, color: "var(--muted)", lineHeight: 1.4 }}>
                Paste a YouTube or Instagram link. For Stream, use the Upload tab.
              </p>
            )}
            <input
              ref={inputRef}
              type="text"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setError("");
              }}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="w-full text-sm rounded-lg px-3 py-2 font-sans"
              style={{
                background: "var(--background)",
                color: "var(--foreground)",
                border: error ? "1.5px solid #b91c1c" : "1.5px solid var(--border)",
                outline: "none",
                width: "100%",
                boxSizing: "border-box",
              }}
            />
            {error && (
              <p className="text-xs font-sans" style={{ color: "#b91c1c", margin: 0 }}>
                {error}
              </p>
            )}
            {showMiniPreview && (
              <div
                className="rounded-md overflow-hidden"
                style={{
                  border: "1px solid var(--border)",
                  aspectRatio: "16 / 9",
                  maxHeight: 140,
                  position: "relative",
                  background: "#000",
                }}
              >
                <iframe
                  src={parsed!.embedSrc}
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }}
                  title="Preview"
                  allow="fullscreen"
                />
              </div>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={handleClose}
                className="font-sans text-xs font-bold px-3 py-1.5 rounded-md"
                style={{
                  background: "transparent",
                  border: "1px solid var(--border)",
                  color: "var(--muted)",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleInsert}
                className="font-sans text-xs font-bold px-3 py-1.5 rounded-md"
                style={{
                  background: "var(--primary)",
                  border: "none",
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                Insert
              </button>
            </div>
          </>
        )}

        {!isLink && tab === "library" && (
          <div>
            {libraryLoading && (
              <p className="text-xs font-sans text-muted" style={{ margin: 0 }}>Loading…</p>
            )}
            {!libraryLoading && library.length === 0 && (
              <p className="text-xs font-sans text-muted" style={{ margin: 0 }}>
                No published videos. Upload a file or paste a URL.
              </p>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", maxHeight: 240, overflowY: "auto" }}>
              {library.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => insertFromLibrary(v)}
                  className="font-sans text-left"
                  style={{
                    display: "flex",
                    gap: "0.5rem",
                    alignItems: "center",
                    padding: "0.4rem",
                    border: "1px solid var(--border)",
                    borderRadius: "0.4rem",
                    background: "var(--background)",
                    cursor: "pointer",
                    width: "100%",
                  }}
                >
                  {v.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={v.thumbnailUrl}
                      alt=""
                      width={56}
                      height={32}
                      style={{ objectFit: "cover", borderRadius: 3, width: 56, height: 32, flexShrink: 0 }}
                    />
                  ) : (
                    <div style={{ width: 56, height: 32, background: "var(--border)", borderRadius: 3, flexShrink: 0 }} />
                  )}
                  <div style={{ minWidth: 0 }}>
                    <div className="text-xs font-medium" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {v.title}
                    </div>
                    <div className="text-xs text-muted" style={{ fontSize: "0.65rem" }}>
                      {v.platform === "STREAM" ? "Stream" : "YouTube"}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TableDropdown({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <ToolbarButton
        onClick={() => setOpen(v => !v)}
        active={editor.isActive("table")}
        title="Table"
      >
        <TableIcon size={15} />
      </ToolbarButton>
      {open && (
        <div
          className="absolute top-full left-0 mt-1 z-50 rounded-lg shadow-xl p-2 min-w-[160px]"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
          }}
        >
          {!editor.isActive("table") ? (
            <>
              <button
                type="button"
                onMouseDown={e => {
                  e.preventDefault();
                  editor
                    .chain()
                    .focus()
                    .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                    .run();
                  setOpen(false);
                }}
                className="w-full text-left px-3 py-1.5 rounded text-xs hover:bg-[var(--surface)] transition-colors flex items-center gap-2"
                style={{ color: "var(--foreground)" }}
              >
                <Plus size={12} /> Insert 3×3 Table
              </button>
              <button
                type="button"
                onMouseDown={e => {
                  e.preventDefault();
                  editor
                    .chain()
                    .focus()
                    .insertTable({ rows: 4, cols: 2, withHeaderRow: true })
                    .run();
                  setOpen(false);
                }}
                className="w-full text-left px-3 py-1.5 rounded text-xs hover:bg-[var(--surface)] transition-colors flex items-center gap-2"
                style={{ color: "var(--foreground)" }}
              >
                <Plus size={12} /> Insert 4×2 Table
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onMouseDown={e => {
                  e.preventDefault();
                  editor.chain().focus().addColumnAfter().run();
                  setOpen(false);
                }}
                className="w-full text-left px-3 py-1.5 rounded text-xs hover:bg-[var(--surface)] transition-colors flex items-center gap-2"
                style={{ color: "var(--foreground)" }}
              >
                <Columns size={12} /> Add Column
              </button>
              <button
                type="button"
                onMouseDown={e => {
                  e.preventDefault();
                  editor.chain().focus().addRowAfter().run();
                  setOpen(false);
                }}
                className="w-full text-left px-3 py-1.5 rounded text-xs hover:bg-[var(--surface)] transition-colors flex items-center gap-2"
                style={{ color: "var(--foreground)" }}
              >
                <Rows size={12} /> Add Row
              </button>
              <div
                className="my-1"
                style={{ borderTop: "1px solid var(--border)" }}
              />
              <button
                type="button"
                onMouseDown={e => {
                  e.preventDefault();
                  editor.chain().focus().deleteColumn().run();
                  setOpen(false);
                }}
                className="w-full text-left px-3 py-1.5 rounded text-xs hover:bg-[var(--surface)] transition-colors flex items-center gap-2"
                style={{ color: "var(--primary)" }}
              >
                <Columns size={12} /> Delete Column
              </button>
              <button
                type="button"
                onMouseDown={e => {
                  e.preventDefault();
                  editor.chain().focus().deleteRow().run();
                  setOpen(false);
                }}
                className="w-full text-left px-3 py-1.5 rounded text-xs hover:bg-[var(--surface)] transition-colors flex items-center gap-2"
                style={{ color: "var(--primary)" }}
              >
                <Rows size={12} /> Delete Row
              </button>
              <button
                type="button"
                onMouseDown={e => {
                  e.preventDefault();
                  editor.chain().focus().deleteTable().run();
                  setOpen(false);
                }}
                className="w-full text-left px-3 py-1.5 rounded text-xs hover:bg-[var(--surface)] transition-colors flex items-center gap-2"
                style={{ color: "var(--primary)" }}
              >
                <Trash2 size={12} /> Delete Table
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── CTA Button Dropdown ──────────────────────────────────────────────────────
const CTA_PRESETS = [
  { label: "Book Now", color: "var(--primary)", href: "/plan-your-adventure" },
  { label: "View Flight Deals", color: "var(--secondary)", href: "/flight-deals" },
  { label: "Join Premium", color: "var(--primary)", href: "/premium" },
  {
    label: "Plan Disney Trip",
    color: "var(--secondary)",
    href: "/disney-vacation-planning",
  },
  {
    label: "Plan Universal Trip",
    color: "var(--secondary)",
    href: "/universal-vacation-planning",
  },
  { label: "Custom Button...", color: "var(--primary)", href: "" },
];

function CTAButtonDropdown({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [customText, setCustomText] = useState("");
  const [customUrl, setCustomUrl] = useState("https://");
  const [customColor, setCustomColor] = useState("var(--primary)");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setCustomOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const insertCTA = (text: string, href: string, color: string) => {
    const buttonHtml = `<div class="wp-block-buttons" style="margin:1rem 0;"><div class="wp-block-button"><a class="wp-block-button__link wp-element-button" href="${href}" style="background-color:${color};color:#fff;padding:12px 28px;border-radius:8px;font-weight:700;text-decoration:none;display:inline-block;font-size:15px;">${text}</a></div></div>`;
    editor.chain().focus().insertContent(buttonHtml).run();
    setOpen(false);
    setCustomOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <ToolbarButton onClick={() => setOpen(!open)} title="Insert CTA Button">
        <span className="flex items-center gap-0.5">
          <MousePointerClick size={15} />
          <ChevronDown size={10} />
        </span>
      </ToolbarButton>
      {open && (
        <div
          className="absolute top-full left-0 mt-1 w-56 rounded-lg shadow-xl z-50 py-1"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
          }}
        >
          {!customOpen ? (
            <>
              <div
                className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider"
                style={{ color: "var(--muted)" }}
              >
                CTA Buttons
              </div>
              {CTA_PRESETS.map(preset => (
                <button
                  key={preset.label}
                  type="button"
                  onMouseDown={e => {
                    e.preventDefault();
                    if (preset.label === "Custom Button...") {
                      setCustomOpen(true);
                    } else {
                      insertCTA(preset.label, preset.href, preset.color);
                    }
                  }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--surface)] transition-colors flex items-center gap-2.5"
                  style={{ color: "var(--foreground)" }}
                >
                  <span
                    className="inline-block w-3 h-3 rounded-sm flex-shrink-0"
                    style={{ background: preset.color }}
                  />
                  {preset.label}
                </button>
              ))}
            </>
          ) : (
            <div className="px-3 py-2 space-y-2">
              <div
                className="text-[10px] font-bold uppercase tracking-wider"
                style={{ color: "var(--muted)" }}
              >
                Custom CTA Button
              </div>
              <input
                type="text"
                value={customText}
                onChange={e => setCustomText(e.target.value)}
                placeholder="Button text..."
                className="w-full text-xs rounded px-2.5 py-1.5"
                style={{
                  background: "var(--surface)",
                  color: "var(--foreground)",
                  border: "1px solid var(--border)",
                }}
              />
              <input
                type="text"
                value={customUrl}
                onChange={e => setCustomUrl(e.target.value)}
                placeholder="https://..."
                className="w-full text-xs rounded px-2.5 py-1.5"
                style={{
                  background: "var(--surface)",
                  color: "var(--foreground)",
                  border: "1px solid var(--border)",
                }}
              />
              <div className="flex items-center gap-2">
                <label
                  className="text-[10px]"
                  style={{ color: "var(--muted)" }}
                >
                  Color:
                </label>
                <input
                  type="color"
                  value={customColor}
                  onChange={e => setCustomColor(e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer border-0"
                />
              </div>
              <div className="flex gap-1.5 pt-1">
                <button
                  type="button"
                  onMouseDown={e => {
                    e.preventDefault();
                    setCustomOpen(false);
                  }}
                  className="flex-1 px-2 py-1.5 rounded text-[10px] font-bold"
                  style={{
                    background: "var(--surface)",
                    color: "var(--muted)",
                    border: "1px solid var(--border)",
                  }}
                >
                  Back
                </button>
                <button
                  type="button"
                  onMouseDown={e => {
                    e.preventDefault();
                    if (customText.trim())
                      insertCTA(
                        customText.trim(),
                        customUrl.trim(),
                        customColor
                      );
                  }}
                  className="flex-1 px-2 py-1.5 rounded text-[10px] font-bold"
                  style={{
                    background: "var(--primary)",
                    color: "oklch(1 0 0)",
                  }}
                >
                  Insert
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Toolbar({
  editor,
  onImageInsert,
  onGalleryInsert,
  onVideoEmbed,
  onInstagram,
  onLink,
}: {
  editor: Editor | null;
  onImageInsert?: () => void;
  onGalleryInsert?: () => void;
  onVideoEmbed: (e: React.MouseEvent) => void;
  onInstagram: (e: React.MouseEvent) => void;
  onLink: (e: React.MouseEvent) => void;
}) {
  if (!editor) return null;

  return (
    <div
      className="flex flex-wrap items-center gap-0.5 p-2 border-b"
      style={{
        borderColor: "var(--border)",
        background: "var(--surface)",
      }}
    >
      {/* History */}
      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title="Undo"
      >
        <Undo size={15} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title="Redo"
      >
        <Redo size={15} />
      </ToolbarButton>

      <div
        className="w-px h-5 mx-1"
        style={{ background: "var(--border)" }}
      />

      {/* Headings */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        active={editor.isActive("heading", { level: 1 })}
        title="Heading 1 (H1)"
      >
        <Heading1 size={15} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        active={editor.isActive("heading", { level: 2 })}
        title="Heading 2 (H2)"
      >
        <Heading2 size={15} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        active={editor.isActive("heading", { level: 3 })}
        title="Heading 3 (H3)"
      >
        <Heading3 size={15} />
      </ToolbarButton>

      <div
        className="w-px h-5 mx-1"
        style={{ background: "var(--border)" }}
      />

      {/* Formatting */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive("bold")}
        title="Bold"
      >
        <Bold size={15} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive("italic")}
        title="Italic"
      >
        <Italic size={15} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        active={editor.isActive("underline")}
        title="Underline"
      >
        <UnderlineIcon size={15} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        active={editor.isActive("strike")}
        title="Strikethrough"
      >
        <Strikethrough size={15} />
      </ToolbarButton>

      <div
        className="w-px h-5 mx-1"
        style={{ background: "var(--border)" }}
      />

      {/* Lists */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive("bulletList")}
        title="Bullet List"
      >
        <List size={15} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive("orderedList")}
        title="Numbered List"
      >
        <ListOrdered size={15} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        active={editor.isActive("blockquote")}
        title="Blockquote"
      >
        <Quote size={15} />
      </ToolbarButton>

      <div
        className="w-px h-5 mx-1"
        style={{ background: "var(--border)" }}
      />

      {/* Alignment */}
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
        active={editor.isActive({ textAlign: "left" })}
        title="Align Left"
      >
        <AlignLeft size={15} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
        active={editor.isActive({ textAlign: "center" })}
        title="Align Center"
      >
        <AlignCenter size={15} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
        active={editor.isActive({ textAlign: "right" })}
        title="Align Right"
      >
        <AlignRight size={15} />
      </ToolbarButton>

      <div
        className="w-px h-5 mx-1"
        style={{ background: "var(--border)" }}
      />

      {/* Link, Image, HR */}
      <ToolbarButton
        onClick={onLink}
        active={editor.isActive("link")}
        title="Insert Link"
      >
        <LinkIcon size={15} />
      </ToolbarButton>
      {onImageInsert && (
        <ToolbarButton onClick={onImageInsert} title="Insert Image">
          <ImageIcon size={15} />
        </ToolbarButton>
      )}
      {onGalleryInsert && (
        <ToolbarButton onClick={onGalleryInsert} title="Insert Gallery">
          <Columns size={15} />
        </ToolbarButton>
      )}
      <ToolbarButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="Horizontal Rule"
      >
        <Minus size={15} />
      </ToolbarButton>

      <div
        className="w-px h-5 mx-1"
        style={{ background: "var(--border)" }}
      />

      {/* Table */}
      <TableDropdown editor={editor} />

      {/* Video: YouTube / Stream / library */}
      <ToolbarButton onClick={onVideoEmbed} title="Insert video (upload Stream, or YouTube/IG URL)">
        <Video size={15} />
      </ToolbarButton>

      {/* Instagram */}
      <ToolbarButton onClick={onInstagram} title="Embed Instagram">
        <Camera size={15} />
      </ToolbarButton>

      <div
        className="w-px h-5 mx-1"
        style={{ background: "var(--border)" }}
      />

      {/* Quick Answer Block */}
      <ToolbarButton
        onClick={() => {
          editor
            .chain()
            .focus()
            .insertContent({
              type: "blockquote",
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      marks: [{ type: "bold" }],
                      text: "Quick Answer: ",
                    },
                    { type: "text", text: "Your answer here..." },
                  ],
                },
              ],
            })
            .run();
        }}
        title="Insert Quick Answer Block"
      >
        <MessageSquareQuote size={15} />
      </ToolbarButton>

      {/* CTA Button */}
      <CTAButtonDropdown editor={editor} />
    </div>
  );
}

function formatUrl(url: string) {
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (
    trimmed.startsWith("/") ||
    trimmed.startsWith("#") ||
    trimmed.startsWith("mailto:") ||
    trimmed.startsWith("tel:")
  ) {
    return trimmed;
  }
  if (!/^https?:\/\//i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

function LinkInput({
  initialUrl,
  onSave,
  onCancel,
}: {
  initialUrl: string;
  onSave: (url: string) => void;
  onCancel: () => void;
}) {
  const [url, setUrl] = useState(initialUrl);
  const [suggestions, setSuggestions] = useState<{ title: string; url: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (url.startsWith("/")) {
      setShowSuggestions(true);
      fetch(`/api/search-links?q=${encodeURIComponent(url)}`)
        .then((res) => res.json())
        .then((data) => {
          setSuggestions(data);
          setSelectedIndex(0);
        })
        .catch(() => setSuggestions([]));
    } else {
      setShowSuggestions(false);
    }
  }, [url]);

  const handleSave = (finalUrl: string) => {
    onSave(formatUrl(finalUrl));
  };

  return (
    <div style={{ position: "relative" }}>
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          alignItems: "center",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "0.5rem",
          padding: "0.5rem",
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
        }}
      >
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Type URL or / to search pages"
          style={{
            padding: "0.25rem 0.5rem",
            border: "1px solid var(--border)",
            borderRadius: "0.25rem",
            background: "var(--background)",
            color: "var(--foreground)",
            fontFamily: "var(--font-sans)",
            fontSize: "0.875rem",
            outline: "none",
            minWidth: "220px",
          }}
          ref={inputRef}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" && showSuggestions) {
              e.preventDefault();
              setSelectedIndex((s) => Math.min(s + 1, suggestions.length - 1));
            } else if (e.key === "ArrowUp" && showSuggestions) {
              e.preventDefault();
              setSelectedIndex((s) => Math.max(s - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              if (showSuggestions && suggestions[selectedIndex]) {
                handleSave(suggestions[selectedIndex].url);
              } else {
                handleSave(url);
              }
            } else if (e.key === "Escape") {
              onCancel();
            }
          }}
        />
        <button
          onClick={() => {
            if (showSuggestions && suggestions[selectedIndex] && url.startsWith("/")) {
              handleSave(suggestions[selectedIndex].url);
            } else {
              handleSave(url);
            }
          }}
          className="btn btn-primary"
          style={{ padding: "0.25rem 0.75rem", fontSize: "0.875rem" }}
        >
          Apply
        </button>
        <button
          onClick={onCancel}
          style={{
            color: "var(--muted)",
            cursor: "pointer",
            background: "transparent",
            border: "none",
            padding: "0.25rem",
          }}
        >
          <X size={14} />
        </button>
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            width: "100%",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "0.5rem",
            marginTop: "0.25rem",
            zIndex: 50,
            maxHeight: "200px",
            overflowY: "auto",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
          }}
        >
          {suggestions.map((s, i) => (
            <div
              key={s.url}
              style={{
                padding: "0.5rem",
                cursor: "pointer",
                background: i === selectedIndex ? "var(--surface-hover)" : "transparent",
                borderBottom: i === suggestions.length - 1 ? "none" : "1px solid var(--border)",
              }}
              onClick={() => handleSave(s.url)}
              onMouseEnter={() => setSelectedIndex(i)}
            >
              <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--foreground)" }}>{s.title}</div>
              <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{s.url}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Floating Bubble Toolbar ─────────────────────────────────────────────────
function FloatingBubbleToolbar({
  editor,
  onImageInsert,
  onVideoEmbed,
}: {
  editor: Editor;
  onImageInsert?: () => void;
  onVideoEmbed?: (e: React.MouseEvent) => void;
}) {
  const [isInsertingLink, setIsInsertingLink] = useState(false);
  const [url, setUrl] = useState("");
  // Track selection range so link UI resets only when caret/range actually moves
  const lastFromTo = useRef({ from: -1, to: -1 });

  useEffect(() => {
    const handleReset = () => {
      const { from, to } = editor.state.selection;
      if (from === lastFromTo.current.from && to === lastFromTo.current.to) return;
      lastFromTo.current = { from, to };
      setIsInsertingLink(false);
      setUrl("");
    };
    editor.on("selectionUpdate", handleReset);
    return () => {
      editor.off("selectionUpdate", handleReset);
    };
  }, [editor]);

  return (
    <BubbleMenu
      editor={editor}
      // @ts-expect-error - Tiptap types missing tippyOptions in this version
      tippyOptions={{ duration: 100, placement: "top", offset: [0, 8] }}
      shouldShow={({ editor, view }) => {
        if (!editor.isEditable || !view.hasFocus()) return false;
        // Hide over media/atoms and when the dedicated link menu is showing
        if (editor.isActive("image") || editor.isActive("gallery")) return false;
        if (editor.isActive("videoEmbed")) return false;
        if (editor.isActive("link")) return false;
        // Show on caret click (empty selection) and on text highlight
        return true;
      }}
    >
      {isInsertingLink ? (
        <LinkInput 
          initialUrl={url}
          onSave={(finalUrl) => {
            if (finalUrl) {
              editor.chain().focus().setLink({ href: finalUrl }).run();
            }
            setIsInsertingLink(false);
          }}
          onCancel={() => setIsInsertingLink(false)}
        />
      ) : (
        <div
          className="flex items-center gap-0.5 px-1.5 py-1 rounded-lg shadow-xl"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          backdropFilter: "blur(12px)",
          maxWidth: "min(100vw - 16px, 520px)",
          flexWrap: "wrap",
        }}
      >
        {/* Headings */}
        <ToolbarButton
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          active={editor.isActive("heading", { level: 2 })}
          title="Heading 2"
          size="small"
        >
          <Heading2 size={14} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
          active={editor.isActive("heading", { level: 3 })}
          title="Heading 3"
          size="small"
        >
          <Heading3 size={14} />
        </ToolbarButton>

        <div
          className="w-px h-4 mx-0.5"
          style={{ background: "var(--border)" }}
        />

        {/* Formatting */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
          title="Bold"
          size="small"
        >
          <Bold size={14} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
          title="Italic"
          size="small"
        >
          <Italic size={14} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive("underline")}
          title="Underline"
          size="small"
        >
          <UnderlineIcon size={14} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive("strike")}
          title="Strikethrough"
          size="small"
        >
          <Strikethrough size={14} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          active={editor.isActive("highlight")}
          title="Highlight (for Editorial Notes)"
          size="small"
        >
          <Highlighter size={14} />
        </ToolbarButton>

        <div
          className="w-px h-4 mx-0.5"
          style={{ background: "var(--border)" }}
        />

        {/* Link / Image / Video — available on click, not only highlight */}
        <ToolbarButton
          onClick={() => setIsInsertingLink(true)}
          active={editor.isActive("link")}
          title={editor.isActive("link") ? "Edit Link" : "Insert Link"}
          size="small"
        >
          <LinkIcon size={14} />
        </ToolbarButton>
        {onImageInsert && (
          <ToolbarButton
            onClick={() => onImageInsert()}
            title="Insert Image"
            size="small"
          >
            <ImageIcon size={14} />
          </ToolbarButton>
        )}
        {onVideoEmbed && (
          <ToolbarButton
            onClick={(e) => onVideoEmbed(e)}
            title="Insert Video (upload Stream / URL)"
            size="small"
          >
            <Video size={14} />
          </ToolbarButton>
        )}

        <div
          className="w-px h-4 mx-0.5"
          style={{ background: "var(--border)" }}
        />

        {/* Alignment */}
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          active={editor.isActive({ textAlign: "left" })}
          title="Align Left"
          size="small"
        >
          <AlignLeft size={14} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          active={editor.isActive({ textAlign: "center" })}
          title="Align Center"
          size="small"
        >
          <AlignCenter size={14} />
        </ToolbarButton>

        {/* Quote */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive("blockquote")}
          title="Blockquote"
          size="small"
        >
          <Quote size={14} />
        </ToolbarButton>
      </div>
      )}
    </BubbleMenu>
  );
}

function LinkBubbleMenu({ editor }: { editor: Editor }) {
  const [isEditing, setIsEditing] = useState(false);
  const [url, setUrl] = useState("");

  const isActive = editor.isActive("link");

  useEffect(() => {
    if (isActive) {
      setUrl(editor.getAttributes("link").href || "");
    } else {
      setIsEditing(false);
    }
  }, [editor.state.selection, isActive, editor]);

  if (!isActive) return null;

  return (
    <BubbleMenu
      editor={editor}
      // @ts-expect-error - Tiptap types missing tippyOptions in this version
      tippyOptions={{ duration: 100, placement: "bottom" }}
      pluginKey="linkBubbleMenu"
      shouldShow={({ editor }) => editor.isActive("link")}
    >
      {isEditing ? (
        <LinkInput 
          initialUrl={url}
          onSave={(finalUrl) => {
            if (finalUrl) {
              editor.chain().focus().extendMarkRange("link").setLink({ href: finalUrl }).run();
            }
            setIsEditing(false);
          }}
          onCancel={() => setIsEditing(false)}
        />
      ) : (
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            alignItems: "center",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "0.5rem",
            padding: "0.5rem",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
          }}
        >
          <a
              href={url}
              target="_blank"
              rel="noreferrer"
              style={{
                color: "var(--primary)",
                textDecoration: "underline",
                maxWidth: "250px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                fontSize: "0.875rem",
                fontFamily: "var(--font-sans)"
              }}
            >
              {url}
            </a>
            <div style={{ width: "1px", height: "1rem", background: "var(--border)", margin: "0 0.25rem" }} />
            <button
              onClick={() => setIsEditing(true)}
              title="Edit Link"
              style={{ color: "var(--muted)", cursor: "pointer", background: "transparent", border: "none", padding: "0.25rem" }}
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={() => editor.chain().focus().unsetLink().run()}
              title="Remove Link"
              style={{ color: "var(--muted)", cursor: "pointer", background: "transparent", border: "none", padding: "0.25rem" }}
            >
              <Unlink size={14} />
            </button>
        </div>
      )}
    </BubbleMenu>
  );
}

function PreviewPane({ html }: { html: string }) {
  return (
    <div
      className="rich-text-preview-pane blog-post-content article-content p-6 overflow-y-auto"
      style={{
        background: "#fff",
        color: "var(--foreground)",
        minHeight: "600px",
        maxWidth: "100%",
        overflowX: "hidden",
        boxSizing: "border-box",
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export const RichTextEditor = forwardRef<
  RichTextEditorHandle,
  RichTextEditorProps
>(function RichTextEditor(
  { value, onChange, onImageInsert, onGalleryInsert, placeholder, className, viewMode = "edit" },
  ref
) {
  const [embedDialog, setEmbedDialog] = useState<{
    open: boolean;
    mode: EmbedDialogMode;
    preferredProvider?: EmbedProvider;
    initialUrl?: string;
    anchor: EmbedAnchor | null;
  }>({ open: false, mode: "video", anchor: null });

  const extensions = useMemo(() => [
    // Newer StarterKit ships link + underline — disable them so we only
    // register our configured copies (avoids TipTap duplicate-name warning).
    StarterKit.configure({
      heading: false,
      link: false,
      underline: false,
    }),
    Heading.configure({ levels: [1, 2, 3] }),
    Link.configure({
      openOnClick: false,
      HTMLAttributes: { target: "_blank", rel: "noopener noreferrer", style: "text-decoration: underline;" },
    }),
    ResizableImage,
    GalleryExtension,
    Placeholder.configure({
      placeholder: placeholder ?? "Write your post content here...",
    }),
    TextAlign.configure({ types: ["heading", "paragraph"] }),
    Underline,
    Table.configure({ resizable: true }),
    TableRow,
    TableHeader,
    TableCell,
    Highlight.configure({ HTMLAttributes: { class: 'editorial-highlight', style: 'background-color: #fef08a; padding: 0.1rem 0.2rem; border-radius: 0.2rem;' } }),
    VideoEmbed,
  ], [placeholder]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions,
    content: value,
    editorProps: {
      handleClick: (view, pos, event) => {
        const target = event.target as HTMLElement;
        if (target.closest('a')) {
          event.preventDefault();
          return true;
        }
        return false;
      }
    },
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML());
    },
  });

  // Sync external value changes (e.g. when loading an existing post)
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value !== current) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [value, editor]);

  const insertImage = useCallback(
    (url: string, alt?: string) => {
      editor
        ?.chain()
        .focus()
        .setImage({ src: url, alt: alt ?? "" })
        .run();
    },
    [editor]
  );

  const insertGallery = useCallback(
    (images: { src: string; alt: string }[], columns: number) => {
      if (!editor) return;
      // Prefer TipTap gallery node (stack / grid / carousel via data-layout)
      const chain = editor.chain().focus() as any;
      if (typeof chain.insertGallery === 'function') {
        chain.insertGallery(images, columns, 'grid').run();
        return;
      }
      editor
        .chain()
        .focus()
        .insertContent({
          type: 'gallery',
          attrs: {
            images,
            columns,
            imageFit: 'cover',
            gallerySize: 'full',
            layout: 'grid',
          },
        })
        .run();
    },
    [editor]
  );

  // Expose methods to parent via ref
  useImperativeHandle(
    ref,
    () => ({
      insertImage,
      insertGallery,
      getEditor: () => editor,
    }),
    [editor, insertImage, insertGallery]
  );

  const handleInsertVideo = useCallback(
    (attrs: { src: string; provider: EmbedProvider; aspectRatio: string }) => {
      if (!editor) return;
      editor
        .chain()
        .focus()
        .setVideoEmbed({
          src: attrs.src,
          provider: attrs.provider,
          aspectRatio: attrs.aspectRatio,
        })
        .run();
    },
    [editor]
  );

  const handleInsertLink = useCallback(
    (url: string) => {
      if (!editor) return;
      editor.chain().focus().setLink({ href: url, target: "_blank" }).run();
    },
    [editor]
  );

  /** Anchor the embed popover to the caret (or the toolbar button as fallback). */
  const openEmbedNearCursor = useCallback(
    (opts: {
      mode: EmbedDialogMode;
      preferredProvider?: EmbedProvider;
      initialUrl?: string;
      fromEvent?: React.MouseEvent;
    }) => {
      let anchor: EmbedAnchor | null = null;
      // Prefer the caret when it's on-screen (near the text you're editing)
      if (editor?.view) {
        try {
          const { from } = editor.state.selection;
          const coords = editor.view.coordsAtPos(from);
          const pad = 40;
          const inView =
            coords.bottom > pad &&
            coords.top < window.innerHeight - pad &&
            coords.left > 0 &&
            coords.left < window.innerWidth;
          if (inView) {
            anchor = {
              top: coords.top,
              left: coords.left,
              bottom: coords.bottom,
            };
          }
        } catch {
          /* ignore */
        }
      }
      // Fallback: toolbar / bubble button that opened the dialog
      if (!anchor && opts.fromEvent) {
        const t = opts.fromEvent.currentTarget as HTMLElement;
        const r = t.getBoundingClientRect();
        anchor = { top: r.top, left: r.left, bottom: r.bottom };
      }
      if (!anchor) {
        anchor = { top: 100, left: 80, bottom: 130 };
      }
      setEmbedDialog({
        open: true,
        mode: opts.mode,
        preferredProvider: opts.preferredProvider,
        initialUrl: opts.initialUrl,
        anchor,
      });
    },
    [editor]
  );

  const showEditor = viewMode === "edit" || viewMode === "split";
  const showPreview = viewMode === "preview" || viewMode === "split";

  return (
    <>
      <div
        className={`rounded-lg border overflow-hidden ${className ?? ""}`}
        style={{ borderColor: "var(--border)" }}
      >
        {showEditor && (
          <Toolbar
            editor={editor}
            onImageInsert={onImageInsert}
            onGalleryInsert={onGalleryInsert}
            onVideoEmbed={(e) =>
              openEmbedNearCursor({ mode: "video", fromEvent: e })
            }
            onInstagram={(e) =>
              openEmbedNearCursor({
                mode: "video",
                preferredProvider: "instagram",
                fromEvent: e,
              })
            }
            onLink={(e) => openEmbedNearCursor({ mode: "link", fromEvent: e })}
          />
        )}
        <div
          className={viewMode === "split" ? "grid grid-cols-2 divide-x" : ""}
          style={
            viewMode === "split"
              ? { borderColor: "var(--border)" }
              : undefined
          }
        >
          {showEditor && (
            <div 
              className="relative"
              onClickCapture={(e) => {
                const target = e.target as HTMLElement;
                if (target.closest('a')) {
                  e.preventDefault();
                }
              }}
            >
              <EditorContent
                editor={editor}
                className="rich-text-editor-content"
              />
              {/* Floating bubble toolbar near caret / selection */}
              {editor && (
                <>
                  <FloatingBubbleToolbar
                    editor={editor}
                    onImageInsert={onImageInsert}
                    onVideoEmbed={(e) =>
                      openEmbedNearCursor({ mode: "video", fromEvent: e })
                    }
                  />
                  <LinkBubbleMenu editor={editor} />
                </>
              )}
            </div>
          )}
          {showPreview && <PreviewPane html={value} />}
        </div>
      </div>

      <EmbedDialog
        open={embedDialog.open}
        mode={embedDialog.mode}
        preferredProvider={embedDialog.preferredProvider}
        initialUrl={embedDialog.initialUrl}
        anchor={embedDialog.anchor}
        onClose={() => setEmbedDialog(prev => ({ ...prev, open: false }))}
        onInsertVideo={handleInsertVideo}
        onInsertLink={handleInsertLink}
      />
    </>
  );
});
