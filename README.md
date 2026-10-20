<div align="center">

```
  ╔═╗╔╦╗═╗ ╦  ╔═╗╦  ╦╔═╗╔═╗
  ║   ║ ╔╩╦╝  ╚═╗║  ║║  ╠═╝
  ╚═╝ ╩ ╩ ╚═  ╚═╝╩═╝╩╚═╝╩═╝
```

# ctx-slice

**Smart Code Slicer for LLMs. Pack dependency trees, not whole repositories.**

[![npm version](https://img.shields.io/npm/v/ctx-slice?color=blue&style=flat-square)](https://www.npmjs.com/package/ctx-slice)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen?style=flat-square)](https://nodejs.org)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)

[English](./README.md) • [简体中文](./README_CN.md)

</div>

---

## ⚡ The Problem

When asking LLMs (Claude 3.7 / 3.5 Sonnet, Cursor, ChatGPT, DeepSeek) to refactor a feature or fix a bug in your project:

1. **Repomix / Full-repo packers are too noisy**: Dumping the entire project costs 100k+ tokens, causes model hallucinations, and triggers the *"Lost in the Middle"* attention degradation.
2. **Manual file-copying is painful**: You inevitably miss underlying interfaces, utility methods, or dependent service signatures.
3. **Token waste**: Deep transitive dependencies usually only need their **type definitions and function signatures**, not 500 lines of internal loop implementations.

## 💡 The Solution: `ctx-slice`

`ctx-slice` starts from your **target entry file** (e.g., `src/routes/user.ts`), automatically walks the local AST import graph, builds an execution dependency tree, and produces an AI-ready context bundle:

- 🎯 **Pinpoint Dependency Tracing**: Only traverses files strictly reachable from your target module.
- 🧩 **Smart AST Skeletonization**: Automatically preserves full implementations for target entry files, while stripping function bodies from deep transitive dependencies (keeping types, classes, interfaces, and signatures intact).
- 📉 **Saves 60%~80% Tokens**: Reduces token consumption dramatically without losing semantic context.
- 📋 **Zero-friction Clipboard**: One flag (`-c`) copies the structured context directly to your OS clipboard.

---

## 📊 Feature Comparison

| Feature | Manual Copying | Repomix / Whole-Repo | `ctx-slice` 🚀 |
| :--- | :---: | :---: | :---: |
| **Context Scope** | Incomplete / Tedious | Entire Repository (Noisy) | **Precise Reachable Subgraph** |
| **Token Efficiency** | High (but lacks context) | Poor (100k+ tokens) | **Optimal (Saves 60%–80%)** |
| **Deep Dependencies** | Often forgotten | Full source dumped | **AST Skeleton / Types Only** |
| **Visual Topology** | ❌ None | Flat / File list | **ASCII Dependency Graph** |
| **Setup Overhead** | Manual | Config file | **Zero-Config (`npx ctx-slice`)** |

---

## 🚀 Quick Start

Run instantly with `npx` (no installation required):

```bash
# Slice a module and copy LLM-ready context to your clipboard
npx ctx-slice src/controllers/user.controller.ts -c
```

Or install globally:

```bash
npm install -g ctx-slice
```

---

## 🛠 Usage Examples

### 1. Basic Slice with Clipboard Copy
Trace from an entry point, convert level 2+ dependencies into AST skeletons, and copy output:
```bash
ctx-slice src/services/billing.ts -c
```

### 2. Inspect Dependency Tree Only
Quickly preview reachable local files before generating context:
```bash
ctx-slice src/index.ts --tree-only
```

Output:
```text
Dependency Topology:
└── src/cli.ts [ENTRY]
    ├── src/analyzer/index.ts [FULL]
    │   ├── src/types.ts [FULL]
    │   ├── src/analyzer/resolver.ts [SKELETON]
    │   ├── src/skeleton/index.ts [SKELETON]
    │   └── src/formatter/index.ts [SKELETON]
    └── src/tokenizer/counter.ts [FULL]
```

### 3. Save to File with Claude/XML Format
```bash
ctx-slice src/routes/auth.ts -f xml -o prompt_context.xml
```

### 4. Enforce a Token Budget
Ensure the total context does not exceed your target limit:
```bash
ctx-slice src/app.ts --budget 8000 -o context.md
```

---

## ⚙️ CLI Options

```text
Usage: ctx-slice <entry-files...> [options]

Arguments:
  entry-files                     One or more entry files to trace from

Options:
  -d, --depth <number>            Maximum dependency traversal depth (default: 5)
  -s, --skeleton-depth <number>   Depth to start converting to AST skeletons (default: 2)
  -b, --budget <number>           Target token budget cap
  -f, --format <format>           Output format: markdown, xml, json (default: "markdown")
  -o, --output <file>             Save context slice to an output file
  -c, --clip                      Copy formatted context directly to system clipboard
  --tree-only                     Print only the dependency topology tree
  -h, --help                      Display help for command
```

---

## 💻 Programmatic API

You can also integrate `ctx-slice` into your own AI Agent pipelines or CI scripts:

```typescript
import { analyzeSlice } from 'ctx-slice';

const result = analyzeSlice({
  entryFiles: ['src/api/payment.ts'],
  skeletonDepth: 2,
  format: 'markdown'
});

console.log(result.totalTokens);      // 1850
console.log(result.savedPercentage);  // 72 (%)
console.log(result.formattedOutput);  // Formatted markdown string
```

---

## 🗺 Roadmap

- [x] TypeScript & JavaScript ESM/CommonJS AST import tracing
- [x] Python module resolution and signature skeletonization
- [x] Smart Token estimation & budget enforcement
- [x] Cross-platform native clipboard integration
- [ ] Go (`import`) and Rust (`mod` / `use`) dependency resolution
- [ ] MCP (Model Context Protocol) Server extension (`ctx-slice/mcp`)
- [ ] Interactive terminal TUI explorer

---

## 🤝 Contributing

Contributions are warmly welcome! Please check out our [Contributing Guidelines](./CONTRIBUTING.md) to get started.

```bash
git clone https://github.com/aicode915/ctx-slice.git
cd ctx-slice
npm install
npm test
```

## 📄 License

[MIT](./LICENSE) © 2026 ctx-slice contributors.
