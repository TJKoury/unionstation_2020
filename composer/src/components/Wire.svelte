<script>
  import {
    flow,
    ports as sports,
    selectedItems,
    globalStyle,
    handleSemantics
  } from "../stores/composer.store.mjs";
  export let node;
  export let p;
  export let w;

  let { handleX } = globalStyle;
  let selected = false;
  let dStyle = document.documentElement.style;
  let ports;
  let targetNode = (node, p, w) => node.ports[p].wires[w];
  const wireID = (node, p, w) => `${node.id}:${p}-${targetNode(node, p, w)}`;

  selectedItems.subscribe(function(s) {
    selected = s.wires[wireID(node, p, w)];
  });

  sports.subscribe(p => {
    ports = p;
  });

  dStyle.setProperty("--wire_strokeWidth", globalStyle.path.strokeWidth);

  function m1(node, p, n) {
    let port = ports[node.id + ":" + p];
    if (!!port) {
      const { e, f } = port;
      return n ? [e, f] : `M${e} ${f}`;
    } else {
      return false;
    }
  }

  function c1(node, p) {
    let c1p = m1(node, p, true);
    return `C${c1p[0] + handleX} ${c1p[1]}`;
  }

  function m2(node, p, w, n) {
    let port = ports[targetNode(node, p, w)];
    if (!!port) {
      const { e, f } = port;
      return n ? [e, f] : `${e} ${f}`;
    } else {
      return false;
    }
  }

  function c2(node, p, w) {
    let c1p = m2(node, p, w, true);
    return `${c1p[0] - handleX} ${c1p[1]}`;
  }
</script>

<style>
  :root {
    --wire_stroke: #777;
  }
  path {
    stroke-width: var(--wire_strokeWidth);
    stroke: var(--wire_stroke);
    stroke-linecap: round;
    fill: #00000000;
  }
  path.selected {
    stroke: orange;
    pointer-events: none !important;
  }
  .wireOutline {
    stroke-width: calc(var(--wire_strokeWidth) + 2);
    stroke: white;
    pointer-events: none !important;
  }
</style>

{#if m2(node, p, w) && Object.keys(ports).length}
  <path
    class="wireOutline"
    d="{m1(node, p)}
    {c1(node, p)}
    {c2(node, p, w)}
    {m2(node, p, w)}" />
  <path
    class="wire"
    class:selected={selected || targetNode(node, p, w) === handleSemantics.wireHandlePort}
    id={wireID(node, p, w)}
    d="{m1(node, p)}
    {c1(node, p)}
    {c2(node, p, w) || '0 0'}
    {m2(node, p, w) || '0 0'}" />
{/if}
