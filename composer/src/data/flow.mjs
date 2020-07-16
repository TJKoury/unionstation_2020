//THIS GETS GENERATED in a package.json

import { writable } from "svelte/store";
import { BasicNode } from "../nodes/basic/index.mjs";
let tt = new BasicNode();

export const flow = writable({
  nodes: [
    new BasicNode({
      id: "d46ca6a8",
      position: {
        x: 100,
        y: 100,
      },
      ports: [
        { type: 0 },
        { type: 1, wires: ["525fa64c"] },
        { type: 1 },
        { type: 1 },
      ],
    }),
    new BasicNode({
      id: "525fa64c",
      position: {
        x: 200,
        y: 200,
      },
      ports: [
        { id: 1, type: 0 },
        { id: 2, type: 1 },
        { id: 3, type: 1 },
        { id: 4, type: 1 },
      ],
      wires: [],
    }),
  ],
});
