import { makeScene2D, Rect, Txt, Layout } from "@motion-canvas/2d";
import {
  all, waitFor, createRef,
  easeOutCubic, easeInOutCubic, easeOutBack,
} from "@motion-canvas/core";
import { colors, fonts, sizes } from "../theme";

/**
 * Scene: Hover documentation.
 * Shows cursor hovering over Flyte types and a rich tooltip appearing.
 */
export default makeScene2D(function* (view) {
  view.fill(colors.bg);

  const frame = createRef<Rect>();
  const hoverTooltip = createRef<Rect>();
  const hoverHighlight = createRef<Rect>();

  // Code that's already written
  const lines = [
    [
      { t: "@env.task", c: colors.decorator },
      { t: "(", c: colors.plain },
      { t: "retries", c: colors.parameter },
      { t: "=", c: colors.plain },
      { t: "3", c: colors.number },
      { t: ", ", c: colors.plain },
      { t: "timeout", c: colors.parameter },
      { t: "=", c: colors.plain },
      { t: '"1h"', c: colors.string },
      { t: ")", c: colors.plain },
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
      { t: "model", c: colors.variable },
      { t: " = ", c: colors.plain },
      { t: "await", c: colors.keyword },
      { t: " ", c: colors.plain },
      { t: "train", c: colors.function },
      { t: "(", c: colors.plain },
      { t: "data", c: colors.variable },
      { t: ")", c: colors.plain },
    ],
    [
      { t: "    ", c: colors.plain },
      { t: "return", c: colors.keyword },
      { t: " ", c: colors.plain },
      { t: "model", c: colors.variable },
    ],
  ];

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

  // Render code
  const baseX = -320;
  const baseY = -60;

  for (let li = 0; li < lines.length; li++) {
    const y = baseY + li * sizes.lineHeight;
    let x = baseX;

    frame().add(
      <Txt
        text={`${li + 10}`}
        fill={colors.lineNumberFg}
        fontSize={sizes.fontSize}
        fontFamily={fonts.mono}
        x={-480}
        y={y}
        textAlign="right"
        width={30}
      />,
    );

    for (const tok of lines[li]) {
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

  // Hover highlight on "@env.task"
  frame().add(
    <Rect
      ref={hoverHighlight}
      width={76}
      height={20}
      fill={"rgba(255,255,255,0.06)"}
      stroke={"rgba(255,255,255,0.1)"}
      lineWidth={1}
      radius={2}
      x={baseX + 38}
      y={baseY}
      opacity={0}
    />,
  );

  // Hover tooltip
  frame().add(
    <Rect
      ref={hoverTooltip}
      width={400}
      height={180}
      fill={colors.popupBg}
      stroke={colors.popupBorder}
      lineWidth={1}
      radius={6}
      x={baseX + 200}
      y={baseY - 110}
      opacity={0}
      scale={0.95}
      shadowColor={"rgba(0,0,0,0.5)"}
      shadowBlur={16}
    >
      <Layout direction="column" gap={8} x={-180} y={-65} width={360}>
        <Txt
          text="(decorator) @env.task"
          fill={colors.type}
          fontSize={13}
          fontFamily={fonts.mono}
          fontWeight={600}
        />
        <Rect width={360} height={1} fill={colors.border} />
        <Txt
          text="Decorates an async function as a Flyte task bound to this environment."
          fill={colors.dimWhite}
          fontSize={12}
          fontFamily={fonts.ui}
          textWrap
          width={360}
        />
        <Layout direction="column" gap={4} marginTop={4}>
          <Layout direction="row" gap={6}>
            <Txt text="retries" fill={colors.parameter} fontSize={12} fontFamily={fonts.mono} />
            <Txt text="int" fill={colors.type} fontSize={12} fontFamily={fonts.mono} />
            <Txt text="- Number of retry attempts" fill={colors.lineNumberFg} fontSize={11} fontFamily={fonts.ui} />
          </Layout>
          <Layout direction="row" gap={6}>
            <Txt text="timeout" fill={colors.parameter} fontSize={12} fontFamily={fonts.mono} />
            <Txt text="str" fill={colors.type} fontSize={12} fontFamily={fonts.mono} />
            <Txt text='- Max execution time (e.g. "1h")' fill={colors.lineNumberFg} fontSize={11} fontFamily={fonts.ui} />
          </Layout>
          <Layout direction="row" gap={6}>
            <Txt text="cache" fill={colors.parameter} fontSize={12} fontFamily={fonts.mono} />
            <Txt text="Cache" fill={colors.type} fontSize={12} fontFamily={fonts.mono} />
            <Txt text="- Caching configuration" fill={colors.lineNumberFg} fontSize={11} fontFamily={fonts.ui} />
          </Layout>
        </Layout>
      </Layout>
    </Rect>,
  );

  // Animate
  yield* all(
    frame().opacity(1, 0.5, easeOutCubic),
    frame().scale(1, 0.5, easeOutCubic),
  );

  yield* waitFor(0.5);

  // Zoom to the decorator area
  yield* all(
    frame().scale(2, 0.8, easeInOutCubic),
    frame().position.y(60, 0.8, easeInOutCubic),
    frame().position.x(180, 0.8, easeInOutCubic),
  );

  yield* waitFor(0.3);

  // Show hover highlight
  yield* hoverHighlight().opacity(1, 0.2);

  yield* waitFor(0.2);

  // Show tooltip
  yield* all(
    hoverTooltip().opacity(1, 0.3, easeOutCubic),
    hoverTooltip().scale(1, 0.3, easeOutBack),
  );

  yield* waitFor(2);

  // Zoom out
  yield* all(
    frame().scale(1, 0.6, easeInOutCubic),
    frame().position.y(0, 0.6, easeInOutCubic),
    frame().position.x(0, 0.6, easeInOutCubic),
    hoverTooltip().opacity(0, 0.3),
    hoverHighlight().opacity(0, 0.3),
  );

  yield* waitFor(0.3);
  yield* frame().opacity(0, 0.4);
});
