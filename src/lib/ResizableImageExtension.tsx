import Image from "@tiptap/extension-image";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import { useEffect, useRef, useState } from "react";

/**
 * Custom Image extension with drag-to-resize handles.
 * Stores dimensions as data-width / data-height AND inline style.
 */

function ResizableImageView({ node, updateAttributes, selected }: any) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [displayWidth, setDisplayWidth] = useState<number>(node.attrs.width || 0);
  const naturalRatio = useRef<number>(1);
  // Use a ref to track the live width during drag — avoids stale closure
  const liveWidthRef = useRef<number>(node.attrs.width || 0);

  // Load natural dimensions on mount
  useEffect(() => {
    if (imgRef.current) {
      const img = imgRef.current;
      const onLoad = () => {
        if (img.naturalWidth && img.naturalHeight) {
          naturalRatio.current = img.naturalWidth / img.naturalHeight;
          if (!node.attrs.width) {
            const w = Math.min(img.naturalWidth, 700);
            setDisplayWidth(w);
            liveWidthRef.current = w;
            updateAttributes({ width: w, height: Math.round(w / naturalRatio.current) });
          }
        }
      };
      if (img.complete) onLoad();
      else img.addEventListener("load", onLoad);
      return () => img.removeEventListener("load", onLoad);
    }
  }, [node.attrs.src]);

  // Sync from node attrs when not resizing
  useEffect(() => {
    if (node.attrs.width && !isResizing) {
      setDisplayWidth(node.attrs.width);
      liveWidthRef.current = node.attrs.width;
    }
  }, [node.attrs.width, isResizing]);

  const handleMouseDown = (e: React.MouseEvent, corner: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    const startX = e.clientX;
    const startWidth = liveWidthRef.current || imgRef.current?.offsetWidth || 300;
    const ratio = naturalRatio.current || 1;
    const isLeft = corner.includes("left");

    const onMouseMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX;
      const delta = isLeft ? -dx : dx;
      const parentMax =
        imgRef.current?.closest('.rich-text-editor-content, .ProseMirror, .tiptap')?.clientWidth || 900;
      const newWidth = Math.max(100, Math.min(startWidth + delta, Math.min(900, parentMax - 16)));
      liveWidthRef.current = newWidth;
      setDisplayWidth(newWidth);
    };

    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      // Read the final width from the ref (not stale state)
      const finalWidth = Math.max(100, liveWidthRef.current);
      const finalHeight = Math.round(finalWidth / ratio);
      updateAttributes({ width: finalWidth, height: finalHeight });
      setIsResizing(false);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  const widthStyle = displayWidth ? `${displayWidth}px` : "auto";

  return (
    <NodeViewWrapper
      className="resizable-image-node"
      style={{
        display: "block",
        width: widthStyle,
        maxWidth: "100%",
        margin: "1.25rem auto",
        boxSizing: "border-box",
      }}
    >
      <div
        className="relative group"
        style={{ width: "100%", maxWidth: "100%" }}
      >
        <img
          ref={imgRef}
          src={node.attrs.src}
          alt={node.attrs.alt || ""}
          title={node.attrs.title || ""}
          draggable={false}
          style={{
            display: "block",
            width: "100%",
            maxWidth: "100%",
            height: "auto",
            objectFit: "contain",
            borderRadius: "0.5rem",
            boxShadow: selected || isResizing
              ? "0 0 0 2px #1B2253"
              : "none",
          }}
        />
        {/* Resize handles — brand navy */}
        {(selected || isResizing) && (
          <>
            <div
              onMouseDown={(e) => handleMouseDown(e, "bottom-right")}
              title="Drag to resize"
              style={{
                position: "absolute",
                bottom: 0,
                right: 0,
                width: 14,
                height: 14,
                background: "#1B2253",
                borderRadius: "4px 0 0.5rem 0",
                cursor: "se-resize",
                zIndex: 10,
                opacity: 0.9,
              }}
            />
            <div
              onMouseDown={(e) => handleMouseDown(e, "bottom-left")}
              title="Drag to resize"
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                width: 14,
                height: 14,
                background: "#1B2253",
                borderRadius: "0 4px 0 0.5rem",
                cursor: "sw-resize",
                zIndex: 10,
                opacity: 0.9,
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: -28,
                left: "50%",
                transform: "translateX(-50%)",
                background: "#1B2253",
                color: "#fff",
                fontSize: 11,
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: 999,
                whiteSpace: "nowrap",
                zIndex: 10,
                fontFamily: "var(--font-sans)",
              }}
            >
              {Math.round(displayWidth || 0)}px · drag corners to resize
            </div>
          </>
        )}
      </div>
    </NodeViewWrapper>
  );
}

export const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element: HTMLElement) => {
          const dw = element.getAttribute("data-width");
          if (dw) return Number(dw);
          const sw = element.style.width?.replace("px", "");
          if (sw) return Number(sw);
          return null;
        },
        renderHTML: (attributes: Record<string, any>) => {
          if (!attributes.width) return {};
          return {
            "data-width": String(attributes.width),
            style: `width: ${attributes.width}px; max-width: 100%; height: auto;`,
          };
        },
      },
      height: {
        default: null,
        parseHTML: (element: HTMLElement) => {
          const dh = element.getAttribute("data-height");
          return dh ? Number(dh) : null;
        },
        renderHTML: (attributes: Record<string, any>) => {
          if (!attributes.height) return {};
          return { "data-height": String(attributes.height) };
        },
      },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView);
  },
});
