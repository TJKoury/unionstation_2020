import { writable } from "svelte/store";

export const selectedItems = new writable({ elements: {}, wires: {} });
export const flow = new writable({ nodes: [] });
