import { flow, selectedItems } from "../stores/composer.store.mjs";

let target,
  selectedElements,
  offset,
  minX,
  maxX,
  minY,
  maxY,
  confined,
  dragging = { active: false, outNode: null, outPort: null },
  originalPositions = {},
  whP = "wireHandleNode:0",
  wH = "wireHandleNode";

selectedItems.subscribe((s) => {
  selectedElements = s;
});

const pfG = (sA, v) => parseFloat(sA.getNamedItem(v)?.value || 0);
const sAttr = (id) => document.getElementById(id).attributes;
const cC = (cL, cname) => Array.from(cL).indexOf(cname) !== -1;

function getMousePosition(evt) {
  if (!target.getScreenCTM) return;
  let CTM = target.getScreenCTM();
  if (evt.touches) {
    evt = evt.touches[0];
  }
  return {
    x: (evt.clientX - CTM.e) / CTM.a,
    y: (evt.clientY - CTM.f) / CTM.d,
  };
}

export function startDrag(evt) {
  const { classList } = evt.target;
  if (cC(classList, "dragHandle")) {
    startNodeDrag(evt);
  } else if (cC(classList, "wireHandle")) {
    startWireDrag(evt);
  }
}

export function startWireDrag(evt) {
  const { classList } = evt.target;
  if (cC(classList, "in")) return;
  let [nID, pID] = evt.target.closest("g").id.split(":");
  pID = parseInt(pID);
  const initXY = getMousePosition(evt);
  flow.update((f) => {
    let nWN = f.nodes.find((n) => n.id === wH);
    if (!nWN) {
      f.nodes.push({
        id: wH,
        ports: [{ type: 0 }],
        width: 1,
        height: 1,
        element: function () {},
        position: initXY,
      });
      let pWN = f.nodes.find((n) => n.id === nID);
      pWN.ports[pID].wires.push(whP);
      dragging.outNode = pWN;
      dragging.outPort = pID;
    }
    return f;
  });
  dragging.active = "wire";
}

export function startNodeDrag(evt) {
  offset = getMousePosition(evt);
  for (let sID in selectedElements) {
    let sA = sAttr(sID);
    originalPositions[sID] = { x: pfG(sA, "x"), y: pfG(sA, "y") };
  }
  dragging.active = "node";
}

export function drag(evt) {
  if (!dragging.active) return;
  if (dragging.active === "node") {
    nodeDrag(evt);
  } else if (dragging.active === "wire") {
    wireDrag(evt);
  }
}

export function nodeDrag(evt) {
  if (Object.keys(selectedElements).length) {
    evt.preventDefault();
    for (let sID in selectedElements) {
      let selNode = selectedElements[sID];
      let coord = getMousePosition(evt);
      let dx = coord.x - offset.x;
      let dy = coord.y - offset.y;

      if (confined) {
        if (dx < minX) {
          dx = minX;
        } else if (dx > maxX) {
          dx = maxX;
        }
        if (dy < minY) {
          dy = minY;
        } else if (dy > maxY) {
          dy = maxY;
        }
      }
      let sE = document.getElementById(selNode.id).attributes;
      let nX = originalPositions[sID].x + dx;
      let nY = originalPositions[sID].y + dy;
      if (!sE.x || !sE.y) return;
      sE.x.value = nX;
      sE.y.value = nY;
      flow.update((f) => {
        f.nodes[f.nodes.indexOf(selNode)].position = {
          x: nX,
          y: nY,
        };
        return f;
      });
    }
  }
}
export function wireDrag(evt) {
  const mXY = getMousePosition(evt);
  flow.update((f) => {
    let dNode = f.nodes.find((n) => n.id === wH);
    f.nodes[f.nodes.indexOf(dNode)].position = mXY;
    return f;
  });
}
export function endDrag(evt) {
  const { classList } = evt.target;
  if (dragging.active === "wire") {
    flow.update((f) => {
      let dNode = f.nodes.indexOf(dragging.outNode);
      let wires = () => f.nodes[dNode].ports[dragging.outPort].wires;
      f.nodes[dNode].ports[dragging.outPort].wires = wires().filter((w) => w !== whP);
      console.log(evt.target, classList);
      if (cC(classList, "wireHandle") && cC(classList, "in")) {
        let portID = evt.target.closest("g").id;
        let [nID, pID] = portID.split(":");
        pID = parseInt(pID);
        if (wires().indexOf(portID) === -1) {
          f.nodes[dNode].ports[dragging.outPort].wires.push(portID);
        }
        let toNode = document.getElementById(nID);
        let pE = toNode.parentElement;
        pE.removeChild(toNode);
        pE.appendChild(toNode);
      }
      return f;
    });
  }
  dragging.active = false;
  originalPositions = {};
  flow.update((f) => {
    f.nodes = f.nodes.filter((n) => n.id !== wH);
    return f;
  });
}

export let mapping = {
  mousedown: startDrag,
  mousemove: drag,
  mouseup: endDrag,
  //mouseleave: endDrag,
  touchstart: startDrag,
  touchmove: drag,
  touchend: endDrag,
  touchleave: endDrag,
  touchcancel: endDrag,
};

export function init(el) {
  target = el;
  Object.entries(mapping).map((a) => {
    target.addEventListener(a[0], a[1], { passive: false });
  });
}
