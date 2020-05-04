import { promises } from 'fs';
let { readFile } = promises;
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const main = async () => {
    let nodeAPI = JSON.parse(await readFile(join(__dirname, '../lib/node.api.json')));
    //console.log(nodeAPI);
    console.log(nodeAPI.globals.map(n => n.name));

};
main();
