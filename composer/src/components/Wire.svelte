<script>
  import { flow, selectedItems } from "../stores/composer.store.mjs";
  export let node;
  export let p;
  export let w;

  let styles = {
    path: {
      strokeWidth: 3,
      stroke: "#777"
    },
    handleX: 100
  };

  let ef = port => {
    let { e, f } = port.getCTM();
    let { width, height } = port.getBoundingClientRect();
    e = e + width / 2;
    f = f - styles.path.strokeWidth / 2 + height / 2;
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
    return `C${c1p[0] + styles.handleX} ${c1p[1]}`;
  }

  function m2(node, p, w, n) {
    let port = document.getElementById(node.ports[p].wires[w]);
    if (!!port) {
      const { e, f } = ef(port);
      return n ? [e, f] : `${e} ${f}`;
    } else {
      return false;
    }
  }

  function c2(node, p, w) {
    let c1p = m2(node, p, w, true);
    return `${c1p[0] - styles.handleX} ${c1p[1]}`;
  }
</script>

<path
  class="wire"
  d="{m1(node, p)}
  {c1(node, p)}
  {c2(node, p, w)}
  {m2(node, p, w)}"
  style="stroke-width: {styles.path.strokeWidth}; stroke: {styles.path.stroke};
  stroke-linecap: round; fill: #00000000;" />
