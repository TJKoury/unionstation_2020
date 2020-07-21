//THIS GETS GENERATED in a package.json

import { flow, ports, globalStyle } from "./stores/composer.store.mjs";

let ef = (port) => {
  if (port) {
    let { e, f } = port.getCTM();
    let { width, height } = port.getBoundingClientRect();
    e = e + width / 2;
    f = f - globalStyle.path.strokeWidth / 2 + height / 2;
    return { e, f, width, height };
  }
};

flow.subscribe((f) => {
  let _ports = {};
  f.nodes.forEach(async (n) => {
    n.ports.forEach((p, i) => {
      let _pID = n.id + ":" + i;
      let _port = ef(document.getElementById(_pID));
      if (_port) {
        _ports[_pID] = _port;
      }
    });
  });
  ports.set(_ports);
});

export const updateWires = (inflow) => {
  let updateWireFunc = (f) => {
    let nodes = f.nodes.map((n) => n.id);
    f.nodes.forEach(async (n) => {
      n.ports.forEach((p) => {
        let _wires = [];
        if (p.wires) {
          p.wires.forEach((w, i) => {
            if (nodes.indexOf(w.split(":")[0]) > -1) {
              _wires.push(w);
            }
          });
        }
        p.wires = _wires;
      });
    });

    return f;
  };

  if (!inflow) {
    flow.update(updateWireFunc);
  } else {
    flow.update((f) => updateWireFunc(inflow));
  }
};

export const loadFlow = () => {
  flow.set({
    nodes: [
      {
        id: "d46ca6a8",
        position: {
          x: 100,
          y: 100,
        },
        ports: [{ type: 0 }, { type: 1, wires: ["525fa64c:0"] }, { type: 1, wires: ["025fa64c:0"] }, { type: 1 }],
      },
      {
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
      },
      {
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
      },
    ],
  });
  updateWires();
};
