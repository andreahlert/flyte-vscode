import { makeProject } from "@motion-canvas/core";
import intro from "./scenes/intro?scene";
import editor from "./scenes/editor?scene";
import completion from "./scenes/completion?scene";
import hover from "./scenes/hover?scene";
import codelens from "./scenes/codelens?scene";
import sidebar from "./scenes/sidebar?scene";
import gpu from "./scenes/gpu?scene";
import outro from "./scenes/outro?scene";

export default makeProject({
  scenes: [intro, editor, completion, hover, codelens, sidebar, gpu, outro],
});
