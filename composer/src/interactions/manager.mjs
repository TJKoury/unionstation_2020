import { drag } from "./drag.mjs";
import { select } from "./select.mjs";

let interactions = [];

export const registerInteractions = (target) => {
  interactions.push(new select(target));
  interactions.push(new drag(target));
};
