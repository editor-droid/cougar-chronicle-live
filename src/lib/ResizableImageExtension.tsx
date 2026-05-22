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
      const newWidth = Math.max(100, Math.min(startWidth + delta, 900));
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
    <NodeViewWrapper className="inline-block relative" style={{ width: widthStyle, maxWidth: "100%" }}>
      <div
        className="relative inline-block group"
        style={{ width: "100%" }}
      >
        <img
          ref={imgRef}
          src={node.attrs.src}
          alt={node.attrs.alt || ""}
          title={node.attrs.title || ""}
          draggable={false}
          className={`block w-full h-auto rounded ${selected ? "ring-2 ring-[oklch(0.578_0.130_60.2)] ring-offset-2" : ""}`}
        />
        {/* Resize handles — visible on hover or when selected */}
        {(selected || isResizing) && (
          <>
            {/* Bottom-right handle */}
            <div
              onMouseDown={(e) => handleMouseDown(e, "bottom-right")}
              className="absolute bottom-0 right-0 w-3 h-3 bg-[oklch(0.578_0.130_60.2)] rounded-tl cursor-se-resize z-10 opacity-80 hover:opacity-100"
              style={{ transform: "translate(25%, 25%)" }}
            />
            {/* Bottom-left handle */}
            <div
              onMouseDown={(e) => handleMouseDown(e, "bottom-left")}
              className="absolute bottom-0 left-0 w-3 h-3 bg-[oklch(0.578_0.130_60.2)] rounded-tr cursor-sw-resize z-10 opacity-80 hover:opacity-100"
              style={{ transform: "translate(-25%, 25%)" }}
            />
            {/* Width indicator */}
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-[oklch(0.318_0.035_226.6)] text-white text-xs px-2 py-0.5 rounded whitespace-nowrap z-10">
              {Math.round(displayWidth || 0)}px
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
