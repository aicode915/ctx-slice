export type OutputFormat = 'markdown' | 'xml' | 'json';

export interface SliceOptions {
  entryFiles: string[];
  maxDepth?: number;
  skeletonDepth?: number;
  budgetTokens?: number;
  format?: OutputFormat;
  includeTree?: boolean;
  outputPath?: string;
  clipboard?: boolean;
  ignorePatterns?: string[];
  verbose?: boolean;
}

export interface DependencyNode {
  filePath: string;           // Relative file path (for display)
  absolutePath: string;       // Normalized absolute path
  depth: number;              // Distance from entry files (0 = entry)
  rawContent: string;         // Original source code
  processedContent: string;   // Output content (skeleton or full)
  isSkeleton: boolean;        // True if implementation details were omitted
  dependencies: string[];     // Absolute paths of resolved local dependencies
  tokenCount: number;         // Estimated token count of processed content
  originalTokenCount: number; // Token count before skeletonization
  sizeBytes: number;
}

export interface SliceResult {
  nodes: DependencyNode[];
  entryFiles: string[];
  totalOriginalTokens: number;
  totalTokens: number;
  savedTokens: number;
  savedPercentage: number;
  topologyTree: string;
  formattedOutput: string;
}
