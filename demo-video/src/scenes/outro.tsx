import { makeScene2D, Rect, Txt, Layout } from "@motion-canvas/2d";
import {
  all, waitFor, createRef,
  easeOutCubic, easeInOutCubic,
} from "@motion-canvas/core";
import { colors, fonts } from "../theme";

/**
 * Scene: Outro with install CTA.
 */
export default makeScene2D(function* (view) {
  view.fill(colors.bg);

  const logo = createRef<Rect>();
  const title = createRef<Txt>();
  const features = createRef<Layout>();
  const cta = createRef<Rect>();

  view.add(
    <Rect ref={logo} width={80} height={80} radius={16} fill={colors.flytePurple} opacity={0} scale={0.5} y={-100}>
      <Txt text="F" fill={colors.white} fontSize={44} fontWeight={800} fontFamily={fonts.ui} />
    </Rect>,
  );

  view.add(
    <Txt
      ref={title}
      text="Flyte for VS Code"
      fill={colors.white}
      fontSize={36}
      fontWeight={700}
      fontFamily={fonts.ui}
      opacity={0}
      y={-20}
    />,
  );

  const featureList = [
    "Intelligent Autocomplete",
    "Inline Documentation",
    "One-Click Run & Deploy",
    "GPU Accelerator Support",
    "Cluster Management",
    "Execution History",
  ];

  view.add(
    <Layout ref={features} direction="row" gap={20} y={40} opacity={0} wrap="wrap" width={800} justifyContent="center">
      {featureList.map((feat, i) => (
        <Rect
          key={`feat-${i}`}
          height={28}
          paddingLeft={12}
          paddingRight={12}
          fill={"rgba(108,71,255,0.15)"}
          stroke={colors.flytePurple}
          lineWidth={1}
          radius={14}
        >
          <Txt text={feat} fill={colors.dimWhite} fontSize={12} fontFamily={fonts.ui} />
        </Rect>
      ))}
    </Layout>,
  );

  view.add(
    <Rect
      ref={cta}
      height={44}
      paddingLeft={24}
      paddingRight={24}
      fill={colors.flytePurple}
      radius={8}
      y={120}
      opacity={0}
      scale={0.9}
      shadowColor={"rgba(108,71,255,0.4)"}
      shadowBlur={20}
    >
      <Txt
        text="Install from VS Code Marketplace"
        fill={colors.white}
        fontSize={15}
        fontFamily={fonts.ui}
        fontWeight={600}
      />
    </Rect>,
  );

  // Animate
  yield* all(
    logo().opacity(1, 0.5, easeOutCubic),
    logo().scale(1, 0.5, easeOutCubic),
  );

  yield* waitFor(0.2);

  yield* title().opacity(1, 0.4, easeOutCubic);

  yield* waitFor(0.2);

  yield* features().opacity(1, 0.5, easeOutCubic);

  yield* waitFor(0.3);

  yield* all(
    cta().opacity(1, 0.5, easeOutCubic),
    cta().scale(1, 0.5, easeOutCubic),
  );

  yield* waitFor(2.5);

  // Fade all out
  yield* all(
    logo().opacity(0, 0.5),
    title().opacity(0, 0.5),
    features().opacity(0, 0.5),
    cta().opacity(0, 0.5),
  );
});
