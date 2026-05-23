const fs = require('fs');
let content = fs.readFileSync('src/app/dashboard/editor/[id]/EditorForm.tsx', 'utf8');

// 1. Add state
content = content.replace(
  "const [customAuthor, setCustomAuthor] = useState(post?.customAuthor || '');",
  "const [customAuthor, setCustomAuthor] = useState(post?.customAuthor || '');\n  const [isPremium, setIsPremium] = useState(post?.isPremium || false);"
);

// 2. Add checkbox after Custom Byline block
const customBylineBlock = `<div style={{ flex: 1, minWidth: '200px' }}>
            <label className="font-sans text-sm text-muted" style={{ display: 'block', marginBottom: '0.5rem' }}>Custom Byline (Optional)</label>
            <input 
              type="text" 
              value={customAuthor} 
              onChange={(e) => setCustomAuthor(e.target.value)} 
              placeholder="e.g. John Doe and Jane Smith"
              style={{ width: '100%', padding: '0.75rem', borderRadius: '0.25rem', border: '1px solid var(--border)' }}
            />
          </div>`;

const premiumCheckboxBlock = `
          <div style={{ flex: 1, minWidth: '200px', display: 'flex', alignItems: 'flex-end', paddingBottom: '0.75rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={isPremium} 
                onChange={(e) => setIsPremium(e.target.checked)} 
                style={{ width: '1.25rem', height: '1.25rem', cursor: 'pointer' }}
              />
              <span className="font-sans text-sm font-bold" style={{ color: 'var(--primary)' }}>Premium Article (Paywall)</span>
            </label>
          </div>`;

content = content.replace(customBylineBlock, customBylineBlock + premiumCheckboxBlock);

// 3. Add isPremium to savePost payloads
content = content.replace(/customAuthor([\s\n]*)\}/g, 'customAuthor, isPremium$1}');

fs.writeFileSync('src/app/dashboard/editor/[id]/EditorForm.tsx', content);
console.log('EditorForm updated successfully!');
