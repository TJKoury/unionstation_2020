import { flow, selected } from "../stores/composer.store.mjs";
let target, nodes;
flow.subscribe((f) => {
  nodes = f.nodes;
});
function nodeSelect(evt) {
  const sID = evt.target.closest(".draggable").id;
  selected.update((s) => {
    if (!evt.ctrlKey) {
      s = {};
    }
    if (s[sID]) {
      delete s[sID];
    } else {
      s[sID] = true;
    }

    console.log(s);
    return s;
  });
}

function startSelect(evt) {
  const classList = Array.from(evt.target.classList);
  if (classList.includes("dragHandle")) {
    nodeSelect(evt);
  }
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
}
