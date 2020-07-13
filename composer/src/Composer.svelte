<script>
  import { onMount } from "svelte";

  export let nodeList = [
    {
      width: 140,
      cradius: 10,
      height: 30,
      x: 100,
      y: 100,
      rx: 5,
      ry: 5,
      fill: "rgb(231, 231, 174)",
      io_ports: [
        { id: 1, type: "input" },
        { id: 1, type: "output" },
        { id: 1, type: "output" },
        { id: 1, type: "output" }
      ]
    },
    {
      cradius: 10,
      width: 140,
      height: 30,
      x: 200,
      y: 200,
      rx: 5,
      ry: 5,
      fill: "rgb(231, 231, 174)"
    }
  ];
  let getAttributeMap = node => {
    return Object.entries(node).map(ee => `${ee[0]} = "${ee[1]}"`);
  };
  function makeDraggable(evt) {
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
  onMount(() => {
    let _svg = document.getElementById("stage");
    makeDraggable({ target: _svg });
    globalThis.resizeNN = () => {
      nodeList[0].width = 1000;
    };
  });
</script>

<style>
  #node-explorer {
    color: white;
    user-select: none;
    outline: none;
  }
  .node {
    cursor: move;
  }
  rect {
    shape-rendering: crispedges;
  }
  #stage {
    width: 100%;
    height: 100%;
    position: fixed;
  }
  :global(body) {
    overflow: hidden;
    padding: none;
  }
</style>

<div id="node-explorer" tabindex="0">
  <svg xmlns="http://www.w3.org/2000/svg" id="stage">
    {#each nodeList as node, i}
      <svg
        shape-rendering="optimizeQuality"
        class="node nodegroup draggable"
        x={node.x}
        y={node.y}
        width={node.width + node.cradius}
        height={node.height}>

        <rect
          class="node"
          rx={node.rx}
          x={node.cradius / 2}
          ry={node.ry}
          fill={node.fill}
          style="width:{node.width};height:{node.height};max-width:{node.width};max-height:{node.height};" />
        {#if node.io_ports}
          <svg x="0" y="0" shape-rendering="auto" transform="scale(1)">
            {#each node.io_ports.filter(f => f.type === 'input') as io_port, i}
              <g class="red-ui-flow-port-input" transform="translate(0,10)">
                <rect
                  class="red-ui-flow-port"
                  rx="3"
                  ry="3"
                  width="10"
                  height="10"
                  style="stroke: #999; stroke-width: 1; fill: #d9d9d9;
                  cursor:crosshair;" />
              </g>
            {/each}
          </svg>
          <svg x={node.width} y="0">
            {#each node.io_ports.filter(f => f.type !== 'input') as io_port, i}
              <rect
                class="node-connection"
                rx="3"
                ry="3"
                fill="black"
                y={i * node.cradius}
                width={node.cradius}
                height={node.cradius} />
            {/each}
          </svg>
        {/if}
        <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle">
          template
        </text>

      </svg>
    {/each}
  </svg>
</div>
