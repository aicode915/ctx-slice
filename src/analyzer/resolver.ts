import fs from 'node:fs';
import path from 'node:path';

const JS_TS_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];
const PYTHON_EXTENSIONS = ['.py'];

/**
 * Resolves an import specifier to an absolute file path on disk.
 * Returns null if the import is an external package (e.g. 'react', 'lodash', 'fastapi').
 */
export function resolveImportPath(
  importSpecifier: string,
  containingFile: string,
  rootDir: string
): string | null {
  // Only resolve local relative or absolute imports
  if (!importSpecifier.startsWith('.') && !importSpecifier.startsWith('/')) {
    // Check if it's a tsconfig alias or relative to root?
    // If user has 'src/foo', check if exists relative to rootDir
    const rootRelative = path.resolve(rootDir, importSpecifier);
    const resolvedFromRoot = tryResolveExtensions(rootRelative);
    if (resolvedFromRoot) return resolvedFromRoot;
    
    // External npm or pip module, skip
    return null;
  }

  const containingDir = path.dirname(containingFile);
  const targetPath = path.resolve(containingDir, importSpecifier);

  return tryResolveExtensions(targetPath);
}

function tryResolveExtensions(basePath: string): string | null {
  // 1. Exact file match
  if (fs.existsSync(basePath) && fs.statSync(basePath).isFile()) {
    return basePath;
  }

  // 1.5 In NodeNext TypeScript ESM, code imports './foo.js' but the source file on disk is './foo.ts'
  if (basePath.endsWith('.js') || basePath.endsWith('.mjs')) {
    const withoutExt = basePath.replace(/\.(m)?js$/, '');
    for (const ext of ['.ts', '.tsx', '.mts']) {
      const tsPath = withoutExt + ext;
      if (fs.existsSync(tsPath) && fs.statSync(tsPath).isFile()) {
        return tsPath;
      }
    }
  }

  // 2. Try JS/TS extensions
  for (const ext of JS_TS_EXTENSIONS) {
    const withExt = basePath + ext;
    if (fs.existsSync(withExt) && fs.statSync(withExt).isFile()) {
      return withExt;
    }
  }

  // 3. Try Python extension
  for (const ext of PYTHON_EXTENSIONS) {
    const withExt = basePath + ext;
    if (fs.existsSync(withExt) && fs.statSync(withExt).isFile()) {
      return withExt;
    }
  }

  // 4. Try Directory index files (e.g. ./utils -> ./utils/index.ts)
  if (fs.existsSync(basePath) && fs.statSync(basePath).isDirectory()) {
    for (const ext of JS_TS_EXTENSIONS) {
      const indexFile = path.join(basePath, `index${ext}`);
      if (fs.existsSync(indexFile) && fs.statSync(indexFile).isFile()) {
        return indexFile;
      }
    }
    const pyInit = path.join(basePath, '__init__.py');
    if (fs.existsSync(pyInit) && fs.statSync(pyInit).isFile()) {
      return pyInit;
    }
  }

  return null;
}

/**
 * Extracts import and export specifiers from source code using fast static regex.
 */
export function extractImportSpecifiers(sourceText: string, filePath: string): string[] {
  const specifiers: Set<string> = new Set();

  if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(filePath)) {
    // 1. import ... from 'specifier'
    const importRegex = /(?:import|export)\s+(?:[\w*\s{},]*\s+from\s+)?['"]([^'"]+)['"]/g;
    let match: RegExpExecArray | null;
    while ((match = importRegex.exec(sourceText)) !== null) {
      if (match[1]) specifiers.add(match[1]);
    }

    // 2. require('specifier')
    const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    while ((match = requireRegex.exec(sourceText)) !== null) {
      if (match[1]) specifiers.add(match[1]);
    }

    // 3. dynamic import('specifier')
    const dynamicImportRegex = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    while ((match = dynamicImportRegex.exec(sourceText)) !== null) {
      if (match[1]) specifiers.add(match[1]);
    }
  } else if (/\.py$/.test(filePath)) {
    // from .foo import bar
    // from ..service.user import UserService
    const fromRegex = /from\s+([.\w]+)\s+import/g;
    let match: RegExpExecArray | null;
    while ((match = fromRegex.exec(sourceText)) !== null) {
      if (match[1]) {
        // Convert Python dot module to relative path
        const dots = match[1].match(/^\.+/)?.[0] || '';
        const rest = match[1].slice(dots.length).replace(/\./g, '/');
        const specifier = dots.length > 0 ? `${dots}${rest ? '/' + rest : ''}` : rest;
        specifiers.add(specifier);
      }
    }

    // import foo.bar
    const importRegex = /^import\s+([.\w]+)/gm;
    while ((match = importRegex.exec(sourceText)) !== null) {
      if (match[1]) {
        specifiers.add(match[1].replace(/\./g, '/'));
      }
    }
  }

  return Array.from(specifiers);
}
