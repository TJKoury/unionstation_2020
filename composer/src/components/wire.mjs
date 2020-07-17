import { flow } from "../stores/composer.store.mjs";
import { writable } from "svelte/store";

let styles, nodesLength = 0;
let handleX = 70;

const styleStore = new writable({
    path: {
        strokeWidth: 3,
    },
    handle: 75
});

styleStore.subscribe((s) => {
    styles = s;
});

flow.subscribe(f => {
    if (f.nodes.length === nodesLength) return;
    let nodes = f.nodes.map(n => n.id);
    f.nodes.forEach(n => {
        let _wires = [];
        n.ports.forEach(p => {
            if (p.wires) {
                p.wires.forEach((w, i) => {
                    if (nodes.indexOf(w.split(":")[0]) !== -1) {
                        _wires.push(w);
                    }
                })
            }
        });
        n.wires = _wires;
    });
    nodesLength = f.nodes.length;
});

let ef = (port) => {
    let { e, f } = port.getCTM();
    let { width, height } = port.getBoundingClientRect();
    e = e + width / 2;
    f = f - styles.path.strokeWidth / 2 + height / 2;
    return { e, f };
};

function m1(node, p, n) {
    let port = document.getElementById(node.id + ":" + p);
    if (!!port) {
        const { e, f } = ef(port);
        return n ? [e, f] : `M${e} ${f}`;
    } else {
        return false;
    }
}

function c1(node, p) {
    let c1p = m1(node, p, true);
    return `C${c1p[0] + handleX} ${c1p[1]}`;
}

function m2(node, p, w, n) {
    let port = document.getElementById(node.ports[p].wires[w]);
    if (!!port) {
        const { e, f } = ef(port);
        return n ? [e, f] : `${e} ${f}`;
    } else {
        return false;
    }
}

function c2(node, p, w) {
    let c1p = m2(node, p, w, true);
    return `${c1p[0] - handleX} ${c1p[1]}`;
}

export { m1, c1, m2, c2, styleStore };
