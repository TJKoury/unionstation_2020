import { flow, selected } from "../stores/composer.store.mjs";
let target,
  selectedElements,
  offset,
  minX,
  maxX,
  minY,
  maxY,
  confined,
  dragging = false,
  originalPositions = {};

selected.subscribe((s) => {
  selectedElements = s;
});

const pfG = (sA, v) => parseFloat(sA.getNamedItem(v).value);
const sAttr = (id) => document.getElementById(id).attributes;
const cC = (cl, cL) => cL.indexOf(cl) !== -1;

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
  const classList = Array.from(evt.target.classList);
  if (cC("dragHandle", classList)) {
    startNodeDrag(evt);
  } else if (cC("wireHandle", classList)) {
    startWireDrag(evt);
  }
}

export function startWireDrag(evt) {
  let [nID, pID] = evt.target.closest("g").id.split(":");
  const initXY = getMousePosition(evt);
  console.log(nID, parseInt(pID));
  flow.update((f) => {
    let nWN = f.nodes["wireHandleNode"];
    if (!nWN) {
      f.nodes["wireHandleNode"] = {
        id: "wireHandleNode",
        ports: [{ type: 0 }],
        width: 1,
        height: 1,
        position: initXY,
      };
    }
    console.log(f.nodes[nID]);
    return f;
  });
  dragging = "wire";
}

export function startNodeDrag(evt) {
  offset = getMousePosition(evt);
  for (let sID in selectedElements) {
    let sA = sAttr(sID);
    originalPositions[sID] = { x: pfG(sA, "x"), y: pfG(sA, "y") };
  }
  dragging = "node";
}

export function drag(evt) {
  if (!dragging) return;
  if (dragging === "node") {
    nodeDrag(evt);
  } else if (dragging === "wire") {
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
    let dNode = f.nodes.find((n) => n.id === "wireHandleNode");
    f.nodes[f.nodes.indexOf(dNode)].position = mXY;
    return f;
  });
}
export function endDrag(evt) {
  dragging = false;
  originalPositions = {};
  flow.update((f) => {
    f.nodes = f.nodes.filter((n) => n.id !== "wireHandleNode");
    return f;
  });
}

export let mapping = {
  mousedown: startDrag,
  mousemove: drag,
  mouseup: endDrag,
  //["mouseleave": endDrag,
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
