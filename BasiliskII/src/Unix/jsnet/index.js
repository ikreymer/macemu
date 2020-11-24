// Copyright 2018 The Emulation-as-a-Service Authors.
// SPDX-License-Identifier: GPL-2.0-or-later

import {broadcastStream} from "./broadcast-stream.js";
import {NIC, parseMAC, NetworkStack} from "./webnetwork.js";

import {EthernetParser, IPv4Parser} from "./network-parser.js";
import TransformStream from "./transform-stream.js";

import RingBuffer from "./ringbuffer.js";


const iterator = reader => ({
    [Symbol.asyncIterator]: function () {return this;},
    next: () => reader.read(),
    return: () => ({}),
});

async function sleep(timeout) {
  return new Promise((resolve) => setTimeout(resolve, timeout));
}

let replayUrl;
let replayTs;
let SERVER = "192.168.1.1";
let PORT = 8080;

const rb = RingBuffer.create(1514 * 64);
let emuPort = null;

self.onmessage = (event) => {
  if (event.data.port) {
    emuPort = event.data.port;
    emuPort.postMessage(rb.buffer);
  }
  if (event.data.replayUrl) {
    replayUrl = event.data.replayUrl;
  }
  if (event.data.replayTs) {
    replayTs = event.data.replayTs;
    console.log("Replay TS: " + replayTs);
  }
  if (event.data.SERVER) {
    SERVER = event.data.SERVER;
  }
  if (event.data.PORT) {
    PORT = event.data.PORT;
  }
  main();
};


const sabWriter = new WritableStream({
  async write(chunk) {
    while (true) {
      try {
        const sizeBuff = new ArrayBuffer(2);
        new DataView(sizeBuff).setUint16(0, chunk.byteLength);
        rb.append(new Uint8Array(sizeBuff));

        rb.append(chunk);
        console.log(`Writing chunk size: ${chunk.byteLength}`);
        return true;
      } catch (e) {
        console.log("not enough space, wait and try again");
        await sleep(100);
      }
    }
  }
});


async function main() {
  const nic = await new NIC(undefined, new Uint8Array([34, 250, 80, 37, 2, 130]));

  nic.readable.pipeThrough(broadcastStream("eth_to_emu"));

  broadcastStream("eth_from_emu").readable.pipeThrough(nic);

  monitorChannel("eth_from_emu", " -> ");
  monitorChannel("eth_to_emu", " <- ");

  broadcastStream("eth_to_emu").readable.pipeTo(sabWriter);

  nic.addIPv4(SERVER);

  await nic.startDHCPServer(SERVER, "255.255.255.0");

  const server = new nic.TCPServerSocket({localPort: PORT, localAddress: SERVER});

  const PROXY_PAC = `
function FindProxyForURL(url, host)
{
    if (isInNet(host, "${SERVER}") || shExpMatch(url, "http://${SERVER}:${PORT}/*")) {
        return "DIRECT";
    }

    return "PROXY ${SERVER}:${PORT}";
}
`;

  async function handleResponse(socket) {
    const req = new TextDecoder().decode((await socket.readable.getReader().read()).value);
    //console.log(req);

    const m = req.match(/GET\s([^\s]+)/);
    const writer = socket.writable.getWriter();

    if (m) {
      if (m[1] === "/proxy.pac") {
        sendResponse({
          content: PROXY_PAC,
          contentType: "application/x-ns-proxy-autoconfig",
          writer
        });
        return;
      }

      if (m[1] === "/") {
        sendRedirect({
          redirect: replayUrl,
          writer
        });
        return;
      }
    }

    if (!m || !m[1].startsWith("http://")) {
      sendResponse({
        content: "Invalid URL: " + JSON.stringify(m),
        status: 400,
        statusText: "Bad Request",
        writer
      });
      return;
    }

    const targetUrl = m[1];

    const fetchUrl = "http://cors-anywhere.herokuapp.com/" + (replayTs ? `https://web.archive.org/web/${replayTs}id_/${targetUrl}` : targetUrl);

    const resp = await fetch(fetchUrl);
    const content = await resp.arrayBuffer();
    const { status, statusText } = resp;
    const contentType = resp.headers.get("content-type");

    sendResponse({content, status, statusText, contentType, writer});
  }

  const encoder = new TextEncoder();

  function sendResponse({writer, content, status = 200, statusText = "OK", contentType = "text/plain"}) {
    const payload = typeof(content) === "string" ? encoder.encode(content) : new Uint8Array(content);

    writer.write(encoder.encode(`HTTP/1.0 ${status} ${statusText}\r\n\
Content-Type: ${contentType}\r\n\
Content-Length: ${payload.byteLength}\r\n\
\r\n`));

    writer.write(payload);
    writer.close();
  }

  function sendRedirect({writer, redirect}) {
    writer.write(encoder.encode(`HTTP/1.0 302 Redirect\r\n\
Content-Type: text/plain\r\n\
Content-Length: 0\r\n\
Location: ${redirect}\r\n\
\r\n`));

    writer.close();
  }


  for await (const s of iterator(server.readable.getReader())) {
    handleResponse(s);
  }
}


const printer = (tag, ...args) => new TransformStream({
    transform(v, c) {
        console.log(...(tag ? [tag] : []), v);
        c.enqueue(v);
    }
});



async function monitorChannel(name, label) {
  broadcastStream(name).readable
  .pipeThrough(new EthernetParser)
  .pipeThrough(printer("ether " + label))
  .pipeThrough(new IPv4Parser)
  .pipeThrough(printer("ip " + label))
  .pipeTo(new WritableStream);
}


//main();
//monitor();
