<script>
  import { onMount } from "svelte";
  import { flow } from "./data/flow.mjs";
  import { registerInteractions } from "./interactions/manager.mjs";
  import { getAttributeMap, getStyleMap } from "./utilities/nodeUtilities.mjs";
  import xxhash from "xxhashjs";
  let styles = {
    path: {
      strokeWidth: 3
    }
  };

  function in_port(node, p, n) {
    let port = document.getElementById(node.id + ":" + p);
    if (!!port) {
      console.log();
      let { e, f } = port.getScreenCTM();
      f = f + styles.path.strokeWidth / 2 - port.getBBox().height / 2;
      return n ? [e, f] : `${e}, ${f}`;
    } else {
      return false;
    }
  }

  function c1(node, p) {
    let c1p = in_port(node, p, true);
    return `C${c1p[0] + 100}, ${c1p[1]}`;
  }

  onMount(() => {
    registerInteractions(document.getElementById("stage"));
    Object.defineProperty(globalThis, "flow", {
      get() {
        return flow;
      }
    });
    setTimeout(() => {
      flow.update(f => f);
    }, 1);
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
      {#each node.ports as port, p}
        {#if port.wires}
          {#each port.wires as wire, w}
            {#if in_port(node, p)}
              <path
                d="M{in_port(node, p)}
                {c1(node, p)} 89,374 191,371"
                style=" stroke-width: {styles.path.strokeWidth}; stroke:
                #1E1935; stroke-linecap: round; fill: none;" />
            {/if}
          {/each}
        {/if}
      {/each}
      <svg
        id={node.id}
        overflow="visible"
        shape-rendering="optimizeQuality"
        class="nodegroup draggable"
        x={node.position.x}
        y={node.position.y}
        width={node.width}
        height={node.height}>
        <svelte:component this={node.element} bind:node {flow} />
      </svg>
    {/each}
  </svg>
</div>
