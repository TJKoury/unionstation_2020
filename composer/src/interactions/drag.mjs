import { flow, selected } from "../stores/composer.store.mjs";
let target,
  selectedElements,
  nodes,
  offset,
  minX,
  maxX,
  minY,
  maxY,
  confined,
  dragging = false,
  originalPositions = {};

flow.subscribe((f) => {
  nodes = f.nodes;
});
selected.subscribe((s) => {
  selectedElements = s;
});
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

export function match(el) {
  return Array.from(el.classList).indexOf("dragHandle") > -1;
}

export function startDrag(evt) {
  offset = getMousePosition(evt);
  for (let sID in selectedElements) {
    let sEA = document.getElementById(sID).attributes;
    originalPositions[sID] = { x: parseFloat(sEA.getNamedItem("x").value), y: parseFloat(sEA.getNamedItem("y").value) };
  }
  dragging = true;
}

export function drag(evt) {
  if (Object.keys(selectedElements).length && dragging) {
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

export function endDrag(evt) {
  dragging = false;
  originalPositions = {};
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
