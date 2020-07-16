export const getAttributeMap = (node = { attributes: {} }) => {
    return Object.entries(node).map(ee => `${ee[0]} = "${ee[1]}"`).join(" ");
};

export const getStyleMap = (node = { style: {} }) => {
    return Object.entries(node.style).map(ee => `${ee[0]}: ${ee[1]}`).join(";");
};
