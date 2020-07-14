<script>
  import { onMount } from "svelte";
  import { nodeList } from "./data/flow.mjs";
  import { makeDraggable } from "./interactions/dragInteractions.mjs";
  import { getAttributeMap, getStyleMap } from "./utilities/nodeUtilities.mjs";

  onMount(() => {
    let _svg = document.getElementById("stage");
    makeDraggable({ target: _svg });
    globalThis.resizeNN = () => {
      nodeList[0].width = 1000;
    };
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
  <svg xmlns="http://www.w3.org/2000/svg" id="stage">

    {#each nodeList as node, i}
      {@html node.style}
      <svg
        overflow="visible"
        shape-rendering="optimizeQuality"
        class="nodegroup draggable"
        x={node.attributes.x}
        y={node.attributes.y}
        width={node.attributes.width}
        height={node.attributes.height}>

        <svelte:component this={node.component} bind:node />
      </svg>
    {/each}
  </svg>
</div>
