<script>
  import { flow, selectedItems } from "../stores/composer.store.mjs";
  export let node;
  export let p;
  export let w;

  let handleX = 100;
  let selected = false;

  let targetNode = (node, p, w) => node.ports[p].wires[w];
  const wireID = (node, p, w) => `${node.id}:${p}-${targetNode(node, p, w)}`;

  selectedItems.subscribe(function(s) {
    selected = s[wireID(node, p, w)];
  });

  let dStyle = document.documentElement.style;
  dStyle.setProperty("--wire_strokeWidth", 3);

  let ef = port => {
    let { e, f } = port.getCTM();
    let { width, height } = port.getBoundingClientRect();
    e = e + width / 2;
    f =
      f -
      parseFloat(dStyle.getPropertyValue("--wire_strokeWidth")) / 2 +
      height / 2;
    return { e, f };
  };

  function m1(node, p, n) {
    let port = document.getElementById(node.id + ":" + p);
    if (!!port) {
      const { e, f } = ef(port);
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
    let port = document.getElementById(targetNode(node, p, w));
    if (!!port) {
      const { e, f } = ef(port);
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
  }
</style>

<path
  class="wire"
  class:selected
  id={wireID(node, p, w)}
  d="{m1(node, p)}
  {c1(node, p)}
  {c2(node, p, w)}
  {m2(node, p, w)}" />
