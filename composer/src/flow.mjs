import { flow, ports, selectedItems, globalStyle } from "./stores/composer.store.mjs";

let sWires;

let ef = (port) => {
  if (port) {
    let { e, f } = port.getCTM();
    let { width, height } = port.getBoundingClientRect();
    e = e + width / 2;
    f = f - globalStyle.path.strokeWidth / 2 + height / 2;
    return { e, f, width, height };
  }
};

selectedItems.subscribe((s) => {
  sWires = s.wires;
});

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
  let nodeGroups = document.querySelectorAll(".nodegroup");
  nodeGroups.forEach((ng) => {
    let pE = ng.parentElement;
    ["removeChild", "appendChild"].forEach((x) => {
      pE[x](ng);
    });
  }); //z-index HAAAACK
});

export const updateWires = (inflow, removeWires) => {
  let updateWireFunc = (f) => {
    let nodes = f.nodes.map((n) => n.id);
    f.nodes.forEach(async (n) => {
      n.ports.forEach((p, pi) => {
        let _wires = [];
        if (p.wires) {
          p.wires.forEach((w, i) => {
            if (nodes.indexOf(w.split(":")[0]) > -1 && (!removeWires || sWires[`${n.id}:${pi}-${w}`] === undefined)) {
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

export const loadFlow = (importedFlow) => {
  flow.set(importedFlow);
  updateWires();
};
