<script>
  export let node;
  const cradius = 10;
</script>

<style>
  .node {
    fill: rgb(231, 231, 174);
    width: 140px;
    height: 30px;
    stroke: #999;
    stroke-width: 1px;
    cursor: move;
  }
  text {
    fill: black;
    cursor: move;
  }
</style>

<rect class="node" ry={node.attributes.ry} />
{#if node.io_ports}
  <svg shape-rendering="auto">
    {#each node.io_ports.filter(f => f.type === 'input') as io_port, i}
      <g transform="translate(0,10)">
        <rect
          rx="3"
          ry="3"
          width="10"
          height="10"
          style="stroke: #999; stroke-width: 1; fill: #d9d9d9; cursor:crosshair;" />
      </g>
    {/each}
  </svg>
  <svg x={node.width} y="0">
    {#each node.io_ports.filter(f => f.type !== 'input') as io_port, i}
      <rect
        class="node-connection"
        rx="3"
        ry="3"
        fill="black"
        y={i * cradius}
        width={cradius}
        height={cradius} />
    {/each}
  </svg>
{/if}
<text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" style="">
  template
</text>
