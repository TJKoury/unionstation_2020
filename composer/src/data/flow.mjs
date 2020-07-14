//THIS GETS GENERATED in a package.json

import { BasicNode } from "../nodes/basic/index.mjs";
let tt = new BasicNode();
export const flow = {
  nodes: [
    new BasicNode({
      id: 1,
      attributes: {
        width: 140,
        height: 30,
        x: 100,
        y: 100,
        rx: 5,
        ry: 5,
      },
      io_ports: [
        { id: 1, type: "input" },
        { id: 2, type: "output" },
        { id: 3, type: "output" },
        { id: 4, type: "output" },
      ],
      wires: [],
    }),
    new BasicNode({
      id: 2,
      attributes: {
        width: 140,
        height: 30,
        x: 200,
        y: 200,
        rx: 5,
        ry: 5,
      },
      wires: [],
    }),
  ],
};
