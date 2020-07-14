export function makeDraggable(evt) {
    let svg = evt.target;

    svg.addEventListener("mousedown", startDrag);
    svg.addEventListener("mousemove", drag);
    svg.addEventListener("mouseup", endDrag);
    svg.addEventListener("mouseleave", endDrag);
    svg.addEventListener("touchstart", startDrag);
    svg.addEventListener("touchmove", drag);
    svg.addEventListener("touchend", endDrag);
    svg.addEventListener("touchleave", endDrag);
    svg.addEventListener("touchcancel", endDrag);

    let selectedElement,
        offset,
        transform,
        bbox,
        minX,
        maxX,
        minY,
        maxY,
        confined;

    function getMousePosition(evt) {
        let CTM = svg.getScreenCTM();
        if (evt.touches) {
            evt = evt.touches[0];
        }
        return {
            x: (evt.clientX - CTM.e) / CTM.a,
            y: (evt.clientY - CTM.f) / CTM.d
        };
    }

    function startDrag(evt) {
        selectedElement = evt.target.closest(".draggable");
        if (!selectedElement) return false;
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
        }
    }

    function endDrag(evt) {
        selectedElement = false;
    }
}