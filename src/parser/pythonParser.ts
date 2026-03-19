import * as path from 'path';
import { Parser, Language } from 'web-tree-sitter';

let parser: Parser | null = null;
let language: Language | null = null;

export async function initParser(extensionPath: string): Promise<void> {
  if (parser) return;

  await Parser.init();

  parser = new Parser();
  const wasmPath = path.join(extensionPath, 'dist', 'tree-sitter-python.wasm');
  language = await Language.load(wasmPath);
  parser.setLanguage(language);
}

export function parseSource(source: string): ReturnType<Parser['parse']> | null {
  if (!parser) return null;
  return parser.parse(source);
}

export function getLanguage(): Language | null {
  return language;
}

export function isParserReady(): boolean {
  return parser !== null;
}
