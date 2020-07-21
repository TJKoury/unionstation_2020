import { drag } from "./drag.mjs";
import { select } from "./select.mjs";
import { keys } from "./keys.mjs";

let interactions = [select, drag, keys];

export const registerInteractions = (target) => {
  interactions.map(i=>new i(target));
};
