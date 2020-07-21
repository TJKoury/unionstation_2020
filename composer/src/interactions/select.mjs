import { flow, selectedItems } from "../stores/composer.store.mjs";
let target, nodes;
flow.subscribe((f) => {
  nodes = f.nodes;
});

const stageCheck = (evt) => evt.target.id === "stage";

function doSelect(sID, evt, eL) {
  selectedItems.update((s) => {
    const isSelected = Object.keys(s).indexOf(sID) > -1;
    if (!evt.ctrlKey && !isSelected) {
      s = {};
    } else if (evt.ctrlKey && isSelected) {
      delete s[sID];
    }
    s[sID] = eL;

    return s;
  });
}

function nodeSelect(evt) {
  let sID = evt.target.closest(".draggable");

  if (sID) {
    sID = sID.id;
    doSelect(sID, evt, nodes.filter((n) => n.id === sID)[0]);
  }
}

function wireSelect(evt) {
  doSelect(evt.target.id, evt, evt.target);
}
function overSelect(evt) {
  //console.log(evt.target);
}
function startSelect(evt) {
  if (stageCheck(evt)) {
    selectedItems.update((s) => {
      s = {};
      return s;
    });
    return;
  }
  const classList = Array.from(evt.target.classList);
  if (classList.includes("dragHandle") || stageCheck(evt)) {
    nodeSelect(evt);
  }
  if (classList.includes("wire")) {
    wireSelect(evt);
  }
  console.log(evt.target);
}

export let mapping = {
  mousedown: startSelect,
  mouseover: overSelect,
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
