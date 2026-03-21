import { makeScene2D, Rect, Txt, Layout } from "@motion-canvas/2d";
import {
  all, waitFor, createRef,
  easeOutCubic, easeInOutCubic, easeOutBack,
} from "@motion-canvas/core";
import { colors, fonts, sizes } from "../theme";

/**
 * Scene: GPU accelerator suggestions.
 * Shows typing gpu= and seeing GPU model suggestions.
 */
export default makeScene2D(function* (view) {
  view.fill(colors.bg);

  const frame = createRef<Rect>();
  const popup = createRef<Rect>();
  const highlight = createRef<Rect>();

  const gpuOptions = [
    { label: "A100", detail: "NVIDIA A100 80GB" },
    { label: "H100", detail: "NVIDIA H100 80GB" },
    { label: "T4", detail: "NVIDIA T4 16GB" },
    { label: "V100", detail: "NVIDIA V100 32GB" },
    { label: "L4", detail: "NVIDIA L4 24GB" },
    { label: "A10G", detail: "NVIDIA A10G 24GB" },
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
  const baseY = -80;

  // Code context
  const lines = [
    [
      { t: "env", c: colors.variable }, { t: " = ", c: colors.plain },
      { t: "flyte", c: colors.variable }, { t: ".", c: colors.plain },
      { t: "TaskEnvironment", c: colors.type }, { t: "(", c: colors.plain },
    ],
    [
      { t: '    name="gpu-training",', c: colors.plain },
    ],
    [
      { t: "    ", c: colors.plain },
      { t: "resources", c: colors.parameter }, { t: "=", c: colors.plain },
      { t: "flyte", c: colors.variable }, { t: ".", c: colors.plain },
      { t: "Resources", c: colors.type }, { t: "(", c: colors.plain },
    ],
    [
      { t: "        ", c: colors.plain },
      { t: "cpu", c: colors.parameter }, { t: "=", c: colors.plain },
      { t: "4", c: colors.number }, { t: ",", c: colors.plain },
    ],
    [
      { t: "        ", c: colors.plain },
      { t: "memory", c: colors.parameter }, { t: "=", c: colors.plain },
      { t: '"32Gi"', c: colors.string }, { t: ",", c: colors.plain },
    ],
    [
      { t: "        ", c: colors.plain },
      { t: "gpu", c: colors.parameter }, { t: "=", c: colors.plain },
    ],
  ];

  for (let li = 0; li < lines.length; li++) {
    const y = baseY + li * sizes.lineHeight;
    let x = baseX;

    frame().add(
      <Txt
        text={`${li + 5}`}
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

  // Cursor after gpu=
  const cursorX = baseX + 8 * 8.4 + 3 * 8.4 + 1 * 8.4;
  const cursorY = baseY + 5 * sizes.lineHeight;
  frame().add(
    <Rect width={2} height={18} fill={colors.cursorFg} x={cursorX} y={cursorY} />,
  );

  // GPU completion popup
  const popupX = cursorX;
  const popupY = cursorY + 20;

  frame().add(
    <Rect
      ref={popup}
      width={280}
      height={gpuOptions.length * 28 + 8}
      fill={colors.popupBg}
      stroke={colors.popupBorder}
      lineWidth={1}
      radius={4}
      x={popupX + 140}
      y={popupY + (gpuOptions.length * 28 + 8) / 2}
      opacity={0}
      scale={0.95}
      shadowColor={"rgba(0,0,0,0.4)"}
      shadowBlur={12}
    >
      <Rect
        ref={highlight}
        width={278}
        height={28}
        fill={colors.popupHighlight}
        radius={2}
        y={-(gpuOptions.length * 28) / 2 + 14}
      />
      {gpuOptions.map((gpu, i) => (
        <Layout
          direction="row"
          gap={10}
          alignItems="center"
          y={-(gpuOptions.length * 28) / 2 + 14 + i * 28}
          x={-120}
          key={`gpu-${i}`}
        >
          <Rect width={18} height={18} radius={3} fill={colors.flytePurple}>
            <Txt text="G" fill={colors.white} fontSize={10} fontFamily={fonts.ui} fontWeight={600} />
          </Rect>
          <Txt text={gpu.label} fill={colors.white} fontSize={13} fontFamily={fonts.mono} fontWeight={600} />
          <Txt text={gpu.detail} fill={colors.lineNumberFg} fontSize={11} fontFamily={fonts.mono} />
        </Layout>
      ))}
    </Rect>,
  );

  // Animate
  yield* all(
    frame().opacity(1, 0.5, easeOutCubic),
    frame().scale(1, 0.5, easeOutCubic),
  );

  yield* waitFor(0.4);

  // Zoom to gpu= area
  yield* all(
    frame().scale(2.2, 0.8, easeInOutCubic),
    frame().position.y(-10, 0.8, easeInOutCubic),
    frame().position.x(100, 0.8, easeInOutCubic),
  );

  yield* waitFor(0.3);

  // Show GPU popup
  yield* all(
    popup().opacity(1, 0.25, easeOutCubic),
    popup().scale(1, 0.25, easeOutBack),
  );

  yield* waitFor(0.5);

  // Navigate through GPU options
  for (let i = 1; i < 4; i++) {
    yield* highlight().position.y(
      -(gpuOptions.length * 28) / 2 + 14 + i * 28,
      0.15,
      easeOutCubic,
    );
    yield* waitFor(0.4);
  }

  yield* waitFor(0.8);

  // Zoom out
  yield* all(
    frame().scale(1, 0.6, easeInOutCubic),
    frame().position.y(0, 0.6, easeInOutCubic),
    frame().position.x(0, 0.6, easeInOutCubic),
  );

  yield* waitFor(0.3);
  yield* frame().opacity(0, 0.4);
});
