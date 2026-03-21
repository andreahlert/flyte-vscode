/**
 * Flyte VS Code Extension - Demo Recorder
 *
 * Uses Playwright to pilot code-server (VS Code in browser).
 * All interactions use mouse: clicks, hovers, scroll wheel.
 */

import { chromium } from "playwright";
import { setTimeout as sleep } from "timers/promises";
import { mkdirSync } from "fs";

const CODE_SERVER_URL = process.env.CODE_SERVER_URL || "http://localhost:8080";
const OUTPUT_DIR = process.env.OUTPUT_DIR || "./output";
const VIEWPORT = { width: 1920, height: 1080 };
const SLOW_TYPE = 45;
const FAST_TYPE = 20;

mkdirSync(OUTPUT_DIR, { recursive: true });

// ─── Mouse helpers ───────────────────────────────────────────────────

async function hover(page, selector, { steps = 20, timeout = 5000 } = {}) {
  const el = await page.waitForSelector(selector, { timeout });
  const box = await el.boundingBox();
  if (!box) return null;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y, { steps });
  return { x, y, box };
}

async function click(page, selector, opts = {}) {
  const pos = await hover(page, selector, opts);
  if (!pos) return;
  await sleep(150);
  await page.mouse.click(pos.x, pos.y);
}

async function clickAt(page, x, y) {
  await page.mouse.move(x, y, { steps: 15 });
  await sleep(100);
  await page.mouse.click(x, y);
}

async function scrollDown(page, x, y, lines = 5) {
  await page.mouse.move(x, y, { steps: 5 });
  for (let i = 0; i < lines; i++) {
    await page.mouse.wheel(0, 80);
    await sleep(100);
  }
}

async function scrollUp(page, x, y, lines = 5) {
  await page.mouse.move(x, y, { steps: 5 });
  for (let i = 0; i < lines; i++) {
    await page.mouse.wheel(0, -80);
    await sleep(100);
  }
}

async function typeText(page, text, delay = SLOW_TYPE) {
  for (const char of text) {
    await page.keyboard.type(char, { delay: 0 });
    await sleep(delay);
  }
}

async function press(page, key) {
  await page.keyboard.press(key);
  await sleep(150);
}

async function shot(page, name) {
  await page.screenshot({ path: `${OUTPUT_DIR}/debug-${name}.png` });
}

async function waitForCodeServer(page) {
  console.log("[demo] Waiting for code-server...");
  for (let i = 0; i < 60; i++) {
    try {
      await page.goto(CODE_SERVER_URL, { timeout: 5000 });
      await page.waitForSelector(".monaco-workbench", { timeout: 10000 });
      console.log("[demo] code-server loaded");
      await sleep(5000);
      return;
    } catch {
      await sleep(2000);
    }
  }
  throw new Error("code-server not ready");
}

// Find the center of the editor area (for scrolling)
function editorCenter() {
  // code-server: activity bar ~48px, sidebar ~0 (closed), so editor starts ~48px
  // Title bar ~35px, tabs ~35px, status ~22px
  return { x: 700, y: 450 };
}

// ─── Scenes ──────────────────────────────────────────────────────────

async function sceneOpenFile(page) {
  console.log("[demo] >> Opening pipeline.py via file explorer");

  // Click the Explorer icon in activity bar (first icon)
  await click(page, '.activitybar .action-item:first-child');
  await sleep(1000);

  // Click on pipeline.py in the file tree
  const pipelineFile = page.locator('.explorer-folders-view .monaco-list-row:has-text("pipeline.py")').first();
  if (await pipelineFile.isVisible({ timeout: 3000 }).catch(() => false)) {
    const box = await pipelineFile.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 15 });
      await sleep(300);
      await page.mouse.dblclick(box.x + box.width / 2, box.y + box.height / 2);
    }
  } else {
    // Fallback: Quick Open
    await press(page, "Control+p");
    await sleep(500);
    await typeText(page, "pipeline.py", FAST_TYPE);
    await sleep(500);
    await press(page, "Enter");
  }
  await sleep(2000);

  // Close sidebar to see full code
  await press(page, "Control+b");
  await sleep(500);

  // Scroll to top
  await press(page, "Control+Home");
  await sleep(500);

  await shot(page, "03-file-opened");
}

async function sceneBrowseCode(page) {
  console.log("[demo] >> Scrolling through code with mouse wheel");

  const { x, y } = editorCenter();

  // Scroll down slowly with mouse wheel
  await scrollDown(page, x, y, 25);
  await sleep(1500);

  // Scroll back up
  await scrollUp(page, x, y, 25);
  await sleep(1000);

  await shot(page, "04-browsed");
}

async function sceneAutocomplete(page) {
  console.log("[demo] >> Autocomplete with mouse clicks");

  // Click at the end of the file (scroll down first)
  await press(page, "Control+End");
  await sleep(500);
  await press(page, "Enter");
  await press(page, "Enter");

  // Type new code
  await typeText(page, "# New environment with autocomplete");
  await press(page, "Enter");
  await sleep(300);

  await typeText(page, "env2 = flyte.TaskEnvironment(");
  await sleep(600);
  await press(page, "Enter");
  await typeText(page, '    name="inference",');
  await press(page, "Enter");
  await sleep(300);

  // Trigger autocomplete
  await typeText(page, "    ");
  await sleep(500);
  await press(page, "Control+Space");
  await sleep(2000);

  await shot(page, "06-autocomplete");

  // Click on an autocomplete item with mouse
  const suggestWidget = page.locator(".suggest-widget .monaco-list-row");
  const count = await suggestWidget.count();
  if (count > 2) {
    // Hover over first few items
    for (let i = 0; i < Math.min(3, count); i++) {
      const item = suggestWidget.nth(i);
      const box = await item.boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 10 });
        await sleep(600);
      }
    }

    await shot(page, "07-autocomplete-hover");

    // Click on "resources" if visible
    const resourcesItem = page.locator('.suggest-widget .monaco-list-row:has-text("resources")').first();
    if (await resourcesItem.isVisible({ timeout: 1000 }).catch(() => false)) {
      const box = await resourcesItem.boundingBox();
      if (box) {
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        await sleep(500);
      }
    } else {
      await press(page, "Escape");
    }
  } else {
    await press(page, "Escape");
  }

  await sleep(500);
}

async function sceneGpuSuggestions(page) {
  console.log("[demo] >> GPU accelerator suggestions");

  await typeText(page, "=flyte.Resources(");
  await press(page, "Enter");
  await typeText(page, "        cpu=4,");
  await press(page, "Enter");
  await typeText(page, '        memory="32Gi",');
  await press(page, "Enter");
  await typeText(page, "        gpu=");
  await sleep(500);

  await press(page, "Control+Space");
  await sleep(2000);

  await shot(page, "08-gpu");

  // Click on a GPU option with mouse
  const gpuItems = page.locator(".suggest-widget .monaco-list-row");
  const count = await gpuItems.count();
  if (count > 0) {
    // Hover over GPU items
    for (let i = 0; i < Math.min(3, count); i++) {
      const item = gpuItems.nth(i);
      const box = await item.boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 10 });
        await sleep(500);
      }
    }

    // Click the second item
    if (count > 1) {
      const item = gpuItems.nth(1);
      const box = await item.boundingBox();
      if (box) {
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      }
    }
  }

  await sleep(1000);
  await shot(page, "09-gpu-selected");
}

async function sceneHoverDocs(page) {
  console.log("[demo] >> Hover documentation with mouse");

  // Scroll to top
  await press(page, "Control+Home");
  await sleep(500);

  const { x, y } = editorCenter();

  // Scroll down a bit to find TaskEnvironment
  await scrollDown(page, x, y, 5);
  await sleep(500);

  // Find "TaskEnvironment" text in the editor and hover
  const taskEnvToken = page.locator('.view-line:has-text("TaskEnvironment") span').first();
  if (await taskEnvToken.isVisible({ timeout: 3000 }).catch(() => false)) {
    const box = await taskEnvToken.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 25 });
      await sleep(3000);
      await shot(page, "10-hover-taskenv");
    }
  }

  // Move away
  await page.mouse.move(600, 200, { steps: 10 });
  await sleep(500);

  // Now hover over @env.task decorator
  // Scroll to find it
  await scrollDown(page, x, y, 8);
  await sleep(500);

  const decoratorToken = page.locator('.view-line:has-text("@") span').first();
  if (await decoratorToken.isVisible({ timeout: 3000 }).catch(() => false)) {
    const box = await decoratorToken.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 25 });
      await sleep(3000);
      await shot(page, "11-hover-decorator");
    }
  }

  await page.mouse.move(600, 200, { steps: 10 });
  await sleep(500);
}

async function sceneCodeLens(page) {
  console.log("[demo] >> CodeLens - click Run Task");

  await press(page, "Control+Home");
  await sleep(500);

  const { x, y } = editorCenter();
  await scrollDown(page, x, y, 10);
  await sleep(1000);

  // Find CodeLens "Run Task" and hover/click
  const runTask = page.locator('a:has-text("Run Task"), .codelens-decoration a:has-text("Run")').first();
  if (await runTask.isVisible({ timeout: 3000 }).catch(() => false)) {
    const box = await runTask.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 20 });
      await sleep(1500);
      await shot(page, "12-codelens-hover");
      // Click it
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await sleep(2000);
      await shot(page, "12b-codelens-clicked");
      // Dismiss any dialog
      await press(page, "Escape");
    }
  } else {
    // Find "Graph" button
    const graphBtn = page.locator('a:has-text("Graph"), .codelens-decoration a:has-text("Graph")').first();
    if (await graphBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      const box = await graphBtn.boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 20 });
        await sleep(1500);
        await shot(page, "12-codelens-graph");
      }
    }
  }

  await sleep(500);
}

async function sceneSidebar(page) {
  console.log("[demo] >> Sidebar - click through sections");

  // Click the Flyte icon in the activity bar
  // Find it by iterating activity bar items
  const activityItems = page.locator(".activitybar .action-item .action-label");
  const count = await activityItems.count();
  let flyteClicked = false;

  for (let i = 0; i < count; i++) {
    const item = activityItems.nth(i);
    const ariaLabel = await item.getAttribute("aria-label") || "";
    if (ariaLabel.toLowerCase().includes("flyte")) {
      const box = await item.boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 15 });
        await sleep(300);
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        flyteClicked = true;
      }
      break;
    }
  }

  if (!flyteClicked) {
    // Try by icon position (Flyte is usually the last custom icon)
    const allItems = page.locator(".activitybar .action-item");
    const totalItems = await allItems.count();
    if (totalItems > 4) {
      const lastCustom = allItems.nth(totalItems - 3);
      const box = await lastCustom.boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 15 });
        await sleep(300);
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      }
    }
  }

  await sleep(2000);
  await shot(page, "14-sidebar-flyte");

  // Click on ENVIRONMENTS section header
  const envHeader = page.locator('.pane-header:has-text("ENVIRONMENTS"), h3:has-text("ENVIRONMENTS"), [aria-label*="Environments"]').first();
  if (await envHeader.isVisible({ timeout: 2000 }).catch(() => false)) {
    await click(page, '.pane-header:has-text("ENVIRONMENTS"), h3:has-text("ENVIRONMENTS")');
    await sleep(800);

    // Click on individual environment items
    const envItems = page.locator('.tree-row:has-text("data-processing"), .monaco-list-row:has-text("data-processing")').first();
    if (await envItems.isVisible({ timeout: 1000 }).catch(() => false)) {
      const box = await envItems.boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 12 });
        await sleep(500);
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        await sleep(800);
      }
    }
  }

  await shot(page, "14b-env-clicked");

  // Click TASKS section
  const tasksHeader = page.locator('.pane-header:has-text("TASKS"), h3:has-text("TASKS"), [aria-label*="Tasks"]').first();
  if (await tasksHeader.isVisible({ timeout: 2000 }).catch(() => false)) {
    const box = await tasksHeader.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 12 });
      await sleep(300);
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await sleep(800);
    }

    // Click on a task item (e.g. fetch_dataset)
    const taskItem = page.locator('.monaco-list-row:has-text("fetch_dataset")').first();
    if (await taskItem.isVisible({ timeout: 1000 }).catch(() => false)) {
      const box2 = await taskItem.boundingBox();
      if (box2) {
        await page.mouse.move(box2.x + box2.width / 2, box2.y + box2.height / 2, { steps: 12 });
        await sleep(500);
        await page.mouse.click(box2.x + box2.width / 2, box2.y + box2.height / 2);
        await sleep(800);
      }
    }
  }

  await shot(page, "14c-tasks-clicked");

  // Click CLUSTERS section
  const clustersHeader = page.locator('.pane-header:has-text("CLUSTERS"), h3:has-text("CLUSTERS"), [aria-label*="Clusters"]').first();
  if (await clustersHeader.isVisible({ timeout: 2000 }).catch(() => false)) {
    const box = await clustersHeader.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 12 });
      await sleep(300);
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await sleep(800);
    }
  }

  await shot(page, "14d-clusters");

  // Click RUNS section
  const runsHeader = page.locator('.pane-header:has-text("RUNS"), h3:has-text("RUNS"), [aria-label*="Runs"]').first();
  if (await runsHeader.isVisible({ timeout: 2000 }).catch(() => false)) {
    const box = await runsHeader.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 12 });
      await sleep(300);
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await sleep(800);
    }
  }

  await shot(page, "14e-runs");
  await sleep(1000);
}

async function sceneClusterSetup(page) {
  console.log("[demo] >> Cluster setup - Union.ai");

  // The Union.ai button should be visible in the CLUSTERS section
  // It's a welcome view button when no clusters are configured
  const unionBtn = page.locator('a:has-text("Union.ai"), button:has-text("Union.ai"), .welcome-view-content a:has-text("Union")').first();

  if (await unionBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    const box = await unionBtn.boundingBox();
    if (box) {
      // Hover over it first
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 20 });
      await sleep(1000);
      await shot(page, "15-union-hover");

      // Click it
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await sleep(2000);

      await shot(page, "15b-union-clicked");

      // An input box should appear asking for endpoint
      const inputBox = page.locator('.quick-input-widget input, .input-box input').first();
      if (await inputBox.isVisible({ timeout: 3000 }).catch(() => false)) {
        await typeText(page, "dns:///my-org.unionai.cloud", SLOW_TYPE);
        await sleep(1000);
        await shot(page, "15c-union-endpoint");

        // Press Enter to confirm
        await press(page, "Enter");
        await sleep(1000);

        // Name input appears
        const nameInput = page.locator('.quick-input-widget input, .input-box input').first();
        if (await nameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          // Clear default and type custom name
          await press(page, "Control+a");
          await typeText(page, "production", SLOW_TYPE);
          await sleep(800);
          await shot(page, "15d-union-name");
          await press(page, "Enter");
          await sleep(2000);
        }
      }

      await shot(page, "15e-cluster-created");
    }
  } else {
    console.log("[demo]    Union.ai button not found, trying Self-Hosted");

    const selfHostedBtn = page.locator('a:has-text("Self-Hosted"), button:has-text("Self-Hosted")').first();
    if (await selfHostedBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      const box = await selfHostedBtn.boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 20 });
        await sleep(1000);
        await shot(page, "15-selfhosted-hover");
      }
    }
  }

  // Dismiss any remaining dialogs
  await press(page, "Escape");
  await sleep(500);
}

async function sceneSnippets(page) {
  console.log("[demo] >> Snippets");

  // Focus editor
  await press(page, "Control+1");
  await sleep(500);
  await press(page, "Control+End");
  await sleep(300);
  await press(page, "Enter");
  await press(page, "Enter");

  await typeText(page, "# Task from snippet");
  await press(page, "Enter");
  await sleep(300);

  await typeText(page, "ftask");
  await sleep(500);

  await press(page, "Control+Space");
  await sleep(1500);

  await shot(page, "16-snippets");

  // Click on the snippet item
  const snippetItem = page.locator('.suggest-widget .monaco-list-row').first();
  if (await snippetItem.isVisible({ timeout: 1000 }).catch(() => false)) {
    const box = await snippetItem.boundingBox();
    if (box) {
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    }
  } else {
    await press(page, "Enter");
  }

  await sleep(2000);
  await shot(page, "17-snippet-expanded");
}

async function sceneGraph(page) {
  console.log("[demo] >> Task graph via command palette");

  await press(page, "Control+Shift+p");
  await sleep(800);
  await typeText(page, "Flyte: Show Task Graph", FAST_TYPE);
  await sleep(1000);

  // Click the result
  const cmdItem = page.locator('.quick-input-list .monaco-list-row').first();
  if (await cmdItem.isVisible({ timeout: 2000 }).catch(() => false)) {
    const box = await cmdItem.boundingBox();
    if (box) {
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    }
  } else {
    await press(page, "Enter");
  }

  await sleep(3000);
  await shot(page, "18-graph");
}

// ─── Main ────────────────────────────────────────────────────────────

async function main() {
  console.log("[demo] Starting Playwright recorder...");

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox"],
  });

  const context = await browser.newContext({
    viewport: VIEWPORT,
    recordVideo: { dir: OUTPUT_DIR, size: VIEWPORT },
  });

  const page = await context.newPage();

  await waitForCodeServer(page);
  await shot(page, "01-loaded");

  // Close welcome/tabs
  await press(page, "Control+w");
  await sleep(300);
  await press(page, "Control+w");
  await sleep(300);
  await press(page, "Escape");
  await sleep(500);

  await shot(page, "02-clean");

  // ─── Demo flow ───
  await sceneOpenFile(page);
  await sceneBrowseCode(page);
  await sceneAutocomplete(page);
  await sceneGpuSuggestions(page);
  await sceneHoverDocs(page);
  await sceneCodeLens(page);
  await sceneSidebar(page);
  await sceneClusterSetup(page);
  await sceneSnippets(page);
  await sceneGraph(page);

  await sleep(2000);

  await page.close();
  await context.close();
  await browser.close();

  console.log("[demo] === Done! ===");
}

main().catch((err) => {
  console.error("[demo] FATAL:", err);
  process.exit(1);
});
