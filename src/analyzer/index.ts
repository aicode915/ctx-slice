import fs from 'node:fs';
import path from 'node:path';
import { DependencyNode, SliceOptions, SliceResult } from '../types.js';
import { extractImportSpecifiers, resolveImportPath } from './resolver.js';
import { extractSkeleton } from '../skeleton/index.js';
import { estimateTokens } from '../tokenizer/counter.js';
import { formatOutput, generateTopologyTree } from '../formatter/index.js';

export function analyzeSlice(options: SliceOptions): SliceResult {
  const rootDir = process.cwd();
  const maxDepth = options.maxDepth ?? 5;
  const skeletonDepth = options.skeletonDepth ?? 2;
  const format = options.format ?? 'markdown';

  // Absolute path -> DependencyNode
  const nodeMap = new Map<string, DependencyNode>();
  const visited = new Set<string>();

  // Queue for BFS traversal: [absolutePath, currentDepth]
  const queue: Array<[string, number]> = [];

  const resolvedEntries: string[] = [];

  for (const entry of options.entryFiles) {
    const absPath = path.resolve(rootDir, entry);
    if (!fs.existsSync(absPath)) {
      throw new Error(`Entry file not found: ${entry}`);
    }
    resolvedEntries.push(absPath);
    queue.push([absPath, 0]);
  }

  while (queue.length > 0) {
    const [currentPath, currentDepth] = queue.shift()!;

    if (visited.has(currentPath)) {
      // If already visited, update depth if we found a shorter path
      const existing = nodeMap.get(currentPath);
      if (existing && currentDepth < existing.depth) {
        existing.depth = currentDepth;
      }
      continue;
    }

    visited.add(currentPath);

    if (currentDepth > maxDepth) {
      continue;
    }

    const rawContent = fs.readFileSync(currentPath, 'utf-8');
    const relPath = path.relative(rootDir, currentPath);

    // Determine if this file should be skeletonized
    // Entry files (depth 0) are always full.
    // Files at depth >= skeletonDepth become AST skeletons.
    const shouldSkeletonize = currentDepth >= skeletonDepth;
    const processedContent = shouldSkeletonize
      ? extractSkeleton(rawContent, currentPath)
      : rawContent;

    const originalTokens = estimateTokens(rawContent);
    const processedTokens = shouldSkeletonize ? estimateTokens(processedContent) : originalTokens;

    // Extract outgoing imports
    const specifiers = extractImportSpecifiers(rawContent, currentPath);
    const localDeps: string[] = [];

    for (const specifier of specifiers) {
      const resolved = resolveImportPath(specifier, currentPath, rootDir);
      if (resolved && !isIgnored(resolved, options.ignorePatterns)) {
        localDeps.push(resolved);
        if (!visited.has(resolved) && currentDepth + 1 <= maxDepth) {
          queue.push([resolved, currentDepth + 1]);
        }
      }
    }

    nodeMap.set(currentPath, {
      filePath: relPath,
      absolutePath: currentPath,
      depth: currentDepth,
      rawContent,
      processedContent,
      isSkeleton: shouldSkeletonize,
      dependencies: localDeps,
      tokenCount: processedTokens,
      originalTokenCount: originalTokens,
      sizeBytes: Buffer.byteLength(processedContent, 'utf-8')
    });
  }

  // Convert map to array sorted by depth asc, then filePath
  let nodes = Array.from(nodeMap.values()).sort((a, b) => {
    if (a.depth !== b.depth) return a.depth - b.depth;
    return a.filePath.localeCompare(b.filePath);
  });

  // Apply budgetTokens pruning if specified
  if (options.budgetTokens && options.budgetTokens > 0) {
    nodes = applyTokenBudget(nodes, options.budgetTokens);
  }

  const totalOriginalTokens = nodes.reduce((sum, n) => sum + n.originalTokenCount, 0);
  const totalTokens = nodes.reduce((sum, n) => sum + n.tokenCount, 0);
  const savedTokens = Math.max(0, totalOriginalTokens - totalTokens);
  const savedPercentage = totalOriginalTokens > 0
    ? Math.round((savedTokens / totalOriginalTokens) * 100)
    : 0;

  const topologyTree = generateTopologyTree(nodes, resolvedEntries);
  const formattedOutput = formatOutput(nodes, topologyTree, format);

  return {
    nodes,
    entryFiles: resolvedEntries.map(p => path.relative(rootDir, p)),
    totalOriginalTokens,
    totalTokens,
    savedTokens,
    savedPercentage,
    topologyTree,
    formattedOutput
  };
}

function isIgnored(filePath: string, ignorePatterns?: string[]): boolean {
  if (filePath.includes('node_modules') || filePath.includes('.git') || filePath.includes('/dist/')) {
    return true;
  }
  if (!ignorePatterns || ignorePatterns.length === 0) return false;
  return ignorePatterns.some(pattern => filePath.includes(pattern));
}

function applyTokenBudget(nodes: DependencyNode[], budget: number): DependencyNode[] {
  let accumulated = 0;
  const pruned: DependencyNode[] = [];

  for (const node of nodes) {
    if (accumulated + node.tokenCount <= budget || node.depth === 0) {
      accumulated += node.tokenCount;
      pruned.push(node);
    } else {
      // Force skeletonize if not yet skeletonized to try fitting
      if (!node.isSkeleton) {
        node.processedContent = extractSkeleton(node.rawContent, node.absolutePath);
        node.isSkeleton = true;
        node.tokenCount = estimateTokens(node.processedContent);
      }
      if (accumulated + node.tokenCount <= budget) {
        accumulated += node.tokenCount;
        pruned.push(node);
      }
    }
  }

  return pruned;
}
