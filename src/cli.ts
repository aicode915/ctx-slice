#!/usr/bin/env node
import { Command } from 'commander';
import pc from 'picocolors';
import fs from 'node:fs';
import path from 'node:path';
import { analyzeSlice } from './analyzer/index.js';
import { formatTokenCount } from './tokenizer/counter.js';
import { copyToClipboard } from './clipboard.js';
import { OutputFormat } from './types.js';

const program = new Command();

program
  .name('ctx-slice')
  .description('Smart Code Slicer for LLMs. Pack dependency trees, not whole repositories.')
  .version('0.1.1')
  .argument('<entry-files...>', 'One or more entry file paths to trace (e.g. src/index.ts)')
  .option('-d, --depth <number>', 'Maximum dependency traversal depth', '5')
  .option('-s, --skeleton-depth <number>', 'Depth threshold to convert dependencies to AST skeletons', '2')
  .option('-b, --budget <number>', 'Target token budget cap', undefined)
  .option('-f, --format <format>', 'Output format: markdown, xml, json', 'markdown')
  .option('-o, --output <file>', 'Save context slice to an output file')
  .option('-c, --clip', 'Copy formatted context directly to system clipboard', false)
  .option('--tree-only', 'Print only the dependency topology tree', false)
  .option('--no-color', 'Disable colored output')
  .action(async (entryFiles: string[], opts) => {
    try {
      printBanner();

      const maxDepth = parseInt(opts.depth, 10);
      const skeletonDepth = parseInt(opts.skeletonDepth, 10);
      const budgetTokens = opts.budget ? parseInt(opts.budget, 10) : undefined;
      const format = opts.format.toLowerCase() as OutputFormat;

      console.log(pc.cyan(`⚡ Tracing dependency graph from ${pc.bold(entryFiles.join(', '))}...`));

      const startTime = Date.now();
      const result = analyzeSlice({
        entryFiles,
        maxDepth,
        skeletonDepth,
        budgetTokens,
        format
      });
      const elapsed = Date.now() - startTime;

      if (opts.treeOnly) {
        console.log('\n' + pc.bold(result.topologyTree) + '\n');
        return;
      }

      // Print Summary Card
      console.log('\n' + pc.bold(pc.green('✔ Dependency slice resolved successfully!')));
      console.log(pc.gray('─'.repeat(54)));
      console.log(`  📂 Files sliced:       ${pc.bold(pc.white(result.nodes.length.toString()))}`);
      console.log(`  🧠 Token estimate:     ${pc.bold(pc.cyan(formatTokenCount(result.totalTokens)))} tokens`);
      if (result.savedPercentage > 0) {
        console.log(`  💎 Token savings:      ${pc.bold(pc.green(`${result.savedPercentage}% saved`))} (${formatTokenCount(result.savedTokens)} tokens saved via AST skeletonization)`);
      }
      console.log(`  ⏱  Analysis time:      ${pc.gray(`${elapsed}ms`)}`);
      console.log(pc.gray('─'.repeat(54)));

      // Handle Output destination
      if (opts.output) {
        const outPath = path.resolve(process.cwd(), opts.output);
        fs.writeFileSync(outPath, result.formattedOutput, 'utf-8');
        console.log(pc.green(`💾 Saved sliced context to: ${pc.bold(outPath)}`));
      }

      if (opts.clip) {
        const copied = await copyToClipboard(result.formattedOutput);
        if (copied) {
          console.log(pc.yellow('📋 Copied context to clipboard! Ready to paste into Claude/Cursor.'));
        } else {
          console.log(pc.red('✖ Failed to copy to clipboard automatically.'));
        }
      }

      // If neither -o nor -c was specified, print to stdout
      if (!opts.output && !opts.clip) {
        console.log('\n' + result.formattedOutput);
      }

    } catch (err: any) {
      console.error(pc.red(`\n✖ Error: ${err.message}`));
      process.exit(1);
    }
  });

function printBanner() {
  console.log(
    pc.magenta(
      `\n  ╔═╗╔╦╗═╗ ╦  ╔═╗╦  ╦╔═╗╔═╗\n  ║   ║ ╔╩╦╝  ╚═╗║  ║║  ╠═╝\n  ╚═╝ ╩ ╩ ╚═  ╚═╝╩═╝╩╚═╝╩═╝`
    ) +
    pc.gray('  v0.1.1\n') +
    pc.dim('  Smart Code Slicer for LLMs • Pack trees, not repos.\n')
  );
}

program.parse(process.argv);
