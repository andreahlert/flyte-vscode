import { makeScene2D, Rect, Txt, Layout, Circle } from "@motion-canvas/2d";
import {
  all, chain, waitFor, createRef, sequence,
  easeOutCubic, easeInOutCubic,
} from "@motion-canvas/core";
import { colors, fonts, sizes } from "../theme";

/**
 * Scene: Sidebar with Environments, Tasks, Clusters, and Runs views.
 */
export default makeScene2D(function* (view) {
  view.fill(colors.bg);

  const frame = createRef<Rect>();
  const sidebar = createRef<Rect>();

  // Sidebar sections
  const envItems = createRef<Layout>();
  const taskItems = createRef<Layout>();
  const clusterItems = createRef<Layout>();
  const runItems = createRef<Layout>();

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
      <Rect width={1100} height={22} fill={colors.statusBarBg} y={314}>
        <Txt text="Flyte" fill={colors.statusBarFg} fontSize={11} fontFamily={fonts.ui} fontWeight={600} x={-520} />
      </Rect>

      {/* Activity bar */}
      <Rect width={48} height={598} fill={colors.activityBarBg} x={-526} y={2}>
        <Rect width={28} height={28} radius={4} fill={colors.flytePurple} y={-260}>
          <Txt text="F" fill={colors.white} fontSize={16} fontWeight={700} fontFamily={fonts.ui} />
        </Rect>
        {/* Active indicator */}
        <Rect width={2} height={28} fill={colors.white} x={-23} y={-260} />
      </Rect>

      {/* Sidebar panel */}
      <Rect
        ref={sidebar}
        width={280}
        height={598}
        fill={colors.sidebarBg}
        x={-362}
        y={2}
      >
        <Txt
          text="FLYTE"
          fill={colors.dimWhite}
          fontSize={11}
          fontFamily={fonts.ui}
          fontWeight={600}
          letterSpacing={1}
          x={-100}
          y={-278}
        />

        {/* ENVIRONMENTS section */}
        <Layout ref={envItems} direction="column" gap={0} x={0} y={-220} opacity={0}>
          <Layout direction="row" gap={6} height={26} alignItems="center" x={-100}>
            <Txt text=">" fill={colors.dimWhite} fontSize={11} fontFamily={fonts.mono} />
            <Txt text="ENVIRONMENTS" fill={colors.dimWhite} fontSize={11} fontFamily={fonts.ui} fontWeight={600} letterSpacing={0.5} />
          </Layout>
          {[
            { name: "data-processing", color: colors.flyteTeal },
            { name: "gpu-training", color: colors.flytePurple },
            { name: "evaluation", color: colors.flyteBlue },
          ].map((env, i) => (
            <Layout direction="row" gap={8} height={24} alignItems="center" x={-80} key={`env-${i}`}>
              <Rect width={14} height={14} radius={3} fill={env.color} opacity={0.8} />
              <Txt text={env.name} fill={colors.plain} fontSize={12} fontFamily={fonts.mono} />
            </Layout>
          ))}
        </Layout>

        {/* TASKS section */}
        <Layout ref={taskItems} direction="column" gap={0} x={0} y={-100} opacity={0}>
          <Layout direction="row" gap={6} height={26} alignItems="center" x={-100}>
            <Txt text=">" fill={colors.dimWhite} fontSize={11} fontFamily={fonts.mono} />
            <Txt text="TASKS" fill={colors.dimWhite} fontSize={11} fontFamily={fonts.ui} fontWeight={600} letterSpacing={0.5} />
          </Layout>
          {[
            "fetch_dataset",
            "preprocess_shard",
            "train_model",
            "evaluate_model",
            "generate_report",
          ].map((task, i) => (
            <Layout direction="row" gap={8} height={24} alignItems="center" x={-80} key={`task-${i}`}>
              <Txt text="fn" fill={colors.function} fontSize={10} fontFamily={fonts.mono} fontWeight={700} />
              <Txt text={task} fill={colors.plain} fontSize={12} fontFamily={fonts.mono} />
            </Layout>
          ))}
        </Layout>

        {/* CLUSTERS section */}
        <Layout ref={clusterItems} direction="column" gap={0} x={0} y={50} opacity={0}>
          <Layout direction="row" gap={6} height={26} alignItems="center" x={-100}>
            <Txt text=">" fill={colors.dimWhite} fontSize={11} fontFamily={fonts.mono} />
            <Txt text="CLUSTERS" fill={colors.dimWhite} fontSize={11} fontFamily={fonts.ui} fontWeight={600} letterSpacing={0.5} />
          </Layout>
          <Layout direction="row" gap={8} height={24} alignItems="center" x={-80}>
            <Circle width={10} height={10} fill={"#f5a623"} />
            <Txt text="union.ai/production" fill={colors.plain} fontSize={12} fontFamily={fonts.mono} />
            <Txt text="(active)" fill={colors.comment} fontSize={10} fontFamily={fonts.mono} />
          </Layout>
          <Layout direction="row" gap={8} height={24} alignItems="center" x={-80}>
            <Circle width={10} height={10} fill={colors.flytePurple} />
            <Txt text="localhost:30080" fill={colors.lineNumberFg} fontSize={12} fontFamily={fonts.mono} />
          </Layout>
        </Layout>

        {/* RUNS section */}
        <Layout ref={runItems} direction="column" gap={0} x={0} y={160} opacity={0}>
          <Layout direction="row" gap={6} height={26} alignItems="center" x={-100}>
            <Txt text=">" fill={colors.dimWhite} fontSize={11} fontFamily={fonts.mono} />
            <Txt text="RUNS" fill={colors.dimWhite} fontSize={11} fontFamily={fonts.ui} fontWeight={600} letterSpacing={0.5} />
          </Layout>
          {[
            { name: "train_model", status: "running", statusColor: "#4ec9b0" },
            { name: "fetch_dataset", status: "completed", statusColor: colors.comment },
            { name: "evaluate_model", status: "completed", statusColor: colors.comment },
          ].map((run, i) => (
            <Layout direction="row" gap={8} height={24} alignItems="center" x={-80} key={`run-${i}`}>
              <Circle
                width={8}
                height={8}
                fill={run.statusColor}
              />
              <Txt text={run.name} fill={colors.plain} fontSize={12} fontFamily={fonts.mono} />
              <Txt text={run.status} fill={run.statusColor} fontSize={10} fontFamily={fonts.mono} />
            </Layout>
          ))}
        </Layout>
      </Rect>

      {/* Editor area (dimmed code background) */}
      <Layout direction="column" x={40} y={-100} opacity={0.3}>
        {Array.from({ length: 20 }, (_, i) => (
          <Layout direction="row" height={sizes.lineHeight} alignItems="center" key={`bg-${i}`}>
            <Txt text={`${i + 1}`} fill={colors.lineNumberFg} fontSize={sizes.fontSize} fontFamily={fonts.mono} width={30} textAlign="right" marginRight={16} />
            <Rect width={100 + Math.random() * 300} height={12} fill={"rgba(255,255,255,0.04)"} radius={2} />
          </Layout>
        ))}
      </Layout>
    </Rect>,
  );

  // Animate
  yield* all(
    frame().opacity(1, 0.5, easeOutCubic),
    frame().scale(1, 0.5, easeOutCubic),
  );

  yield* waitFor(0.4);

  // Reveal sidebar sections one by one
  yield* envItems().opacity(1, 0.4, easeOutCubic);
  yield* waitFor(0.4);

  yield* taskItems().opacity(1, 0.4, easeOutCubic);
  yield* waitFor(0.4);

  yield* clusterItems().opacity(1, 0.4, easeOutCubic);
  yield* waitFor(0.4);

  yield* runItems().opacity(1, 0.4, easeOutCubic);
  yield* waitFor(0.6);

  // Zoom into clusters section
  yield* all(
    frame().scale(2.2, 0.8, easeInOutCubic),
    frame().position.y(-50, 0.8, easeInOutCubic),
    frame().position.x(360, 0.8, easeInOutCubic),
  );

  yield* waitFor(1.2);

  // Zoom to runs
  yield* all(
    frame().position.y(-180, 0.8, easeInOutCubic),
  );

  yield* waitFor(1);

  // Zoom out
  yield* all(
    frame().scale(1, 0.6, easeInOutCubic),
    frame().position.y(0, 0.6, easeInOutCubic),
    frame().position.x(0, 0.6, easeInOutCubic),
  );

  yield* waitFor(0.3);
  yield* frame().opacity(0, 0.4);
});
