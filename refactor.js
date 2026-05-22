const fs = require('fs');

function refactorFile(filepath) {
  let content = fs.readFileSync(filepath, 'utf8');

  // Replace oklch background/border colors with CSS variables
  content = content.replace(/oklch\([^\)]+\)/g, (match) => {
    if (match.includes('160')) {
      if (match.includes('0.22') || match.includes('0.20') || match.includes('0.18') || match.includes('0.28') || match.includes('0.15')) return 'var(--surface)';
      if (match.includes('0.30') || match.includes('0.35') || match.includes('0.32') || match.includes('0.40')) return 'var(--border)';
      if (match.includes('0.92') || match.includes('0.85') || match.includes('0.80')) return 'var(--foreground)';
      if (match.includes('0.75') || match.includes('0.60') || match.includes('0.55') || match.includes('0.50')) return 'var(--muted)';
      return 'var(--primary)';
    }
    if (match.includes('75') || match.includes('25') || match.includes('330') || match.includes('10') || match.includes('145') || match.includes('280') || match.includes('148') || match.includes('60')) {
      // Accent colors
      return 'var(--primary)';
    }
    return match;
  });

  // Remove trpc import if present
  if (content.includes('trpc')) {
    content = content.replace('import { trpc } from "@/lib/trpc";\n', '');
    
    // Replace useMutation with standard fetch
    content = content.replace(
      /const generateSuggestions = trpc[\s\S]*?\}\);/m,
      `const [isPending, setIsPending] = useState(false);
  
  const generateSuggestions = async (data: any) => {
    setIsPending(true);
    try {
      const res = await fetch('/api/seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: data.title, content: data.content })
      });
      if (!res.ok) throw new Error('Failed to generate suggestions');
      const result = await res.json();
      setSuggestions({
        seoTitle: result.seoTitle || '',
        seoDescription: result.seoDescription || '',
        suggestedSlug: result.seoTitle ? result.seoTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') : '',
        titleSuggestion: result.seoTitle || '',
        excerptSuggestion: result.seoDescription || '',
        internalLinkSuggestions: [],
        contentTips: [],
        focusKeywordSuggestions: result.seoKeywords ? result.seoKeywords.split(',').map((s: string) => s.trim()) : []
      });
      setAiExpanded(true);
      toast.success("SEO suggestions generated!");
    } catch (e: any) {
      toast.error(e.message || "Failed to generate suggestions");
    } finally {
      setIsPending(false);
    }
  };`
    );
    
    content = content.replace(/generateSuggestions\.mutate/g, 'generateSuggestions');
    content = content.replace(/generateSuggestions\.isPending/g, 'isPending');
  }

  fs.writeFileSync(filepath, content);
}

refactorFile('src/components/SeoAnalysisPanel.tsx');
console.log('Refactored SeoAnalysisPanel.tsx');
