<script>
  import { onMount } from "svelte";
  export let flow;
  export let node;
  export let sStore;

  let selected = false;
  sStore.subscribe(s => {
    selected = s[node.id];
  });

  let totals = [];

  let styles = {
    rect: {
      width: 140,
      height: 30
    },
    wireHandle: {
      width: 10,
      height: 10,
      spacing: 0.25
    }
  };

  let resize = () => {
    let _totals = [];
    node.ports.map(p => {
      _totals[p.type] = _totals[p.type] || 0;
      _totals[p.type] += 1;
    });
    let match = true;
    _totals.forEach(n => {
      if (totals.indexOf(n) === -1) {
        match = false;
      }
    });
    if (match) return;

    totals = _totals.sort((a, b) => (a > b ? -1 : 1));

    let { rect, wireHandle } = styles;
    let { width, height } = styles.rect;
    let sh = wireHandle.height;
    let sp = sh * (1 + wireHandle.spacing);
    styles.rect.height = Math.max(styles.rect.height, (totals[0] + 1) * sp);

    Object.assign(node, styles.rect);
  };

  let getCYPos = (i, n) => {
    let { rect, wireHandle } = styles;
    let cports = n.ports.filter(np => np.type === n.ports[i].type);
    i = cports.indexOf(n.ports[i]);
    let sh = wireHandle.height;
    let sp = sh * wireHandle.spacing;
    let theight = cports.length * sh + (cports.length - 1) * sp;
    return (rect.height - theight) / 2 + i * (sh + sp) || 0;
  };

  onMount(() => {
    resize();
    flow.subscribe(f => {
      resize();
    });
  });
</script>

<style>
  .node {
    fill: rgb(231, 231, 174, 0.75);
    stroke: #999;
    stroke-width: 1px;
    cursor: move;
  }
  .node.selected {
    stroke: orange;
    stroke-width: 2px;
  }
  .wireHandle {
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

{#if node.id !== 'wireHandleNode'}
  <rect
    class="node dragHandle"
    class:selected
    rx="10"
    ry="10"
    style="width:{styles.rect.width}px; height:{styles.rect.height}px" />
  {#if node.ports}
    {#each node.ports as port, i}
      <g
        id="{node.id}:{i}"
        transform="translate( {(port.type && node.width ? node.width : 0) - styles.wireHandle.width / 2},
        {getCYPos(i, node)})">
        <rect
          class="wireHandle"
          rx="3"
          ry="3"
          style="width:{styles.wireHandle.width}px; height:{styles.wireHandle.height}px" />
      </g>
    {/each}
  {/if}
  <text
    class="dragHandle"
    x="50%"
    y="50%"
    text-anchor="middle"
    dominant-baseline="middle">
    {!!selected}
  </text>
{/if}
