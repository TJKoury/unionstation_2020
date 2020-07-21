import { flow, selectedItems } from "../stores/composer.store.mjs";
import { Interaction } from "./interaction.class.mjs";

export class select extends Interaction {
  constructor(target) {
    let nodes;
    flow.subscribe((f) => {
      nodes = f.nodes;
    });

    const stageCheck = (evt) => evt.target.id === "stage";
    const reset = (s) => {
      for (let p in s) s[p] = {};
      return s;
    };
    function doSelect(sID, evt, eL, prop) {
      selectedItems.update((s) => {
        const isSelected = Object.keys(s[prop]).indexOf(sID) > -1;
        if (!evt.ctrlKey && !isSelected) {
          s = reset(s);
        } else if (evt.ctrlKey && isSelected) {
          delete s[prop][sID];
        }
        s[prop][sID] = eL;

        return s;
      });
    }

    function nodeSelect(evt) {
      let sID = evt.target.closest(".draggable");

      if (sID) {
        sID = sID.id;
        doSelect(sID, evt, nodes.filter((n) => n.id === sID)[0], "elements");
      }
    }

    function wireSelect(evt) {
      doSelect(evt.target.id, evt, evt.target, "wires");
    }
    function mouseover(evt) {
      //console.log(evt.target);
    }
    function mousedown(evt) {
      if (stageCheck(evt)) {
        selectedItems.update((s) => {
          return reset(s);
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
    }

    super(target, {
      mousedown,
      mouseover,
      //mousemove: drag,
      //mouseup: endDrag,
      //"mouseleave": endDrag,
      touchstart: mousedown,
      //touchmove: drag,
      //touchend: endDrag,
      //touchleave: endDrag,
      //touchcancel: endDrag,
    });
  }
}
