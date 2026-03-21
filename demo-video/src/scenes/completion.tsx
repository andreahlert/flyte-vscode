import { makeScene2D, Rect, Txt, Layout, Node } from "@motion-canvas/2d";
import {
  all, chain, waitFor, createRef,
  easeOutCubic, easeInOutCubic, easeOutBack,
} from "@motion-canvas/core";
import { colors, fonts, sizes } from "../theme";

/**
 * Scene: Autocomplete popup showing Flyte parameter suggestions.
 * Simulates typing inside TaskEnvironment() and seeing completions.
 */
export default makeScene2D(function* (view) {
  view.fill(colors.bg);

  const frame = createRef<Rect>();
  const popup = createRef<Rect>();
  const docPanel = createRef<Rect>();
  const highlight = createRef<Rect>();

  const codeLines = [
    [
      { t: "env", c: colors.variable }, { t: " = ", c: colors.plain },
      { t: "flyte", c: colors.variable }, { t: ".", c: colors.plain },
      { t: "TaskEnvironment", c: colors.type }, { t: "(", c: colors.plain },
    ],
    [
      { t: "    ", c: colors.plain },
      { t: "name", c: colors.parameter }, { t: "=", c: colors.plain },
      { t: '"ml-training"', c: colors.string }, { t: ",", c: colors.plain },
    ],
    [
      { t: "    ", c: colors.plain },
      { t: "|", c: colors.cursorFg }, // cursor position
    ],
  ];

  const completionItems = [
    { label: "image", type: "Image", desc: "Container image for the task" },
    { label: "resources", type: "Resources", desc: "CPU, memory, GPU allocation" },
    { label: "cache", type: "Cache", desc: "Caching behavior configuration" },
    { label: "secrets", type: "list[Secret]", desc: "Secrets to inject into the task" },
    { label: "env_vars", type: "dict", desc: "Environment variables" },
    { label: "interruptible", type: "bool", desc: "Allow spot instance preemption" },
    { label: "queue", type: "str", desc: "Queue for task scheduling" },
  ];

  // Frame
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

      {/* Tab bar */}
      <Rect width={1100} height={35} fill={colors.tabBg} y={-277.5}>
        <Rect width={130} height={35} fill={colors.tabActiveBg} x={-485}>
          <Txt text="pipeline.py" fill={colors.white} fontSize={12} fontFamily={fonts.ui} />
        </Rect>
      </Rect>

      {/* Status bar */}
      <Rect width={1100} height={22} fill={colors.statusBarBg} y={314}>
        <Txt text="Flyte" fill={colors.statusBarFg} fontSize={11} fontFamily={fonts.ui} fontWeight={600} x={-520} />
      </Rect>
    </Rect>,
  );

  // Render static code
  const baseX = -350;
  const baseY = -200;

  for (let li = 0; li < codeLines.length; li++) {
    const y = baseY + li * sizes.lineHeight;
    let x = baseX;

    // Line number
    frame().add(
      <Txt
        text={`${li + 1}`}
        fill={colors.lineNumberFg}
        fontSize={sizes.fontSize}
        fontFamily={fonts.mono}
        x={-510}
        y={y}
        textAlign="right"
        width={30}
      />,
    );

    for (const tok of codeLines[li]) {
      if (tok.t === "|") {
        // Cursor
        frame().add(
          <Rect width={2} height={18} fill={colors.cursorFg} x={x + 1} y={y} />,
        );
      } else {
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
  }

  // Completion popup
  const popupX = baseX + 40;
  const popupY = baseY + 2.5 * sizes.lineHeight + 10;

  frame().add(
    <Rect
      ref={popup}
      width={320}
      height={completionItems.length * 28 + 8}
      fill={colors.popupBg}
      stroke={colors.popupBorder}
      lineWidth={1}
      radius={4}
      x={popupX + 160}
      y={popupY + (completionItems.length * 28 + 8) / 2}
      opacity={0}
      scale={0.95}
      shadowColor={"rgba(0,0,0,0.4)"}
      shadowBlur={12}
    >
      {/* Highlight bar */}
      <Rect
        ref={highlight}
        width={318}
        height={28}
        fill={colors.popupHighlight}
        radius={2}
        y={-(completionItems.length * 28) / 2 + 14 + 0 * 28}
      />

      {completionItems.map((item, i) => (
        <Layout
          direction="row"
          gap={8}
          alignItems="center"
          y={-(completionItems.length * 28) / 2 + 14 + i * 28}
          x={-140}
          key={`comp-${i}`}
        >
          <Rect width={18} height={18} radius={3} fill={colors.accent}>
            <Txt text="P" fill={colors.white} fontSize={10} fontFamily={fonts.ui} fontWeight={600} />
          </Rect>
          <Txt text={item.label} fill={colors.white} fontSize={13} fontFamily={fonts.mono} />
          <Txt text={item.type} fill={colors.lineNumberFg} fontSize={11} fontFamily={fonts.mono} />
        </Layout>
      ))}
    </Rect>,
  );

  // Documentation panel (appears to the right of completion)
  frame().add(
    <Rect
      ref={docPanel}
      width={280}
      height={120}
      fill={colors.docBg}
      stroke={colors.popupBorder}
      lineWidth={1}
      radius={4}
      x={popupX + 160 + 300}
      y={popupY + 70}
      opacity={0}
      shadowColor={"rgba(0,0,0,0.3)"}
      shadowBlur={8}
    >
      <Layout direction="column" gap={6} x={-120} y={-35} width={240}>
        <Txt
          text="image: Image"
          fill={colors.type}
          fontSize={13}
          fontFamily={fonts.mono}
          fontWeight={600}
        />
        <Txt
          text="Container image for the task environment. Supports custom Debian-based images with pip packages."
          fill={colors.dimWhite}
          fontSize={11}
          fontFamily={fonts.ui}
          textWrap
          width={240}
        />
        <Txt
          text="Default: None"
          fill={colors.lineNumberFg}
          fontSize={11}
          fontFamily={fonts.mono}
        />
      </Layout>
    </Rect>,
  );

  // Animate
  yield* all(
    frame().opacity(1, 0.5, easeOutCubic),
    frame().scale(1, 0.5, easeOutCubic),
  );

  yield* waitFor(0.5);

  // Zoom into the code area where cursor is
  yield* all(
    frame().scale(1.8, 0.8, easeInOutCubic),
    frame().position.y(140, 0.8, easeInOutCubic),
    frame().position.x(120, 0.8, easeInOutCubic),
  );

  yield* waitFor(0.3);

  // Show completion popup
  yield* all(
    popup().opacity(1, 0.25, easeOutCubic),
    popup().scale(1, 0.25, easeOutBack),
  );

  yield* waitFor(0.5);

  // Show doc panel
  yield* docPanel().opacity(1, 0.3, easeOutCubic);

  yield* waitFor(0.8);

  // Navigate through items
  for (let i = 1; i < 4; i++) {
    yield* highlight().position.y(
      -(completionItems.length * 28) / 2 + 14 + i * 28,
      0.15,
      easeOutCubic,
    );
    yield* waitFor(0.4);
  }

  yield* waitFor(0.8);

  // Zoom out and fade
  yield* all(
    frame().scale(1, 0.6, easeInOutCubic),
    frame().position.y(0, 0.6, easeInOutCubic),
    frame().position.x(0, 0.6, easeInOutCubic),
  );

  yield* waitFor(0.3);
  yield* frame().opacity(0, 0.4);
});
