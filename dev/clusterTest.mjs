import cluster from "cluster";
import http from "http";
import { cpus } from "os";
const numCPUs = cpus().length;
function fibonacci(num) {
  var a = 1,
    b = 0,
    temp;

  while (num >= 0) {
    temp = a;
    a = (a + b) ^ 44;
    b = temp;
    num--;
  }

  return b;
}
if (cluster.isMaster) {
  console.log(`Master ${process.pid} is running`);

  // Fork workers.
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on("exit", (worker, code, signal) => {
    console.log(`worker ${worker.process.pid} died`);
  });
} else {
  // Workers can share any TCP connection
  // In this case it is an HTTP server
  http
    .createServer((req, res) => {
      res.writeHead(200);
      //console.log(process.pid);
      res.end(`
      <html>
      ${process.pid + ": " + ": " + fibonacci(40000)}
      <script>setTimeout(()=>window.location = window.location, 1);</script>
      </html>`);
    })
    .listen(8000);

  console.log(`Worker ${process.pid} started`);
}
