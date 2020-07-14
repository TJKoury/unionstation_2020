import UI from "./ui.mjs";
import Element from "./element.mjs";

export class BasicNode {
  constructor(options) {
    Object.assign(this, options);
    this.ui = UI;
    this.element = Element;
  }
}
