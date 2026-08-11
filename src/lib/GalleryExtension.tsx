import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import { useRef, useState } from "react";
import {
  Trash2,
  Plus,
  GripVertical,
  Columns2,
  Columns3,
  Grid2x2,
  Maximize2,
  RectangleHorizontal,
  Rows3,
  LayoutGrid,
  GalleryHorizontal,
  Loader2,
} from "lucide-react";

// ── Gallery Image type ──────────────────────────────────────────────────────
export interface GalleryImage {
  src: string;
  alt: string;
}

type ImageFit = "cover" | "contain";
type GallerySize = "full" | "large" | "medium";
type GalleryLayout = "stack" | "grid" | "carousel";

const NAVY = "#1B2253";
const NAVY_MID = "#2a3570";
const NAVY_SOFT = "#3d4a8c";
const NAVY_BORDER = "rgba(255,255,255,0.14)";
const ACCENT = "#c5cae8";

// ── React NodeView Component ────────────────────────────────────────────────
function GalleryNodeView({ node, updateAttributes, deleteNode }: any) {
  const images: GalleryImage[] = node.attrs.images || [];
  const columns: number = node.attrs.columns || 2;
  const imageFit: ImageFit = node.attrs.imageFit === "contain" ? "contain" : "cover";
  const gallerySize: GallerySize =
    node.attrs.gallerySize === "medium" || node.attrs.gallerySize === "large"
      ? node.attrs.gallerySize
      : "full";
  const layout: GalleryLayout =
    node.attrs.layout === "carousel" || node.attrs.layout === "stack"
      ? node.attrs.layout
      : "grid";
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const addFileRef = useRef<HTMLInputElement>(null);

  const setColumns = (cols: number) => updateAttributes({ columns: cols });
  const setFit = (fit: ImageFit) => updateAttributes({ imageFit: fit });
  const setSize = (size: GallerySize) => updateAttributes({ gallerySize: size });
  const setLayout = (next: GalleryLayout) => {
    updateAttributes({
      layout: next,
      // Prefer contain for screenshots in stack/carousel
      imageFit: next === "grid" ? imageFit : "contain",
    });
  };

  const removeImage = (idx: number) => {
    const newImages = images.filter((_: GalleryImage, i: number) => i !== idx);
    if (newImages.length === 0) {
      deleteNode();
    } else {
      updateAttributes({ images: newImages });
    }
  };

  const updateAlt = (idx: number, alt: string) => {
    const newImages = [...images];
    newImages[idx] = { ...newImages[idx], alt };
    updateAttributes({ images: newImages });
  };

  const handleDragStart = (idx: number) => setDragIdx(idx);

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    const newImages = [...images];
    const [moved] = newImages.splice(dragIdx, 1);
    newImages.splice(idx, 0, moved);
    updateAttributes({ images: newImages });
    setDragIdx(idx);
  };

  const handleDragEnd = () => setDragIdx(null);

  /** Open file picker and append uploaded images to this gallery (not a new one). */
  const addMoreImages = () => {
    if (adding) return;
    addFileRef.current?.click();
  };

  const handleAddFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    setAdding(true);
    const uploaded: GalleryImage[] = [];
    try {
      for (const file of Array.from(files)) {
        try {
          const res = await fetch("/api/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ filename: file.name, contentType: file.type }),
          });
          const data = await res.json();
          if (!res.ok || !data?.uploadUrl || !data?.publicUrl) continue;
          await fetch(data.uploadUrl, {
            method: "PUT",
            headers: { "Content-Type": file.type },
            body: file,
          });
          uploaded.push({ src: data.publicUrl, alt: file.name.replace(/\.[^.]+$/, "") || file.name });
        } catch {
          // skip failed file; continue others
        }
      }
      if (uploaded.length) {
        const nextImages = [...images, ...uploaded];
        const nextColumns =
          layout === "grid"
            ? Math.min(4, Math.max(columns, nextImages.length >= 3 ? 3 : 2))
            : columns;
        updateAttributes({ images: nextImages, columns: nextColumns });
      }
    } finally {
      setAdding(false);
      // allow re-selecting the same files
      e.target.value = "";
    }
  };

  const maxWidth =
    gallerySize === "medium" ? "520px" : gallerySize === "large" ? "720px" : "100%";

  const cellMinHeight =
    gallerySize === "medium" ? 120 : gallerySize === "large" ? 160 : 180;

  return (
    <NodeViewWrapper
      className="blog-gallery-editor"
      style={{ margin: "1.25rem 0", maxWidth: "100%", width: "100%" }}
    >
      {/* Toolbar always full editor width; size only affects the image grid below */}
      <div style={{ width: "100%", maxWidth: "100%" }}>
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-t-xl flex-wrap"
          style={{
            background: `linear-gradient(145deg, ${NAVY} 0%, ${NAVY_MID} 55%, ${NAVY_SOFT} 100%)`,
            border: `1px solid ${NAVY}`,
            borderBottom: "none",
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          <span
            className="text-xs font-bold tracking-wide uppercase"
            style={{ color: "#fff", letterSpacing: "0.06em" }}
          >
            Gallery
          </span>
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.7)" }}>
            {images.length} image{images.length !== 1 ? "s" : ""} · {layout}
          </span>

          <div className="flex-1" />

          {/* Layout: stack | grid | carousel */}
          {(
            [
              ["stack", "Stack", Rows3],
              ["grid", "Grid", LayoutGrid],
              ["carousel", "Carousel", GalleryHorizontal],
            ] as const
          ).map(([val, label, Icon]) => (
            <button
              key={val}
              type="button"
              onClick={() => setLayout(val)}
              className="px-2 py-1 rounded text-xs font-semibold transition-colors flex items-center gap-1"
              style={{
                color: layout === val ? NAVY : ACCENT,
                background: layout === val ? "#fff" : "transparent",
                border: `1px solid ${layout === val ? "#fff" : NAVY_BORDER}`,
              }}
              title={`${label} layout`}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}

          <div className="w-px h-4 mx-0.5" style={{ background: NAVY_BORDER }} />

          {/* Size */}
          {(
            [
              ["full", "Full"],
              ["large", "Large"],
              ["medium", "Med"],
            ] as const
          ).map(([val, label]) => (
            <button
              key={val}
              type="button"
              onClick={() => setSize(val)}
              className="px-2 py-1 rounded text-xs font-semibold transition-colors"
              style={{
                color: gallerySize === val ? NAVY : ACCENT,
                background: gallerySize === val ? "#fff" : "transparent",
                border: `1px solid ${gallerySize === val ? "#fff" : NAVY_BORDER}`,
              }}
              title={`${label} width`}
            >
              {label}
            </button>
          ))}

          <div className="w-px h-4 mx-0.5" style={{ background: NAVY_BORDER }} />

          {/* Fit */}
          <button
            type="button"
            onClick={() => setFit("cover")}
            className="p-1.5 rounded transition-colors"
            style={{
              color: imageFit === "cover" ? "#fff" : ACCENT,
              background: imageFit === "cover" ? "rgba(255,255,255,0.18)" : "transparent",
            }}
            title="Crop to fill (cover)"
          >
            <Maximize2 size={15} />
          </button>
          <button
            type="button"
            onClick={() => setFit("contain")}
            className="p-1.5 rounded transition-colors"
            style={{
              color: imageFit === "contain" ? "#fff" : ACCENT,
              background: imageFit === "contain" ? "rgba(255,255,255,0.18)" : "transparent",
            }}
            title="Show full image (contain)"
          >
            <RectangleHorizontal size={15} />
          </button>

          <div className="w-px h-4 mx-0.5" style={{ background: NAVY_BORDER }} />

          {/* Columns (grid only) */}
          {layout === "grid" && (
            <>
              <button
                type="button"
                onClick={() => setColumns(2)}
                className="p-1.5 rounded transition-colors"
                style={{
                  color: columns === 2 ? "#fff" : ACCENT,
                  background: columns === 2 ? "rgba(255,255,255,0.18)" : "transparent",
                }}
                title="2 columns"
              >
                <Columns2 size={15} />
              </button>
              <button
                type="button"
                onClick={() => setColumns(3)}
                className="p-1.5 rounded transition-colors"
                style={{
                  color: columns === 3 ? "#fff" : ACCENT,
                  background: columns === 3 ? "rgba(255,255,255,0.18)" : "transparent",
                }}
                title="3 columns"
              >
                <Columns3 size={15} />
              </button>
              <button
                type="button"
                onClick={() => setColumns(4)}
                className="p-1.5 rounded transition-colors"
                style={{
                  color: columns === 4 ? "#fff" : ACCENT,
                  background: columns === 4 ? "rgba(255,255,255,0.18)" : "transparent",
                }}
                title="4 columns"
              >
                <Grid2x2 size={15} />
              </button>
            </>
          )}

          <div className="w-px h-4 mx-0.5" style={{ background: NAVY_BORDER }} />

          <input
            ref={addFileRef}
            type="file"
            multiple
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleAddFiles}
          />

          <button
            type="button"
            onClick={addMoreImages}
            disabled={adding}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold transition-colors"
            style={{
              background: "rgba(255,255,255,0.12)",
              color: "#fff",
              border: `1px solid ${NAVY_BORDER}`,
              opacity: adding ? 0.7 : 1,
              cursor: adding ? "wait" : "pointer",
            }}
            title="Add more images to this gallery"
          >
            {adding ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
            {adding ? "Uploading…" : "Add"}
          </button>

          <button
            type="button"
            onClick={deleteNode}
            className="p-1.5 rounded transition-colors"
            style={{ color: "rgba(255,255,255,0.75)" }}
            title="Delete gallery"
          >
            <Trash2 size={14} />
          </button>
        </div>

        {/* Image grid — size (full/large/med) only narrows this block */}
        <div
          className="rounded-b-xl p-2.5"
          style={{
            background: "#f4f5f9",
            border: `1px solid ${NAVY}22`,
            borderTop: "none",
            display: layout === "stack" ? "flex" : "grid",
            flexDirection: layout === "stack" ? "column" : undefined,
            gridTemplateColumns:
              layout === "grid"
                ? `repeat(${columns}, minmax(0, 1fr))`
                : layout === "carousel"
                  ? "1fr"
                  : undefined,
            gap: "10px",
            width: "100%",
            maxWidth,
            margin: "0 auto",
            boxSizing: "border-box",
          }}
        >
          {images.map((img: GalleryImage, idx: number) => (
            <div
              key={`${img.src}-${idx}`}
              className="relative group rounded-lg overflow-hidden"
              style={{
                background: "#fff",
                border:
                  dragIdx === idx
                    ? `2px solid ${NAVY}`
                    : "1px solid #e5e7eb",
                minWidth: 0,
              }}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragEnd={handleDragEnd}
            >
              <div
                style={{
                  width: "100%",
                  minHeight: cellMinHeight,
                  maxHeight: gallerySize === "medium" ? 200 : 280,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: imageFit === "contain" ? "#eef0f6" : "#1b2253",
                  overflow: "hidden",
                }}
              >
                <img
                  src={img.src}
                  alt={img.alt}
                  draggable={false}
                  style={{
                    width: "100%",
                    height: "100%",
                    minHeight: cellMinHeight,
                    maxHeight: gallerySize === "medium" ? 200 : 280,
                    objectFit: imageFit,
                    objectPosition: "center",
                    display: "block",
                  }}
                />
              </div>
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/35 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto">
                <button
                  type="button"
                  className="p-1.5 rounded"
                  style={{ background: "rgba(27,34,83,0.85)", color: "white" }}
                  title="Drag to reorder"
                >
                  <GripVertical size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="p-1.5 rounded"
                  style={{ background: "rgba(27,34,83,0.85)", color: "#fecaca" }}
                  title="Remove image"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <input
                type="text"
                value={img.alt}
                onChange={(e) => updateAlt(idx, e.target.value)}
                placeholder="Alt text..."
                className="w-full px-2 py-1.5 text-xs"
                style={{
                  background: "#fff",
                  color: "#374151",
                  border: "none",
                  borderTop: "1px solid #e5e7eb",
                  outline: "none",
                  fontFamily: "var(--font-sans)",
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </NodeViewWrapper>
  );
}

// ── TipTap Node Extension ───────────────────────────────────────────────────
export const GalleryExtension = Node.create({
  name: "gallery",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      images: {
        default: [],
        parseHTML: (element: HTMLElement) => {
          try {
            const data = element.getAttribute("data-images");
            return data ? JSON.parse(data) : [];
          } catch {
            const imgs = element.querySelectorAll("img");
            return Array.from(imgs).map((img) => ({
              src: img.getAttribute("src") || "",
              alt: img.getAttribute("alt") || "",
            }));
          }
        },
        renderHTML: (attributes: Record<string, any>) => {
          return { "data-images": JSON.stringify(attributes.images || []) };
        },
      },
      columns: {
        default: 2,
        parseHTML: (element: HTMLElement) => {
          return parseInt(element.getAttribute("data-columns") || "2") || 2;
        },
        renderHTML: (attributes: Record<string, any>) => {
          return { "data-columns": String(attributes.columns || 2) };
        },
      },
      imageFit: {
        default: "cover",
        parseHTML: (element: HTMLElement) =>
          element.getAttribute("data-image-fit") || "cover",
        renderHTML: (attributes: Record<string, any>) => ({
          "data-image-fit": attributes.imageFit || "cover",
        }),
      },
      gallerySize: {
        default: "full",
        parseHTML: (element: HTMLElement) =>
          element.getAttribute("data-gallery-size") || "full",
        renderHTML: (attributes: Record<string, any>) => ({
          "data-gallery-size": attributes.gallerySize || "full",
        }),
      },
      layout: {
        default: "grid",
        parseHTML: (element: HTMLElement) => {
          const raw =
            element.getAttribute("data-layout") ||
            (element.classList.contains("article-gallery--stack")
              ? "stack"
              : element.classList.contains("article-gallery--carousel")
                ? "carousel"
                : element.classList.contains("article-gallery--grid")
                  ? "grid"
                  : "grid");
          return raw === "stack" || raw === "carousel" ? raw : "grid";
        },
        renderHTML: (attributes: Record<string, any>) => ({
          "data-layout": attributes.layout || "grid",
        }),
      },
    };
  },

  parseHTML() {
    return [
      { tag: 'div[class*="article-gallery"]' },
      { tag: 'div[class*="blog-gallery"]' },
      { tag: 'div[class*="wp-block-gallery"]' },
    ];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, any> }) {
    const images: GalleryImage[] = HTMLAttributes["data-images"]
      ? JSON.parse(HTMLAttributes["data-images"])
      : [];
    const columns = HTMLAttributes["data-columns"] || "2";
    const fit = HTMLAttributes["data-image-fit"] || "cover";
    const size = HTMLAttributes["data-gallery-size"] || "full";
    const layoutRaw = HTMLAttributes["data-layout"] || "grid";
    const layout =
      layoutRaw === "stack" || layoutRaw === "carousel" ? layoutRaw : "grid";
    const maxW =
      size === "medium" ? "520px" : size === "large" ? "720px" : "100%";

    const imgElements = images.map((img: GalleryImage) => [
      "figure",
      { class: "article-gallery-item blog-gallery-item" },
      [
        "img",
        {
          src: img.src,
          alt: img.alt,
          loading: "lazy",
          style: `width:100%;height:auto;object-fit:${fit};object-position:center;display:block;`,
        },
      ],
      img.alt && layout === "grid" ? ["figcaption", {}, img.alt] : "",
    ]);

    const styleByLayout =
      layout === "stack"
        ? `display:flex;flex-direction:column;align-items:center;gap:1rem;margin:1.5rem auto;width:100%;max-width:${maxW};box-sizing:border-box;`
        : layout === "carousel"
          ? `display:block;margin:1.5rem auto;width:100%;max-width:min(100%,640px);box-sizing:border-box;`
          : `display:grid;grid-template-columns:repeat(${columns},minmax(0,1fr));gap:12px;margin:1.5rem auto;width:100%;max-width:${maxW};box-sizing:border-box;`;

    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        class: `article-gallery article-gallery--${layout} blog-gallery blog-gallery--${size}${
          layout === "grid" ? ` columns-${columns}` : ""
        }`,
        "data-layout": layout,
        "data-columns": columns,
        "data-image-fit": fit,
        "data-gallery-size": size,
        style: styleByLayout,
      }),
      ...imgElements,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(GalleryNodeView);
  },

  addCommands() {
    return {
      insertGallery:
        (images: GalleryImage[], columns = 2, layout: GalleryLayout = "grid") =>
        ({ commands }: any) => {
          return commands.insertContent({
            type: "gallery",
            attrs: {
              images,
              columns,
              imageFit: layout === "grid" ? "cover" : "contain",
              gallerySize: "full",
              layout,
            },
          });
        },
    } as any;
  },
});
