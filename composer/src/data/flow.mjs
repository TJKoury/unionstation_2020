import Node from "../nodes/basic/index.mjs";

const Node1 = new Node({});

const Node2 = new Node({});

Node1.

export let nodeList = [

    {
        component: Node,
        id: 1,
        attributes: {
            width: 140,
            height: 30,
            x: 100,
            y: 100,
            rx: 5,
            ry: 5,
        },
        cradius: 10,
        io_ports: [
            { id: 1, type: "input" },
            { id: 2, type: "output" },
            { id: 3, type: "output" },
            { id: 4, type: "output" }
        ]
    },
    {
        
        id: 2,
        cradius: 10,
        attributes: {
            width: 140,
            height: 30,
            x: 200,
            y: 200,
            rx: 5,
            ry: 5,
        }
    }
];