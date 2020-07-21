import { drag } from "./drag.mjs";
import { select } from "./select.mjs";

let interactions = [select, drag];

export const registerInteractions = (target) => {
  interactions.map(i=>new i(target));
};
