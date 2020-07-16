<script>
  import { onMount } from "svelte";
  import { flow } from "./data/flow.mjs";
  import { registerInteractions } from "./interactions/manager.mjs";
  import { getAttributeMap, getStyleMap } from "./utilities/nodeUtilities.mjs";

  onMount(() => {
    registerInteractions(document.getElementById("stage"));
    Object.defineProperty(globalThis, "flow", {
      get() {
        return flow;
      }
    });
  });
</script>

<style>
  #node-explorer {
    color: white;
    user-select: none;
    outline: none;
  }

  #stage {
    width: 100%;
    height: 100%;
    position: fixed;
  }
  :global(body) {
    overflow: hidden;
    padding: none;
  }
</style>

<!-- prettier-ignore -->
<div id="node-explorer" tabindex="0">
  <svg xmlns="http://www.w3.org/2000/svg" overflow="visible" id="stage">

    {#each $flow.nodes as node, i}
      <svg
        id={node.id}
        overflow="visible"
        shape-rendering="optimizeQuality"
        class="nodegroup draggable"
        x={node.position.x}
        y={node.position.y}
        width={node.width}
        height={node.height}>
        <svelte:component this={node.element} bind:node />
      </svg>
    {/each}
  </svg>
</div>
