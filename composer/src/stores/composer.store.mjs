import { writable } from "svelte/store";

export const styles = new writable({
  path: {
    strokeWidth: 3,
  },
});

export const selected = new writable({});
export const flow = new writable({ nodes: [] });
let nodesLength = 0;
flow.subscribe(f => {
  if (f.nodes.length === nodesLength) return;
  let nodes = f.nodes.map(n => n.id);
  f.nodes.forEach(n => {
    let _wires = [];
    n.ports.forEach(p => {
      if (p.wires) {
        p.wires.forEach((w, i) => {
          if (nodes.indexOf(w.split(":")[0]) !== -1) {
            _wires.push(w);
          }
        })
      }
    });
    n.wires = _wires;
  });
  nodesLength = f.nodes.length;
})