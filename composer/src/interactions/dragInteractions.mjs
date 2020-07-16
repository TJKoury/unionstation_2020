export function makeDraggable(evt) {
  let svg = evt.target;
  [
    ["mousedown", startDrag],
    ["mousemove", drag],
    ["mouseup", endDrag],
    //["mouseleave", endDrag],
    ["touchstart", startDrag],
    ["touchmove", drag],
    ["touchend", endDrag],
    ["touchleave", endDrag],
    ["touchcancel", endDrag],
  ].map((a) => {
    svg.addEventListener(a[0], a[1]);
  });

  let selectedElement, node, offset, transform, bbox, minX, maxX, minY, maxY, confined;

  function getMousePosition(evt) {
    let CTM = svg.getScreenCTM();
    if (evt.touches) {
      evt = evt.touches[0];
    }
    return {
      x: (evt.clientX - CTM.e) / CTM.a,
      y: (evt.clientY - CTM.f) / CTM.d,
    };
  }

  function startDrag(evt) {
    selectedElement = evt.target.closest(".draggable");
    if (!selectedElement) return false;
    node = flow.nodes.filter((n) => {
      return n.id === selectedElement.attributes.getNamedItem("id").value;
    })[0];
    offset = getMousePosition(evt);
    let { x, y } = selectedElement.attributes;
    offset.x -= x.value;
    offset.y -= y.value;
  }

  function drag(evt) {
    if (selectedElement) {
      evt.preventDefault();

      let coord = getMousePosition(evt);
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
      selectedElement.attributes.x.value = dx;
      selectedElement.attributes.y.value = dy;
      node.position.x = dx;
      node.position.y = dy;
    }
  }

  function endDrag(evt) {
    selectedElement = false;
    node = false;
  }
}
