// Copyright 2018 The Emulation-as-a-Service Authors.
// SPDX-License-Identifier: GPL-2.0-or-later

import {broadcastStream} from "./broadcast-stream.js";
import {NIC, parseMAC, NetworkStack} from "./webnetwork.js";

import {EthernetParser, IPv4Parser} from "./network-parser.js";
import TransformStream from "./transform-stream.js";


const iterator = reader => ({
    [Symbol.asyncIterator]: function () {return this;},
    next: () => reader.read(),
    return: () => ({}),
});

async function sleep(timeout) {
  return new Promise((resolve) => setTimeout(resolve, timeout));
}


async function main() {
  const nic = await new NIC(undefined, new Uint8Array([34, 250, 80, 37, 2, 130]));
  nic.readable.pipeThrough(broadcastStream("ethernet")).pipeThrough(nic);

  monitorNic(nic);
  nic.addIPv4("10.0.2.100");

  await nic.startDHCPServer("10.0.2.100");
  //console.log("dhcp started");

  //await client_nic.startDHCPClient();

  const server = new nic.TCPServerSocket({localPort: 8080, localAddress: "10.0.2.100"});
  //console.log(server.readable)
  for await (const s of iterator(server.readable.getReader())) {
      (async () => {
          const req = new TextDecoder().decode((await s.readable.getReader().read()).value);
          const path = req.match(/^GET (\S+)/)[1];
          console.log(path);
          const w = s.writable.getWriter();

          w.write(new TextEncoder().encode("HTTP/1.1 200 OK\r\n\r\n"));
          w.releaseLock();
          (await tryRead(drop.fs, path)).body.pipeTo(s.writable);
          return;

          w.write(new TextEncoder().encode(`HTTP/1.1 200 OK
content-type: text/plain

YEAAHH

!`.replace(/\n/g, "\r\n").repeat(1000)));
          w.close();
          console.log("finished");
      })();
  }
}


const printer = (tag, ...args) => new TransformStream({
    transform(v, c) {
        console.log(...(tag ? [tag] : []), v);
        c.enqueue(v);
    }
});



async function monitorNic(nic) {
/*
  nic.readable
  .pipeThrough(new EthernetParser)
  .pipeThrough(printer("ether out"))
  .pipeThrough(new IPv4Parser)
  .pipeThrough(printer("ip out"))
  .pipeTo(new WritableStream);
*/

  broadcastStream("ethernet").readable
  .pipeThrough(new EthernetParser)
  .pipeThrough(printer("ether in"))
  .pipeThrough(new IPv4Parser)
  .pipeThrough(printer("ip in"))
  .pipeTo(new WritableStream);


/*
  const broadcast = broadcastStream("ethernet");
  const printer1 = printer("ethernet");
  const printer2 = printer("ip");
  broadcast.readable
      //.pipeThrough(new RecordStream(data))
      .pipeThrough(new EthernetParser)
      .pipeThrough(printer1)
      .pipeThrough(new IPv4Parser)
      .pipeThrough(printer2)
      .pipeTo(new WritableStream);

*/
}


main();
//monitor();
