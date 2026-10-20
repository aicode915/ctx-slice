import ts from 'typescript';

/**
 * Extracts structural AST skeleton from TypeScript/JavaScript source code.
 * Preserves interfaces, types, enums, class/method signatures, and export statements.
 * Strips method/function bodies to save tokens while keeping structural comprehension.
 */
export function extractTypeScriptSkeleton(sourceText: string, fileName: string): string {
  const sourceFile = ts.createSourceFile(
    fileName,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    fileName.endsWith('.tsx') || fileName.endsWith('.jsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );

  const lines: string[] = [];

  function visit(node: ts.Node, indentLevel: number) {
    const indent = '  '.repeat(indentLevel);

    // 1. Preserve imports and exports
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node) || ts.isExportAssignment(node)) {
      lines.push(node.getText(sourceFile).trim());
      return;
    }

    // 2. Preserve Type Aliases and Interfaces in full
    if (ts.isTypeAliasDeclaration(node) || ts.isInterfaceDeclaration(node) || ts.isEnumDeclaration(node)) {
      lines.push(node.getText(sourceFile).trim());
      return;
    }

    // 3. Class Declarations
    if (ts.isClassDeclaration(node)) {
      const className = node.name ? node.name.text : 'AnonymousClass';
      const heritage = node.heritageClauses ? ' ' + node.heritageClauses.map(h => h.getText(sourceFile)).join(' ') : '';
      const isExport = node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword) ? 'export ' : '';
      const isDefault = node.modifiers?.some(m => m.kind === ts.SyntaxKind.DefaultKeyword) ? 'default ' : '';

      lines.push(`${indent}${isExport}${isDefault}class ${className}${heritage} {`);

      for (const member of node.members) {
        if (ts.isPropertyDeclaration(member)) {
          const mod = member.modifiers ? member.modifiers.map(m => m.getText(sourceFile)).join(' ') + ' ' : '';
          const name = member.name.getText(sourceFile);
          const type = member.type ? `: ${member.type.getText(sourceFile)}` : '';
          lines.push(`${indent}  ${mod}${name}${type};`);
        } else if (ts.isMethodDeclaration(member) || ts.isConstructorDeclaration(member)) {
          const mod = member.modifiers ? member.modifiers.map(m => m.getText(sourceFile)).join(' ') + ' ' : '';
          const name = ts.isConstructorDeclaration(member) ? 'constructor' : member.name.getText(sourceFile);
          const params = member.parameters.map(p => p.getText(sourceFile)).join(', ');
          const returnType = member.type ? `: ${member.type.getText(sourceFile)}` : '';
          lines.push(`${indent}  ${mod}${name}(${params})${returnType} { /* ... */ }`);
        }
      }
      lines.push(`${indent}}`);
      return;
    }

    // 4. Function Declarations
    if (ts.isFunctionDeclaration(node)) {
      const isExport = node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword) ? 'export ' : '';
      const isDefault = node.modifiers?.some(m => m.kind === ts.SyntaxKind.DefaultKeyword) ? 'default ' : '';
      const isAsync = node.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword) ? 'async ' : '';
      const fnName = node.name ? node.name.text : 'anonymous';
      const params = node.parameters.map(p => p.getText(sourceFile)).join(', ');
      const returnType = node.type ? `: ${node.type.getText(sourceFile)}` : '';

      lines.push(`${indent}${isExport}${isDefault}${isAsync}function ${fnName}(${params})${returnType} { /* omitted */ }`);
      return;
    }

    // 5. Const function exports (e.g. export const getUser = async (id: string) => { ... })
    if (ts.isVariableStatement(node)) {
      const isExport = node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword) ? 'export ' : '';
      for (const decl of node.declarationList.declarations) {
        const varName = decl.name.getText(sourceFile);
        if (decl.initializer && (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer))) {
          const fn = decl.initializer;
          const params = fn.parameters.map(p => p.getText(sourceFile)).join(', ');
          const returnType = fn.type ? `: ${fn.type.getText(sourceFile)}` : '';
          const isAsync = fn.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword) ? 'async ' : '';
          lines.push(`${indent}${isExport}const ${varName} = ${isAsync}(${params})${returnType} => { /* omitted */ };`);
        } else {
          const type = decl.type ? `: ${decl.type.getText(sourceFile)}` : '';
          lines.push(`${indent}${isExport}const ${varName}${type};`);
        }
      }
      return;
    }

    ts.forEachChild(node, child => visit(child, indentLevel));
  }

  visit(sourceFile, 0);

  const result = lines.join('\n');
  return result.trim().length > 0 ? result : sourceText;
}

/**
 * Extracts structural skeleton for Python source code.
 */
export function extractPythonSkeleton(sourceText: string): string {
  const lines = sourceText.split('\n');
  const result: string[] = [];
  let inFunction = false;
  let functionIndent = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    // Preserve imports and docstrings / comments
    if (trimmed.startsWith('import ') || trimmed.startsWith('from ')) {
      result.push(line);
      inFunction = false;
      continue;
    }

    // Class definition
    if (trimmed.startsWith('class ') && trimmed.endsWith(':')) {
      result.push(line);
      inFunction = false;
      continue;
    }

    // Function / method definition
    const match = line.match(/^(\s*)(def|async def)\s+([a-zA-Z0-9_]+)\((.*)\)(\s*->.*)?:$/);
    if (match) {
      result.push(line);
      result.push(`${match[1]}    ...`);
      inFunction = true;
      functionIndent = match[1].length;
      continue;
    }

    // If inside function, skip internal lines
    if (inFunction) {
      const currentIndent = line.search(/\S/);
      if (currentIndent > functionIndent) {
        continue; // skip function body
      } else if (trimmed.length > 0) {
        inFunction = false;
      }
    }

    if (!inFunction && (trimmed.startsWith('@') || /^[A-Z0-9_]+\s*[:=]/.test(trimmed))) {
      result.push(line);
    }
  }

  const output = result.join('\n');
  return output.trim().length > 0 ? output : sourceText;
}

export function extractSkeleton(sourceText: string, filePath: string): string {
  if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(filePath)) {
    return extractTypeScriptSkeleton(sourceText, filePath);
  }
  if (/\.py$/.test(filePath)) {
    return extractPythonSkeleton(sourceText);
  }
  return sourceText;
}
