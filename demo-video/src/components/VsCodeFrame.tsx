import { Rect, Txt, Line, Layout, Node } from "@motion-canvas/2d";
import { Reference, createRef } from "@motion-canvas/core";
import { colors, fonts, sizes } from "../theme";

interface VsCodeFrameProps {
  width?: number;
  height?: number;
  showSidebar?: boolean;
  sidebarContent?: Node;
  activeTab?: string;
  statusText?: string;
}

export function VsCodeFrame({
  width = 1200,
  height = 700,
  showSidebar = false,
  activeTab = "pipeline.py",
  statusText = "Python",
}: VsCodeFrameProps) {
  const sidebarW = showSidebar ? sizes.sidebarWidth : 0;
  const activityW = sizes.activityBarWidth;
  const editorX = activityW + sidebarW;
  const editorW = width - editorX;

  return (
    <Rect
      width={width}
      height={height}
      radius={8}
      clip
      fill={colors.bg}
      shadowColor={"rgba(0,0,0,0.5)"}
      shadowBlur={40}
      shadowOffsetY={10}
    >
      {/* Title bar */}
      <Rect
        width={width}
        height={sizes.titleBarHeight}
        fill={colors.titleBarBg}
        y={-height / 2 + sizes.titleBarHeight / 2}
      >
        {/* Traffic lights */}
        <Layout direction="row" gap={8} x={-width / 2 + 20} alignItems="center">
          <Rect width={12} height={12} radius={6} fill="#ff5f57" />
          <Rect width={12} height={12} radius={6} fill="#febc2e" />
          <Rect width={12} height={12} radius={6} fill="#28c840" />
        </Layout>
        <Txt
          text={`${activeTab} - Flyte VS Code`}
          fill={colors.dimWhite}
          fontSize={12}
          fontFamily={fonts.ui}
        />
      </Rect>

      {/* Activity bar */}
      <Rect
        width={activityW}
        height={height - sizes.titleBarHeight - sizes.statusBarHeight}
        fill={colors.activityBarBg}
        x={-width / 2 + activityW / 2}
        y={(sizes.titleBarHeight - sizes.statusBarHeight) / 2}
      >
        {/* Flyte icon placeholder */}
        <Rect
          width={28}
          height={28}
          radius={4}
          fill={colors.flytePurple}
          y={-height / 2 + sizes.titleBarHeight + 30}
          opacity={0.9}
        >
          <Txt text="F" fill={colors.white} fontSize={16} fontWeight={700} fontFamily={fonts.ui} />
        </Rect>
        {/* Explorer icon */}
        <Rect
          width={24}
          height={24}
          radius={3}
          stroke={colors.dimWhite}
          lineWidth={1.5}
          opacity={0.4}
          y={-height / 2 + sizes.titleBarHeight + 70}
        />
        {/* Search icon */}
        <Rect
          width={24}
          height={24}
          radius={12}
          stroke={colors.dimWhite}
          lineWidth={1.5}
          opacity={0.4}
          y={-height / 2 + sizes.titleBarHeight + 110}
        />
      </Rect>

      {/* Tab bar */}
      <Rect
        width={editorW}
        height={sizes.tabHeight}
        fill={colors.tabBg}
        x={-width / 2 + editorX + editorW / 2}
        y={-height / 2 + sizes.titleBarHeight + sizes.tabHeight / 2}
      >
        <Rect
          width={140}
          height={sizes.tabHeight}
          fill={colors.tabActiveBg}
          x={-editorW / 2 + 70}
        >
          <Txt
            text={activeTab}
            fill={colors.white}
            fontSize={12}
            fontFamily={fonts.ui}
          />
        </Rect>
      </Rect>

      {/* Status bar */}
      <Rect
        width={width}
        height={sizes.statusBarHeight}
        fill={colors.statusBarBg}
        y={height / 2 - sizes.statusBarHeight / 2}
      >
        <Txt
          text={statusText}
          fill={colors.statusBarFg}
          fontSize={11}
          fontFamily={fonts.ui}
          x={width / 2 - 60}
        />
        <Txt
          text="Flyte"
          fill={colors.statusBarFg}
          fontSize={11}
          fontFamily={fonts.ui}
          fontWeight={600}
          x={-width / 2 + 50}
        />
      </Rect>
    </Rect>
  );
}
