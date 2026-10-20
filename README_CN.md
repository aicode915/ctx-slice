<div align="center">

```
  ╔═╗╔╦╗═╗ ╦  ╔═╗╦  ╦╔═╗╔═╗
  ║   ║ ╔╩╦╝  ╚═╗║  ║║  ╠═╝
  ╚═╝ ╩ ╩ ╚═  ╚═╝╩═╝╩╚═╝╩═╝
```

# ctx-slice

**专为大模型设计的代码上下文智能切片与依赖打包工具。只喂依赖链路，不喂臃肿仓库。**

[![npm version](https://img.shields.io/npm/v/ctx-slice?color=blue&style=flat-square)](https://www.npmjs.com/package/ctx-slice)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen?style=flat-square)](https://nodejs.org)

[English](./README.md) • [简体中文](./README_CN.md)

</div>

---

## ⚡ 痛点背景

当我们让 Claude 3.7、Cursor、ChatGPT 或 DeepSeek 帮我们修改某个特定模块的 Bug 或重构代码时：

1. **Repomix 等全库打包工具噪音太大**：一股脑打包几十甚至上百个文件，动辄突破 100k+ Tokens，费用昂贵，并且导致大模型注意力稀释（Lost in the middle）甚至频繁幻觉。
2. **人工手动复制代码极其繁琐**：每次修改一个接口，需要手动去找引入的 Model、Service、Utils，稍有遗漏，大模型就因为缺乏接口定义而报错或胡乱猜测。
3. **深层依赖冗余**：底层的工具方法和类型，大模型往往**只需要看它的 Interface 定义和函数签名**，根本不需要看几百行具体的循环实现。

## 💡 解决方案：`ctx-slice`

`ctx-slice` 以你指定的**目标文件**为入口，**顺着 AST 静态导入依赖图顺藤摸瓜**，递归提取所有相关的本地依赖代码，并做智能分层处理：

- 🎯 **精准调用链切片**：只遍历与目标模块直接或间接相关的代码文件。
- 🧩 **AST 智能骨架提取**：核心文件保留完整源码；深层依赖（如 depth >= 2）自动抽离内部实现细节，仅保留 class、interface、type 和函数签名。
- 📉 **节省 60%~80% Token 消耗**：极大压缩 Prompt 大小，减少 API 费用并显著提升模型回答质量。
- 📋 **极简系统剪贴板**：加上 `-c` 参数，生成的高质量结构化上下文直接写入系统剪贴板，秒贴进 Claude / Cursor。

---

## 📊 与现有方案对比

| 功能特性 | 手动逐个复制 | Repomix (全库打包) | `ctx-slice` 🚀 |
| :--- | :---: | :---: | :---: |
| **上下文范围** | 易遗漏关联定义 | 整个项目（充满无关干扰） | **精确的依赖子图** |
| **Token 效率** | 依赖不全 | 昂贵（100k+ Tokens） | **极致优化（节省 60%–80%）** |
| **深层间接依赖** | 往往漏掉 | 全量硬拼 | **AST 骨架 / 仅保留签名与类型** |
| **依赖拓扑图** | ❌ 无 | 文件平铺列表 | **直观 ASCII 依赖树** |
| **上手门槛** | 耗时费力 | 需要配置文件 | **单命令开箱即用 (`npx ctx-slice`)** |

---

## 🚀 极速上手

无需安装，使用 `npx` 直接运行：

```bash
# 切片指定模块并直接复制到系统剪贴板
npx ctx-slice src/controllers/user.controller.ts -c
```

或者全局安装：

```bash
npm install -g ctx-slice
```

---

## 🛠 常见用法

### 1. 基础依赖切片并复制到剪贴板
```bash
ctx-slice src/services/billing.ts -c
```

### 2. 仅预览依赖调用拓扑图
```bash
ctx-slice src/index.ts --tree-only
```
输出效果：
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

### 3. 输出为 Claude 推荐的 XML 格式并保存到文件
```bash
ctx-slice src/routes/auth.ts -f xml -o prompt_context.xml
```

### 4. 限制 Token 预算（超标自动加深骨架化）
```bash
ctx-slice src/app.ts --budget 8000 -o context.md
```

---

## ⚙️ 命令行参数

```text
用法: ctx-slice <entry-files...> [选项]

参数:
  entry-files                     一个或多个需要追踪分析的入口文件路径

选项:
  -d, --depth <number>            最大递归追踪依赖深度 (默认: 5)
  -s, --skeleton-depth <number>   触发 AST 骨架化的深度阈值 (默认: 2)
  -b, --budget <number>           目标 Token 预算上限
  -f, --format <format>           输出格式: markdown, xml, json (默认: "markdown")
  -o, --output <file>             保存输出文件路径
  -c, --clip                      直接复制到系统剪贴板
  --tree-only                     仅打印依赖拓扑树
  -h, --help                      显示帮助信息
```

---

## 📄 开源许可证

[MIT](./LICENSE) © 2026 ctx-slice contributors.
