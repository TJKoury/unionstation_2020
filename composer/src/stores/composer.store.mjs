import { writable } from "svelte/store";

export const selected = new writable({});
export const flow = new writable({ nodes: [] });