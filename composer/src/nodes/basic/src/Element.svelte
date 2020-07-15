<script>
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
  export const style_node = {
    width: 140,
    height: 30
  };

  export const style_connector = {
    height: 10,
    width: 10
  };
  let ctypes = {};
  $: {
    node.io_ports.map(function(cV) {
      ctypes[cV.type] = ctypes[cV.type] || 0;
      ctypes[cV.type] += 1;
    });

    let conn_count = Object.values(ctypes).sort((a, b) => (a > b ? -1 : 1))[0];
    console.log(conn_count * (style_connector.height * 1.5));
    style_node.height = Math.max(
      style_default.node.height,
      conn_count * (style_connector.height * 1.5)
    );
  }
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

<rect class="node" style={styleString(style_node)} ry={node.attributes.ry} />
{#if node.io_ports}
  <svg overflow="visible" shape-rendering="auto">
    {#each node.io_ports.filter(p => !p.type) as io_port, i}
      <g
        transform="translate( {0 - style_connector.width / 2}, {i * style_connector.height})">
        <rect
          class="connector"
          rx="3"
          ry="3"
          y={ctypes[0] * style_connector.height}
          style={styleString(style_connector)} />
      </g>
    {/each}
    {#each node.io_ports.filter(p => p.type) as io_port, i}
      <g
        transform="translate( {style_node.width - style_connector.width / 2}, {i * style_connector.height})">
        <rect
          class="connector"
          rx="3"
          ry="3"
          y={ctypes[0] * style_connector.height}
          style={styleString(style_connector)} />
      </g>
    {/each}
  </svg>
{/if}
<text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" style="">
  template
</text>
