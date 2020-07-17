<script>
  import { onMount } from "svelte";
  import { flow, selected } from "./stores/composer.store.mjs";
  import { loadFlow } from "./flow.mjs";
  import { registerInteractions } from "./interactions/manager.mjs";
  import { m1, c1, m2, c2, styleStore as wireStyle } from "./components/wire.mjs";

  import xxhash from "xxhashjs";

  onMount(() => {
    loadFlow();
    let stage = document.getElementById("stage");
    registerInteractions(stage);
    setTimeout(() => flow.update(f => f), 1);
    globalThis.flow = flow;
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
            {#if m1(node, p) && !!document.getElementById(wire)}
              <path
                class="wire"
                d="{m1(node, p)}
                {c1(node, p)}
                {c2(node, p, w)}
                {m2(node, p, w)}"
                style=" stroke-width: {$wireStyle.path.strokeWidth}; stroke:
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
        <svelte:component
          this={node.element}
          bind:node
          {flow}
          sStore={selected} />
      </svg>
    {/each}
  </svg>
</div>
