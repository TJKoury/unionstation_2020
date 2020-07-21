import { writable } from "svelte/store";

export const selectedItems = new writable({});
export const flow = new writable({ nodes: [] });