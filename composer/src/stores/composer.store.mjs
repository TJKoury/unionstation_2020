import { readable, writable } from "svelte/store";

export const selectedItems = new writable({ elements: {}, wires: {} });
export const flow = new writable({ nodes: [] });
export const ports = new writable({});
export const globalStyle = { path: { strokeWidth: 3 } };
export const handleSemantics = {
  wireHandlePort: "ec3126eecb6511eab362c3165c36f74b:0",
  wireHandle: "ec3126eecb6511eab362c3165c36f74b",
};
