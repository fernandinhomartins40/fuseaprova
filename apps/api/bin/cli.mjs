#!/usr/bin/env node
// `pnpm --filter api cli <comando>`: usa o build (dist/cli.js) se existir; senão roda o
// código-fonte com tsx (desenvolvimento).
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const dist = fileURLToPath(new URL('../dist/cli.js', import.meta.url));
const fonte = fileURLToPath(new URL('../src/cli.ts', import.meta.url));
const comando = existsSync(dist)
  ? [process.execPath, [dist, ...args]]
  : [process.execPath, ['--conditions=@fuse/source', '--import', 'tsx', fonte, ...args]];
const filho = spawn(comando[0], comando[1], { stdio: 'inherit' });
filho.on('exit', (codigo) => process.exit(codigo ?? 1));
