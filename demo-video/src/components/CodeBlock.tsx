import { Layout, Rect, Txt, Node } from "@motion-canvas/2d";
import { colors, fonts, sizes } from "../theme";

export interface Token {
  text: string;
  color: string;
}

export type CodeLine = Token[];

/**
 * Renders syntax-highlighted code lines with line numbers.
 */
export function CodeBlock({
  lines,
  x = 0,
  y = 0,
  startLine = 1,
  opacity = 1,
}: {
  lines: CodeLine[];
  x?: number;
  y?: number;
  startLine?: number;
  opacity?: number;
}) {
  return (
    <Layout direction="column" x={x} y={y} opacity={opacity}>
      {lines.map((tokens, i) => (
        <Layout direction="row" height={sizes.lineHeight} alignItems="center" key={`line-${i}`}>
          {/* Line number */}
          <Txt
            text={`${startLine + i}`}
            fill={colors.lineNumberFg}
            fontSize={sizes.fontSize}
            fontFamily={fonts.mono}
            width={40}
            textAlign="right"
            marginRight={16}
          />
          {/* Tokens */}
          {tokens.map((token, j) => (
            <Txt
              key={`token-${i}-${j}`}
              text={token.text}
              fill={token.color}
              fontSize={sizes.fontSize}
              fontFamily={fonts.mono}
            />
          ))}
        </Layout>
      ))}
    </Layout>
  );
}

// Helper to build tokens quickly
export const t = (text: string, color: string): Token => ({ text, color });

// Common token builders
export const kw = (text: string) => t(text, colors.keyword);
export const fn = (text: string) => t(text, colors.function);
export const str = (text: string) => t(text, colors.string);
export const num = (text: string) => t(text, colors.number);
export const typ = (text: string) => t(text, colors.type);
export const vr = (text: string) => t(text, colors.variable);
export const op = (text: string) => t(text, colors.operator);
export const cm = (text: string) => t(text, colors.comment);
export const dec = (text: string) => t(text, colors.decorator);
export const bl = (text: string) => t(text, colors.builtin);
export const pl = (text: string) => t(text, colors.plain);
