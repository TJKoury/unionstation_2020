import { promises } from 'fs';
let { readFile } = promises;
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import http from 'http';

http.
const __dirname = dirname(fileURLToPath(import.meta.url));
const main = async () => {
    let nodeAPI = JSON.parse(await readFile(join(__dirname, '../lib/node.api.json')));
    console.log(nodeAPI.modules.filter(n=>n.name ==="http")[0].classes);

};
main();
