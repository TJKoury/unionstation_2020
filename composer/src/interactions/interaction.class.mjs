export class Interaction {
  constructor(target, mapping) {
    if (!target || !mapping) {
      throw Error(`class Interaction missing required arguments: target ${target} mapping:${mapping}`);
    }
    Object.entries(mapping).map(([event, callback] = args) => {
      target.addEventListener(event, callback, { passive: false });
    });
  }
}
