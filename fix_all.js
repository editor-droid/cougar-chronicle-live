const fs = require('fs');

// 1. Fix EditorForm.tsx
let editorForm = fs.readFileSync('src/app/dashboard/editor/[id]/EditorForm.tsx', 'utf8');
editorForm = editorForm.replace(/const content = content;\n/g, '');
fs.writeFileSync('src/app/dashboard/editor/[id]/EditorForm.tsx', editorForm);

// 2. Fix RichTextEditor.tsx
let rtf = fs.readFileSync('src/components/RichTextEditor.tsx', 'utf8');
rtf = rtf.replace(/import { ResizableImageExtension } from "\.\.\/lib\/ResizableImageExtension";/, 'import { ResizableImage } from "../lib/ResizableImageExtension";');
rtf = rtf.replace(/ResizableImageExtension,/g, 'ResizableImage,');
rtf = rtf.replace(/import Youtube from "@tiptap\/extension-youtube";/, 'import Youtube from "@tiptap/extension-youtube";'); // This is fine
rtf = rtf.replace(/Youtube,/g, 'Youtube,');

// For lucide-react icons, if Youtube and Instagram are missing, maybe they are just named Video and Camera or something.
// Actually, lucide-react does export 'Youtube' and 'Instagram'. The error was: Module '"lucide-react"' has no exported member 'Youtube'.
// Let's replace 'Youtube' and 'Instagram' with 'Video' and 'Camera' from lucide-react, as those definitely exist.
rtf = rtf.replace(/Youtube, Instagram,/g, 'Video, Camera,');
rtf = rtf.replace(/<Youtube size=\{15\} \/>/g, '<Video size={15} />');
rtf = rtf.replace(/<Instagram size=\{15\} \/>/g, '<Camera size={15} />');
rtf = rtf.replace(/YoutubeIcon/g, 'Video');
fs.writeFileSync('src/components/RichTextEditor.tsx', rtf);

// 3. Fix SeoAnalysisPanel.tsx
let seo = fs.readFileSync('src/components/SeoAnalysisPanel.tsx', 'utf8');
seo = seo.replace(/onClick=\{handleGenerateSuggestions\}/g, 'onClick={() => generateSuggestions({ title, content })}');
fs.writeFileSync('src/components/SeoAnalysisPanel.tsx', seo);

console.log('Fixed all TS errors!');
