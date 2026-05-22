import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import { useState, useCallback } from "react";
import { Trash2, Plus, GripVertical, Columns2, Columns3, Grid2x2 } from "lucide-react";

// ── Gallery Image type ──────────────────────────────────────────────────────
export interface GalleryImage {
  src: string;
  alt: string;
}

// ── React NodeView Component ────────────────────────────────────────────────
function GalleryNodeView({ node, updateAttributes, deleteNode, editor }: any) {
  const images: GalleryImage[] = node.attrs.images || [];
  const columns: number = node.attrs.columns || 3;
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const setColumns = (cols: number) => {
    updateAttributes({ columns: cols });
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

  const handleDragStart = (idx: number) => {
    setDragIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    const newImages = [...images];
    const [moved] = newImages.splice(dragIdx, 1);
    newImages.splice(idx, 0, moved);
    updateAttributes({ images: newImages });
    setDragIdx(idx);
  };

  const handleDragEnd = () => {
    setDragIdx(null);
  };

  // Trigger the parent BlogEditor's image upload
  const addMoreImages = () => {
    // Dispatch a custom event that BlogEditor listens for
    const event = new CustomEvent("gallery-add-images", {
      detail: { nodePos: editor.state.selection.$anchor.pos },
    });
    window.dispatchEvent(event);
  };

  return (
    <NodeViewWrapper className="blog-gallery-editor my-4">
      {/* Gallery toolbar */}
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-t-lg"
        style={{
          background: "#28444d",
          border: "1px solid #335a64",
          borderBottom: "none",
        }}
      >
        <span
          className="text-xs font-semibold"
          style={{ color: "oklch(0.72 0.12 75)" }}
        >
          Gallery
        </span>
        <span className="text-xs" style={{ color: "#7a8f95" }}>
          {images.length} image{images.length !== 1 ? "s" : ""}
        </span>

        <div className="flex-1" />

        {/* Column controls */}
        <button
          onClick={() => setColumns(2)}
          className="p-1 rounded transition-colors"
          style={{
            color: columns === 2 ? "oklch(0.72 0.12 75)" : "#6c8188",
            background: columns === 2 ? "oklch(0.72 0.12 75 / 0.15)" : "transparent",
          }}
          title="2 columns"
        >
          <Columns2 size={16} />
        </button>
        <button
          onClick={() => setColumns(3)}
          className="p-1 rounded transition-colors"
          style={{
            color: columns === 3 ? "oklch(0.72 0.12 75)" : "#6c8188",
            background: columns === 3 ? "oklch(0.72 0.12 75 / 0.15)" : "transparent",
          }}
          title="3 columns"
        >
          <Columns3 size={16} />
        </button>
        <button
          onClick={() => setColumns(4)}
          className="p-1 rounded transition-colors"
          style={{
            color: columns === 4 ? "oklch(0.72 0.12 75)" : "#6c8188",
            background: columns === 4 ? "oklch(0.72 0.12 75 / 0.15)" : "transparent",
          }}
          title="4 columns"
        >
          <Grid2x2 size={16} />
        </button>

        <div
          className="w-px h-4 mx-1"
          style={{ background: "#335a64" }}
        />

        <button
          onClick={addMoreImages}
          className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors"
          style={{
            background: "#2d4c56",
            color: "#abb7bb",
            border: "1px solid #3e6a78",
          }}
          title="Add more images"
        >
          <Plus size={12} />
          Add
        </button>

        <button
          onClick={deleteNode}
          className="p-1 rounded transition-colors"
          style={{ color: "#889da2" }}
          title="Delete gallery"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Image grid */}
      <div
        className="rounded-b-lg p-2"
        style={{
          background: "#213840",
          border: "1px solid #335a64",
          display: "grid",
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap: "8px",
        }}
      >
        {images.map((img: GalleryImage, idx: number) => (
          <div
            key={idx}
            className="relative group rounded-lg overflow-hidden"
            style={{
              background: "#1b2d33",
              border: dragIdx === idx ? "2px solid oklch(0.72 0.12 75)" : "1px solid #2d4c56",
            }}
            draggable
            onDragStart={() => handleDragStart(idx)}
            onDragOver={(e) => handleDragOver(e, idx)}
            onDragEnd={handleDragEnd}
          >
            <img
              src={img.src}
              alt={img.alt}
              className="w-full object-cover"
              style={{ height: "150px" }}
            />
            {/* Overlay controls */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
              <button
                className="p-1 rounded"
                style={{ background: "oklch(0 0 0 / 0.6)", color: "white" }}
                title="Drag to reorder"
              >
                <GripVertical size={16} />
              </button>
              <button
                onClick={() => removeImage(idx)}
                className="p-1 rounded"
                style={{ background: "oklch(0 0 0 / 0.6)", color: "oklch(0.7 0.2 25)" }}
                title="Remove image"
              >
                <Trash2 size={16} />
              </button>
            </div>
            {/* Alt text input */}
            <input
              type="text"
              value={img.alt}
              onChange={(e) => updateAlt(idx, e.target.value)}
              placeholder="Alt text..."
              className="w-full px-2 py-1 text-xs"
              style={{
                background: "#1f353c",
                color: "#b8c3c7",
                border: "none",
                borderTop: "1px solid #2d4c56",
                outline: "none",
              }}
            />
          </div>
        ))}
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
            // Fallback: parse from child img elements
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
        default: 3,
        parseHTML: (element: HTMLElement) => {
          return parseInt(element.getAttribute("data-columns") || "3") || 3;
        },
        renderHTML: (attributes: Record<string, any>) => {
          return { "data-columns": String(attributes.columns || 3) };
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[class*="blog-gallery"]' }];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, any> }) {
    // Render the gallery as a div with images inside for the HTML output
    const images: GalleryImage[] = HTMLAttributes["data-images"]
      ? JSON.parse(HTMLAttributes["data-images"])
      : [];
    const columns = HTMLAttributes["data-columns"] || "3";

    const imgElements = images.map((img: GalleryImage) => [
      "figure",
      { class: "blog-gallery-item" },
      ["img", { src: img.src, alt: img.alt, loading: "lazy" }],
      img.alt ? ["figcaption", {}, img.alt] : "",
    ]);

    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        class: `blog-gallery`,
        "data-columns": columns,
        style: `display:grid;grid-template-columns:repeat(${columns},1fr);gap:8px;`,
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
        (images: GalleryImage[], columns = 3) =>
        ({ commands }: any) => {
          return commands.insertContent({
            type: "gallery",
            attrs: { images, columns },
          });
        },
    } as any;
  },
});
