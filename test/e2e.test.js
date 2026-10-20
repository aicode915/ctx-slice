import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { analyzeSlice } from '../dist/analyzer/index.js';

test('e2e: analyzeSlice traverses dependency tree and applies AST skeleton threshold', (t) => {
  const tmpDir = path.resolve('test/mock-project');
  fs.mkdirSync(path.join(tmpDir, 'src/models'), { recursive: true });

  // Depth 0: Entrypoint
  fs.writeFileSync(
    path.join(tmpDir, 'src/app.ts'),
    `import { UserController } from './user.controller';\nconsole.log(UserController);`
  );

  // Depth 1: Controller
  fs.writeFileSync(
    path.join(tmpDir, 'src/user.controller.ts'),
    `import { UserService } from './user.service';\nexport class UserController {\n  constructor(private s: UserService) {}\n}`
  );

  // Depth 2: Service
  fs.writeFileSync(
    path.join(tmpDir, 'src/user.service.ts'),
    `import { User } from './models/user';\nexport class UserService {\n  getUser(): User {\n    const x = 123;\n    return { id: 'u1', name: 'Alice' };\n  }\n}`
  );

  // Depth 3: Model
  fs.writeFileSync(
    path.join(tmpDir, 'src/models/user.ts'),
    `export interface User {\n  id: string;\n  name: string;\n}`
  );

  t.after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  const result = analyzeSlice({
    entryFiles: [path.join(tmpDir, 'src/app.ts')],
    skeletonDepth: 2, // Depth 2+ will become AST skeleton
    maxDepth: 5
  });

  assert.strictEqual(result.nodes.length, 4, 'Should trace all 4 dependency files');
  
  const appNode = result.nodes.find(n => n.filePath.endsWith('app.ts'));
  assert.ok(appNode);
  assert.strictEqual(appNode.depth, 0);
  assert.strictEqual(appNode.isSkeleton, false);

  const ctrlNode = result.nodes.find(n => n.filePath.endsWith('user.controller.ts'));
  assert.ok(ctrlNode);
  assert.strictEqual(ctrlNode.depth, 1);
  assert.strictEqual(ctrlNode.isSkeleton, false);

  const serviceNode = result.nodes.find(n => n.filePath.endsWith('user.service.ts'));
  assert.ok(serviceNode);
  assert.strictEqual(serviceNode.depth, 2);
  assert.strictEqual(serviceNode.isSkeleton, true, 'Depth 2 should be skeletonized');
  assert.ok(!serviceNode.processedContent.includes('const x = 123;'));

  assert.ok(result.topologyTree.includes('app.ts [ENTRY]'));
  assert.ok(result.topologyTree.includes('user.service.ts [SKELETON]'));
  assert.ok(result.formattedOutput.includes('# Codebase Context Slice'));
});
