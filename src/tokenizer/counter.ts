/**
 * High-speed token estimation approximating tiktoken (cl100k_base / Claude)
 * for source code and markdown structures.
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  
  // Clean empty lines and excessive spaces
  const trimmed = text.trim();
  if (trimmed.length === 0) return 0;

  // Standard code token estimation:
  // English words and code symbols average ~3.7 - 4 characters per token.
  // Special punctuation / brackets / keywords add roughly 10% overhead.
  const charBased = Math.ceil(trimmed.length / 3.8);
  const wordCount = (trimmed.match(/\b\w+\b/g) || []).length;
  const symbolCount = (trimmed.match(/[{}\[\](),.:;=<>!+\-*\/&|?~^%"'`#\\]/g) || []).length;

  const combined = Math.round((charBased + wordCount + symbolCount * 0.5) / 2);
  return Math.max(1, combined);
}

export function formatTokenCount(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}M`;
  }
  if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(1)}k`;
  }
  return tokens.toString();
}
