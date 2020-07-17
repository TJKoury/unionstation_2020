import * as drag from "./drag.mjs";
import * as wire from "./wire.mjs";
import * as select from "./select.mjs";

export const registerInteractions = (target) => {
  drag.init(target);
  select.init(target);
};
