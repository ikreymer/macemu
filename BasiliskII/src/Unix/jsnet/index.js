// Copyright 2018 The Emulation-as-a-Service Authors.
// SPDX-License-Identifier: GPL-2.0-or-later

import {broadcastStream} from "./broadcast-stream.js";
import {NIC, parseMAC, NetworkStack} from "./webnetwork.js";

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
  nic.addIPv4("10.0.2.2");

  await nic.startDHCPServer("10.0.2.2");

  console.log("dhcp started");

  const server = new nic.TCPServerSocket({localPort: 80, localAddress: "10.0.2.2"});
  console.log(server.readable)
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






main();

