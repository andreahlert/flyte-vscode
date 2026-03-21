import { makeScene2D, Rect, Txt, Layout, Circle, Line } from "@motion-canvas/2d";
import { all, chain, waitFor, createRef, easeOutCubic, easeInOutCubic, linear } from "@motion-canvas/core";
import { colors, fonts } from "../theme";

export default makeScene2D(function* (view) {
  view.fill(colors.bg);

  const logo = createRef<Rect>();
  const title = createRef<Txt>();
  const subtitle = createRef<Txt>();
  const line = createRef<Rect>();
  const tagline = createRef<Txt>();

  // Flyte logo (stylized "F" in a rounded square)
  view.add(
    <Rect ref={logo} width={100} height={100} radius={20} fill={colors.flytePurple} opacity={0} scale={0.5} y={-40}>
      <Txt text="F" fill={colors.white} fontSize={56} fontWeight={800} fontFamily={fonts.ui} />
    </Rect>,
  );

  view.add(
    <Txt
      ref={title}
      text="Flyte for VS Code"
      fill={colors.white}
      fontSize={44}
      fontWeight={700}
      fontFamily={fonts.ui}
      opacity={0}
      y={50}
    />,
  );

  view.add(
    <Rect ref={line} width={0} height={2} fill={colors.flytePurple} y={85} radius={1} />,
  );

  view.add(
    <Txt
      ref={subtitle}
      text="Build, run, and deploy workflows from your editor"
      fill={colors.dimWhite}
      fontSize={20}
      fontFamily={fonts.ui}
      opacity={0}
      y={115}
    />,
  );

  // Animate in
  yield* all(
    logo().opacity(1, 0.6, easeOutCubic),
    logo().scale(1, 0.6, easeOutCubic),
  );

  yield* waitFor(0.2);

  yield* all(
    title().opacity(1, 0.5, easeOutCubic),
    line().width(300, 0.6, easeInOutCubic),
  );

  yield* all(
    subtitle().opacity(1, 0.5, easeOutCubic),
  );

  yield* waitFor(1.5);

  // Fade everything out
  yield* all(
    logo().opacity(0, 0.4),
    title().opacity(0, 0.4),
    line().opacity(0, 0.4),
    subtitle().opacity(0, 0.4),
  );
});
