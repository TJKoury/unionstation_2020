import { flow, selected } from "../stores/composer.store.mjs";
let target, nodes;
flow.subscribe((f) => {
  nodes = f.nodes;
});

const stageCheck = (evt) => evt.target.id === "stage";

function nodeSelect(evt) {
  let sID = evt.target.closest(".draggable");

  if (sID) {
    sID = sID.id;
  }

  selected.update((s) => {
    if (stageCheck(evt)) {
      s = {};
      return s;
    }
    const isSelected = Object.keys(s).indexOf(sID) > -1;
    if (!evt.ctrlKey && !isSelected) {
      s = {};
    } else if (evt.ctrlKey && isSelected) {
      delete s[sID];
    }
    s[sID] = nodes.filter((n) => n.id === sID)[0];

    return s;
  });
}

function wireSelect(evt) {
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
    return s;
  });
}

function startSelect(evt) {
  const classList = Array.from(evt.target.classList);
  if (classList.includes("dragHandle") || stageCheck(evt)) {
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
