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
import Youtube from "@tiptap/extension-youtube";
import Highlight from "@tiptap/extension-highlight";
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
  onClick: () => void;
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
        e.preventDefault();
        onClick();
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

// ── Embed Dialog ──────────────────────────────────────────────────────────────
function EmbedDialog({
  open,
  onClose,
  onInsert,
  type,
}: {
  open: boolean;
  onClose: () => void;
  onInsert: (url: string) => void;
  type: "youtube" | "instagram" | "link";
}) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setUrl("");
      setError("");
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  if (!open) return null;

  const config = {
    youtube: {
      title: "Embed YouTube Video",
      placeholder: "https://www.youtube.com/watch?v=...",
      hint: "Paste a YouTube video URL. Supports youtube.com/watch, youtu.be, and youtube.com/shorts links.",
      validate: (u: string) => {
        const patterns = [
          /youtube\.com\/watch\?v=[\w-]+/,
          /youtu\.be\/[\w-]+/,
          /youtube\.com\/embed\/[\w-]+/,
          /youtube\.com\/shorts\/[\w-]+/,
        ];
        return patterns.some(p => p.test(u));
      },
      errorMsg: "Please enter a valid YouTube URL",
      icon: <Video size={20} />,
      color: "var(--primary)",
    },
    instagram: {
      title: "Embed Instagram Post",
      placeholder: "https://www.instagram.com/p/ABC123/",
      hint: "Paste an Instagram post, reel, or IGTV URL.",
      validate: (u: string) => /instagram\.com\/(p|reel|tv)\/[\w-]+/.test(u),
      errorMsg:
        "Please enter a valid Instagram post URL (e.g. instagram.com/p/...)",
      icon: <Camera size={20} />,
      color: "var(--primary)",
    },
    link: {
      title: "Insert Link",
      placeholder: "https://example.com",
      hint: "Enter the URL you want to link to.",
      validate: (u: string) => {
        try {
          new URL(u);
          return true;
        } catch {
          return false;
        }
      },
      errorMsg: "Please enter a valid URL starting with http:// or https://",
      icon: <LinkIcon size={20} />,
      color: "var(--primary)",
    },
  }[type];

  const handleInsert = () => {
    const trimmed = url.trim();
    if (!trimmed) {
      setError("URL is required");
      return;
    }
    if (!config.validate(trimmed)) {
      setError(config.errorMsg);
      return;
    }
    onInsert(trimmed);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleInsert();
    }
    if (e.key === "Escape") {
      onClose();
    }
  };

  // Extract YouTube video ID for preview
  const getYoutubeId = (u: string): string | null => {
    const match = u.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([\w-]+)/
    );
    return match ? match[1] : null;
  };

  const showPreview =
    type === "youtube" && url.trim() && config.validate(url.trim());
  const videoId = showPreview ? getYoutubeId(url.trim()) : null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: "oklch(0 0 0 / 0.6)", backdropFilter: "blur(4px)" }}
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-md mx-4 rounded-xl shadow-2xl overflow-hidden"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3.5"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-2.5">
            <span style={{ color: config.color }}>{config.icon}</span>
            <h3
              className="font-bold text-sm"
              style={{ color: "var(--foreground)" }}
            >
              {config.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg transition-colors hover:bg-[var(--surface)]"
            style={{ color: "var(--muted)" }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3">
          <p
            className="text-xs leading-relaxed"
            style={{ color: "var(--muted)" }}
          >
            {config.hint}
          </p>

          <div>
            <input
              ref={inputRef}
              type="text"
              value={url}
              onChange={e => {
                setUrl(e.target.value);
                setError("");
              }}
              onKeyDown={handleKeyDown}
              placeholder={config.placeholder}
              className="w-full text-sm rounded-lg px-3.5 py-2.5 transition-all"
              style={{
                background: "var(--surface)",
                color: "var(--foreground)",
                border: error
                  ? "1.5px solid var(--primary)"
                  : "1.5px solid var(--border)",
                outline: "none",
              }}
              onFocus={e => {
                if (!error) e.target.style.borderColor = "var(--primary)";
              }}
              onBlur={e => {
                if (!error) e.target.style.borderColor = "var(--border)";
              }}
            />
            {error && (
              <div className="flex items-center gap-1.5 mt-1.5">
                <AlertCircle
                  size={12}
                  style={{ color: "var(--primary)" }}
                />
                <p className="text-xs" style={{ color: "var(--primary)" }}>
                  {error}
                </p>
              </div>
            )}
          </div>

          {/* YouTube Preview */}
          {showPreview && videoId && (
            <div
              className="rounded-lg overflow-hidden"
              style={{ border: "1px solid var(--border)" }}
            >
              <div
                style={{
                  position: "relative",
                  paddingBottom: "56.25%",
                  height: 0,
                }}
              >
                <iframe
                  src={`https://www.youtube.com/embed/${videoId}`}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    border: "none",
                  }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-2.5 px-5 py-3.5"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-bold transition-all"
            style={{
              background: "var(--surface)",
              color: "var(--muted)",
              border: "1px solid var(--border)",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleInsert}
            className="px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
            style={{
              background: config.color,
              color: "oklch(1 0 0)",
            }}
          >
            <ExternalLink size={12} />
            Insert
          </button>
        </div>
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
  onYoutube,
  onInstagram,
  onLink,
}: {
  editor: Editor | null;
  onImageInsert?: () => void;
  onGalleryInsert?: () => void;
  onYoutube: () => void;
  onInstagram: () => void;
  onLink: () => void;
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

      {/* YouTube */}
      <ToolbarButton onClick={onYoutube} title="Embed YouTube Video">
        <Video size={15} />
      </ToolbarButton>

      {/* Instagram */}
      <ToolbarButton onClick={onInstagram} title="Embed Instagram Post">
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

// ── Floating Bubble Toolbar ─────────────────────────────────────────────────
function FloatingBubbleToolbar({
  editor,
  onLink,
}: {
  editor: Editor;
  onLink: () => void;
}) {
  return (
    <BubbleMenu
      editor={editor}
      options={{
        placement: "top",
        offset: 8,
      }}
      className="bubble-toolbar"
    >
      <div
        className="flex items-center gap-0.5 px-1.5 py-1 rounded-lg shadow-xl"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          backdropFilter: "blur(12px)",
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

        {/* Link */}
        <ToolbarButton
          onClick={onLink}
          active={editor.isActive("link")}
          title="Insert Link"
          size="small"
        >
          <LinkIcon size={14} />
        </ToolbarButton>

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
    </BubbleMenu>
  );
}

function PreviewPane({ html }: { html: string }) {
  return (
    <div
      className="rich-text-preview-pane p-6 overflow-y-auto blog-post-content"
      style={{
        background: "var(--primary)",
        color: "var(--primary)",
        minHeight: "600px",
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
    type: "youtube" | "instagram" | "link";
  }>({ open: false, type: "youtube" });

  const extensions = useMemo(() => [
    StarterKit.configure({
      heading: false,
    }),
    Heading.configure({ levels: [1, 2, 3] }),
    Link.configure({
      openOnClick: false,
      HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" },
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
    Youtube.configure({
      inline: false,
      HTMLAttributes: {
        class: "youtube-embed",
      },
    }),
  ], [placeholder]);

  const editor = useEditor({
    extensions,
    content: value,
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
    (images: {src: string, alt: string}[], columns: number) => {
      if (!editor) return;
      const html = `<div class="wp-block-gallery columns-${columns}" style="display: grid; grid-template-columns: repeat(${columns}, 1fr); gap: 16px; margin: 24px 0;">` +
        images.map(img => `<div style="position: relative; width: 100%; padding-bottom: 100%;"><img src="${img.src}" alt="${img.alt}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; border-radius: 8px;" /></div>`).join("") +
        `</div>`;
      editor.chain().focus().insertContent(html).run();
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

  const handleEmbedInsert = useCallback(
    (url: string) => {
      if (!editor) return;

      if (embedDialog.type === "youtube") {
        editor
          .chain()
          .focus()
          .setYoutubeVideo({ src: url, width: 640, height: 360 })
          .run();
      } else if (embedDialog.type === "instagram") {
        const embedUrl = url.replace(/\/$/, "") + "/embed";
        editor
          .chain()
          .focus()
          .insertContent(
            `<div data-instagram-embed="true" class="instagram-embed-wrapper"><iframe src="${embedUrl}" width="400" height="480" frameborder="0" scrolling="no" allowtransparency="true" style="border-radius:8px; max-width:100%;"></iframe></div>`
          )
          .run();
      } else if (embedDialog.type === "link") {
        editor.chain().focus().setLink({ href: url, target: "_blank" }).run();
      }
    },
    [editor, embedDialog.type]
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
            onYoutube={() => setEmbedDialog({ open: true, type: "youtube" })}
            onInstagram={() =>
              setEmbedDialog({ open: true, type: "instagram" })
            }
            onLink={() => setEmbedDialog({ open: true, type: "link" })}
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
            <div className="relative">
              <EditorContent
                editor={editor}
                className="rich-text-editor-content"
              />
              {/* Floating bubble toolbar on text selection */}
              {editor && (
                <FloatingBubbleToolbar
                  editor={editor}
                  onLink={() => setEmbedDialog({ open: true, type: "link" })}
                />
              )}
            </div>
          )}
          {showPreview && <PreviewPane html={value} />}
        </div>
      </div>

      {/* Embed Dialog */}
      <EmbedDialog
        open={embedDialog.open}
        type={embedDialog.type}
        onClose={() => setEmbedDialog(prev => ({ ...prev, open: false }))}
        onInsert={handleEmbedInsert}
      />
    </>
  );
});
