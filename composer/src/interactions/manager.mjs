import * as drag from "./drag.mjs";
import * as wire from "./wire.mjs";

export const registerInteractions = (target) => {
  drag.init(target);
};
