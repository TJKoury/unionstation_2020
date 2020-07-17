import { writable } from "svelte/store";

export const styles = new writable({
  path: {
    strokeWidth: 3,
  },
});

export const selected = new writable({});
export const flow = new writable({ nodes: [] });
