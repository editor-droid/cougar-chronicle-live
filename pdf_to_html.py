import fitz  # PyMuPDF
import sys

def pdf_to_semantic_html(pdf_path, output_path):
    doc = fitz.open(pdf_path)
    html_out = ["<html><head><meta charset='utf-8'><style>body { font-family: sans-serif; max-width: 800px; margin: 2rem auto; line-height: 1.6; } h2 { margin-top: 2rem; color: #333; } p { margin-bottom: 1rem; }</style></head><body>"]
    
    html_out.append("<h1>Extracted Articles</h1><p>Copy and paste from here into the rich-text editor! All bold and italics are preserved.</p><hr>")
    
    for page_num in range(len(doc)):
        page = doc[page_num]
        rect = page.rect
        blocks = page.get_text("dict")["blocks"]
        
        for b in blocks:
            if b['type'] == 0:  # Text block
                # Check for headers/footers (top 10% or bottom 10% of the page)
                y0, y1 = b["bbox"][1], b["bbox"][3]
                if y0 < rect.height * 0.08 or y1 > rect.height * 0.92:
                    continue # Skip headers and footers
                    
                block_text = ""
                for l in b["lines"]:
                    line_text = ""
                    for s in l["spans"]:
                        text = s["text"]
                        if not text.strip():
                            line_text += text
                            continue
                            
                        # Check font properties for bold/italic
                        is_bold = s["flags"] & 2**4 or "bold" in s["font"].lower()
                        is_italic = s["flags"] & 2**1 or "italic" in s["font"].lower()
                        is_header = s["size"] > 14
                        
                        prefix = ""
                        suffix = ""
                        if is_header:
                            prefix += "<h2>"
                            suffix = "</h2>" + suffix
                        if is_bold and not is_header:
                            prefix += "<strong>"
                            suffix = "</strong>" + suffix
                        if is_italic and not is_header:
                            prefix += "<em>"
                            suffix = "</em>" + suffix
                            
                        line_text += f"{prefix}{text}{suffix}"
                    
                    # Clean up hyphenation at the end of the line
                    line_text = line_text.strip()
                    
                    import re
                    # If the line contains no letters or numbers (e.g. a line of underscores or dashes), skip it completely
                    if not re.search(r'[a-zA-Z0-9]', line_text):
                        continue
                        
                    if block_text and block_text.endswith("-"):
                        # Remove the hyphen and append directly
                        block_text = block_text[:-1] + line_text
                    else:
                        block_text += " " + line_text if block_text else line_text
                
                block_text = block_text.strip()
                if block_text:
                    # Final check: if the entire block is just non-alphanumeric garbage, skip it
                    if not re.search(r'[a-zA-Z0-9]', block_text):
                        continue
                        
                    # Wrap the block in a paragraph if it's not already wrapped in a header
                    if not block_text.startswith("<h2>"):
                        html_out.append(f"<p>{block_text}</p>")
                    else:
                        html_out.append(block_text)
                        
        html_out.append("<hr>") # Page break divider
        
    html_out.append("</body></html>")
    
    with open(output_path, "w", encoding="utf-8") as f:
        f.write("\n".join(html_out))
        
    print(f"Successfully generated {output_path}")

if __name__ == "__main__":
    pdf_to_semantic_html('C:\\Users\\carte\\Downloads\\Final_with_covers.pdf', 'articles_formatted.html')
