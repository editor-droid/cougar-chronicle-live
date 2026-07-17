import { useMemo, useState } from "react";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronDown,
  Sparkles,
  Loader2,
  Check,
  X,
  Copy,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

interface SeoAnalysisPanelProps {
  title: string;
  seoTitle: string;
  seoDescription: string;
  slug: string;
  content: string; // HTML content from Tiptap
  excerpt: string;
  category: string;
  focusKeyword: string;
  onFocusKeywordChange: (kw: string) => void;
  schemaTypes: string[];
  // Callbacks for applying AI suggestions
  onApplySeoTitle?: (value: string) => void;
  onApplySeoDescription?: (value: string) => void;
  onApplyTitle?: (value: string) => void;
  onApplySlug?: (value: string) => void;
  onApplyExcerpt?: (value: string) => void;
}

type CheckStatus = "good" | "warning" | "error";

interface SeoCheck {
  id: string;
  label: string;
  status: CheckStatus;
  message: string;
}

interface SeoSuggestions {
  seoTitle: string;
  seoDescription: string;
  suggestedSlug: string;
  titleSuggestion: string;
  excerptSuggestion: string;
  internalLinkSuggestions: Array<{
    anchorText: string;
    targetPath: string;
    reason: string;
  }>;
  contentTips: string[];
  focusKeywordSuggestions: string[];
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function getKeywordDensity(text: string, keyword: string): number {
  if (!keyword) return 0;
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  const kwWords = keyword.toLowerCase().split(/\s+/).filter(Boolean);
  if (kwWords.length === 0 || words.length === 0) return 0;
  let count = 0;
  for (let i = 0; i <= words.length - kwWords.length; i++) {
    if (kwWords.every((w, j) => words[i + j] === w)) count++;
  }
  return (count / words.length) * 100;
}

function hasImagesWithoutAlt(html: string): boolean {
  const imgMatches = html.match(/<img[^>]*>/g) ?? [];
  return imgMatches.some(img => {
    const altMatch = img.match(/alt="([^"]*)"/);
    return !altMatch || altMatch[1].trim() === "";
  });
}

function getHeadings(html: string): { h1: number; h2: number; h3: number } {
  return {
    h1: (html.match(/<h1[^>]*>/g) ?? []).length,
    h2: (html.match(/<h2[^>]*>/g) ?? []).length,
    h3: (html.match(/<h3[^>]*>/g) ?? []).length,
  };
}

function getReadabilityScore(text: string): {
  score: number;
  label: string;
  color: string;
} {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const words = text.split(/\s+/).filter(Boolean);
  if (sentences.length === 0 || words.length === 0)
    return { score: 0, label: "No content", color: "var(--muted)" };
  const avgWordsPerSentence = words.length / sentences.length;
  const syllables = words.reduce((acc, word) => {
    const matches = word.toLowerCase().match(/[aeiouy]+/g);
    return acc + (matches ? matches.length : 1);
  }, 0);
  const avgSyllablesPerWord = syllables / words.length;
  const score =
    206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord;
  const clamped = Math.max(0, Math.min(100, score));
  if (clamped >= 70)
    return {
      score: clamped,
      label: "Easy to read",
      color: "var(--primary)",
    };
  if (clamped >= 50)
    return {
      score: clamped,
      label: "Fairly easy",
      color: "var(--primary)",
    };
  if (clamped >= 30)
    return {
      score: clamped,
      label: "Somewhat difficult",
      color: "var(--primary)",
    };
  return {
    score: clamped,
    label: "Difficult to read",
    color: "var(--primary)",
  };
}

const STATUS_ICON = {
  good: <CheckCircle2 size={14} style={{ color: "var(--primary)" }} />,
  warning: <AlertTriangle size={14} style={{ color: "var(--primary)" }} />,
  error: <XCircle size={14} style={{ color: "var(--primary)" }} />,
};

const STATUS_COLOR = {
  good: "var(--primary)",
  warning: "var(--primary)",
  error: "var(--primary)",
};

// Suggestion card with approve/reject
function SuggestionCard({
  label,
  current,
  suggested,
  onApply,
  charLimit,
}: {
  label: string;
  current: string;
  suggested: string;
  onApply?: (value: string) => void;
  charLimit?: string;
}) {
  const [applied, setApplied] = useState(false);

  if (!suggested || suggested === current) return null;

  return (
    <div
      className="rounded-lg p-3 space-y-2"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
      }}
    >
      <div className="flex items-center justify-between">
        <span
          className="text-xs font-bold uppercase tracking-wider"
          style={{ color: "var(--muted)" }}
        >
          {label}
        </span>
        {charLimit && (
          <span className="text-xs" style={{ color: "var(--muted)" }}>
            {suggested.length} chars {charLimit}
          </span>
        )}
      </div>
      {current && (
        <div
          className="text-xs rounded px-2 py-1.5"
          style={{
            background: "var(--surface)",
            color: "var(--muted)",
          }}
        >
          <span className="font-bold" style={{ color: "var(--muted)" }}>
            Current:{" "}
          </span>
          {current}
        </div>
      )}
      <div
        className="text-xs rounded px-2 py-1.5"
        style={{
          background: "var(--primary)",
          color: "white",
          border: "1px solid var(--primary)",
        }}
      >
        <span className="font-bold" style={{ color: "rgba(255,255,255,0.7)" }}>
          Suggested:{" "}
        </span>
        {suggested}
      </div>
      <div className="flex items-center gap-2">
        {onApply && !applied && (
          <button
            onClick={() => {
              onApply(suggested);
              setApplied(true);
              toast.success(`${label} applied!`);
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition-all"
            style={{ background: "var(--primary)", color: "white" }}
          >
            <Check size={11} /> Apply
          </button>
        )}
        {applied && (
          <span
            className="flex items-center gap-1 text-xs font-bold"
            style={{ color: "var(--primary)" }}
          >
            <Check size={11} /> Applied
          </span>
        )}
        <button
          onClick={() => {
            navigator.clipboard.writeText(suggested);
            toast.success("Copied to clipboard");
          }}
          className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition-all"
          style={{
            background: "var(--surface)",
            color: "var(--primary)",
          }}
        >
          <Copy size={11} /> Copy
        </button>
      </div>
    </div>
  );
}

export function SeoAnalysisPanel({
  title,
  seoTitle,
  seoDescription,
  slug,
  content,
  excerpt,
  category,
  focusKeyword,
  onFocusKeywordChange,
  schemaTypes,
  onApplySeoTitle,
  onApplySeoDescription,
  onApplyTitle,
  onApplySlug,
  onApplyExcerpt,
}: SeoAnalysisPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [aiExpanded, setAiExpanded] = useState(false);
  const [suggestions, setSuggestions] = useState<SeoSuggestions | null>(null);

  const [isPending, setIsPending] = useState(false);
  
  const generateSuggestions = async (data: any) => {
    setIsPending(true);
    try {
      const res = await fetch('/api/seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: data.title, content: data.content })
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(result.error || result.details || 'Failed to generate suggestions');
      }
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
  };

  const analysis = useMemo(() => {
    const plainText = stripHtml(content);
    const wordCount = countWords(plainText);
    const headings = getHeadings(content);
    const readability = getReadabilityScore(plainText);
    const kwDensity = getKeywordDensity(plainText, focusKeyword);
    const kwInTitle = focusKeyword
      ? title.toLowerCase().includes(focusKeyword.toLowerCase())
      : false;
    const kwInSeoTitle = focusKeyword
      ? seoTitle.toLowerCase().includes(focusKeyword.toLowerCase())
      : false;
    const kwInDescription = focusKeyword
      ? seoDescription.toLowerCase().includes(focusKeyword.toLowerCase())
      : false;
    const kwInSlug = focusKeyword
      ? slug
          .toLowerCase()
          .includes(focusKeyword.toLowerCase().replace(/\s+/g, "-"))
      : false;
    const kwInFirstParagraph = focusKeyword
      ? (() => {
          const firstPara = content.match(/<p[^>]*>(.*?)<\/p>/)?.[1] ?? "";
          return stripHtml(firstPara)
            .toLowerCase()
            .includes(focusKeyword.toLowerCase());
        })()
      : false;
    const imagesWithoutAlt = hasImagesWithoutAlt(content);
    const hasImages = /<img[^>]*>/i.test(content);
    const seoTitleLen = seoTitle.length;
    const seoDescLen = seoDescription.length;
    const hasInternalLinks = /<a[^>]*href="\/[^"]*"[^>]*>/i.test(content);
    const hasExternalLinks = /<a[^>]*href="https?:\/\/[^"]*"[^>]*>/i.test(
      content
    );

    const checks: SeoCheck[] = [];

    checks.push({
      id: "word-count",
      label: "Content length",
      status:
        wordCount >= 600 ? "good" : wordCount >= 300 ? "warning" : "error",
      message:
        wordCount >= 600
          ? `${wordCount} words — good length for SEO`
          : wordCount >= 300
            ? `${wordCount} words — aim for 600+ for better rankings`
            : `${wordCount} words — too short, aim for at least 300`,
    });

    checks.push({
      id: "headings",
      label: "Heading structure",
      status:
        headings.h2 >= 2 ? "good" : headings.h2 >= 1 ? "warning" : "error",
      message:
        headings.h2 >= 2
          ? `${headings.h2} H2 headings found — good structure`
          : headings.h2 === 1
            ? "Only 1 H2 heading — add more to improve structure"
            : "No H2 headings — add subheadings to break up content",
    });

    checks.push({
      id: "images",
      label: "Images",
      status: !hasImages ? "warning" : imagesWithoutAlt ? "warning" : "good",
      message: !hasImages
        ? "No images — add at least one relevant image"
        : imagesWithoutAlt
          ? "Some images are missing alt text — add alt text to all images"
          : "All images have alt text",
    });

    checks.push({
      id: "internal-links",
      label: "Internal links",
      status: hasInternalLinks ? "good" : "warning",
      message: hasInternalLinks
        ? "Internal links found — good for site structure"
        : "No internal links — link to other pages on your site",
    });

    checks.push({
      id: "external-links",
      label: "External links",
      status: hasExternalLinks ? "good" : "warning",
      message: hasExternalLinks
        ? "External links found"
        : "No external links — consider linking to credible sources",
    });

    checks.push({
      id: "seo-title-length",
      label: "SEO title length",
      status:
        seoTitleLen >= 50 && seoTitleLen <= 60
          ? "good"
          : seoTitleLen > 0
            ? "warning"
            : "error",
      message:
        seoTitleLen === 0
          ? "No SEO title — add one in the SEO section"
          : seoTitleLen < 50
            ? `${seoTitleLen} chars — too short, aim for 50–60`
            : seoTitleLen > 60
              ? `${seoTitleLen} chars — too long, aim for 50–60`
              : `${seoTitleLen} chars — perfect length`,
    });

    checks.push({
      id: "meta-description-length",
      label: "Meta description length",
      status:
        seoDescLen >= 120 && seoDescLen <= 160
          ? "good"
          : seoDescLen > 0
            ? "warning"
            : "error",
      message:
        seoDescLen === 0
          ? "No meta description — add one in the SEO section"
          : seoDescLen < 120
            ? `${seoDescLen} chars — too short, aim for 120–160`
            : seoDescLen > 160
              ? `${seoDescLen} chars — too long, aim for 120–160`
              : `${seoDescLen} chars — perfect length`,
    });

    if (focusKeyword) {
      checks.push({
        id: "kw-title",
        label: "Keyword in title",
        status: kwInTitle ? "good" : "error",
        message: kwInTitle
          ? `"${focusKeyword}" found in title`
          : `"${focusKeyword}" not in title — add it`,
      });

      checks.push({
        id: "kw-seo-title",
        label: "Keyword in SEO title",
        status: kwInSeoTitle ? "good" : "warning",
        message: kwInSeoTitle
          ? `"${focusKeyword}" found in SEO title`
          : `"${focusKeyword}" not in SEO title`,
      });

      checks.push({
        id: "kw-description",
        label: "Keyword in meta description",
        status: kwInDescription ? "good" : "warning",
        message: kwInDescription
          ? `"${focusKeyword}" found in meta description`
          : `"${focusKeyword}" not in meta description`,
      });

      checks.push({
        id: "kw-slug",
        label: "Keyword in URL slug",
        status: kwInSlug ? "good" : "warning",
        message: kwInSlug
          ? `"${focusKeyword}" found in URL slug`
          : `"${focusKeyword}" not in URL slug`,
      });

      checks.push({
        id: "kw-first-para",
        label: "Keyword in first paragraph",
        status: kwInFirstParagraph ? "good" : "warning",
        message: kwInFirstParagraph
          ? `"${focusKeyword}" found in first paragraph`
          : `"${focusKeyword}" not in first paragraph — add it early`,
      });

      checks.push({
        id: "kw-density",
        label: "Keyword density",
        status:
          kwDensity >= 0.5 && kwDensity <= 2.5
            ? "good"
            : kwDensity > 0
              ? "warning"
              : "error",
        message:
          kwDensity === 0
            ? `"${focusKeyword}" not found in content`
            : kwDensity < 0.5
              ? `${kwDensity.toFixed(1)}% — too low, aim for 0.5–2.5%`
              : kwDensity > 2.5
                ? `${kwDensity.toFixed(1)}% — too high (keyword stuffing), aim for 0.5–2.5%`
                : `${kwDensity.toFixed(1)}% — good keyword density`,
      });
    }

    checks.push({
      id: "schema",
      label: "Schema markup",
      status: schemaTypes.length > 0 ? "good" : "warning",
      message:
        schemaTypes.length > 0
          ? `${schemaTypes.join(", ")} schema enabled`
          : "No schema selected — add schema markup for rich results",
    });

    const goodCount = checks.filter(c => c.status === "good").length;
    const totalCount = checks.length;
    const overallScore = Math.round((goodCount / totalCount) * 100);

    return { checks, overallScore, wordCount, readability };
  }, [
    title,
    seoTitle,
    seoDescription,
    slug,
    content,
    focusKeyword,
    schemaTypes,
  ]);

  const overallStatus: CheckStatus =
    analysis.overallScore >= 75
      ? "good"
      : analysis.overallScore >= 50
        ? "warning"
        : "error";
  const overallLabel =
    analysis.overallScore >= 75
      ? "Good"
      : analysis.overallScore >= 50
        ? "Needs Work"
        : "Poor";

  return (
    <div className="space-y-3">
      {/* SEO Analysis Panel */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{
          borderColor: "var(--border)",
          background: "var(--surface)",
        }}
      >
        {/* Header */}
        <button
          type="button"
          className="w-full flex items-center justify-between px-4 py-3"
          onClick={() => setExpanded(v => !v)}
        >
          <div className="flex items-center gap-2">
            <span
              className="text-sm font-semibold"
              style={{ color: "var(--foreground)" }}
            >
              SEO Analysis
            </span>
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{
                background: STATUS_COLOR[overallStatus] + "22",
                color: STATUS_COLOR[overallStatus],
                border: `1px solid ${STATUS_COLOR[overallStatus]}44`,
              }}
            >
              {overallLabel} · {analysis.overallScore}%
            </span>
          </div>
          <ChevronDown
            size={14}
            style={{
              color: "var(--muted)",
              transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s",
            }}
          />
        </button>

        {expanded && (
          <div className="px-4 pb-4 space-y-4">
            {/* Focus keyword input */}
            <div>
              <label
                className="block text-xs font-medium mb-1"
                style={{ color: "var(--muted)" }}
              >
                Focus Keyword
              </label>
              <input
                type="text"
                value={focusKeyword}
                onChange={e => onFocusKeywordChange(e.target.value)}
                placeholder="e.g. food freedom for women 40"
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  color: "var(--foreground)",
                  outline: "none",
                }}
              />
              <p
                className="text-xs mt-1"
                style={{ color: "var(--muted)" }}
              >
                The main keyword you want this post to rank for
              </p>
            </div>

            {/* Readability */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span
                  className="text-xs font-medium"
                  style={{ color: "var(--muted)" }}
                >
                  Readability
                </span>
                <span
                  className="text-xs font-semibold"
                  style={{ color: analysis.readability.color }}
                >
                  {analysis.readability.label}
                </span>
              </div>
              <div
                className="h-1.5 rounded-full overflow-hidden"
                style={{ background: "var(--surface)" }}
              >
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.max(5, analysis.readability.score)}%`,
                    background: analysis.readability.color,
                  }}
                />
              </div>
              <p
                className="text-xs mt-1"
                style={{ color: "var(--muted)" }}
              >
                {analysis.wordCount} words · Use short sentences and simple
                language for your audience
              </p>
            </div>

            {/* Score bar */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span
                  className="text-xs font-medium"
                  style={{ color: "var(--muted)" }}
                >
                  Overall SEO Score
                </span>
                <span
                  className="text-xs font-semibold"
                  style={{ color: STATUS_COLOR[overallStatus] }}
                >
                  {analysis.overallScore}% (
                  {analysis.checks.filter(c => c.status === "good").length}/
                  {analysis.checks.length} checks passed)
                </span>
              </div>
              <div
                className="h-1.5 rounded-full overflow-hidden"
                style={{ background: "var(--surface)" }}
              >
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${analysis.overallScore}%`,
                    background: STATUS_COLOR[overallStatus],
                  }}
                />
              </div>
            </div>

            {/* Checks list */}
            <div className="space-y-1.5">
              {analysis.checks.map(check => (
                <div key={check.id} className="flex items-start gap-2">
                  <div className="mt-0.5 flex-shrink-0">
                    {STATUS_ICON[check.status]}
                  </div>
                  <div>
                    <span
                      className="text-xs font-medium"
                      style={{ color: "var(--foreground)" }}
                    >
                      {check.label}:{" "}
                    </span>
                    <span
                      className="text-xs"
                      style={{ color: "var(--muted)" }}
                    >
                      {check.message}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* AI SEO Optimizer Panel */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{
          borderColor: "var(--primary)",
          background: "var(--surface)",
        }}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Sparkles size={14} style={{ color: "var(--primary)" }} />
            <span
              className="text-sm font-semibold"
              style={{ color: "var(--foreground)" }}
            >
              AI SEO Optimizer
            </span>
          </div>
          <button
            onClick={() => generateSuggestions({ title, content })}
            disabled={isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
            style={{
              background: "var(--primary)",
              color: "white",
              opacity: isPending ? 0.7 : 1,
            }}
          >
            {isPending ? (
              <>
                <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Analyzing...
              </>
            ) : (
              <>
                <Sparkles size={12} /> {suggestions ? "Re-analyze" : "Optimize"}
              </>
            )}
          </button>
        </div>

        {/* AI Suggestions */}
        {suggestions && (
          <div
            className="px-4 pb-4 space-y-3 border-t"
            style={{ borderColor: "var(--surface)" }}
          >
            <button
              type="button"
              onClick={() => setAiExpanded(v => !v)}
              className="w-full flex items-center justify-between pt-3"
            >
              <span
                className="text-xs font-bold uppercase tracking-wider"
                style={{ color: "var(--primary)" }}
              >
                Suggestions Ready
              </span>
              <ChevronDown
                size={14}
                style={{
                  color: "var(--muted)",
                  transform: aiExpanded ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.2s",
                }}
              />
            </button>

            {aiExpanded && (
              <div className="space-y-3">
                {/* SEO Title */}
                <SuggestionCard
                  label="SEO Title"
                  current={seoTitle}
                  suggested={suggestions.seoTitle}
                  onApply={onApplySeoTitle}
                  charLimit="(target: 50-60)"
                />

                {/* Meta Description */}
                <SuggestionCard
                  label="Meta Description"
                  current={seoDescription}
                  suggested={suggestions.seoDescription}
                  onApply={onApplySeoDescription}
                  charLimit="(target: 120-160)"
                />

                {/* Title */}
                <SuggestionCard
                  label="Post Title"
                  current={title}
                  suggested={suggestions.titleSuggestion}
                  onApply={onApplyTitle}
                />

                {/* Slug */}
                <SuggestionCard
                  label="URL Slug"
                  current={slug}
                  suggested={suggestions.suggestedSlug}
                  onApply={onApplySlug}
                />

                {/* Excerpt */}
                <SuggestionCard
                  label="Excerpt"
                  current={excerpt}
                  suggested={suggestions.excerptSuggestion}
                  onApply={onApplyExcerpt}
                />

                {/* Internal Link Suggestions */}
                {suggestions.internalLinkSuggestions.length > 0 && (
                  <div
                    className="rounded-lg p-3 space-y-2"
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <span
                      className="text-xs font-bold uppercase tracking-wider block"
                      style={{ color: "var(--muted)" }}
                    >
                      Internal Link Suggestions
                    </span>
                    {suggestions.internalLinkSuggestions.map((link, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 text-xs"
                        style={{ color: "var(--foreground)" }}
                      >
                        <ExternalLink
                          size={11}
                          className="mt-0.5 flex-shrink-0"
                          style={{ color: "var(--primary)" }}
                        />
                        <div>
                          <span
                            className="font-bold"
                            style={{ color: "var(--primary)" }}
                          >
                            {link.anchorText}
                          </span>
                          <span style={{ color: "var(--muted)" }}>
                            {" "}
                            → {link.targetPath}
                          </span>
                          <p
                            className="mt-0.5"
                            style={{ color: "var(--muted)" }}
                          >
                            {link.reason}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Content Tips */}
                {suggestions.contentTips.length > 0 && (
                  <div
                    className="rounded-lg p-3 space-y-1.5"
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <span
                      className="text-xs font-bold uppercase tracking-wider block"
                      style={{ color: "var(--muted)" }}
                    >
                      Content Improvement Tips
                    </span>
                    {suggestions.contentTips.map((tip, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 text-xs"
                        style={{ color: "var(--foreground)" }}
                      >
                        <span
                          className="font-bold flex-shrink-0"
                          style={{ color: "var(--primary)" }}
                        >
                          {i + 1}.
                        </span>
                        <span>{tip}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Focus Keyword Suggestions */}
                {suggestions.focusKeywordSuggestions.length > 0 && (
                  <div
                    className="rounded-lg p-3 space-y-2"
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <span
                      className="text-xs font-bold uppercase tracking-wider block"
                      style={{ color: "var(--muted)" }}
                    >
                      Alternative Keywords
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {suggestions.focusKeywordSuggestions.map((kw, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            onFocusKeywordChange(kw);
                            toast.success(`Focus keyword set to "${kw}"`);
                          }}
                          className="px-2.5 py-1 rounded-full text-xs font-bold transition-all hover:opacity-80"
                          style={{
                            background: "var(--surface)",
                            color: "var(--foreground)",
                            border: "1px solid var(--border)",
                          }}
                          title={`Set "${kw}" as focus keyword`}
                        >
                          {kw}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
