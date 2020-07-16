<script>
  import { onMount } from "svelte";
  export let node;

  let styleString = a =>
    Object.entries(a)
      .map(a => `${a[0]}:${a[1]}`)
      .join(";");

  let style_default = {
    node: {
      width: 140,
      height: 30
    },
    connector: {
      width: 10,
      height: 10
    }
  };

  export const style_connector = {
    height: 10,
    width: 10
  };

  let ctypes = {};

  export let recalc = () => {
    ctypes = {};
    node.io_ports.map(function(cV) {
      ctypes[cV.type] = ctypes[cV.type] || 0;
      ctypes[cV.type] += 1;
    });
    let conn_count = Object.values(ctypes).sort((a, b) => (a > b ? -1 : 1))[0];
    node.height = Math.max(
      style_default.node.height,
      conn_count * (style_connector.height * 1.5)
    );
  };

  let getCYPos = (i, n) => {
    if (!ctypes[n]) {
      recalc();
    }
    let sh = style_connector.height;
    let sp = sh * 0.25;
    let theight = ctypes[n] * sh + (ctypes[n] - 1) * sp;
    return (node.height - theight) / 2 + i * (sh + sp) || 0;
  };

  onMount(() => {
    recalc();
  });
</script>

<style>
  .node {
    fill: rgb(231, 231, 174);
    stroke: #999;
    stroke-width: 1px;
    cursor: move;
  }
  .connector {
    stroke: #999;
    stroke-width: 1;
    fill: #d9d9d9;
    cursor: crosshair;
  }
  text {
    fill: black;
    cursor: move;
  }
</style>

<rect
  class="node dragHandle"
  style={styleString({ width: node.width, height: node.height })}
  ry={node.ry} />
{#if node.io_ports}
  {#each node.io_ports.filter(p => !p.type) as io_port, i}
    <g
      transform="translate( {0 - style_connector.width / 2}, {getCYPos(i, 0)})">
      <rect
        class="connector"
        rx="3"
        ry="3"
        style={styleString(style_connector)} />
    </g>
  {/each}
  {#each node.io_ports.filter(p => p.type) as io_port, i}
    <g
      transform="translate( {node.width - style_connector.width / 2},{getCYPos(i, 1)})">
      <rect
        class="connector"
        rx="3"
        ry="3"
        style={styleString(style_connector)} />
    </g>
  {/each}
{/if}
<text class="dragHandle" x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" style="">
  {node.id.split('-')[0]}
</text>
