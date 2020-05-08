import { Worker, isMainThread, parentPort, workerData, threadId } from "worker_threads";
import { cpus } from "os";
import http from "http";
import { TextDecoder, TextEncoder} from "util";

let workers = {};
function sharedArrayBufferToUtf16String(buf) {
  const array = new Uint16Array(buf);
  return String.fromCharCode.apply(null, array);
}

function utf16StringToSharedArrayBuffer(str) {
  // 2 bytes for each char
  const bytes = str.length * 2;
  const buffer = new SharedArrayBuffer(bytes);
  const arrayBuffer = new Uint16Array(buffer);
  for (let i = 0, strLen = str.length; i < strLen; i++) {
    arrayBuffer[i] = str.charCodeAt(i);
  }
  return { array: arrayBuffer, buffer: buffer };
}

const exampleString = "Hello world, this is an example string!";
let TE  = new TextEncoder();
const sharedArrayBuffer = TE.encode(exampleString);
const makeWorkers = (limit) => {
  if (limit < 1) return;
  for (let i = 0; i < limit; i++) {
    const worker = new Worker(new URL(import.meta.url), { workerData: sharedArrayBuffer });
    let wid = "w" + worker.threadId;
    workers[wid] = worker;
    worker.on("message", () => {});
    worker.on("error", () => {});
    worker.on("exit", (code) => {
      console.log("kill ", wid);
      delete workers[wid];
      console.log(Object.keys(workers).length);
      makeWorkers(cpus().length - Object.keys(workers).length);
      if (code !== 0) new Error(`Worker stopped with exit code ${code}`);
    });
  }
};
if (isMainThread) {
  makeWorkers(cpus().length);
} else {
    let TD = new TextDecoder;
  http
    .createServer((req, res) => {
      if (req.url === "/favicon.ico") {
        res.end();
      } else {
        res.writeHead(200);
        res.end(`
        <html>
        ${process.pid + ": " + threadId} ${TD.decode(workerData)}
        <script>setTimeout(()=>window.location = window.location, 10);</script>
        </html>`);
        process.exit();
      }
    })
    .listen(8000);
  console.log(threadId);
  //parentPort.postMessage(parse(script));
}
