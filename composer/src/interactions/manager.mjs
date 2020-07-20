import * as drag from "./drag.mjs";
import * as select from "./select.mjs";

export const registerInteractions = (target) => {
  select.init(target);
  drag.init(target);
};
