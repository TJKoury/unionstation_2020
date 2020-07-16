import { flow } from "../stores/composer.store.mjs";
let nodes;
flow.subscribe((f) => {
  nodes = f.nodes;
});
