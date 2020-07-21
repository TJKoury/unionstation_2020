export function init(el) {
    target = el;
    Object.entries(mapping).map((a) => {
      target.addEventListener(a[0], a[1], { passive: false });
    });
  }
  