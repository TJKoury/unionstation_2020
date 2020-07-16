import { flow, selected, selectable } from "../stores/composer.store.mjs";
let target, selectedElement, node, nodes, offset, minX, maxX, minY, maxY, confined;

function select(evt) {}
/*
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
*/
export function init(el) {
  selectable.subscribe((s) => {
    console.log(s);
  });
}
