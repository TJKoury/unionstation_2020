//THIS GETS GENERATED in a package.json

import { BasicNode } from "./components/nodes/basic/index.mjs";
import { flow } from "./stores/composer.store.mjs";

let nodesLength = 0;

flow.subscribe((f) => {
  if (f.nodes.length === nodesLength) return;
  let nodes = f.nodes.map((n) => n.id);
  f.nodes.forEach((n) => {
    let _wires = [];
    n.ports.forEach((p) => {
      if (p.wires) {
        p.wires.forEach((w, i) => {
          if (nodes.indexOf(w.split(":")[0]) !== -1) {
            _wires.push(w);
          }
        });
      } else {
        p.wires = [];
      }
    });
    n.wires = _wires;
  });
  nodesLength = f.nodes.length;
});

export const loadFlow = () => {
  flow.set({
    nodes: [
      new BasicNode({
        id: "d46ca6a8",
        position: {
          x: 100,
          y: 100,
        },
        ports: [{ type: 0 }, { type: 1, wires: ["525fa64c:0"] }, { type: 1, wires: ["025fa64c:0"] }, { type: 1 }],
      }),
      new BasicNode({
        id: "525fa64c",
        position: {
          x: 200,
          y: 200,
        },
        ports: [
          { id: 1, type: 0 },
          { id: 2, type: 1 },
          { id: 3, type: 1 },
          { id: 4, type: 1 },
        ],
        wires: [],
      }),
      new BasicNode({
        id: "025fa64c",
        position: {
          x: 200,
          y: 340,
        },
        ports: [
          { id: 1, type: 0 },
          { id: 2, type: 1 },
          { id: 3, type: 1 },
          { id: 4, type: 1 },
        ],
        wires: [],
      }),
    ],
  });
};
