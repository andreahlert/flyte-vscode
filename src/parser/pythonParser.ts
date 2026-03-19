import * as path from 'path';
import * as fs from 'fs';
import * as TreeSitter from 'web-tree-sitter';

let parser: any = null;
let language: any = null;

export async function initParser(extensionPath: string): Promise<void> {
  if (parser) return;

  const treeSitterWasm = path.join(extensionPath, 'dist', 'tree-sitter.wasm');
  const pythonWasm = path.join(extensionPath, 'dist', 'tree-sitter-python.wasm');

  if (!fs.existsSync(treeSitterWasm)) {
    throw new Error(`tree-sitter.wasm not found at ${treeSitterWasm}`);
  }
  if (!fs.existsSync(pythonWasm)) {
    throw new Error(`tree-sitter-python.wasm not found at ${pythonWasm}`);
  }

  // web-tree-sitter 0.26 exports { Parser, Language } as named exports
  const mod = TreeSitter as any;
  const Parser = mod.Parser ?? mod.default?.Parser ?? mod;
  const Language = mod.Language ?? mod.default?.Language ?? Parser.Language;

  await Parser.init({
    locateFile: () => treeSitterWasm,
  });

  parser = new Parser();
  language = await Language.load(pythonWasm);
  parser.setLanguage(language);
}

export function parseSource(source: string): any | null {
  if (!parser) return null;
  return parser.parse(source);
}

export function getLanguage(): any | null {
  return language;
}

export function isParserReady(): boolean {
  return parser !== null;
}
