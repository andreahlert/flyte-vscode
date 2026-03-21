import { makeScene2D, Rect, Txt, Layout } from "@motion-canvas/2d";
import {
  all, waitFor, createRef,
  easeOutCubic, easeInOutCubic, easeOutBack,
} from "@motion-canvas/core";
import { colors, fonts, sizes } from "../theme";

/**
 * Scene: CodeLens "Run Task" and "Graph" buttons above task functions.
 */
export default makeScene2D(function* (view) {
  view.fill(colors.bg);

  const frame = createRef<Rect>();
  const codeLensRun = createRef<Layout>();
  const codeLensGraph = createRef<Layout>();
  const runClickGlow = createRef<Rect>();
  const terminalPanel = createRef<Rect>();

  view.add(
    <Rect
      ref={frame}
      width={1100}
      height={650}
      radius={8}
      clip={false}
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
      <Rect width={1100} height={35} fill={colors.tabBg} y={-277.5}>
        <Rect width={130} height={35} fill={colors.tabActiveBg} x={-485}>
          <Txt text="pipeline.py" fill={colors.white} fontSize={12} fontFamily={fonts.ui} />
        </Rect>
      </Rect>
      <Rect width={1100} height={22} fill={colors.statusBarBg} y={314}>
        <Txt text="Flyte" fill={colors.statusBarFg} fontSize={11} fontFamily={fonts.ui} fontWeight={600} x={-520} />
      </Rect>
    </Rect>,
  );

  const baseX = -320;
  const baseY = -100;

  // CodeLens line (above decorator)
  frame().add(
    <Layout ref={codeLensRun} direction="row" gap={12} x={baseX + 20} y={baseY - 12} opacity={0}>
      <Txt text="Run Task" fill={colors.codeLensFg} fontSize={12} fontFamily={fonts.mono} textDecoration="underline" />
      <Txt text="|" fill={colors.border} fontSize={12} fontFamily={fonts.mono} />
      <Txt text="Graph" fill={colors.codeLensFg} fontSize={12} fontFamily={fonts.mono} textDecoration="underline" />
    </Layout>,
  );

  // Click glow effect
  frame().add(
    <Rect
      ref={runClickGlow}
      width={70}
      height={20}
      fill={colors.accent}
      radius={4}
      x={baseX + 34}
      y={baseY - 12}
      opacity={0}
    />,
  );

  // Code lines
  const codeLines = [
    [
      { t: "@env.task", c: colors.decorator },
      { t: "(", c: colors.plain },
      { t: "retries", c: colors.parameter },
      { t: "=", c: colors.plain },
      { t: "3", c: colors.number },
      { t: ")", c: colors.plain },
    ],
    [
      { t: "async", c: colors.keyword },
      { t: " ", c: colors.plain },
      { t: "def", c: colors.keyword },
      { t: " ", c: colors.plain },
      { t: "fetch_dataset", c: colors.function },
      { t: "(", c: colors.plain },
      { t: "source", c: colors.parameter },
      { t: ": ", c: colors.plain },
      { t: "str", c: colors.type },
      { t: "):", c: colors.plain },
    ],
    [
      { t: "    ", c: colors.plain },
      { t: "df", c: colors.variable },
      { t: " = ", c: colors.plain },
      { t: "await", c: colors.keyword },
      { t: " ", c: colors.plain },
      { t: "load_from_s3", c: colors.function },
      { t: "(", c: colors.plain },
      { t: "source", c: colors.variable },
      { t: ")", c: colors.plain },
    ],
    [
      { t: "    ", c: colors.plain },
      { t: "return", c: colors.keyword },
      { t: " ", c: colors.plain },
      { t: "df", c: colors.variable },
    ],
    [], // blank
    // Second task with its own CodeLens
    [
      { t: "@env.task", c: colors.decorator },
    ],
    [
      { t: "async", c: colors.keyword },
      { t: " ", c: colors.plain },
      { t: "def", c: colors.keyword },
      { t: " ", c: colors.plain },
      { t: "train_model", c: colors.function },
      { t: "(", c: colors.plain },
      { t: "data", c: colors.parameter },
      { t: ": ", c: colors.plain },
      { t: "pd.DataFrame", c: colors.type },
      { t: "):", c: colors.plain },
    ],
    [
      { t: "    ", c: colors.plain },
      { t: "...", c: colors.plain },
    ],
  ];

  // Second CodeLens
  const codeLens2 = createRef<Layout>();
  const codeLens2Y = baseY + 5 * sizes.lineHeight - 12;
  frame().add(
    <Layout ref={codeLens2} direction="row" gap={12} x={baseX + 20} y={codeLens2Y} opacity={0}>
      <Txt text="Run Task" fill={colors.codeLensFg} fontSize={12} fontFamily={fonts.mono} textDecoration="underline" />
      <Txt text="|" fill={colors.border} fontSize={12} fontFamily={fonts.mono} />
      <Txt text="Graph" fill={colors.codeLensFg} fontSize={12} fontFamily={fonts.mono} textDecoration="underline" />
    </Layout>,
  );

  for (let li = 0; li < codeLines.length; li++) {
    const y = baseY + li * sizes.lineHeight;
    let x = baseX;

    frame().add(
      <Txt
        text={`${li + 8}`}
        fill={colors.lineNumberFg}
        fontSize={sizes.fontSize}
        fontFamily={fonts.mono}
        x={-480}
        y={y}
        textAlign="right"
        width={30}
      />,
    );

    for (const tok of codeLines[li]) {
      frame().add(
        <Txt
          text={tok.t}
          fill={tok.c}
          fontSize={sizes.fontSize}
          fontFamily={fonts.mono}
          x={x + (tok.t.length * 8.4) / 2}
          y={y}
        />,
      );
      x += tok.t.length * 8.4;
    }
  }

  // Terminal panel (appears when "Run Task" is clicked)
  frame().add(
    <Rect
      ref={terminalPanel}
      width={1098}
      height={160}
      fill={"#1a1a1a"}
      stroke={colors.border}
      lineWidth={1}
      y={240}
      opacity={0}
    >
      <Txt text="TERMINAL" fill={colors.lineNumberFg} fontSize={11} fontFamily={fonts.ui} x={-500} y={-65} fontWeight={600} />
      <Layout direction="column" gap={4} x={-480} y={-25} width={900}>
        <Txt text="$ flyte run pipeline.py fetch_dataset" fill={colors.flyteTeal} fontSize={12} fontFamily={fonts.mono} />
        <Txt text="Running fetch_dataset locally..." fill={colors.dimWhite} fontSize={12} fontFamily={fonts.mono} />
        <Txt text="[OK] Task completed in 2.3s" fill={"#4ec9b0"} fontSize={12} fontFamily={fonts.mono} />
      </Layout>
    </Rect>,
  );

  // Animate
  yield* all(
    frame().opacity(1, 0.5, easeOutCubic),
    frame().scale(1, 0.5, easeOutCubic),
  );

  yield* waitFor(0.4);

  // Show CodeLens buttons (fade in above the tasks)
  yield* all(
    codeLensRun().opacity(1, 0.4, easeOutCubic),
    codeLens2().opacity(1, 0.4, easeOutCubic),
  );

  yield* waitFor(0.8);

  // Zoom into first CodeLens
  yield* all(
    frame().scale(2, 0.8, easeInOutCubic),
    frame().position.y(80, 0.8, easeInOutCubic),
    frame().position.x(180, 0.8, easeInOutCubic),
  );

  yield* waitFor(0.5);

  // "Click" Run Task (glow effect)
  yield* runClickGlow().opacity(0.3, 0.1);
  yield* runClickGlow().opacity(0, 0.3);

  yield* waitFor(0.3);

  // Zoom back and show terminal
  yield* all(
    frame().scale(1, 0.6, easeInOutCubic),
    frame().position.y(-40, 0.6, easeInOutCubic),
    frame().position.x(0, 0.6, easeInOutCubic),
  );

  yield* terminalPanel().opacity(1, 0.4, easeOutCubic);

  yield* waitFor(1.5);

  yield* frame().opacity(0, 0.4);
});
