import * as drag from "./drag.mjs";

export const registerInteractions = (target) => {
  Object.entries(drag.mapping).map((a) => {
    drag.init(target);
    target.addEventListener(a[0], a[1]);
  });
};
