import { flow, selected, selectable } from "../stores/composer.store.mjs";
let target;

function startSelect(evt) {
  console.log(evt.target);
}

export let mapping = {
  mousedown: startSelect,
  //mousemove: drag,
  //mouseup: endDrag,
  //["mouseleave": endDrag,
  /*touchstart: startDrag,
  touchmove: drag,
  touchend: endDrag,
  touchleave: endDrag,
  touchcancel: endDrag,*/
};

export function init(el) {
  target = el;
  Object.entries(mapping).map((a) => {
    target.addEventListener(a[0], a[1], { passive: false });
  });
  selectable.subscribe((s) => {
    console.log(s);
  });
}
