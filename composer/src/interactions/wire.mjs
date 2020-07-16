import { flow } from "../data/flow.mjs";
let target, selectedElement, node, nodes, offset, minX, maxX, minY, maxY, confined;

flow.subscribe((f) => {
  nodes = f.nodes;
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
  return Array.from(el.classList).indexOf("wireHandle") > -1;
}

export function startDrag(evt) {

}

export function drag(evt) {
  if (selectedElement) {
    evt.preventDefault();

    let coord = getMousePosition(evt);
    let sE = selectedElement.attributes;
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
    sE.x.value = dx;
    sE.y.value = dy;
    flow.update((f) => {
      f.nodes[f.nodes.indexOf(node)].position = {
        x: dx,
        y: dy,
      };
      return f;
    });
    node.position.x = dx;
    node.position.y = dy;
  }
}

export function endDrag(evt) {
  selectedElement = false;
  node = false;
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
}
