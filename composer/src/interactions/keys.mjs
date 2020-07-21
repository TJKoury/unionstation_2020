import { Interaction } from "./interaction.class.mjs";
import { flow as _f, selectedItems } from "../stores/composer.store.mjs";
import { updateWires } from "../flow.mjs";

let sItems = {};
let flow;

selectedItems.subscribe((s) => {
  sItems = s;
});

_f.subscribe((f) => {
  flow = f;
});

export class keys extends Interaction {
  constructor(target) {
    target = document.documentElement;
    const keydown = (evt) => {
      if (evt.key === "Delete") {
        for (let e in sItems.elements) {
          let _nodes = flow.nodes.filter((n) => n.id !== e);
          let _d = _nodes.length !== flow.nodes.length;
          if (_d) {
            delete sItems.elements[e];
          }
          flow.nodes = _nodes;
        }
        selectedItems.set(sItems);
        updateWires(flow, true);
      }
    };

    super(target, {
      keydown,
    });
  }
}
