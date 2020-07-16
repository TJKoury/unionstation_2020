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
  return Array.from(el.classList).indexOf("dragHandle") > -1;
}

export function startDrag(evt) {
  if (!match(evt.target)) return false;
  selectedElement = evt.target.closest(".draggable");
  if (!selectedElement) return false;
  let sE = selectedElement.attributes;

  evt.stopPropagation();
  node = nodes.filter((n) => {
    return n.id === sE.getNamedItem("id").value;
  })[0];
  offset = getMousePosition(evt);
  let { x, y } = sE;
  offset.x -= x.value;
  offset.y -= y.value;
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
  Object.entries(mapping).map((a) => {
    target.addEventListener(a[0], a[1], { passive: false });
  });
}
