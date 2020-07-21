<script>
  import { onMount } from "svelte";
  import { flow, selectedItems } from "./stores/composer.store.mjs";
  import { loadFlow } from "./flow.mjs";
  import { registerInteractions } from "./interactions/manager.mjs";
  import Wire from "./components/Wire.svelte";
  import Element from "./components/Element.svelte";
  import xxhash from "xxhashjs";

  const eExist = id => {
    return !!document.getElementById(id);
  };

  onMount(() => {
    loadFlow();
    let stage = document.getElementById("stage");
    registerInteractions(stage);
    setTimeout(() => flow.update(f => f), 1);
    globalThis.exportFlow = () => {
      console.log(JSON.stringify($flow));
    };
  });
</script>

<style>
  #node-explorer {
    color: white;
    user-select: none;
    outline: none;
    position: fixed;
    width: 100%;
    height: 100%;
    overflow: scroll;
  }

  #stage {
  }

  :global(body) {
    overflow: hidden;
    padding: 0px;
    margin: 0px;
  }
</style>

<!-- prettier-ignore -->
<!--viewBox="0,0,500,500"
    preserveAspectRatio="xMidYMid meet"-->
<div id="node-explorer" tabindex="0">
  <svg width="5000" height="5000" xmlns="http://www.w3.org/2000/svg" id="stage">
    {#each $flow.nodes as node, i}
      {#each node.ports as port, p}
        {#if port.wires}
          {#each port.wires as wire, w}
            {#if eExist(node.id + ':' + p) && eExist(wire)}
              <Wire {node} {p} {w} />
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
        <Element {node} {flow} />
      </svg>
    {/each}
  </svg>
</div>
