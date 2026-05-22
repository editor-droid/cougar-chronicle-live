const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/editor/[id]/EditorForm.tsx', 'utf8');

code = code.replace(/seoKeywords,/g, 'seoKeywords,\n        keyInsights,');
code = code.replace(/seoKeywords, featuredImageAlt, customAuthor/g, 'seoKeywords, keyInsights, featuredImageAlt, customAuthor');

const uiSnippet = `
        <div style={{ marginBottom: '1.5rem' }}>
          <label className="font-sans text-sm text-muted" style={{ display: 'block', marginBottom: '0.5rem' }}>
            Key Insights / Takeaways (Optional)
          </label>
          <textarea 
            value={keyInsights} 
            onChange={(e) => setKeyInsights(e.target.value)} 
            placeholder="Summarize the key points of this article. Readers can expand this box at the top of the article."
            style={{ width: '100%', minHeight: '100px', padding: '0.75rem', borderRadius: '0.25rem', border: '1px solid var(--border)', fontFamily: 'var(--font-sans)', fontSize: '0.95rem' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>`;

code = code.replace(/<div style=\{\{ display: 'flex', gap: '2rem', alignItems: 'flex-start' \}\}>/, uiSnippet);

fs.writeFileSync('src/app/dashboard/editor/[id]/EditorForm.tsx', code);
console.log('Updated EditorForm.tsx');
