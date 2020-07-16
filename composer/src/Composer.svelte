<script>
  import { onMount } from "svelte";
  import { flow } from "./data/flow.mjs";
  import { registerInteractions } from "./interactions/manager.mjs";
  import { getAttributeMap, getStyleMap } from "./utilities/nodeUtilities.mjs";
  import xxhash from "xxhashjs";

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
        <svelte:component this={node.element} bind:node flow={flow}/>
      </svg>
      {#each node.ports as port, p}
        {#if port.wires}
          {#each port.wires as wire, w}
            <path
              d="M81,328 C177,326 89,374 191,371"
              style=" stroke-width: 3; stroke: #1E1935; stroke-linecap: round;
              fill: none;" />
          {/each}
        {/if}
      {/each}
    {/each}
  </svg>
</div>
