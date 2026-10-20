import test from 'node:test';
import assert from 'node:assert';
import { extractImportSpecifiers, resolveImportPath } from '../dist/analyzer/resolver.js';
import { extractTypeScriptSkeleton, extractPythonSkeleton } from '../dist/skeleton/index.js';
import { estimateTokens } from '../dist/tokenizer/counter.js';

test('resolver: extracts ES imports, requires and dynamic imports', () => {
  const code = `
    import { UserService } from './services/user';
    import config from '../config.json';
    const auth = require('./auth');
    const dynamic = await import('./dynamic-module');
    import 'react';
  `;

  const specifiers = extractImportSpecifiers(code, 'src/index.ts');
  assert.ok(specifiers.includes('./services/user'));
  assert.ok(specifiers.includes('../config.json'));
  assert.ok(specifiers.includes('./auth'));
  assert.ok(specifiers.includes('./dynamic-module'));
  assert.ok(specifiers.includes('react'));
});

test('skeleton: strips TypeScript method bodies but retains interfaces and signatures', () => {
  const tsCode = `
    export interface User {
      id: string;
      name: string;
    }

    export class AuthService {
      private secret: string;

      constructor(secret: string) {
        this.secret = secret;
        console.log('init');
      }

      public async validateToken(token: string): Promise<boolean> {
        if (!token) return false;
        // heavy implementation logic
        return token === this.secret;
      }
    }

    export function hashPassword(pwd: string): string {
      const salt = 'xyz';
      return salt + pwd;
    }
  `;

  const skeleton = extractTypeScriptSkeleton(tsCode, 'auth.ts');

  // Interface must be preserved
  assert.ok(skeleton.includes('interface User'));
  assert.ok(skeleton.includes('id: string'));

  // Class and method signature preserved
  assert.ok(skeleton.includes('class AuthService'));
  assert.ok(skeleton.includes('validateToken(token: string): Promise<boolean>'));

  // Method bodies must be omitted
  assert.ok(!skeleton.includes('heavy implementation logic'));
  assert.ok(!skeleton.includes('salt + pwd'));
  assert.ok(skeleton.includes('/* ... */') || skeleton.includes('/* omitted */'));
});

test('skeleton: handles Python classes and function signatures', () => {
  const pyCode = `
from datetime import datetime
import os

class DatabaseConnection:
    def __init__(self, uri: str):
        self.uri = uri
        print("connecting...")

    def query(self, sql: str) -> list:
        # execute sql query
        return [{"id": 1}]

def calculate_metric(a: int, b: int) -> int:
    result = a * 2 + b
    return result
  `;

  const skeleton = extractPythonSkeleton(pyCode);
  assert.ok(skeleton.includes('class DatabaseConnection:'));
  assert.ok(skeleton.includes('def __init__'));
  assert.ok(skeleton.includes('def query'));
  assert.ok(skeleton.includes('def calculate_metric'));
  assert.ok(!skeleton.includes('execute sql query'));
  assert.ok(!skeleton.includes('result = a * 2 + b'));
});

test('tokenizer: estimates tokens realistically', () => {
  const text = 'function helloWorld(name: string) { return "Hello " + name; }';
  const tokens = estimateTokens(text);
  assert.ok(tokens > 5 && tokens < 25, `Expected reasonable token count, got ${tokens}`);
});
