const fs = require('fs');

let content = fs.readFileSync('src/app/dashboard/editor/[id]/EditorForm.tsx', 'utf8');

// 1. Imports
content = content.replace(
  "import { useEditor, EditorContent } from '@tiptap/react';\nimport StarterKit from '@tiptap/starter-kit';\nimport Image from '@tiptap/extension-image';",
  "import { RichTextEditor, RichTextEditorHandle } from '@/components/RichTextEditor';\nimport { SeoAnalysisPanel } from '@/components/SeoAnalysisPanel';"
);

// 2. Editor state and ref
const editorInitPattern = /const editor = useEditor\(\{[\s\S]*?\}\);/;
content = content.replace(
  editorInitPattern,
  `const [content, setContent] = useState(post?.content || '<p>Start writing your story here...</p>');
  const [focusKeyword, setFocusKeyword] = useState(post?.seoKeywords?.split(',')[0] || '');
  const [isGeneratingSlug, setIsGeneratingSlug] = useState(false);
  const editorRef = useRef<RichTextEditorHandle>(null);`
);

// 3. handleImageUpload
content = content.replace(
  /if \(editor\) \{\s*editor\.chain\(\)\.focus\(\)\.setImage\(\{ src: publicUrl \}\)\.run\(\);\s*\}/,
  `if (editorRef.current) {
        editorRef.current.insertImage(publicUrl);
      }`
);

// 4. generateSEO - no longer needed as SeoAnalysisPanel replaces it, but maybe keep it if I didn't delete the button.
// Actually, I will replace the whole AI SEO Panel and Body Content with the new setup.

// 5. Replace references to editor.getHTML()
content = content.replace(/editor\?\.getHTML\(\) \|\| ''/g, 'content');
content = content.replace(/editor\.getHTML\(\)/g, 'content');
content = content.replace(/!editor/g, 'false');

// 6. Slug Input & AI Slug Gen
const generateSlugFunc = `
  const generateSlug = async () => {
    if (!title && !content) return alert('Add a title or content first');
    setIsGeneratingSlug(true);
    try {
      const res = await fetch('/api/seo/slug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content })
      });
      const data = await res.json();
      if (data.slug) setSlug(data.slug);
    } catch(err) {
      alert('Failed to generate slug');
    } finally {
      setIsGeneratingSlug(false);
    }
  };
`;
// Insert right before handleSubmit
content = content.replace('const handleSubmit = async', generateSlugFunc + '\n  const handleSubmit = async');

// Slug input wrapper
const slugInputReplacement = `<div style={{ flex: 1, minWidth: '200px' }}>
            <label className="font-sans text-sm text-muted" style={{ display: 'block', marginBottom: '0.5rem' }}>URL Slug</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input 
                type="text" 
                value={slug} 
                onChange={(e) => setSlug(e.target.value)} 
                required 
                placeholder="my-new-post"
                style={{ flex: 1, fontFamily: 'monospace', width: '100%', padding: '0.75rem', borderRadius: '0.25rem', border: '1px solid var(--border)' }}
              />
              <button 
                type="button" 
                onClick={generateSlug}
                disabled={isGeneratingSlug}
                className="btn btn-secondary font-sans text-sm"
              >
                {isGeneratingSlug ? '...' : '✨ AI'}
              </button>
            </div>
          </div>`;

content = content.replace(/<div style=\{\{ flex: 1, minWidth: '200px' \}\}>\s*<label[^>]*>URL Slug<\/label>\s*<input[\s\S]*?border: '1px solid var\(--border\)' \}\}\s*\/>\s*<\/div>/, slugInputReplacement);

// 7. Replace Body Content & AI SEO ASSISTANT PANEL entirely
const bodyAndSeoReplacement = `
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
          <div style={{ flex: '1 1 0%', minWidth: 0 }}>
            <label className="font-sans text-sm text-muted" style={{ display: 'block', marginBottom: '0.5rem' }}>Body Content</label>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageUpload} 
              accept="image/*" 
              style={{ display: 'none' }} 
            />
            <RichTextEditor
              ref={editorRef}
              value={content}
              onChange={setContent}
              onImageInsert={() => fileInputRef.current?.click()}
            />
          </div>
          <div style={{ width: '350px', flexShrink: 0, marginTop: '2rem' }}>
            <SeoAnalysisPanel
              title={title}
              seoTitle={seoTitle}
              seoDescription={seoDescription}
              slug={slug}
              content={content}
              excerpt={content.replace(/<[^>]+>/g, ' ').substring(0, 150)}
              category={category}
              focusKeyword={focusKeyword}
              onFocusKeywordChange={setFocusKeyword}
              schemaTypes={['Article', 'NewsArticle']}
              onApplySeoTitle={setSeoTitle}
              onApplySeoDescription={setSeoDescription}
              onApplyTitle={setTitle}
              onApplySlug={setSlug}
            />
          </div>
        </div>
        <div style={{ display: 'none' }}>
`;

// We'll replace from the label "Body Content" down to the start of "Editorial Notes" or "Save Changes" 
content = content.replace(
  /<div>\s*<label className="font-sans text-sm text-muted" style=\{\{ display: 'block', marginBottom: '0.5rem' \}\}>Body Content<\/label>[\s\S]*?\{\/\* AI SEO ASSISTANT PANEL \*\/\}\s*<div[\s\S]*?(?=<div style=\{\{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' \}\}>)/,
  bodyAndSeoReplacement
);

// Remove the dangling generateSEO func
content = content.replace(/const generateSEO = async \(\) => \{[\s\S]*?\}\s*};\s*/, '');

fs.writeFileSync('src/app/dashboard/editor/[id]/EditorForm.tsx', content);
console.log('Updated EditorForm.tsx');
