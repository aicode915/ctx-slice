import { spawn } from 'node:child_process';

/**
 * Copy text to system clipboard across macOS, Linux, and Windows
 * without requiring heavy native dependencies.
 */
export function copyToClipboard(text: string): Promise<boolean> {
  return new Promise((resolve) => {
    let proc;
    if (process.platform === 'darwin') {
      proc = spawn('pbcopy');
    } else if (process.platform === 'win32') {
      proc = spawn('clip');
    } else {
      // Linux: try xclip or wl-copy
      proc = spawn('xclip', ['-selection', 'clipboard']);
    }

    proc.on('error', () => {
      resolve(false);
    });

    proc.on('close', (code) => {
      resolve(code === 0);
    });

    try {
      proc.stdin.write(text);
      proc.stdin.end();
    } catch {
      resolve(false);
    }
  });
}
