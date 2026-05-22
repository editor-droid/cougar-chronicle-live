const fs = require('fs');

let content = fs.readFileSync('src/app/dashboard/editor/[id]/EditorForm.tsx', 'utf8');

// Fix 'const content = content;'
content = content.replace(/const content = content;/g, '');

// Fix Body Content to end of SEO Panel
const startIndex = content.indexOf('<div>\\n          <label className="font-sans text-sm text-muted" style={{ display: \\'block\\', marginBottom: \\'0.5rem\\' }}>Body Content</label>');
if (startIndex === -1) {
  // It's line 418: "<div>"
  // Let's use a regex carefully.
}

content = content.replace(
  /<div>\s*<label className="font-sans text-sm text-muted" style=\{\{ display: 'block', marginBottom: '0.5rem' \}\}>Body Content<\/label>[\s\S]*?<\/div>\s*<\/div>\s*<div style=\{\{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' \}\}>/m,
  `
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

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>`
);

fs.writeFileSync('src/app/dashboard/editor/[id]/EditorForm.tsx', content);
console.log('Fixed EditorForm.tsx');
