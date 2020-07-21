import { flow, selectedItems, handleSemantics } from "../stores/composer.store.mjs";
import { Interaction } from "./interaction.class.mjs";
import { updateWires } from "../flow.mjs";
export class drag extends Interaction {
  constructor(target) {
    let selectedElements,
      offset,
      dragging = { active: false, outNode: null, outPort: null },
      originalPositions = {},
      whP = handleSemantics.wireHandlePort,
      wH = handleSemantics.wireHandle;

    selectedItems.subscribe((s) => {
      selectedElements = s.elements;
    });

    const pfG = (sA, v) => parseFloat(sA.getNamedItem(v) ? sA.getNamedItem(v).value : 0); //TODO after Terser update optional chaining (?.value)
    const sAttr = (id) => document.getElementById(id).attributes;
    const cC = (cL, cname) => Array.from(cL).indexOf(cname) !== -1;

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

    function startWireDrag(evt) {
      const { classList } = evt.target;
      if (cC(classList, "in")) return;
      let [nID, pID] = evt.target.closest("g").id.split(":");
      pID = parseInt(pID);
      const initXY = getMousePosition(evt);
      flow.update((f) => {
        let nWN = f.nodes.find((n) => n.id === wH);
        if (!nWN) {
          f.nodes.push({
            id: wH,
            ports: [{ type: 0 }],
            width: 1,
            height: 1,
            element: function () {},
            position: initXY,
          });
          let pWN = f.nodes.find((n) => n.id === nID);
          pWN.ports[pID].wires.push(whP);
          dragging.outNode = pWN;
          dragging.outPort = pID;
        }
        return f;
      });
      dragging.active = "wire";
    }

    function startNodeDrag(evt) {
      offset = getMousePosition(evt);
      for (let sID in selectedElements) {
        let sA = sAttr(sID);
        originalPositions[sID] = { x: pfG(sA, "x"), y: pfG(sA, "y") };
      }
      dragging.active = "node";
    }

    function nodeDrag(evt) {
      if (Object.keys(selectedElements).length) {
        evt.preventDefault();
        for (let sID in selectedElements) {
          let selNode = selectedElements[sID];
          let sE = document.getElementById(selNode.id).attributes;
          let coord = getMousePosition(evt);

          ["x", "y"].forEach((key) => {
            sE[key].value = originalPositions[sID][key] + (coord[key] - offset[key]);
          });

          flow.update((f) => {
            f.nodes[f.nodes.indexOf(selNode)].position = {
              x: sE.x.value,
              y: sE.y.value,
            };
            return f;
          });
        }
      }
    }
    function wireDrag(evt) {
      const mXY = getMousePosition(evt);
      flow.update((f) => {
        let dNode = f.nodes.find((n) => n.id === wH);
        f.nodes[f.nodes.indexOf(dNode)].position = mXY;
        return f;
      });
    }

    /*EVENTS*/
    function mousedown(evt) {
      const { classList } = evt.target;
      if (cC(classList, "dragHandle")) {
        startNodeDrag(evt);
      } else if (cC(classList, "wireHandle")) {
        startWireDrag(evt);
      }
    }

    function mousemove(evt) {
      if (!dragging.active) return;
      if (dragging.active === "node") {
        nodeDrag(evt);
      } else if (dragging.active === "wire") {
        wireDrag(evt);
      }
    }

    function mouseup(evt) {
      const { classList } = evt.target;
      if (dragging.active === "wire") {
        flow.update((f) => {
          let dNode = f.nodes.indexOf(dragging.outNode);
          let wires = () => f.nodes[dNode].ports[dragging.outPort].wires;
          f.nodes[dNode].ports[dragging.outPort].wires = wires().filter((w) => w !== whP);
          if (cC(classList, "wireHandle") && cC(classList, "in")) {
            let portID = evt.target.closest("g").id;
            let [nID, pID] = portID.split(":");
            pID = parseInt(pID);
            if (wires().indexOf(portID) === -1) {
              f.nodes[dNode].ports[dragging.outPort].wires.push(portID);
            }
          }
          return f;
        });
      }
      dragging.active = false;
      originalPositions = {};
      flow.update((f) => {
        f.nodes = f.nodes.filter((n) => n.id !== wH);
        return f;
      });
      updateWires();
    }

    super(target, {
      mousedown,
      mousemove,
      mouseup,
      //mouseleave: mouseup,
      touchstart: mousedown,
      touchmove: mousemove,
      touchend: mouseup,
      touchleave: mouseup,
      touchcancel: mouseup,
    });
  }
}
