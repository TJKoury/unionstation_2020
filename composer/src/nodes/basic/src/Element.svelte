<script>
  export let node;
  let styleString = a =>
    Object.entries(a)
      .map(a => `${a[0]}:${a[1]}`)
      .join(";");

  export const style_node = {
    width: 140,
    height: 30
  };
  export const style_connector = {
    height: 10,
    width: 10
  };
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
    {#each node.io_ports as io_port, i}
      <g
        transform="translate({io_port.type === 0 ? 0 - style_connector.width / 2 : style_node.width - style_connector.width / 2},{style_node.height / 2 - style_connector.height / 2})">
        <rect
          class="connector"
          rx="3"
          ry="3"
          style={styleString(style_connector)} />
      </g>
    {/each}
  </svg>
{/if}
<text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" style="">
  template
</text>
