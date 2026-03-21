import { makeScene2D, Rect, Txt, Layout, Node } from "@motion-canvas/2d";
import {
  all, chain, waitFor, createRef, createRefArray,
  easeOutCubic, easeInOutCubic, linear, loop, sequence, range,
} from "@motion-canvas/core";
import { colors, fonts, sizes } from "../theme";

/**
 * Scene: Typing code in the editor.
 * Shows Flyte Python code being typed character by character with a blinking cursor.
 */
export default makeScene2D(function* (view) {
  view.fill(colors.bg);

  const frame = createRef<Rect>();
  const cursor = createRef<Rect>();
  const codeContainer = createRef<Layout>();

  // The code we'll "type" (simplified Flyte pipeline)
  const codeLines = [
    { tokens: [{ t: "import", c: colors.keyword }, { t: " ", c: colors.plain }, { t: "asyncio", c: colors.variable }] },
    { tokens: [{ t: "import", c: colors.keyword }, { t: " ", c: colors.plain }, { t: "flyte", c: colors.variable }] },
    { tokens: [] }, // blank
    { tokens: [
      { t: "env", c: colors.variable }, { t: " = ", c: colors.plain },
      { t: "flyte", c: colors.variable }, { t: ".", c: colors.plain },
      { t: "TaskEnvironment", c: colors.type }, { t: "(", c: colors.plain },
    ]},
    { tokens: [
      { t: "    ", c: colors.plain },
      { t: "name", c: colors.parameter }, { t: "=", c: colors.plain },
      { t: '"data-processing"', c: colors.string }, { t: ",", c: colors.plain },
    ]},
    { tokens: [
      { t: "    ", c: colors.plain },
      { t: "image", c: colors.parameter }, { t: "=", c: colors.plain },
      { t: "Image", c: colors.type }, { t: ".", c: colors.plain },
      { t: "from_debian_base", c: colors.function }, { t: "()", c: colors.plain },
    ]},
    { tokens: [
      { t: "        .", c: colors.plain },
      { t: "with_pip_packages", c: colors.function },
      { t: "(", c: colors.plain },
      { t: '"pandas"', c: colors.string }, { t: ", ", c: colors.plain },
      { t: '"numpy"', c: colors.string },
      { t: ")", c: colors.plain }, { t: ",", c: colors.plain },
    ]},
    { tokens: [
      { t: "    ", c: colors.plain },
      { t: "resources", c: colors.parameter }, { t: "=", c: colors.plain },
      { t: "flyte", c: colors.variable }, { t: ".", c: colors.plain },
      { t: "Resources", c: colors.type },
      { t: "(", c: colors.plain },
      { t: "cpu", c: colors.parameter }, { t: "=", c: colors.plain },
      { t: "2", c: colors.number }, { t: ", ", c: colors.plain },
      { t: "memory", c: colors.parameter }, { t: "=", c: colors.plain },
      { t: '"4Gi"', c: colors.string },
      { t: ")", c: colors.plain },
    ]},
    { tokens: [{ t: ")", c: colors.plain }] },
    { tokens: [] }, // blank
    { tokens: [
      { t: "@env.task", c: colors.decorator }, { t: "(", c: colors.plain },
      { t: "retries", c: colors.parameter }, { t: "=", c: colors.plain },
      { t: "3", c: colors.number }, { t: ")", c: colors.plain },
    ]},
    { tokens: [
      { t: "async", c: colors.keyword }, { t: " ", c: colors.plain },
      { t: "def", c: colors.keyword }, { t: " ", c: colors.plain },
      { t: "fetch_dataset", c: colors.function },
      { t: "(", c: colors.plain },
      { t: "source", c: colors.parameter }, { t: ": ", c: colors.plain },
      { t: "str", c: colors.type },
      { t: ") -> ", c: colors.plain },
      { t: "pd.DataFrame", c: colors.type }, { t: ":", c: colors.plain },
    ]},
    { tokens: [
      { t: "    ", c: colors.plain },
      { t: "# Fetch and validate input data", c: colors.comment },
    ]},
    { tokens: [
      { t: "    ", c: colors.plain },
      { t: "df", c: colors.variable }, { t: " = ", c: colors.plain },
      { t: "await", c: colors.keyword }, { t: " ", c: colors.plain },
      { t: "load_from_s3", c: colors.function }, { t: "(", c: colors.plain },
      { t: "source", c: colors.variable }, { t: ")", c: colors.plain },
    ]},
    { tokens: [
      { t: "    ", c: colors.plain },
      { t: "return", c: colors.keyword }, { t: " ", c: colors.plain },
      { t: "df", c: colors.variable },
    ]},
  ];

  // VS Code frame
  view.add(
    <Rect
      ref={frame}
      width={1100}
      height={650}
      radius={8}
      clip
      fill={colors.editorBg}
      shadowColor={"rgba(0,0,0,0.6)"}
      shadowBlur={50}
      shadowOffsetY={12}
      opacity={0}
      scale={0.95}
    >
      {/* Title bar */}
      <Rect width={1100} height={30} fill={colors.titleBarBg} y={-310}>
        <Layout direction="row" gap={8} x={-530} alignItems="center">
          <Rect width={12} height={12} radius={6} fill="#ff5f57" />
          <Rect width={12} height={12} radius={6} fill="#febc2e" />
          <Rect width={12} height={12} radius={6} fill="#28c840" />
        </Layout>
        <Txt text="pipeline.py - Flyte VS Code" fill={colors.dimWhite} fontSize={12} fontFamily={fonts.ui} />
      </Rect>

      {/* Tab bar */}
      <Rect width={1100} height={35} fill={colors.tabBg} y={-277.5}>
        <Rect width={130} height={35} fill={colors.tabActiveBg} x={-485}>
          <Txt text="pipeline.py" fill={colors.white} fontSize={12} fontFamily={fonts.ui} />
        </Rect>
      </Rect>

      {/* Status bar */}
      <Rect width={1100} height={22} fill={colors.statusBarBg} y={314}>
        <Txt text="Flyte" fill={colors.statusBarFg} fontSize={11} fontFamily={fonts.ui} fontWeight={600} x={-520} />
        <Txt text="Python 3.11" fill={colors.statusBarFg} fontSize={11} fontFamily={fonts.ui} x={480} />
      </Rect>

      {/* Code area */}
      <Layout ref={codeContainer} direction="column" x={-350} y={-230} gap={0} />
    </Rect>,
  );

  // Blinking cursor
  view.add(
    <Rect ref={cursor} width={2} height={18} fill={colors.cursorFg} opacity={0} />,
  );

  // Fade in the frame
  yield* all(
    frame().opacity(1, 0.5, easeOutCubic),
    frame().scale(1, 0.5, easeOutCubic),
  );

  yield* waitFor(0.3);

  // Type code line by line
  const baseX = -350;
  const baseY = -230;

  for (let lineIdx = 0; lineIdx < codeLines.length; lineIdx++) {
    const line = codeLines[lineIdx];
    const lineY = baseY + lineIdx * sizes.lineHeight;

    // Line number
    const lineNum = createRef<Txt>();
    frame().add(
      <Txt
        ref={lineNum}
        text={`${lineIdx + 1}`}
        fill={colors.lineNumberFg}
        fontSize={sizes.fontSize}
        fontFamily={fonts.mono}
        x={-510}
        y={lineY}
        textAlign="right"
        width={30}
        opacity={0}
      />,
    );
    yield* lineNum().opacity(0.7, 0.05);

    if (line.tokens.length === 0) {
      // Empty line, just skip
      continue;
    }

    // Type each token
    let charX = baseX;
    for (const token of line.tokens) {
      const tokenRef = createRef<Txt>();
      frame().add(
        <Txt
          ref={tokenRef}
          text={token.t}
          fill={token.c}
          fontSize={sizes.fontSize}
          fontFamily={fonts.mono}
          x={charX + (token.t.length * 8.4) / 2}
          y={lineY}
          opacity={0}
        />,
      );
      // Quick "type" reveal
      yield* tokenRef().opacity(1, 0.03);
      charX += token.t.length * 8.4;
    }

    // Small delay between lines for typing effect
    yield* waitFor(0.06);
  }

  yield* waitFor(1);

  // Zoom into the TaskEnvironment section
  yield* all(
    frame().scale(1.6, 1, easeInOutCubic),
    frame().position.y(180, 1, easeInOutCubic),
    frame().position.x(200, 1, easeInOutCubic),
  );

  yield* waitFor(1.2);

  // Zoom back out
  yield* all(
    frame().scale(1, 0.8, easeInOutCubic),
    frame().position.y(0, 0.8, easeInOutCubic),
    frame().position.x(0, 0.8, easeInOutCubic),
  );

  yield* waitFor(0.5);

  // Fade out
  yield* frame().opacity(0, 0.4);
});
