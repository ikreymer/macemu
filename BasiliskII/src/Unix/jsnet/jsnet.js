(function () {
    'use strict';

    // Copyright 2018 The Emulation-as-a-Service Authors.
    // SPDX-License-Identifier: GPL-2.0-or-later

    const broadcastStream = (name) => {
        const channel = new BroadcastChannel(name);
        let writableClosed, readableClosed;
        const closed = Promise.all([
            new Promise(r => writableClosed = r),
            new Promise(r => readableClosed = r).then(() => channel.onmessage = null),
        ]).then(() => channel.close());
        const writable = new WritableStream({
            write(ch) {
                channel.postMessage(ch);
            },
            close() {
                writableClosed();
            },
            abort() {
                writableClosed();
            },
        });
        let readController;
        const readable = new ReadableStream({
            start(c) {
                readController = c;
            },
            cancel() {
                readableClosed();
            },
        });
        channel.onmessage = ({data}) => readController.enqueue(data);
        return {writable, readable};
    };

    // Copyright 2018 The Emulation-as-a-Service Authors.
    // SPDX-License-Identifier: GPL-2.0-or-later

    const _writable = new WeakMap();
    const _readable = new WeakMap();
    const _writeController = new WeakMap();
    const _readController = new WeakMap();

    const call = (object, method, args) => {
        const fun = object[method];
        if (typeof fun === "undefined") return;
        if (typeof fun !== "function") throw new TypeError();
        return Reflect.apply(fun, object, args);
    };

    /**
     * A polyfill for `TransformStream` that uses the native `ReadableStream`
     * and `WritableStream` implementations.
     */
    class TransformStream {
        constructor(transformer = {}, writableStrategy = {}, readableStrategy = {}) {
            let resolveRead = () => {};
            const writable = new WritableStream({
                start: (writeController) => {
                    _writeController.set(this, writeController);
                },
                write: async (chunk) => {
                    const readC = _readController.get(this);
                    if (readC.desiredSize <= 0) {
                        await new Promise(r => resolveRead = r);
                    }
                    return call(transformer, "transform", [chunk, controller]);
                },
                close: async () => {
                    await call(transformer, "flush", [controller]);
                    _readController.get(this).close();
                },
                abort: () => {
                    return _readController.get(this).error();
                }
            }, writableStrategy);
            const readable = new ReadableStream({
                start: (readController) => {
                    _readController.set(this, readController);
                    if (typeof transformer.start !== "function") return;
                    return transformer.start(controller);
                },
                pull: (chunk, controller) => {
                    resolveRead();
                },
                cancel(reason) {},

            }, readableStrategy);
            const controller = makeTransformStreamDefaultController(
                _writeController.get(this), _readController.get(this));

            _writable.set(this, writable);
            _readable.set(this, readable);
        }
        get writable() {return _writable.get(this);}
        get readable() {return _readable.get(this);}
    }

    const _readController2 = new WeakMap();
    const _writeController2 = new WeakMap();
    const _lastWrite = new WeakMap();

    const makeTransformStreamDefaultController = (writeController, readController) => {
        const _this = Object.create(TransformStreamDefaultController.prototype);
        _writeController2.set(_this, writeController);
        _readController2.set(_this, readController);
        return _this;
    };

    class TransformStreamDefaultController {
        constructor() {throw new TypeError();}

        get desiredSize() {
            return _readController2.get(this).desiredSize;
        }
        enqueue(chunk) {
            const ret = _readController2.get(this).enqueue(chunk);
            _lastWrite.set(this, ret);
            return ret;
        }
        error(reason) {
            _writeController2.get(this).error(reason);
            _readController2.get(this).error(reason);
        }
        terminate() {
            _writeController2.get(this).error();
            _readController2.get(this).close();
        }
    }

    var Module = (function() {
      var _scriptDir = typeof document !== 'undefined' && document.currentScript ? document.currentScript.src : undefined;
      return (
    function(Module) {
      Module = Module || {};

    // Copyright 2010 The Emscripten Authors.  All rights reserved.
    // Emscripten is available under two separate licenses, the MIT license and the
    // University of Illinois/NCSA Open Source License.  Both these licenses can be
    // found in the LICENSE file.

    // The Module object: Our interface to the outside world. We import
    // and export values on it. There are various ways Module can be used:
    // 1. Not defined. We create it here
    // 2. A function parameter, function(Module) { ..generated code.. }
    // 3. pre-run appended it, var Module = {}; ..generated code..
    // 4. External script tag defines var Module.
    // We need to check if Module already exists (e.g. case 3 above).
    // Substitution will be replaced with actual code on later stage of the build,
    // this way Closure Compiler will not mangle it (e.g. case 4. above).
    // Note that if you want to run closure, and also to use Module
    // after the generated code, you will need to define   var Module = {};
    // before the code. Then that object will be used in the code, and you
    // can continue to use Module afterwards as well.
    var Module = typeof Module !== 'undefined' ? Module : {};

    // --pre-jses are emitted after the Module integration code, so that they can
    // refer to Module (if they choose; they can also define Module)
    Module["locateFile"] = function(path) {
      //let url = import.meta.url;
      let url = self.location.href;
      url = url.replace(/^file:\/\//, "");
      // HACK: Special case for Node.js on Windows
      // (`url` will look like "file:///C:/...").
      // Would properly use `require("url").fileURLToPath(url)`
      // on all Node.js platforms, which is not avaible
      // on older Node.js versions, though.
      try {
        if (process.platform === "win32") url = url.replace(/^\/+/, "");
      } catch {}
      return url + "/../" + path;
    };
    Module["noExitRuntime"] = true;

    // HACK: Work around https://github.com/emscripten-core/emscripten/issues/7855
    // for Node.js: turn process.on("uncaughtException" | "unhandledRejection", ...)
    // into no-op.
    let process;
    try {
      process = new Proxy(global.process, {
        get(target, key, receiver) {
          const ret = Reflect.get(target, key, receiver);
          if (key !== "on") return ret;
          return new Proxy(ret, {
            apply(target, thisArg, args) {
              if (args[0] !== "uncaughtException"
                && args[0] !== "unhandledRejection") {
                return Reflect.apply(target, thisArg, args);
              }
            }
          });
        }
      });
    } catch {}



    // Sometimes an existing Module object exists with properties
    // meant to overwrite the default module functionality. Here
    // we collect those properties and reapply _after_ we configure
    // the current environment's defaults to avoid having to be so
    // defensive during initialization.
    var moduleOverrides = {};
    var key;
    for (key in Module) {
      if (Module.hasOwnProperty(key)) {
        moduleOverrides[key] = Module[key];
      }
    }

    var arguments_ = [];
    var thisProgram = './this.program';
    var quit_ = function(status, toThrow) {
      throw toThrow;
    };

    // Determine the runtime environment we are in. You can customize this by
    // setting the ENVIRONMENT setting at compile time (see settings.js).

    var ENVIRONMENT_IS_WEB = false;
    var ENVIRONMENT_IS_WORKER = false;
    var ENVIRONMENT_IS_NODE = false;
    var ENVIRONMENT_HAS_NODE = false;
    var ENVIRONMENT_IS_SHELL = false;
    ENVIRONMENT_IS_WEB = typeof window === 'object';
    ENVIRONMENT_IS_WORKER = typeof importScripts === 'function';
    // A web environment like Electron.js can have Node enabled, so we must
    // distinguish between Node-enabled environments and Node environments per se.
    // This will allow the former to do things like mount NODEFS.
    // Extended check using process.versions fixes issue #8816.
    // (Also makes redundant the original check that 'require' is a function.)
    ENVIRONMENT_HAS_NODE = typeof process === 'object' && typeof process.versions === 'object' && typeof process.versions.node === 'string';
    ENVIRONMENT_IS_NODE = ENVIRONMENT_HAS_NODE && !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_WORKER;
    ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;




    // `/` should be present at the end if `scriptDirectory` is not empty
    var scriptDirectory = '';
    function locateFile(path) {
      if (Module['locateFile']) {
        return Module['locateFile'](path, scriptDirectory);
      }
      return scriptDirectory + path;
    }

    // Hooks that are implemented differently in different runtime environments.
    var read_,
        readBinary;

    var nodeFS;
    var nodePath;

    if (ENVIRONMENT_IS_NODE) {
      scriptDirectory = __dirname + '/';


      read_ = function shell_read(filename, binary) {
        if (!nodeFS) nodeFS = require('fs');
        if (!nodePath) nodePath = require('path');
        filename = nodePath['normalize'](filename);
        return nodeFS['readFileSync'](filename, binary ? null : 'utf8');
      };

      readBinary = function readBinary(filename) {
        var ret = read_(filename, true);
        if (!ret.buffer) {
          ret = new Uint8Array(ret);
        }
        assert(ret.buffer);
        return ret;
      };




      if (process['argv'].length > 1) {
        thisProgram = process['argv'][1].replace(/\\/g, '/');
      }

      arguments_ = process['argv'].slice(2);

      // MODULARIZE will export the module in the proper place outside, we don't need to export here

      process['on']('uncaughtException', function(ex) {
        // suppress ExitStatus exceptions from showing an error
        if (!(ex instanceof ExitStatus)) {
          throw ex;
        }
      });

      process['on']('unhandledRejection', abort);

      quit_ = function(status) {
        process['exit'](status);
      };

      Module['inspect'] = function () { return '[Emscripten Module object]'; };


    } else
    if (ENVIRONMENT_IS_SHELL) {


      if (typeof read != 'undefined') {
        read_ = function shell_read(f) {
          return read(f);
        };
      }

      readBinary = function readBinary(f) {
        var data;
        if (typeof readbuffer === 'function') {
          return new Uint8Array(readbuffer(f));
        }
        data = read(f, 'binary');
        assert(typeof data === 'object');
        return data;
      };

      if (typeof scriptArgs != 'undefined') {
        arguments_ = scriptArgs;
      } else if (typeof arguments != 'undefined') {
        arguments_ = arguments;
      }

      if (typeof quit === 'function') {
        quit_ = function(status) {
          quit(status);
        };
      }

      if (typeof print !== 'undefined') {
        // Prefer to use print/printErr where they exist, as they usually work better.
        if (typeof console === 'undefined') console = {};
        console.log = print;
        console.warn = console.error = typeof printErr !== 'undefined' ? printErr : print;
      }
    } else

    // Note that this includes Node.js workers when relevant (pthreads is enabled).
    // Node.js workers are detected as a combination of ENVIRONMENT_IS_WORKER and
    // ENVIRONMENT_HAS_NODE.
    if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
      if (ENVIRONMENT_IS_WORKER) { // Check worker, not web, since window could be polyfilled
        scriptDirectory = self.location.href;
      } else if (document.currentScript) { // web
        scriptDirectory = document.currentScript.src;
      }
      // When MODULARIZE (and not _INSTANCE), this JS may be executed later, after document.currentScript
      // is gone, so we saved it, and we use it here instead of any other info.
      if (_scriptDir) {
        scriptDirectory = _scriptDir;
      }
      // blob urls look like blob:http://site.com/etc/etc and we cannot infer anything from them.
      // otherwise, slice off the final part of the url to find the script directory.
      // if scriptDirectory does not contain a slash, lastIndexOf will return -1,
      // and scriptDirectory will correctly be replaced with an empty string.
      if (scriptDirectory.indexOf('blob:') !== 0) {
        scriptDirectory = scriptDirectory.substr(0, scriptDirectory.lastIndexOf('/')+1);
      } else {
        scriptDirectory = '';
      }


      // Differentiate the Web Worker from the Node Worker case, as reading must
      // be done differently.
      {


      read_ = function shell_read(url) {
          var xhr = new XMLHttpRequest();
          xhr.open('GET', url, false);
          xhr.send(null);
          return xhr.responseText;
      };

      if (ENVIRONMENT_IS_WORKER) {
        readBinary = function readBinary(url) {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', url, false);
            xhr.responseType = 'arraybuffer';
            xhr.send(null);
            return new Uint8Array(xhr.response);
        };
      }




      }
    } else
    ;


    // Set up the out() and err() hooks, which are how we can print to stdout or
    // stderr, respectively.
    var out = Module['print'] || console.log.bind(console);
    var err = Module['printErr'] || console.warn.bind(console);

    // Merge back in the overrides
    for (key in moduleOverrides) {
      if (moduleOverrides.hasOwnProperty(key)) {
        Module[key] = moduleOverrides[key];
      }
    }
    // Free the object hierarchy contained in the overrides, this lets the GC
    // reclaim data used e.g. in memoryInitializerRequest, which is a large typed array.
    moduleOverrides = null;

    // Emit code to handle expected values on the Module object. This applies Module.x
    // to the proper local x. This has two benefits: first, we only emit it if it is
    // expected to arrive, and second, by using a local everywhere else that can be
    // minified.
    if (Module['arguments']) arguments_ = Module['arguments'];
    if (Module['thisProgram']) thisProgram = Module['thisProgram'];
    if (Module['quit']) quit_ = Module['quit'];

    var asm2wasmImports = { // special asm2wasm imports
        "f64-rem": function(x, y) {
            return x % y;
        },
        "debugger": function() {
        }
    };



    var jsCallStartIndex = 1;
    var functionPointers = new Array(20);

    // 'sig' parameter is required for the llvm backend but only when func is not
    // already a WebAssembly function.
    function addFunction(func, sig) {


      var base = 0;
      for (var i = base; i < base + 20; i++) {
        if (!functionPointers[i]) {
          functionPointers[i] = func;
          return jsCallStartIndex + i;
        }
      }
      throw 'Finished up all reserved function pointers. Use a higher value for RESERVED_FUNCTION_POINTERS.';

    }

    function removeFunction(index) {

      functionPointers[index-jsCallStartIndex] = null;
    }

    var tempRet0 = 0;

    var setTempRet0 = function(value) {
      tempRet0 = value;
    };

    var getTempRet0 = function() {
      return tempRet0;
    };




    // === Preamble library stuff ===

    // Documentation for the public APIs defined in this file must be updated in:
    //    site/source/docs/api_reference/preamble.js.rst
    // A prebuilt local version of the documentation is available at:
    //    site/build/text/docs/api_reference/preamble.js.txt
    // You can also build docs locally as HTML or other formats in site/
    // An online HTML version (which may be of a different version of Emscripten)
    //    is up at http://kripken.github.io/emscripten-site/docs/api_reference/preamble.js.html


    var wasmBinary;if (Module['wasmBinary']) wasmBinary = Module['wasmBinary'];
    var noExitRuntime;if (Module['noExitRuntime']) noExitRuntime = Module['noExitRuntime'];


    if (typeof WebAssembly !== 'object') {
      err('no native wasm support detected');
    }





    // Wasm globals

    var wasmMemory;

    // In fastcomp asm.js, we don't need a wasm Table at all.
    // In the wasm backend, we polyfill the WebAssembly object,
    // so this creates a (non-native-wasm) table for us.
    var wasmTable = new WebAssembly.Table({
      'initial': 448,
      'maximum': 448,
      'element': 'anyfunc'
    });


    //========================================
    // Runtime essentials
    //========================================

    // whether we are quitting the application. no code should run after this.
    // set in exit() and abort()
    var ABORT = false;

    /** @type {function(*, string=)} */
    function assert(condition, text) {
      if (!condition) {
        abort('Assertion failed: ' + text);
      }
    }

    // Returns the C function with a specified identifier (for C++, you need to do manual name mangling)
    function getCFunc(ident) {
      var func = Module['_' + ident]; // closure exported function
      assert(func, 'Cannot call unknown function ' + ident + ', make sure it is exported');
      return func;
    }

    // C calling interface.
    function ccall(ident, returnType, argTypes, args, opts) {
      // For fast lookup of conversion functions
      var toC = {
        'string': function(str) {
          var ret = 0;
          if (str !== null && str !== undefined && str !== 0) { // null string
            // at most 4 bytes per UTF-8 code point, +1 for the trailing '\0'
            var len = (str.length << 2) + 1;
            ret = stackAlloc(len);
            stringToUTF8(str, ret, len);
          }
          return ret;
        },
        'array': function(arr) {
          var ret = stackAlloc(arr.length);
          writeArrayToMemory(arr, ret);
          return ret;
        }
      };

      function convertReturnValue(ret) {
        if (returnType === 'string') return UTF8ToString(ret);
        if (returnType === 'boolean') return Boolean(ret);
        return ret;
      }

      var func = getCFunc(ident);
      var cArgs = [];
      var stack = 0;
      if (args) {
        for (var i = 0; i < args.length; i++) {
          var converter = toC[argTypes[i]];
          if (converter) {
            if (stack === 0) stack = stackSave();
            cArgs[i] = converter(args[i]);
          } else {
            cArgs[i] = args[i];
          }
        }
      }
      var ret = func.apply(null, cArgs);

      ret = convertReturnValue(ret);
      if (stack !== 0) stackRestore(stack);
      return ret;
    }

    function cwrap(ident, returnType, argTypes, opts) {
      argTypes = argTypes || [];
      // When the function takes numbers and returns a number, we can just return
      // the original function
      var numericArgs = argTypes.every(function(type){ return type === 'number'});
      var numericRet = returnType !== 'string';
      if (numericRet && numericArgs && !opts) {
        return getCFunc(ident);
      }
      return function() {
        return ccall(ident, returnType, argTypes, arguments);
      }
    }


    // Given a pointer 'ptr' to a null-terminated UTF8-encoded string in the given array that contains uint8 values, returns
    // a copy of that string as a Javascript String object.

    var UTF8Decoder = typeof TextDecoder !== 'undefined' ? new TextDecoder('utf8') : undefined;

    /**
     * @param {number} idx
     * @param {number=} maxBytesToRead
     * @return {string}
     */
    function UTF8ArrayToString(u8Array, idx, maxBytesToRead) {
      var endIdx = idx + maxBytesToRead;
      var endPtr = idx;
      // TextDecoder needs to know the byte length in advance, it doesn't stop on null terminator by itself.
      // Also, use the length info to avoid running tiny strings through TextDecoder, since .subarray() allocates garbage.
      // (As a tiny code save trick, compare endPtr against endIdx using a negation, so that undefined means Infinity)
      while (u8Array[endPtr] && !(endPtr >= endIdx)) ++endPtr;

      if (endPtr - idx > 16 && u8Array.subarray && UTF8Decoder) {
        return UTF8Decoder.decode(u8Array.subarray(idx, endPtr));
      } else {
        var str = '';
        // If building with TextDecoder, we have already computed the string length above, so test loop end condition against that
        while (idx < endPtr) {
          // For UTF8 byte structure, see:
          // http://en.wikipedia.org/wiki/UTF-8#Description
          // https://www.ietf.org/rfc/rfc2279.txt
          // https://tools.ietf.org/html/rfc3629
          var u0 = u8Array[idx++];
          if (!(u0 & 0x80)) { str += String.fromCharCode(u0); continue; }
          var u1 = u8Array[idx++] & 63;
          if ((u0 & 0xE0) == 0xC0) { str += String.fromCharCode(((u0 & 31) << 6) | u1); continue; }
          var u2 = u8Array[idx++] & 63;
          if ((u0 & 0xF0) == 0xE0) {
            u0 = ((u0 & 15) << 12) | (u1 << 6) | u2;
          } else {
            u0 = ((u0 & 7) << 18) | (u1 << 12) | (u2 << 6) | (u8Array[idx++] & 63);
          }

          if (u0 < 0x10000) {
            str += String.fromCharCode(u0);
          } else {
            var ch = u0 - 0x10000;
            str += String.fromCharCode(0xD800 | (ch >> 10), 0xDC00 | (ch & 0x3FF));
          }
        }
      }
      return str;
    }

    // Given a pointer 'ptr' to a null-terminated UTF8-encoded string in the emscripten HEAP, returns a
    // copy of that string as a Javascript String object.
    // maxBytesToRead: an optional length that specifies the maximum number of bytes to read. You can omit
    //                 this parameter to scan the string until the first \0 byte. If maxBytesToRead is
    //                 passed, and the string at [ptr, ptr+maxBytesToReadr[ contains a null byte in the
    //                 middle, then the string will cut short at that byte index (i.e. maxBytesToRead will
    //                 not produce a string of exact length [ptr, ptr+maxBytesToRead[)
    //                 N.B. mixing frequent uses of UTF8ToString() with and without maxBytesToRead may
    //                 throw JS JIT optimizations off, so it is worth to consider consistently using one
    //                 style or the other.
    /**
     * @param {number} ptr
     * @param {number=} maxBytesToRead
     * @return {string}
     */
    function UTF8ToString(ptr, maxBytesToRead) {
      return ptr ? UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead) : '';
    }

    // Copies the given Javascript String object 'str' to the given byte array at address 'outIdx',
    // encoded in UTF8 form and null-terminated. The copy will require at most str.length*4+1 bytes of space in the HEAP.
    // Use the function lengthBytesUTF8 to compute the exact number of bytes (excluding null terminator) that this function will write.
    // Parameters:
    //   str: the Javascript string to copy.
    //   outU8Array: the array to copy to. Each index in this array is assumed to be one 8-byte element.
    //   outIdx: The starting offset in the array to begin the copying.
    //   maxBytesToWrite: The maximum number of bytes this function can write to the array.
    //                    This count should include the null terminator,
    //                    i.e. if maxBytesToWrite=1, only the null terminator will be written and nothing else.
    //                    maxBytesToWrite=0 does not write any bytes to the output, not even the null terminator.
    // Returns the number of bytes written, EXCLUDING the null terminator.

    function stringToUTF8Array(str, outU8Array, outIdx, maxBytesToWrite) {
      if (!(maxBytesToWrite > 0)) // Parameter maxBytesToWrite is not optional. Negative values, 0, null, undefined and false each don't write out any bytes.
        return 0;

      var startIdx = outIdx;
      var endIdx = outIdx + maxBytesToWrite - 1; // -1 for string null terminator.
      for (var i = 0; i < str.length; ++i) {
        // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! So decode UTF16->UTF32->UTF8.
        // See http://unicode.org/faq/utf_bom.html#utf16-3
        // For UTF8 byte structure, see http://en.wikipedia.org/wiki/UTF-8#Description and https://www.ietf.org/rfc/rfc2279.txt and https://tools.ietf.org/html/rfc3629
        var u = str.charCodeAt(i); // possibly a lead surrogate
        if (u >= 0xD800 && u <= 0xDFFF) {
          var u1 = str.charCodeAt(++i);
          u = 0x10000 + ((u & 0x3FF) << 10) | (u1 & 0x3FF);
        }
        if (u <= 0x7F) {
          if (outIdx >= endIdx) break;
          outU8Array[outIdx++] = u;
        } else if (u <= 0x7FF) {
          if (outIdx + 1 >= endIdx) break;
          outU8Array[outIdx++] = 0xC0 | (u >> 6);
          outU8Array[outIdx++] = 0x80 | (u & 63);
        } else if (u <= 0xFFFF) {
          if (outIdx + 2 >= endIdx) break;
          outU8Array[outIdx++] = 0xE0 | (u >> 12);
          outU8Array[outIdx++] = 0x80 | ((u >> 6) & 63);
          outU8Array[outIdx++] = 0x80 | (u & 63);
        } else {
          if (outIdx + 3 >= endIdx) break;
          outU8Array[outIdx++] = 0xF0 | (u >> 18);
          outU8Array[outIdx++] = 0x80 | ((u >> 12) & 63);
          outU8Array[outIdx++] = 0x80 | ((u >> 6) & 63);
          outU8Array[outIdx++] = 0x80 | (u & 63);
        }
      }
      // Null-terminate the pointer to the buffer.
      outU8Array[outIdx] = 0;
      return outIdx - startIdx;
    }

    // Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
    // null-terminated and encoded in UTF8 form. The copy will require at most str.length*4+1 bytes of space in the HEAP.
    // Use the function lengthBytesUTF8 to compute the exact number of bytes (excluding null terminator) that this function will write.
    // Returns the number of bytes written, EXCLUDING the null terminator.

    function stringToUTF8(str, outPtr, maxBytesToWrite) {
      return stringToUTF8Array(str, HEAPU8,outPtr, maxBytesToWrite);
    }

    // Returns the number of bytes the given Javascript string takes if encoded as a UTF8 byte array, EXCLUDING the null terminator byte.
    function lengthBytesUTF8(str) {
      var len = 0;
      for (var i = 0; i < str.length; ++i) {
        // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! So decode UTF16->UTF32->UTF8.
        // See http://unicode.org/faq/utf_bom.html#utf16-3
        var u = str.charCodeAt(i); // possibly a lead surrogate
        if (u >= 0xD800 && u <= 0xDFFF) u = 0x10000 + ((u & 0x3FF) << 10) | (str.charCodeAt(++i) & 0x3FF);
        if (u <= 0x7F) ++len;
        else if (u <= 0x7FF) len += 2;
        else if (u <= 0xFFFF) len += 3;
        else len += 4;
      }
      return len;
    }


    // Given a pointer 'ptr' to a null-terminated UTF16LE-encoded string in the emscripten HEAP, returns
    // a copy of that string as a Javascript String object.

    var UTF16Decoder = typeof TextDecoder !== 'undefined' ? new TextDecoder('utf-16le') : undefined;

    // Allocate stack space for a JS string, and write it there.
    function allocateUTF8OnStack(str) {
      var size = lengthBytesUTF8(str) + 1;
      var ret = stackAlloc(size);
      stringToUTF8Array(str, HEAP8, ret, size);
      return ret;
    }

    function writeArrayToMemory(array, buffer) {
      HEAP8.set(array, buffer);
    }
    var WASM_PAGE_SIZE = 65536;

    var /** @type {ArrayBuffer} */
      buffer,
    /** @type {Int8Array} */
      HEAP8,
    /** @type {Uint8Array} */
      HEAPU8,
    /** @type {Int16Array} */
      HEAP16,
    /** @type {Uint16Array} */
      HEAPU16,
    /** @type {Int32Array} */
      HEAP32,
    /** @type {Uint32Array} */
      HEAPU32,
    /** @type {Float32Array} */
      HEAPF32,
    /** @type {Float64Array} */
      HEAPF64;

    function updateGlobalBufferAndViews(buf) {
      buffer = buf;
      Module['HEAP8'] = HEAP8 = new Int8Array(buf);
      Module['HEAP16'] = HEAP16 = new Int16Array(buf);
      Module['HEAP32'] = HEAP32 = new Int32Array(buf);
      Module['HEAPU8'] = HEAPU8 = new Uint8Array(buf);
      Module['HEAPU16'] = HEAPU16 = new Uint16Array(buf);
      Module['HEAPU32'] = HEAPU32 = new Uint32Array(buf);
      Module['HEAPF32'] = HEAPF32 = new Float32Array(buf);
      Module['HEAPF64'] = HEAPF64 = new Float64Array(buf);
    }

    var DYNAMIC_BASE = 5256240,
        DYNAMICTOP_PTR = 13168;

    var INITIAL_TOTAL_MEMORY = Module['TOTAL_MEMORY'] || 16777216;







    // In standalone mode, the wasm creates the memory, and the user can't provide it.
    // In non-standalone/normal mode, we create the memory here.

    // Create the main memory. (Note: this isn't used in STANDALONE_WASM mode since the wasm
    // memory is created in the wasm, not in JS.)

      if (Module['wasmMemory']) {
        wasmMemory = Module['wasmMemory'];
      } else
      {
        wasmMemory = new WebAssembly.Memory({
          'initial': INITIAL_TOTAL_MEMORY / WASM_PAGE_SIZE
          ,
          'maximum': INITIAL_TOTAL_MEMORY / WASM_PAGE_SIZE
        });
      }


    if (wasmMemory) {
      buffer = wasmMemory.buffer;
    }

    // If the user provides an incorrect length, just use that length instead rather than providing the user to
    // specifically provide the memory length with Module['TOTAL_MEMORY'].
    INITIAL_TOTAL_MEMORY = buffer.byteLength;
    updateGlobalBufferAndViews(buffer);

    HEAP32[DYNAMICTOP_PTR>>2] = DYNAMIC_BASE;










    function callRuntimeCallbacks(callbacks) {
      while(callbacks.length > 0) {
        var callback = callbacks.shift();
        if (typeof callback == 'function') {
          callback();
          continue;
        }
        var func = callback.func;
        if (typeof func === 'number') {
          if (callback.arg === undefined) {
            Module['dynCall_v'](func);
          } else {
            Module['dynCall_vi'](func, callback.arg);
          }
        } else {
          func(callback.arg === undefined ? null : callback.arg);
        }
      }
    }

    var __ATPRERUN__  = []; // functions called before the runtime is initialized
    var __ATINIT__    = []; // functions called during startup
    var __ATMAIN__    = []; // functions called when main() is to be run
    var __ATPOSTRUN__ = []; // functions called after the main() is called


    function preRun() {

      if (Module['preRun']) {
        if (typeof Module['preRun'] == 'function') Module['preRun'] = [Module['preRun']];
        while (Module['preRun'].length) {
          addOnPreRun(Module['preRun'].shift());
        }
      }

      callRuntimeCallbacks(__ATPRERUN__);
    }

    function initRuntime() {
      
      callRuntimeCallbacks(__ATINIT__);
    }

    function preMain() {
      
      callRuntimeCallbacks(__ATMAIN__);
    }

    function postRun() {

      if (Module['postRun']) {
        if (typeof Module['postRun'] == 'function') Module['postRun'] = [Module['postRun']];
        while (Module['postRun'].length) {
          addOnPostRun(Module['postRun'].shift());
        }
      }

      callRuntimeCallbacks(__ATPOSTRUN__);
    }

    function addOnPreRun(cb) {
      __ATPRERUN__.unshift(cb);
    }

    function addOnPostRun(cb) {
      __ATPOSTRUN__.unshift(cb);
    }



    // A counter of dependencies for calling run(). If we need to
    // do asynchronous work before running, increment this and
    // decrement it. Incrementing must happen in a place like
    // Module.preRun (used by emcc to add file preloading).
    // Note that you can add dependencies in preRun, even though
    // it happens right before run - run will be postponed until
    // the dependencies are met.
    var runDependencies = 0;
    var dependenciesFulfilled = null; // overridden to take different actions when all run dependencies are fulfilled

    function addRunDependency(id) {
      runDependencies++;

      if (Module['monitorRunDependencies']) {
        Module['monitorRunDependencies'](runDependencies);
      }

    }

    function removeRunDependency(id) {
      runDependencies--;

      if (Module['monitorRunDependencies']) {
        Module['monitorRunDependencies'](runDependencies);
      }

      if (runDependencies == 0) {
        if (dependenciesFulfilled) {
          var callback = dependenciesFulfilled;
          dependenciesFulfilled = null;
          callback(); // can add another dependenciesFulfilled
        }
      }
    }

    Module["preloadedImages"] = {}; // maps url to image data
    Module["preloadedAudios"] = {}; // maps url to audio data


    function abort(what) {
      if (Module['onAbort']) {
        Module['onAbort'](what);
      }

      what += '';
      out(what);
      err(what);

      ABORT = true;

      what = 'abort(' + what + '). Build with -s ASSERTIONS=1 for more info.';

      // Throw a wasm runtime error, because a JS error might be seen as a foreign
      // exception, which means we'd run destructors on it. We need the error to
      // simply make the program stop.
      throw new WebAssembly.RuntimeError(what);
    }







    // Copyright 2017 The Emscripten Authors.  All rights reserved.
    // Emscripten is available under two separate licenses, the MIT license and the
    // University of Illinois/NCSA Open Source License.  Both these licenses can be
    // found in the LICENSE file.

    // Prefix of data URIs emitted by SINGLE_FILE and related options.
    var dataURIPrefix = 'data:application/octet-stream;base64,';

    // Indicates whether filename is a base64 data URI.
    function isDataURI(filename) {
      return String.prototype.startsWith ?
          filename.startsWith(dataURIPrefix) :
          filename.indexOf(dataURIPrefix) === 0;
    }




    var wasmBinaryFile = 'picotcp.wasm';
    if (!isDataURI(wasmBinaryFile)) {
      wasmBinaryFile = locateFile(wasmBinaryFile);
    }

    function getBinary() {
      try {
        if (wasmBinary) {
          return new Uint8Array(wasmBinary);
        }

        if (readBinary) {
          return readBinary(wasmBinaryFile);
        } else {
          throw "both async and sync fetching of the wasm failed";
        }
      }
      catch (err) {
        abort(err);
      }
    }

    function getBinaryPromise() {
      // if we don't have the binary yet, and have the Fetch api, use that
      // in some environments, like Electron's render process, Fetch api may be present, but have a different context than expected, let's only use it on the Web
      if (!wasmBinary && (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) && typeof fetch === 'function') {
        return fetch(wasmBinaryFile, { credentials: 'same-origin' }).then(function(response) {
          if (!response['ok']) {
            throw "failed to load wasm binary file at '" + wasmBinaryFile + "'";
          }
          return response['arrayBuffer']();
        }).catch(function () {
          return getBinary();
        });
      }
      // Otherwise, getBinary should be able to get it synchronously
      return new Promise(function(resolve, reject) {
        resolve(getBinary());
      });
    }



    // Create the wasm instance.
    // Receives the wasm imports, returns the exports.
    function createWasm() {
      // prepare imports
      var info = {
        'env': asmLibraryArg,
        'wasi_unstable': asmLibraryArg
        ,
        'global': {
          'NaN': NaN,
          'Infinity': Infinity
        },
        'global.Math': Math,
        'asm2wasm': asm2wasmImports
      };
      // Load the wasm module and create an instance of using native support in the JS engine.
      // handle a generated wasm instance, receiving its exports and
      // performing other necessary setup
      function receiveInstance(instance, module) {
        var exports = instance.exports;
        Module['asm'] = exports;
        removeRunDependency();
      }
       // we can't run yet (except in a pthread, where we have a custom sync instantiator)
      addRunDependency();


      function receiveInstantiatedSource(output) {
        // 'output' is a WebAssemblyInstantiatedSource object which has both the module and instance.
        // receiveInstance() will swap in the exports (to Module.asm) so they can be called
          // TODO: Due to Closure regression https://github.com/google/closure-compiler/issues/3193, the above line no longer optimizes out down to the following line.
          // When the regression is fixed, can restore the above USE_PTHREADS-enabled path.
        receiveInstance(output['instance']);
      }


      function instantiateArrayBuffer(receiver) {
        return getBinaryPromise().then(function(binary) {
          return WebAssembly.instantiate(binary, info);
        }).then(receiver, function(reason) {
          err('failed to asynchronously prepare wasm: ' + reason);
          abort(reason);
        });
      }

      // Prefer streaming instantiation if available.
      function instantiateAsync() {
        if (!wasmBinary &&
            typeof WebAssembly.instantiateStreaming === 'function' &&
            !isDataURI(wasmBinaryFile) &&
            typeof fetch === 'function') {
          fetch(wasmBinaryFile, { credentials: 'same-origin' }).then(function (response) {
            var result = WebAssembly.instantiateStreaming(response, info);
            return result.then(receiveInstantiatedSource, function(reason) {
                // We expect the most common failure cause to be a bad MIME type for the binary,
                // in which case falling back to ArrayBuffer instantiation should work.
                err('wasm streaming compile failed: ' + reason);
                err('falling back to ArrayBuffer instantiation');
                instantiateArrayBuffer(receiveInstantiatedSource);
              });
          });
        } else {
          return instantiateArrayBuffer(receiveInstantiatedSource);
        }
      }
      // User shell pages can write their own Module.instantiateWasm = function(imports, successCallback) callback
      // to manually instantiate the Wasm module themselves. This allows pages to run the instantiation parallel
      // to any other async startup actions they are performing.
      if (Module['instantiateWasm']) {
        try {
          var exports = Module['instantiateWasm'](info, receiveInstance);
          return exports;
        } catch(e) {
          err('Module.instantiateWasm callback failed with error: ' + e);
          return false;
        }
      }

      instantiateAsync();
      return {}; // no exports yet; we'll fill them in later
    }

    Module['asm'] = createWasm;

    // === Body ===

    var ASM_CONSTS = [function($0) { Module.pointers[$0] = { writable: new SyncReadableWritableStream(), readable: new SyncWritableReadableStream(), }; },
     function($0, $1, $2, $3) { Module.pointers[$0] = { writable: new SyncReadableWritableStream(), readable: new SyncWritableReadableStream(), remoteIP: $1, remotePort: $2, }; Module.pointers[$3].readable._write(Module.pointers[$0]); },
     function($0) { Module.pointers[$0].readable.error(); },
     function($0, $1, $2) { Module.pointers[$0].readable._write(HEAPU8.slice($1, $1 + $2)); },
     function($0, $1) { const device = Module.pointers[$0]; const buffer = device.writable._read(); if (buffer === device.writable.EOF) return -1; if (!buffer) device.writable._onData = () => { Module._js_wakeup($1, $0); }; if (!buffer) return 0; Module._readBuffer = buffer; return buffer.byteLength; },
     function($0) { writeArrayToMemory(Module._readBuffer, $0); },
     function($0, $1) { const _unread = (reader, value) => { reader._read = new Proxy(reader._read, { apply(target, thisArg, args) { thisArg._read = target; return value; } }); }; const device = Module.pointers[$0]; if ($1 < Module._readBuffer.byteLength) { _unread(device.writable, Module._readBuffer.subarray($1)); } Module._readBuffer = null; },
     function($0) { Module.pointers[$0].readable._close(); },
     function($0, $1) { Module.pointers[$0] = { name: UTF8ToString($1), writable: new SyncReadableWritableStream(), readable: new SyncWritableReadableStream(), }; },
     function($0) { return Module.pointers[$0].readable.desiredSize },
     function($0, $1, $2) { Module.pointers[$0].readable._write(HEAPU8.slice($1, $1 + $2)); },
     function($0) { const device = Module.pointers[$0]; const buffer = device.writable._read(); if (!buffer) return 0; Module._readBuffer = buffer; return buffer.byteLength; },
     function($0) { writeArrayToMemory(Module._readBuffer, $0); Module._readBuffer = null; },
     function() { Module._readBuffer = null; Module.pointers = {}; }];

    function _emscripten_asm_const_i(code) {
      return ASM_CONSTS[code]();
    }

    function _emscripten_asm_const_iii(code, a0, a1) {
      return ASM_CONSTS[code](a0, a1);
    }

    function _emscripten_asm_const_iiiii(code, a0, a1, a2, a3) {
      return ASM_CONSTS[code](a0, a1, a2, a3);
    }

    function _emscripten_asm_const_ii(code, a0) {
      return ASM_CONSTS[code](a0);
    }

    function _emscripten_asm_const_iiii(code, a0, a1, a2) {
      return ASM_CONSTS[code](a0, a1, a2);
    }

    function _emscripten_asm_const_di(code, a0) {
      return ASM_CONSTS[code](a0);
    }




    // STATICTOP = STATIC_BASE + 12336;
    /* global initializers */ /*__ATINIT__.push();*/








    /* no memory initializer */
    var tempDoublePtr = 13344;

    // {{PRE_LIBRARY}}


      function demangle(func) {
          return func;
        }
      Module["demangle"] = demangle;

      function demangleAll(text) {
          var regex =
            /\b__Z[\w\d_]+/g;
          return text.replace(regex,
            function(x) {
              var y = demangle(x);
              return x === y ? x : (y + ' [' + x + ']');
            });
        }
      Module["demangleAll"] = demangleAll;

      function jsStackTrace() {
          var err = new Error();
          if (!err.stack) {
            // IE10+ special cases: It does have callstack info, but it is only populated if an Error object is thrown,
            // so try that as a special-case.
            try {
              throw new Error(0);
            } catch(e) {
              err = e;
            }
            if (!err.stack) {
              return '(no stack trace available)';
            }
          }
          return err.stack.toString();
        }
      Module["jsStackTrace"] = jsStackTrace;

      function stackTrace() {
          var js = jsStackTrace();
          if (Module['extraStackTrace']) js += '\n' + Module['extraStackTrace']();
          return demangleAll(js);
        }
      Module["stackTrace"] = stackTrace;

      
      
      function flush_NO_FILESYSTEM() {
          // flush anything remaining in the buffers during shutdown
          var fflush = Module["_fflush"];
          if (fflush) fflush(0);
          var buffers = SYSCALLS.buffers;
          if (buffers[1].length) SYSCALLS.printChar(1, 10);
          if (buffers[2].length) SYSCALLS.printChar(2, 10);
        }
      Module["flush_NO_FILESYSTEM"] = flush_NO_FILESYSTEM;
      
      
      var PATH={splitPath:function (filename) {
            var splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
            return splitPathRe.exec(filename).slice(1);
          },normalizeArray:function (parts, allowAboveRoot) {
            // if the path tries to go above the root, `up` ends up > 0
            var up = 0;
            for (var i = parts.length - 1; i >= 0; i--) {
              var last = parts[i];
              if (last === '.') {
                parts.splice(i, 1);
              } else if (last === '..') {
                parts.splice(i, 1);
                up++;
              } else if (up) {
                parts.splice(i, 1);
                up--;
              }
            }
            // if the path is allowed to go above the root, restore leading ..s
            if (allowAboveRoot) {
              for (; up; up--) {
                parts.unshift('..');
              }
            }
            return parts;
          },normalize:function (path) {
            var isAbsolute = path.charAt(0) === '/',
                trailingSlash = path.substr(-1) === '/';
            // Normalize the path
            path = PATH.normalizeArray(path.split('/').filter(function(p) {
              return !!p;
            }), !isAbsolute).join('/');
            if (!path && !isAbsolute) {
              path = '.';
            }
            if (path && trailingSlash) {
              path += '/';
            }
            return (isAbsolute ? '/' : '') + path;
          },dirname:function (path) {
            var result = PATH.splitPath(path),
                root = result[0],
                dir = result[1];
            if (!root && !dir) {
              // No dirname whatsoever
              return '.';
            }
            if (dir) {
              // It has a dirname, strip trailing slash
              dir = dir.substr(0, dir.length - 1);
            }
            return root + dir;
          },basename:function (path) {
            // EMSCRIPTEN return '/'' for '/', not an empty string
            if (path === '/') return '/';
            var lastSlash = path.lastIndexOf('/');
            if (lastSlash === -1) return path;
            return path.substr(lastSlash+1);
          },extname:function (path) {
            return PATH.splitPath(path)[3];
          },join:function () {
            var paths = Array.prototype.slice.call(arguments, 0);
            return PATH.normalize(paths.join('/'));
          },join2:function (l, r) {
            return PATH.normalize(l + '/' + r);
          }};
      Module["PATH"] = PATH;var SYSCALLS={buffers:[null,[],[]],printChar:function (stream, curr) {
            var buffer = SYSCALLS.buffers[stream];
            if (curr === 0 || curr === 10) {
              (stream === 1 ? out : err)(UTF8ArrayToString(buffer, 0));
              buffer.length = 0;
            } else {
              buffer.push(curr);
            }
          },varargs:0,get:function (varargs) {
            SYSCALLS.varargs += 4;
            var ret = HEAP32[(((SYSCALLS.varargs)-(4))>>2)];
            return ret;
          },getStr:function () {
            var ret = UTF8ToString(SYSCALLS.get());
            return ret;
          },get64:function () {
            var low = SYSCALLS.get(), high = SYSCALLS.get();
            return low;
          },getZero:function () {
            SYSCALLS.get();
          }};
      Module["SYSCALLS"] = SYSCALLS;function _fd_write(fd, iov, iovcnt, pnum) {try {
      
          // hack to support printf in SYSCALLS_REQUIRE_FILESYSTEM=0
          var num = 0;
          for (var i = 0; i < iovcnt; i++) {
            var ptr = HEAP32[(((iov)+(i*8))>>2)];
            var len = HEAP32[(((iov)+(i*8 + 4))>>2)];
            for (var j = 0; j < len; j++) {
              SYSCALLS.printChar(fd, HEAPU8[ptr+j]);
            }
            num += len;
          }
          HEAP32[((pnum)>>2)]=num;
          return 0;
        } catch (e) {
        if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
        return e.errno;
      }
      }
      Module["_fd_write"] = _fd_write;function ___wasi_fd_write() {
      return _fd_write.apply(null, arguments)
      }
      Module["___wasi_fd_write"] = ___wasi_fd_write;

      function _abort() {
          abort();
        }
      Module["_abort"] = _abort;

      var _emscripten_asm_const_double=true;
      Module["_emscripten_asm_const_double"] = _emscripten_asm_const_double;

      var _emscripten_asm_const_int=true;
      Module["_emscripten_asm_const_int"] = _emscripten_asm_const_int;

      function _emscripten_get_heap_size() {
          return HEAP8.length;
        }
      Module["_emscripten_get_heap_size"] = _emscripten_get_heap_size;

       

      
      function abortOnCannotGrowMemory(requestedSize) {
          abort('OOM');
        }
      Module["abortOnCannotGrowMemory"] = abortOnCannotGrowMemory;function _emscripten_resize_heap(requestedSize) {
          abortOnCannotGrowMemory();
        }
      Module["_emscripten_resize_heap"] = _emscripten_resize_heap;

      function _gettimeofday(ptr) {
          var now = Date.now();
          HEAP32[((ptr)>>2)]=(now/1000)|0; // seconds
          HEAP32[(((ptr)+(4))>>2)]=((now % 1000)*1000)|0; // microseconds
          return 0;
        }
      Module["_gettimeofday"] = _gettimeofday;

       

       

      
      function _emscripten_memcpy_big(dest, src, num) {
          HEAPU8.set(HEAPU8.subarray(src, src+num), dest);
        }
      Module["_emscripten_memcpy_big"] = _emscripten_memcpy_big;


    // ASM_LIBRARY EXTERN PRIMITIVES: Int8Array,Int32Array


    function jsCall_ii(index,a1) {
        return functionPointers[index](a1);
    }

    function jsCall_iidiiii(index,a1,a2,a3,a4,a5,a6) {
        return functionPointers[index](a1,a2,a3,a4,a5,a6);
    }

    function jsCall_iii(index,a1,a2) {
        return functionPointers[index](a1,a2);
    }

    function jsCall_iiii(index,a1,a2,a3) {
        return functionPointers[index](a1,a2,a3);
    }

    function jsCall_jiji(index,a1,a2,a3) {
        return functionPointers[index](a1,a2,a3);
    }

    function jsCall_vi(index,a1) {
        functionPointers[index](a1);
    }

    function jsCall_vii(index,a1,a2) {
        functionPointers[index](a1,a2);
    }

    function jsCall_viiii(index,a1,a2,a3,a4) {
        functionPointers[index](a1,a2,a3,a4);
    }

    function jsCall_vji(index,a1,a2) {
        functionPointers[index](a1,a2);
    }

    var asmGlobalArg = {};

    var asmLibraryArg = { "___wasi_fd_write": ___wasi_fd_write, "__memory_base": 1024, "__table_base": 0, "_abort": _abort, "_emscripten_asm_const_di": _emscripten_asm_const_di, "_emscripten_asm_const_i": _emscripten_asm_const_i, "_emscripten_asm_const_ii": _emscripten_asm_const_ii, "_emscripten_asm_const_iii": _emscripten_asm_const_iii, "_emscripten_asm_const_iiii": _emscripten_asm_const_iiii, "_emscripten_asm_const_iiiii": _emscripten_asm_const_iiiii, "_emscripten_get_heap_size": _emscripten_get_heap_size, "_emscripten_memcpy_big": _emscripten_memcpy_big, "_emscripten_resize_heap": _emscripten_resize_heap, "_fd_write": _fd_write, "_gettimeofday": _gettimeofday, "abort": abort, "abortOnCannotGrowMemory": abortOnCannotGrowMemory, "demangle": demangle, "demangleAll": demangleAll, "flush_NO_FILESYSTEM": flush_NO_FILESYSTEM, "getTempRet0": getTempRet0, "jsCall_ii": jsCall_ii, "jsCall_iidiiii": jsCall_iidiiii, "jsCall_iii": jsCall_iii, "jsCall_iiii": jsCall_iiii, "jsCall_jiji": jsCall_jiji, "jsCall_vi": jsCall_vi, "jsCall_vii": jsCall_vii, "jsCall_viiii": jsCall_viiii, "jsCall_vji": jsCall_vji, "jsStackTrace": jsStackTrace, "memory": wasmMemory, "setTempRet0": setTempRet0, "stackTrace": stackTrace, "table": wasmTable, "tempDoublePtr": tempDoublePtr };
    // EMSCRIPTEN_START_ASM
    var asm =Module["asm"]// EMSCRIPTEN_END_ASM
    (asmGlobalArg, asmLibraryArg, buffer);

    Module["asm"] = asm;
    var _PICO_TIME = Module["_PICO_TIME"] = function() {
      return Module["asm"]["_PICO_TIME"].apply(null, arguments)
    };

    var _PICO_TIME_MS = Module["_PICO_TIME_MS"] = function() {
      return Module["asm"]["_PICO_TIME_MS"].apply(null, arguments)
    };

    var _PICO_TIME_MS_130 = Module["_PICO_TIME_MS_130"] = function() {
      return Module["asm"]["_PICO_TIME_MS_130"].apply(null, arguments)
    };

    var _PICO_TIME_MS_137 = Module["_PICO_TIME_MS_137"] = function() {
      return Module["asm"]["_PICO_TIME_MS_137"].apply(null, arguments)
    };

    var _PICO_TIME_MS_146 = Module["_PICO_TIME_MS_146"] = function() {
      return Module["asm"]["_PICO_TIME_MS_146"].apply(null, arguments)
    };

    var _PICO_TIME_MS_231 = Module["_PICO_TIME_MS_231"] = function() {
      return Module["asm"]["_PICO_TIME_MS_231"].apply(null, arguments)
    };

    var _PICO_TIME_MS_278 = Module["_PICO_TIME_MS_278"] = function() {
      return Module["asm"]["_PICO_TIME_MS_278"].apply(null, arguments)
    };

    var _PICO_TIME_MS_310 = Module["_PICO_TIME_MS_310"] = function() {
      return Module["asm"]["_PICO_TIME_MS_310"].apply(null, arguments)
    };

    var _PICO_TIME_MS_366 = Module["_PICO_TIME_MS_366"] = function() {
      return Module["asm"]["_PICO_TIME_MS_366"].apply(null, arguments)
    };

    var _PICO_TIME_MS_376 = Module["_PICO_TIME_MS_376"] = function() {
      return Module["asm"]["_PICO_TIME_MS_376"].apply(null, arguments)
    };

    var ___DOUBLE_BITS_670 = Module["___DOUBLE_BITS_670"] = function() {
      return Module["asm"]["___DOUBLE_BITS_670"].apply(null, arguments)
    };

    var ___emscripten_stdout_close = Module["___emscripten_stdout_close"] = function() {
      return Module["asm"]["___emscripten_stdout_close"].apply(null, arguments)
    };

    var ___emscripten_stdout_seek = Module["___emscripten_stdout_seek"] = function() {
      return Module["asm"]["___emscripten_stdout_seek"].apply(null, arguments)
    };

    var ___errno_location = Module["___errno_location"] = function() {
      return Module["asm"]["___errno_location"].apply(null, arguments)
    };

    var ___fwritex = Module["___fwritex"] = function() {
      return Module["asm"]["___fwritex"].apply(null, arguments)
    };

    var ___lockfile = Module["___lockfile"] = function() {
      return Module["asm"]["___lockfile"].apply(null, arguments)
    };

    var ___overflow = Module["___overflow"] = function() {
      return Module["asm"]["___overflow"].apply(null, arguments)
    };

    var ___pthread_self_423 = Module["___pthread_self_423"] = function() {
      return Module["asm"]["___pthread_self_423"].apply(null, arguments)
    };

    var ___stdio_write = Module["___stdio_write"] = function() {
      return Module["asm"]["___stdio_write"].apply(null, arguments)
    };

    var ___stpncpy = Module["___stpncpy"] = function() {
      return Module["asm"]["___stpncpy"].apply(null, arguments)
    };

    var ___towrite = Module["___towrite"] = function() {
      return Module["asm"]["___towrite"].apply(null, arguments)
    };

    var ___unlockfile = Module["___unlockfile"] = function() {
      return Module["asm"]["___unlockfile"].apply(null, arguments)
    };

    var ___vfprintf_internal = Module["___vfprintf_internal"] = function() {
      return Module["asm"]["___vfprintf_internal"].apply(null, arguments)
    };

    var ___wasi_syscall_ret = Module["___wasi_syscall_ret"] = function() {
      return Module["asm"]["___wasi_syscall_ret"].apply(null, arguments)
    };

    var __pico_stack_recv_zerocopy = Module["__pico_stack_recv_zerocopy"] = function() {
      return Module["asm"]["__pico_stack_recv_zerocopy"].apply(null, arguments)
    };

    var _add_retransmission_timer = Module["_add_retransmission_timer"] = function() {
      return Module["asm"]["_add_retransmission_timer"].apply(null, arguments)
    };

    var _aodv_dev_cmp = Module["_aodv_dev_cmp"] = function() {
      return Module["asm"]["_aodv_dev_cmp"].apply(null, arguments)
    };

    var _aodv_elect_route = Module["_aodv_elect_route"] = function() {
      return Module["asm"]["_aodv_elect_route"].apply(null, arguments)
    };

    var _aodv_forward = Module["_aodv_forward"] = function() {
      return Module["asm"]["_aodv_forward"].apply(null, arguments)
    };

    var _aodv_lifetime = Module["_aodv_lifetime"] = function() {
      return Module["asm"]["_aodv_lifetime"].apply(null, arguments)
    };

    var _aodv_make_rreq = Module["_aodv_make_rreq"] = function() {
      return Module["asm"]["_aodv_make_rreq"].apply(null, arguments)
    };

    var _aodv_node_compare = Module["_aodv_node_compare"] = function() {
      return Module["asm"]["_aodv_node_compare"].apply(null, arguments)
    };

    var _aodv_parse_rack = Module["_aodv_parse_rack"] = function() {
      return Module["asm"]["_aodv_parse_rack"].apply(null, arguments)
    };

    var _aodv_parse_rerr = Module["_aodv_parse_rerr"] = function() {
      return Module["asm"]["_aodv_parse_rerr"].apply(null, arguments)
    };

    var _aodv_parse_rrep = Module["_aodv_parse_rrep"] = function() {
      return Module["asm"]["_aodv_parse_rrep"].apply(null, arguments)
    };

    var _aodv_parse_rreq = Module["_aodv_parse_rreq"] = function() {
      return Module["asm"]["_aodv_parse_rreq"].apply(null, arguments)
    };

    var _aodv_peer_eval = Module["_aodv_peer_eval"] = function() {
      return Module["asm"]["_aodv_peer_eval"].apply(null, arguments)
    };

    var _aodv_peer_new = Module["_aodv_peer_new"] = function() {
      return Module["asm"]["_aodv_peer_new"].apply(null, arguments)
    };

    var _aodv_peer_refresh = Module["_aodv_peer_refresh"] = function() {
      return Module["asm"]["_aodv_peer_refresh"].apply(null, arguments)
    };

    var _aodv_recv_valid_rreq = Module["_aodv_recv_valid_rreq"] = function() {
      return Module["asm"]["_aodv_recv_valid_rreq"].apply(null, arguments)
    };

    var _aodv_retrans_rreq = Module["_aodv_retrans_rreq"] = function() {
      return Module["asm"]["_aodv_retrans_rreq"].apply(null, arguments)
    };

    var _aodv_reverse_path_discover = Module["_aodv_reverse_path_discover"] = function() {
      return Module["asm"]["_aodv_reverse_path_discover"].apply(null, arguments)
    };

    var _aodv_send_reply = Module["_aodv_send_reply"] = function() {
      return Module["asm"]["_aodv_send_reply"].apply(null, arguments)
    };

    var _aodv_send_req = Module["_aodv_send_req"] = function() {
      return Module["asm"]["_aodv_send_req"].apply(null, arguments)
    };

    var _arp_compare = Module["_arp_compare"] = function() {
      return Module["asm"]["_arp_compare"].apply(null, arguments)
    };

    var _arp_expire = Module["_arp_expire"] = function() {
      return Module["asm"]["_arp_expire"].apply(null, arguments)
    };

    var _calc_score = Module["_calc_score"] = function() {
      return Module["asm"]["_calc_score"].apply(null, arguments)
    };

    var _calloc = Module["_calloc"] = function() {
      return Module["asm"]["_calloc"].apply(null, arguments)
    };

    var _checkLocalClosing = Module["_checkLocalClosing"] = function() {
      return Module["asm"]["_checkLocalClosing"].apply(null, arguments)
    };

    var _checkRemoteClosing = Module["_checkRemoteClosing"] = function() {
      return Module["asm"]["_checkRemoteClosing"].apply(null, arguments)
    };

    var _check_dev_serve_interrupt = Module["_check_dev_serve_interrupt"] = function() {
      return Module["asm"]["_check_dev_serve_interrupt"].apply(null, arguments)
    };

    var _check_dev_serve_polling = Module["_check_dev_serve_polling"] = function() {
      return Module["asm"]["_check_dev_serve_polling"].apply(null, arguments)
    };

    var _check_socket_sanity = Module["_check_socket_sanity"] = function() {
      return Module["asm"]["_check_socket_sanity"].apply(null, arguments)
    };

    var _checksum_is_ipv4 = Module["_checksum_is_ipv4"] = function() {
      return Module["asm"]["_checksum_is_ipv4"].apply(null, arguments)
    };

    var _checksum_is_ipv6 = Module["_checksum_is_ipv6"] = function() {
      return Module["asm"]["_checksum_is_ipv6"].apply(null, arguments)
    };

    var _cookie_compare = Module["_cookie_compare"] = function() {
      return Module["asm"]["_cookie_compare"].apply(null, arguments)
    };

    var _create_dev_js = Module["_create_dev_js"] = function() {
      return Module["asm"]["_create_dev_js"].apply(null, arguments)
    };

    var _create_node = Module["_create_node"] = function() {
      return Module["asm"]["_create_node"].apply(null, arguments)
    };

    var _destination_is_bcast = Module["_destination_is_bcast"] = function() {
      return Module["asm"]["_destination_is_bcast"].apply(null, arguments)
    };

    var _destination_is_mcast = Module["_destination_is_mcast"] = function() {
      return Module["asm"]["_destination_is_mcast"].apply(null, arguments)
    };

    var _device_init_ipv6_final = Module["_device_init_ipv6_final"] = function() {
      return Module["asm"]["_device_init_ipv6_final"].apply(null, arguments)
    };

    var _device_init_mac = Module["_device_init_mac"] = function() {
      return Module["asm"]["_device_init_mac"].apply(null, arguments)
    };

    var _device_init_nomac = Module["_device_init_nomac"] = function() {
      return Module["asm"]["_device_init_nomac"].apply(null, arguments)
    };

    var _devloop = Module["_devloop"] = function() {
      return Module["asm"]["_devloop"].apply(null, arguments)
    };

    var _devloop_in = Module["_devloop_in"] = function() {
      return Module["asm"]["_devloop_in"].apply(null, arguments)
    };

    var _devloop_out = Module["_devloop_out"] = function() {
      return Module["asm"]["_devloop_out"].apply(null, arguments)
    };

    var _devloop_sendto_dev = Module["_devloop_sendto_dev"] = function() {
      return Module["asm"]["_devloop_sendto_dev"].apply(null, arguments)
    };

    var _dhcp_action_call = Module["_dhcp_action_call"] = function() {
      return Module["asm"]["_dhcp_action_call"].apply(null, arguments)
    };

    var _dhcp_cookies_cmp = Module["_dhcp_cookies_cmp"] = function() {
      return Module["asm"]["_dhcp_cookies_cmp"].apply(null, arguments)
    };

    var _dhcp_get_timer_event = Module["_dhcp_get_timer_event"] = function() {
      return Module["asm"]["_dhcp_get_timer_event"].apply(null, arguments)
    };

    var _dhcp_negotiation_set_ciaddr = Module["_dhcp_negotiation_set_ciaddr"] = function() {
      return Module["asm"]["_dhcp_negotiation_set_ciaddr"].apply(null, arguments)
    };

    var _dhcp_negotiations_cmp = Module["_dhcp_negotiations_cmp"] = function() {
      return Module["asm"]["_dhcp_negotiations_cmp"].apply(null, arguments)
    };

    var _dhcp_settings_cmp = Module["_dhcp_settings_cmp"] = function() {
      return Module["asm"]["_dhcp_settings_cmp"].apply(null, arguments)
    };

    var _dhcpd_make_reply = Module["_dhcpd_make_reply"] = function() {
      return Module["asm"]["_dhcpd_make_reply"].apply(null, arguments)
    };

    var _dhcps_make_reply_to_discover_or_request = Module["_dhcps_make_reply_to_discover_or_request"] = function() {
      return Module["asm"]["_dhcps_make_reply_to_discover_or_request"].apply(null, arguments)
    };

    var _dhcps_make_reply_to_request_msg = Module["_dhcps_make_reply_to_request_msg"] = function() {
      return Module["asm"]["_dhcps_make_reply_to_request_msg"].apply(null, arguments)
    };

    var _dhcps_parse_options_loop = Module["_dhcps_parse_options_loop"] = function() {
      return Module["asm"]["_dhcps_parse_options_loop"].apply(null, arguments)
    };

    var _dhcps_set_default_lease_time_if_not_provided = Module["_dhcps_set_default_lease_time_if_not_provided"] = function() {
      return Module["asm"]["_dhcps_set_default_lease_time_if_not_provided"].apply(null, arguments)
    };

    var _dhcps_set_default_pool_end_if_not_provided = Module["_dhcps_set_default_pool_end_if_not_provided"] = function() {
      return Module["asm"]["_dhcps_set_default_pool_end_if_not_provided"].apply(null, arguments)
    };

    var _dhcps_set_default_pool_start_if_not_provided = Module["_dhcps_set_default_pool_start_if_not_provided"] = function() {
      return Module["asm"]["_dhcps_set_default_pool_start_if_not_provided"].apply(null, arguments)
    };

    var _dhcps_try_open_socket = Module["_dhcps_try_open_socket"] = function() {
      return Module["asm"]["_dhcps_try_open_socket"].apply(null, arguments)
    };

    var _discard = Module["_discard"] = function() {
      return Module["asm"]["_discard"].apply(null, arguments)
    };

    var _dns_ns_cmp = Module["_dns_ns_cmp"] = function() {
      return Module["asm"]["_dns_ns_cmp"].apply(null, arguments)
    };

    var _dns_ptr_ip6_nibble_hi = Module["_dns_ptr_ip6_nibble_hi"] = function() {
      return Module["asm"]["_dns_ptr_ip6_nibble_hi"].apply(null, arguments)
    };

    var _dns_ptr_ip6_nibble_lo = Module["_dns_ptr_ip6_nibble_lo"] = function() {
      return Module["asm"]["_dns_ptr_ip6_nibble_lo"].apply(null, arguments)
    };

    var _dns_query_cmp = Module["_dns_query_cmp"] = function() {
      return Module["asm"]["_dns_query_cmp"].apply(null, arguments)
    };

    var _do_enqueue_segment = Module["_do_enqueue_segment"] = function() {
      return Module["asm"]["_do_enqueue_segment"].apply(null, arguments)
    };

    var _emscripten_get_sbrk_ptr = Module["_emscripten_get_sbrk_ptr"] = function() {
      return Module["asm"]["_emscripten_get_sbrk_ptr"].apply(null, arguments)
    };

    var _enqueue_segment_len = Module["_enqueue_segment_len"] = function() {
      return Module["asm"]["_enqueue_segment_len"].apply(null, arguments)
    };

    var _eth_check_headroom = Module["_eth_check_headroom"] = function() {
      return Module["asm"]["_eth_check_headroom"].apply(null, arguments)
    };

    var _filter_compare = Module["_filter_compare"] = function() {
      return Module["asm"]["_filter_compare"].apply(null, arguments)
    };

    var _filter_compare_address_port = Module["_filter_compare_address_port"] = function() {
      return Module["asm"]["_filter_compare_address_port"].apply(null, arguments)
    };

    var _filter_compare_addresses = Module["_filter_compare_addresses"] = function() {
      return Module["asm"]["_filter_compare_addresses"].apply(null, arguments)
    };

    var _filter_compare_ports = Module["_filter_compare_ports"] = function() {
      return Module["asm"]["_filter_compare_ports"].apply(null, arguments)
    };

    var _filter_compare_proto = Module["_filter_compare_proto"] = function() {
      return Module["asm"]["_filter_compare_proto"].apply(null, arguments)
    };

    var _filter_match_packet = Module["_filter_match_packet"] = function() {
      return Module["asm"]["_filter_match_packet"].apply(null, arguments)
    };

    var _filter_match_packet_addr = Module["_filter_match_packet_addr"] = function() {
      return Module["asm"]["_filter_match_packet_addr"].apply(null, arguments)
    };

    var _filter_match_packet_addr_in = Module["_filter_match_packet_addr_in"] = function() {
      return Module["asm"]["_filter_match_packet_addr_in"].apply(null, arguments)
    };

    var _filter_match_packet_addr_out = Module["_filter_match_packet_addr_out"] = function() {
      return Module["asm"]["_filter_match_packet_addr_out"].apply(null, arguments)
    };

    var _filter_match_packet_dev = Module["_filter_match_packet_dev"] = function() {
      return Module["asm"]["_filter_match_packet_dev"].apply(null, arguments)
    };

    var _filter_match_packet_dev_and_proto = Module["_filter_match_packet_dev_and_proto"] = function() {
      return Module["asm"]["_filter_match_packet_dev_and_proto"].apply(null, arguments)
    };

    var _filter_match_packet_find_rule = Module["_filter_match_packet_find_rule"] = function() {
      return Module["asm"]["_filter_match_packet_find_rule"].apply(null, arguments)
    };

    var _filter_match_packet_port = Module["_filter_match_packet_port"] = function() {
      return Module["asm"]["_filter_match_packet_port"].apply(null, arguments)
    };

    var _filter_match_packet_port_in = Module["_filter_match_packet_port_in"] = function() {
      return Module["asm"]["_filter_match_packet_port_in"].apply(null, arguments)
    };

    var _filter_match_packet_port_out = Module["_filter_match_packet_port_out"] = function() {
      return Module["asm"]["_filter_match_packet_port_out"].apply(null, arguments)
    };

    var _filter_match_packet_proto = Module["_filter_match_packet_proto"] = function() {
      return Module["asm"]["_filter_match_packet_proto"].apply(null, arguments)
    };

    var _first_segment = Module["_first_segment"] = function() {
      return Module["asm"]["_first_segment"].apply(null, arguments)
    };

    var _fix_delete_collisions = Module["_fix_delete_collisions"] = function() {
      return Module["asm"]["_fix_delete_collisions"].apply(null, arguments)
    };

    var _fix_insert_collisions = Module["_fix_insert_collisions"] = function() {
      return Module["asm"]["_fix_insert_collisions"].apply(null, arguments)
    };

    var _fmt_fp = Module["_fmt_fp"] = function() {
      return Module["asm"]["_fmt_fp"].apply(null, arguments)
    };

    var _fmt_o = Module["_fmt_o"] = function() {
      return Module["asm"]["_fmt_o"].apply(null, arguments)
    };

    var _fmt_u = Module["_fmt_u"] = function() {
      return Module["asm"]["_fmt_u"].apply(null, arguments)
    };

    var _fmt_x = Module["_fmt_x"] = function() {
      return Module["asm"]["_fmt_x"].apply(null, arguments)
    };

    var _fputs = Module["_fputs"] = function() {
      return Module["asm"]["_fputs"].apply(null, arguments)
    };

    var _free = Module["_free"] = function() {
      return Module["asm"]["_free"].apply(null, arguments)
    };

    var _frexp = Module["_frexp"] = function() {
      return Module["asm"]["_frexp"].apply(null, arguments)
    };

    var _fwrite = Module["_fwrite"] = function() {
      return Module["asm"]["_fwrite"].apply(null, arguments)
    };

    var _get_node_by_addr = Module["_get_node_by_addr"] = function() {
      return Module["asm"]["_get_node_by_addr"].apply(null, arguments)
    };

    var _get_sock_dev = Module["_get_sock_dev"] = function() {
      return Module["asm"]["_get_sock_dev"].apply(null, arguments)
    };

    var _getint = Module["_getint"] = function() {
      return Module["asm"]["_getint"].apply(null, arguments)
    };

    var _heap_first = Module["_heap_first"] = function() {
      return Module["asm"]["_heap_first"].apply(null, arguments)
    };

    var _heap_get_element = Module["_heap_get_element"] = function() {
      return Module["asm"]["_heap_get_element"].apply(null, arguments)
    };

    var _heap_increase_size = Module["_heap_increase_size"] = function() {
      return Module["asm"]["_heap_increase_size"].apply(null, arguments)
    };

    var _heap_init = Module["_heap_init"] = function() {
      return Module["asm"]["_heap_init"].apply(null, arguments)
    };

    var _heap_insert = Module["_heap_insert"] = function() {
      return Module["asm"]["_heap_insert"].apply(null, arguments)
    };

    var _heap_peek = Module["_heap_peek"] = function() {
      return Module["asm"]["_heap_peek"].apply(null, arguments)
    };

    var _icmp6_cookie_compare = Module["_icmp6_cookie_compare"] = function() {
      return Module["asm"]["_icmp6_cookie_compare"].apply(null, arguments)
    };

    var _icmp6_initial_checks = Module["_icmp6_initial_checks"] = function() {
      return Module["asm"]["_icmp6_initial_checks"].apply(null, arguments)
    };

    var _if_nodecolor_black_fix_collisions = Module["_if_nodecolor_black_fix_collisions"] = function() {
      return Module["asm"]["_if_nodecolor_black_fix_collisions"].apply(null, arguments)
    };

    var _igmp_parameters_cmp = Module["_igmp_parameters_cmp"] = function() {
      return Module["asm"]["_igmp_parameters_cmp"].apply(null, arguments)
    };

    var _igmp_sources_cmp = Module["_igmp_sources_cmp"] = function() {
      return Module["asm"]["_igmp_sources_cmp"].apply(null, arguments)
    };

    var _igmp_timer_cmp = Module["_igmp_timer_cmp"] = function() {
      return Module["asm"]["_igmp_timer_cmp"].apply(null, arguments)
    };

    var _igmpparm_group_compare = Module["_igmpparm_group_compare"] = function() {
      return Module["asm"]["_igmpparm_group_compare"].apply(null, arguments)
    };

    var _igmpparm_link_compare = Module["_igmpparm_link_compare"] = function() {
      return Module["asm"]["_igmpparm_link_compare"].apply(null, arguments)
    };

    var _igmpt_group_compare = Module["_igmpt_group_compare"] = function() {
      return Module["asm"]["_igmpt_group_compare"].apply(null, arguments)
    };

    var _igmpt_link_compare = Module["_igmpt_link_compare"] = function() {
      return Module["asm"]["_igmpt_link_compare"].apply(null, arguments)
    };

    var _igmpt_type_compare = Module["_igmpt_type_compare"] = function() {
      return Module["asm"]["_igmpt_type_compare"].apply(null, arguments)
    };

    var _initconn_retry = Module["_initconn_retry"] = function() {
      return Module["asm"]["_initconn_retry"].apply(null, arguments)
    };

    var _input_segment_compare = Module["_input_segment_compare"] = function() {
      return Module["asm"]["_input_segment_compare"].apply(null, arguments)
    };

    var _invalid_flags = Module["_invalid_flags"] = function() {
      return Module["asm"]["_invalid_flags"].apply(null, arguments)
    };

    var _ip_address_is_in_dhcp_range = Module["_ip_address_is_in_dhcp_range"] = function() {
      return Module["asm"]["_ip_address_is_in_dhcp_range"].apply(null, arguments)
    };

    var _ipfilter = Module["_ipfilter"] = function() {
      return Module["asm"]["_ipfilter"].apply(null, arguments)
    };

    var _ipfilter_apply_filter = Module["_ipfilter_apply_filter"] = function() {
      return Module["asm"]["_ipfilter_apply_filter"].apply(null, arguments)
    };

    var _ipfilter_ptr_cmp = Module["_ipfilter_ptr_cmp"] = function() {
      return Module["asm"]["_ipfilter_ptr_cmp"].apply(null, arguments)
    };

    var _ipfilter_uint16_cmp = Module["_ipfilter_uint16_cmp"] = function() {
      return Module["asm"]["_ipfilter_uint16_cmp"].apply(null, arguments)
    };

    var _ipfilter_uint32_cmp = Module["_ipfilter_uint32_cmp"] = function() {
      return Module["asm"]["_ipfilter_uint32_cmp"].apply(null, arguments)
    };

    var _ipfilter_uint8_cmp = Module["_ipfilter_uint8_cmp"] = function() {
      return Module["asm"]["_ipfilter_uint8_cmp"].apply(null, arguments)
    };

    var _ipv4_link_compare = Module["_ipv4_link_compare"] = function() {
      return Module["asm"]["_ipv4_link_compare"].apply(null, arguments)
    };

    var _ipv4_mcast_groups_cmp = Module["_ipv4_mcast_groups_cmp"] = function() {
      return Module["asm"]["_ipv4_mcast_groups_cmp"].apply(null, arguments)
    };

    var _ipv4_mcast_sources_cmp = Module["_ipv4_mcast_sources_cmp"] = function() {
      return Module["asm"]["_ipv4_mcast_sources_cmp"].apply(null, arguments)
    };

    var _ipv4_route_compare = Module["_ipv4_route_compare"] = function() {
      return Module["asm"]["_ipv4_route_compare"].apply(null, arguments)
    };

    var _ipv6_compare_metric = Module["_ipv6_compare_metric"] = function() {
      return Module["asm"]["_ipv6_compare_metric"].apply(null, arguments)
    };

    var _ipv6_duplicate_detected = Module["_ipv6_duplicate_detected"] = function() {
      return Module["asm"]["_ipv6_duplicate_detected"].apply(null, arguments)
    };

    var _ipv6_frame_push_final = Module["_ipv6_frame_push_final"] = function() {
      return Module["asm"]["_ipv6_frame_push_final"].apply(null, arguments)
    };

    var _ipv6_link_compare = Module["_ipv6_link_compare"] = function() {
      return Module["asm"]["_ipv6_link_compare"].apply(null, arguments)
    };

    var _ipv6_mcast_groups_cmp = Module["_ipv6_mcast_groups_cmp"] = function() {
      return Module["asm"]["_ipv6_mcast_groups_cmp"].apply(null, arguments)
    };

    var _ipv6_mcast_sources_cmp = Module["_ipv6_mcast_sources_cmp"] = function() {
      return Module["asm"]["_ipv6_mcast_sources_cmp"].apply(null, arguments)
    };

    var _ipv6_push_hdr_adjust = Module["_ipv6_push_hdr_adjust"] = function() {
      return Module["asm"]["_ipv6_push_hdr_adjust"].apply(null, arguments)
    };

    var _ipv6_pushed_frame_checks = Module["_ipv6_pushed_frame_checks"] = function() {
      return Module["asm"]["_ipv6_pushed_frame_checks"].apply(null, arguments)
    };

    var _ipv6_pushed_frame_valid = Module["_ipv6_pushed_frame_valid"] = function() {
      return Module["asm"]["_ipv6_pushed_frame_valid"].apply(null, arguments)
    };

    var _ipv6_route_add_link = Module["_ipv6_route_add_link"] = function() {
      return Module["asm"]["_ipv6_route_add_link"].apply(null, arguments)
    };

    var _ipv6_route_compare = Module["_ipv6_route_compare"] = function() {
      return Module["asm"]["_ipv6_route_compare"].apply(null, arguments)
    };

    var _isdigit = Module["_isdigit"] = function() {
      return Module["asm"]["_isdigit"].apply(null, arguments)
    };

    var _isupper = Module["_isupper"] = function() {
      return Module["asm"]["_isupper"].apply(null, arguments)
    };

    var _js_accept_nameserver = Module["_js_accept_nameserver"] = function() {
      return Module["asm"]["_js_accept_nameserver"].apply(null, arguments)
    };

    var _js_add_ipv4 = Module["_js_add_ipv4"] = function() {
      return Module["asm"]["_js_add_ipv4"].apply(null, arguments)
    };

    var _js_pico_err = Module["_js_pico_err"] = function() {
      return Module["asm"]["_js_pico_err"].apply(null, arguments)
    };

    var _js_socket_bind = Module["_js_socket_bind"] = function() {
      return Module["asm"]["_js_socket_bind"].apply(null, arguments)
    };

    var _js_socket_connect = Module["_js_socket_connect"] = function() {
      return Module["asm"]["_js_socket_connect"].apply(null, arguments)
    };

    var _js_socket_open = Module["_js_socket_open"] = function() {
      return Module["asm"]["_js_socket_open"].apply(null, arguments)
    };

    var _js_wakeup = Module["_js_wakeup"] = function() {
      return Module["asm"]["_js_wakeup"].apply(null, arguments)
    };

    var _listen_find = Module["_listen_find"] = function() {
      return Module["asm"]["_listen_find"].apply(null, arguments)
    };

    var _llvm_bswap_i16 = Module["_llvm_bswap_i16"] = function() {
      return Module["asm"]["_llvm_bswap_i16"].apply(null, arguments)
    };

    var _llvm_bswap_i32 = Module["_llvm_bswap_i32"] = function() {
      return Module["asm"]["_llvm_bswap_i32"].apply(null, arguments)
    };

    var _long_be = Module["_long_be"] = function() {
      return Module["asm"]["_long_be"].apply(null, arguments)
    };

    var _long_be_133 = Module["_long_be_133"] = function() {
      return Module["asm"]["_long_be_133"].apply(null, arguments)
    };

    var _long_be_147 = Module["_long_be_147"] = function() {
      return Module["asm"]["_long_be_147"].apply(null, arguments)
    };

    var _long_be_162 = Module["_long_be_162"] = function() {
      return Module["asm"]["_long_be_162"].apply(null, arguments)
    };

    var _long_be_311 = Module["_long_be_311"] = function() {
      return Module["asm"]["_long_be_311"].apply(null, arguments)
    };

    var _long_be_329 = Module["_long_be_329"] = function() {
      return Module["asm"]["_long_be_329"].apply(null, arguments)
    };

    var _long_be_340 = Module["_long_be_340"] = function() {
      return Module["asm"]["_long_be_340"].apply(null, arguments)
    };

    var _long_be_368 = Module["_long_be_368"] = function() {
      return Module["asm"]["_long_be_368"].apply(null, arguments)
    };

    var _long_be_37 = Module["_long_be_37"] = function() {
      return Module["asm"]["_long_be_37"].apply(null, arguments)
    };

    var _long_be_381 = Module["_long_be_381"] = function() {
      return Module["asm"]["_long_be_381"].apply(null, arguments)
    };

    var _long_be_39 = Module["_long_be_39"] = function() {
      return Module["asm"]["_long_be_39"].apply(null, arguments)
    };

    var _long_be_69 = Module["_long_be_69"] = function() {
      return Module["asm"]["_long_be_69"].apply(null, arguments)
    };

    var _long_from = Module["_long_from"] = function() {
      return Module["asm"]["_long_from"].apply(null, arguments)
    };

    var _long_from_152 = Module["_long_from_152"] = function() {
      return Module["asm"]["_long_from_152"].apply(null, arguments)
    };

    var _long_from_89 = Module["_long_from_89"] = function() {
      return Module["asm"]["_long_from_89"].apply(null, arguments)
    };

    var _main = Module["_main"] = function() {
      return Module["asm"]["_main"].apply(null, arguments)
    };

    var _malloc = Module["_malloc"] = function() {
      return Module["asm"]["_malloc"].apply(null, arguments)
    };

    var _mcast_aggr_validate = Module["_mcast_aggr_validate"] = function() {
      return Module["asm"]["_mcast_aggr_validate"].apply(null, arguments)
    };

    var _mcast_filter_cmp = Module["_mcast_filter_cmp"] = function() {
      return Module["asm"]["_mcast_filter_cmp"].apply(null, arguments)
    };

    var _mcast_filter_cmp_ipv6 = Module["_mcast_filter_cmp_ipv6"] = function() {
      return Module["asm"]["_mcast_filter_cmp_ipv6"].apply(null, arguments)
    };

    var _mcast_get_listen_tree = Module["_mcast_get_listen_tree"] = function() {
      return Module["asm"]["_mcast_get_listen_tree"].apply(null, arguments)
    };

    var _mcast_get_src_tree = Module["_mcast_get_src_tree"] = function() {
      return Module["asm"]["_mcast_get_src_tree"].apply(null, arguments)
    };

    var _mcast_group_update = Module["_mcast_group_update"] = function() {
      return Module["asm"]["_mcast_group_update"].apply(null, arguments)
    };

    var _mcast_group_update_ipv6 = Module["_mcast_group_update_ipv6"] = function() {
      return Module["asm"]["_mcast_group_update_ipv6"].apply(null, arguments)
    };

    var _mcast_parameters_cmp = Module["_mcast_parameters_cmp"] = function() {
      return Module["asm"]["_mcast_parameters_cmp"].apply(null, arguments)
    };

    var _mcast_set_listen_tree_p_null = Module["_mcast_set_listen_tree_p_null"] = function() {
      return Module["asm"]["_mcast_set_listen_tree_p_null"].apply(null, arguments)
    };

    var _mcast_socket_cmp = Module["_mcast_socket_cmp"] = function() {
      return Module["asm"]["_mcast_socket_cmp"].apply(null, arguments)
    };

    var _mcast_sources_cmp = Module["_mcast_sources_cmp"] = function() {
      return Module["asm"]["_mcast_sources_cmp"].apply(null, arguments)
    };

    var _mcast_sources_cmp_ipv6 = Module["_mcast_sources_cmp_ipv6"] = function() {
      return Module["asm"]["_mcast_sources_cmp_ipv6"].apply(null, arguments)
    };

    var _memchr = Module["_memchr"] = function() {
      return Module["asm"]["_memchr"].apply(null, arguments)
    };

    var _memcmp = Module["_memcmp"] = function() {
      return Module["asm"]["_memcmp"].apply(null, arguments)
    };

    var _memcpy = Module["_memcpy"] = function() {
      return Module["asm"]["_memcpy"].apply(null, arguments)
    };

    var _memset = Module["_memset"] = function() {
      return Module["asm"]["_memset"].apply(null, arguments)
    };

    var _mld_discard = Module["_mld_discard"] = function() {
      return Module["asm"]["_mld_discard"].apply(null, arguments)
    };

    var _mld_mrsrrt = Module["_mld_mrsrrt"] = function() {
      return Module["asm"]["_mld_mrsrrt"].apply(null, arguments)
    };

    var _mld_rtimrtct = Module["_mld_rtimrtct"] = function() {
      return Module["asm"]["_mld_rtimrtct"].apply(null, arguments)
    };

    var _mld_sources_cmp = Module["_mld_sources_cmp"] = function() {
      return Module["asm"]["_mld_sources_cmp"].apply(null, arguments)
    };

    var _mld_srsf = Module["_mld_srsf"] = function() {
      return Module["asm"]["_mld_srsf"].apply(null, arguments)
    };

    var _mld_srsfst = Module["_mld_srsfst"] = function() {
      return Module["asm"]["_mld_srsfst"].apply(null, arguments)
    };

    var _mld_srst = Module["_mld_srst"] = function() {
      return Module["asm"]["_mld_srst"].apply(null, arguments)
    };

    var _mld_stcl = Module["_mld_stcl"] = function() {
      return Module["asm"]["_mld_stcl"].apply(null, arguments)
    };

    var _mld_stsdifs = Module["_mld_stsdifs"] = function() {
      return Module["asm"]["_mld_stsdifs"].apply(null, arguments)
    };

    var _mld_timer_cmp = Module["_mld_timer_cmp"] = function() {
      return Module["asm"]["_mld_timer_cmp"].apply(null, arguments)
    };

    var _mldparm_group_compare = Module["_mldparm_group_compare"] = function() {
      return Module["asm"]["_mldparm_group_compare"].apply(null, arguments)
    };

    var _mldparm_link_compare = Module["_mldparm_link_compare"] = function() {
      return Module["asm"]["_mldparm_link_compare"].apply(null, arguments)
    };

    var _mldt_group_compare = Module["_mldt_group_compare"] = function() {
      return Module["asm"]["_mldt_group_compare"].apply(null, arguments)
    };

    var _mldt_link_compare = Module["_mldt_link_compare"] = function() {
      return Module["asm"]["_mldt_link_compare"].apply(null, arguments)
    };

    var _mldt_type_compare = Module["_mldt_type_compare"] = function() {
      return Module["asm"]["_mldt_type_compare"].apply(null, arguments)
    };

    var _mrsrrt = Module["_mrsrrt"] = function() {
      return Module["asm"]["_mrsrrt"].apply(null, arguments)
    };

    var _nat_cmp_address = Module["_nat_cmp_address"] = function() {
      return Module["asm"]["_nat_cmp_address"].apply(null, arguments)
    };

    var _nat_cmp_inbound = Module["_nat_cmp_inbound"] = function() {
      return Module["asm"]["_nat_cmp_inbound"].apply(null, arguments)
    };

    var _nat_cmp_natport = Module["_nat_cmp_natport"] = function() {
      return Module["asm"]["_nat_cmp_natport"].apply(null, arguments)
    };

    var _nat_cmp_outbound = Module["_nat_cmp_outbound"] = function() {
      return Module["asm"]["_nat_cmp_outbound"].apply(null, arguments)
    };

    var _nat_cmp_proto = Module["_nat_cmp_proto"] = function() {
      return Module["asm"]["_nat_cmp_proto"].apply(null, arguments)
    };

    var _nat_cmp_srcport = Module["_nat_cmp_srcport"] = function() {
      return Module["asm"]["_nat_cmp_srcport"].apply(null, arguments)
    };

    var _nd_options = Module["_nd_options"] = function() {
      return Module["asm"]["_nd_options"].apply(null, arguments)
    };

    var _neigh_adv_checks = Module["_neigh_adv_checks"] = function() {
      return Module["asm"]["_neigh_adv_checks"].apply(null, arguments)
    };

    var _neigh_adv_mcast_validity_check = Module["_neigh_adv_mcast_validity_check"] = function() {
      return Module["asm"]["_neigh_adv_mcast_validity_check"].apply(null, arguments)
    };

    var _neigh_adv_option_len_validity_check = Module["_neigh_adv_option_len_validity_check"] = function() {
      return Module["asm"]["_neigh_adv_option_len_validity_check"].apply(null, arguments)
    };

    var _neigh_adv_process = Module["_neigh_adv_process"] = function() {
      return Module["asm"]["_neigh_adv_process"].apply(null, arguments)
    };

    var _neigh_adv_process_incomplete = Module["_neigh_adv_process_incomplete"] = function() {
      return Module["asm"]["_neigh_adv_process_incomplete"].apply(null, arguments)
    };

    var _neigh_adv_reconfirm = Module["_neigh_adv_reconfirm"] = function() {
      return Module["asm"]["_neigh_adv_reconfirm"].apply(null, arguments)
    };

    var _neigh_adv_reconfirm_no_tlla = Module["_neigh_adv_reconfirm_no_tlla"] = function() {
      return Module["asm"]["_neigh_adv_reconfirm_no_tlla"].apply(null, arguments)
    };

    var _neigh_adv_reconfirm_router_option = Module["_neigh_adv_reconfirm_router_option"] = function() {
      return Module["asm"]["_neigh_adv_reconfirm_router_option"].apply(null, arguments)
    };

    var _neigh_adv_validity_checks = Module["_neigh_adv_validity_checks"] = function() {
      return Module["asm"]["_neigh_adv_validity_checks"].apply(null, arguments)
    };

    var _neigh_options = Module["_neigh_options"] = function() {
      return Module["asm"]["_neigh_options"].apply(null, arguments)
    };

    var _neigh_sol_detect_dad = Module["_neigh_sol_detect_dad"] = function() {
      return Module["asm"]["_neigh_sol_detect_dad"].apply(null, arguments)
    };

    var _neigh_sol_mcast_validity_check = Module["_neigh_sol_mcast_validity_check"] = function() {
      return Module["asm"]["_neigh_sol_mcast_validity_check"].apply(null, arguments)
    };

    var _neigh_sol_process = Module["_neigh_sol_process"] = function() {
      return Module["asm"]["_neigh_sol_process"].apply(null, arguments)
    };

    var _neigh_sol_unicast_validity_check = Module["_neigh_sol_unicast_validity_check"] = function() {
      return Module["asm"]["_neigh_sol_unicast_validity_check"].apply(null, arguments)
    };

    var _neigh_sol_validate_unspec = Module["_neigh_sol_validate_unspec"] = function() {
      return Module["asm"]["_neigh_sol_validate_unspec"].apply(null, arguments)
    };

    var _neigh_sol_validity_checks = Module["_neigh_sol_validity_checks"] = function() {
      return Module["asm"]["_neigh_sol_validity_checks"].apply(null, arguments)
    };

    var _next_ping = Module["_next_ping"] = function() {
      return Module["asm"]["_next_ping"].apply(null, arguments)
    };

    var _next_segment = Module["_next_segment"] = function() {
      return Module["asm"]["_next_segment"].apply(null, arguments)
    };

    var _out_8 = Module["_out_8"] = function() {
      return Module["asm"]["_out_8"].apply(null, arguments)
    };

    var _pad_667 = Module["_pad_667"] = function() {
      return Module["asm"]["_pad_667"].apply(null, arguments)
    };

    var _parse_opt_msgtype = Module["_parse_opt_msgtype"] = function() {
      return Module["asm"]["_parse_opt_msgtype"].apply(null, arguments)
    };

    var _parse_opt_reqip = Module["_parse_opt_reqip"] = function() {
      return Module["asm"]["_parse_opt_reqip"].apply(null, arguments)
    };

    var _parse_opt_serverid = Module["_parse_opt_serverid"] = function() {
      return Module["asm"]["_parse_opt_serverid"].apply(null, arguments)
    };

    var _peek_segment = Module["_peek_segment"] = function() {
      return Module["asm"]["_peek_segment"].apply(null, arguments)
    };

    var _pico_aodv_collector = Module["_pico_aodv_collector"] = function() {
      return Module["asm"]["_pico_aodv_collector"].apply(null, arguments)
    };

    var _pico_aodv_expired = Module["_pico_aodv_expired"] = function() {
      return Module["asm"]["_pico_aodv_expired"].apply(null, arguments)
    };

    var _pico_aodv_init = Module["_pico_aodv_init"] = function() {
      return Module["asm"]["_pico_aodv_init"].apply(null, arguments)
    };

    var _pico_aodv_lookup = Module["_pico_aodv_lookup"] = function() {
      return Module["asm"]["_pico_aodv_lookup"].apply(null, arguments)
    };

    var _pico_aodv_parse = Module["_pico_aodv_parse"] = function() {
      return Module["asm"]["_pico_aodv_parse"].apply(null, arguments)
    };

    var _pico_aodv_refresh = Module["_pico_aodv_refresh"] = function() {
      return Module["asm"]["_pico_aodv_refresh"].apply(null, arguments)
    };

    var _pico_aodv_set_dev = Module["_pico_aodv_set_dev"] = function() {
      return Module["asm"]["_pico_aodv_set_dev"].apply(null, arguments)
    };

    var _pico_aodv_socket_callback = Module["_pico_aodv_socket_callback"] = function() {
      return Module["asm"]["_pico_aodv_socket_callback"].apply(null, arguments)
    };

    var _pico_arp_add_entry = Module["_pico_arp_add_entry"] = function() {
      return Module["asm"]["_pico_arp_add_entry"].apply(null, arguments)
    };

    var _pico_arp_check_conflict = Module["_pico_arp_check_conflict"] = function() {
      return Module["asm"]["_pico_arp_check_conflict"].apply(null, arguments)
    };

    var _pico_arp_check_flooding = Module["_pico_arp_check_flooding"] = function() {
      return Module["asm"]["_pico_arp_check_flooding"].apply(null, arguments)
    };

    var _pico_arp_check_incoming_hdr = Module["_pico_arp_check_incoming_hdr"] = function() {
      return Module["asm"]["_pico_arp_check_incoming_hdr"].apply(null, arguments)
    };

    var _pico_arp_check_incoming_hdr_type = Module["_pico_arp_check_incoming_hdr_type"] = function() {
      return Module["asm"]["_pico_arp_check_incoming_hdr_type"].apply(null, arguments)
    };

    var _pico_arp_create_entry = Module["_pico_arp_create_entry"] = function() {
      return Module["asm"]["_pico_arp_create_entry"].apply(null, arguments)
    };

    var _pico_arp_get = Module["_pico_arp_get"] = function() {
      return Module["asm"]["_pico_arp_get"].apply(null, arguments)
    };

    var _pico_arp_init = Module["_pico_arp_init"] = function() {
      return Module["asm"]["_pico_arp_init"].apply(null, arguments)
    };

    var _pico_arp_lookup = Module["_pico_arp_lookup"] = function() {
      return Module["asm"]["_pico_arp_lookup"].apply(null, arguments)
    };

    var _pico_arp_lookup_entry = Module["_pico_arp_lookup_entry"] = function() {
      return Module["asm"]["_pico_arp_lookup_entry"].apply(null, arguments)
    };

    var _pico_arp_postpone = Module["_pico_arp_postpone"] = function() {
      return Module["asm"]["_pico_arp_postpone"].apply(null, arguments)
    };

    var _pico_arp_process_in = Module["_pico_arp_process_in"] = function() {
      return Module["asm"]["_pico_arp_process_in"].apply(null, arguments)
    };

    var _pico_arp_queued_trigger = Module["_pico_arp_queued_trigger"] = function() {
      return Module["asm"]["_pico_arp_queued_trigger"].apply(null, arguments)
    };

    var _pico_arp_receive = Module["_pico_arp_receive"] = function() {
      return Module["asm"]["_pico_arp_receive"].apply(null, arguments)
    };

    var _pico_arp_reply_on_request = Module["_pico_arp_reply_on_request"] = function() {
      return Module["asm"]["_pico_arp_reply_on_request"].apply(null, arguments)
    };

    var _pico_arp_request = Module["_pico_arp_request"] = function() {
      return Module["asm"]["_pico_arp_request"].apply(null, arguments)
    };

    var _pico_arp_request_xmit = Module["_pico_arp_request_xmit"] = function() {
      return Module["asm"]["_pico_arp_request_xmit"].apply(null, arguments)
    };

    var _pico_arp_retry = Module["_pico_arp_retry"] = function() {
      return Module["asm"]["_pico_arp_retry"].apply(null, arguments)
    };

    var _pico_arp_reverse_lookup = Module["_pico_arp_reverse_lookup"] = function() {
      return Module["asm"]["_pico_arp_reverse_lookup"].apply(null, arguments)
    };

    var _pico_arp_unreachable = Module["_pico_arp_unreachable"] = function() {
      return Module["asm"]["_pico_arp_unreachable"].apply(null, arguments)
    };

    var _pico_check_socket = Module["_pico_check_socket"] = function() {
      return Module["asm"]["_pico_check_socket"].apply(null, arguments)
    };

    var _pico_check_timers = Module["_pico_check_timers"] = function() {
      return Module["asm"]["_pico_check_timers"].apply(null, arguments)
    };

    var _pico_checksum = Module["_pico_checksum"] = function() {
      return Module["asm"]["_pico_checksum"].apply(null, arguments)
    };

    var _pico_checksum_adder = Module["_pico_checksum_adder"] = function() {
      return Module["asm"]["_pico_checksum_adder"].apply(null, arguments)
    };

    var _pico_checksum_finalize = Module["_pico_checksum_finalize"] = function() {
      return Module["asm"]["_pico_checksum_finalize"].apply(null, arguments)
    };

    var _pico_datalink_receive = Module["_pico_datalink_receive"] = function() {
      return Module["asm"]["_pico_datalink_receive"].apply(null, arguments)
    };

    var _pico_datalink_send = Module["_pico_datalink_send"] = function() {
      return Module["asm"]["_pico_datalink_send"].apply(null, arguments)
    };

    var _pico_dequeue = Module["_pico_dequeue"] = function() {
      return Module["asm"]["_pico_dequeue"].apply(null, arguments)
    };

    var _pico_dequeue_166 = Module["_pico_dequeue_166"] = function() {
      return Module["asm"]["_pico_dequeue_166"].apply(null, arguments)
    };

    var _pico_dequeue_190 = Module["_pico_dequeue_190"] = function() {
      return Module["asm"]["_pico_dequeue_190"].apply(null, arguments)
    };

    var _pico_dequeue_422 = Module["_pico_dequeue_422"] = function() {
      return Module["asm"]["_pico_dequeue_422"].apply(null, arguments)
    };

    var _pico_dev_cmp = Module["_pico_dev_cmp"] = function() {
      return Module["asm"]["_pico_dev_cmp"].apply(null, arguments)
    };

    var _pico_dev_roundrobin_end = Module["_pico_dev_roundrobin_end"] = function() {
      return Module["asm"]["_pico_dev_roundrobin_end"].apply(null, arguments)
    };

    var _pico_dev_roundrobin_start = Module["_pico_dev_roundrobin_start"] = function() {
      return Module["asm"]["_pico_dev_roundrobin_start"].apply(null, arguments)
    };

    var _pico_device_broadcast = Module["_pico_device_broadcast"] = function() {
      return Module["asm"]["_pico_device_broadcast"].apply(null, arguments)
    };

    var _pico_device_init = Module["_pico_device_init"] = function() {
      return Module["asm"]["_pico_device_init"].apply(null, arguments)
    };

    var _pico_device_ipv6_random_ll = Module["_pico_device_ipv6_random_ll"] = function() {
      return Module["asm"]["_pico_device_ipv6_random_ll"].apply(null, arguments)
    };

    var _pico_device_link_state = Module["_pico_device_link_state"] = function() {
      return Module["asm"]["_pico_device_link_state"].apply(null, arguments)
    };

    var _pico_devices_loop = Module["_pico_devices_loop"] = function() {
      return Module["asm"]["_pico_devices_loop"].apply(null, arguments)
    };

    var _pico_dhcp_are_options_valid = Module["_pico_dhcp_are_options_valid"] = function() {
      return Module["asm"]["_pico_dhcp_are_options_valid"].apply(null, arguments)
    };

    var _pico_dhcp_client_add_cookie = Module["_pico_dhcp_client_add_cookie"] = function() {
      return Module["asm"]["_pico_dhcp_client_add_cookie"].apply(null, arguments)
    };

    var _pico_dhcp_client_callback = Module["_pico_dhcp_client_callback"] = function() {
      return Module["asm"]["_pico_dhcp_client_callback"].apply(null, arguments)
    };

    var _pico_dhcp_client_del_cookie = Module["_pico_dhcp_client_del_cookie"] = function() {
      return Module["asm"]["_pico_dhcp_client_del_cookie"].apply(null, arguments)
    };

    var _pico_dhcp_client_find_cookie = Module["_pico_dhcp_client_find_cookie"] = function() {
      return Module["asm"]["_pico_dhcp_client_find_cookie"].apply(null, arguments)
    };

    var _pico_dhcp_client_init = Module["_pico_dhcp_client_init"] = function() {
      return Module["asm"]["_pico_dhcp_client_init"].apply(null, arguments)
    };

    var _pico_dhcp_client_msg = Module["_pico_dhcp_client_msg"] = function() {
      return Module["asm"]["_pico_dhcp_client_msg"].apply(null, arguments)
    };

    var _pico_dhcp_client_opt_parse = Module["_pico_dhcp_client_opt_parse"] = function() {
      return Module["asm"]["_pico_dhcp_client_opt_parse"].apply(null, arguments)
    };

    var _pico_dhcp_client_recv_params = Module["_pico_dhcp_client_recv_params"] = function() {
      return Module["asm"]["_pico_dhcp_client_recv_params"].apply(null, arguments)
    };

    var _pico_dhcp_client_reinit = Module["_pico_dhcp_client_reinit"] = function() {
      return Module["asm"]["_pico_dhcp_client_reinit"].apply(null, arguments)
    };

    var _pico_dhcp_client_start_init_timer = Module["_pico_dhcp_client_start_init_timer"] = function() {
      return Module["asm"]["_pico_dhcp_client_start_init_timer"].apply(null, arguments)
    };

    var _pico_dhcp_client_start_reacquisition_timers = Module["_pico_dhcp_client_start_reacquisition_timers"] = function() {
      return Module["asm"]["_pico_dhcp_client_start_reacquisition_timers"].apply(null, arguments)
    };

    var _pico_dhcp_client_start_rebinding_timer = Module["_pico_dhcp_client_start_rebinding_timer"] = function() {
      return Module["asm"]["_pico_dhcp_client_start_rebinding_timer"].apply(null, arguments)
    };

    var _pico_dhcp_client_start_renewing_timer = Module["_pico_dhcp_client_start_renewing_timer"] = function() {
      return Module["asm"]["_pico_dhcp_client_start_renewing_timer"].apply(null, arguments)
    };

    var _pico_dhcp_client_start_requesting_timer = Module["_pico_dhcp_client_start_requesting_timer"] = function() {
      return Module["asm"]["_pico_dhcp_client_start_requesting_timer"].apply(null, arguments)
    };

    var _pico_dhcp_client_stop_timers = Module["_pico_dhcp_client_stop_timers"] = function() {
      return Module["asm"]["_pico_dhcp_client_stop_timers"].apply(null, arguments)
    };

    var _pico_dhcp_client_timer_handler = Module["_pico_dhcp_client_timer_handler"] = function() {
      return Module["asm"]["_pico_dhcp_client_timer_handler"].apply(null, arguments)
    };

    var _pico_dhcp_client_update_link = Module["_pico_dhcp_client_update_link"] = function() {
      return Module["asm"]["_pico_dhcp_client_update_link"].apply(null, arguments)
    };

    var _pico_dhcp_client_wakeup = Module["_pico_dhcp_client_wakeup"] = function() {
      return Module["asm"]["_pico_dhcp_client_wakeup"].apply(null, arguments)
    };

    var _pico_dhcp_get_address = Module["_pico_dhcp_get_address"] = function() {
      return Module["asm"]["_pico_dhcp_get_address"].apply(null, arguments)
    };

    var _pico_dhcp_get_nameserver = Module["_pico_dhcp_get_nameserver"] = function() {
      return Module["asm"]["_pico_dhcp_get_nameserver"].apply(null, arguments)
    };

    var _pico_dhcp_initiate_negotiation = Module["_pico_dhcp_initiate_negotiation"] = function() {
      return Module["asm"]["_pico_dhcp_initiate_negotiation"].apply(null, arguments)
    };

    var _pico_dhcp_next_option = Module["_pico_dhcp_next_option"] = function() {
      return Module["asm"]["_pico_dhcp_next_option"].apply(null, arguments)
    };

    var _pico_dhcp_opt_broadcast = Module["_pico_dhcp_opt_broadcast"] = function() {
      return Module["asm"]["_pico_dhcp_opt_broadcast"].apply(null, arguments)
    };

    var _pico_dhcp_opt_dns = Module["_pico_dhcp_opt_dns"] = function() {
      return Module["asm"]["_pico_dhcp_opt_dns"].apply(null, arguments)
    };

    var _pico_dhcp_opt_end = Module["_pico_dhcp_opt_end"] = function() {
      return Module["asm"]["_pico_dhcp_opt_end"].apply(null, arguments)
    };

    var _pico_dhcp_opt_leasetime = Module["_pico_dhcp_opt_leasetime"] = function() {
      return Module["asm"]["_pico_dhcp_opt_leasetime"].apply(null, arguments)
    };

    var _pico_dhcp_opt_maxmsgsize = Module["_pico_dhcp_opt_maxmsgsize"] = function() {
      return Module["asm"]["_pico_dhcp_opt_maxmsgsize"].apply(null, arguments)
    };

    var _pico_dhcp_opt_msgtype = Module["_pico_dhcp_opt_msgtype"] = function() {
      return Module["asm"]["_pico_dhcp_opt_msgtype"].apply(null, arguments)
    };

    var _pico_dhcp_opt_netmask = Module["_pico_dhcp_opt_netmask"] = function() {
      return Module["asm"]["_pico_dhcp_opt_netmask"].apply(null, arguments)
    };

    var _pico_dhcp_opt_paramlist = Module["_pico_dhcp_opt_paramlist"] = function() {
      return Module["asm"]["_pico_dhcp_opt_paramlist"].apply(null, arguments)
    };

    var _pico_dhcp_opt_reqip = Module["_pico_dhcp_opt_reqip"] = function() {
      return Module["asm"]["_pico_dhcp_opt_reqip"].apply(null, arguments)
    };

    var _pico_dhcp_opt_router = Module["_pico_dhcp_opt_router"] = function() {
      return Module["asm"]["_pico_dhcp_opt_router"].apply(null, arguments)
    };

    var _pico_dhcp_opt_serverid = Module["_pico_dhcp_opt_serverid"] = function() {
      return Module["asm"]["_pico_dhcp_opt_serverid"].apply(null, arguments)
    };

    var _pico_dhcp_server_add_negotiation = Module["_pico_dhcp_server_add_negotiation"] = function() {
      return Module["asm"]["_pico_dhcp_server_add_negotiation"].apply(null, arguments)
    };

    var _pico_dhcp_server_add_setting = Module["_pico_dhcp_server_add_setting"] = function() {
      return Module["asm"]["_pico_dhcp_server_add_setting"].apply(null, arguments)
    };

    var _pico_dhcp_server_find_negotiation = Module["_pico_dhcp_server_find_negotiation"] = function() {
      return Module["asm"]["_pico_dhcp_server_find_negotiation"].apply(null, arguments)
    };

    var _pico_dhcp_server_initiate = Module["_pico_dhcp_server_initiate"] = function() {
      return Module["asm"]["_pico_dhcp_server_initiate"].apply(null, arguments)
    };

    var _pico_dhcp_server_recv = Module["_pico_dhcp_server_recv"] = function() {
      return Module["asm"]["_pico_dhcp_server_recv"].apply(null, arguments)
    };

    var _pico_dhcp_state_machine = Module["_pico_dhcp_state_machine"] = function() {
      return Module["asm"]["_pico_dhcp_state_machine"].apply(null, arguments)
    };

    var _pico_dhcp_timer_add = Module["_pico_dhcp_timer_add"] = function() {
      return Module["asm"]["_pico_dhcp_timer_add"].apply(null, arguments)
    };

    var _pico_dhcpd_wakeup = Module["_pico_dhcpd_wakeup"] = function() {
      return Module["asm"]["_pico_dhcpd_wakeup"].apply(null, arguments)
    };

    var _pico_discard_segment = Module["_pico_discard_segment"] = function() {
      return Module["asm"]["_pico_discard_segment"].apply(null, arguments)
    };

    var _pico_dns_check_namelen = Module["_pico_dns_check_namelen"] = function() {
      return Module["asm"]["_pico_dns_check_namelen"].apply(null, arguments)
    };

    var _pico_dns_client_add_ns = Module["_pico_dns_client_add_ns"] = function() {
      return Module["asm"]["_pico_dns_client_add_ns"].apply(null, arguments)
    };

    var _pico_dns_client_add_query = Module["_pico_dns_client_add_query"] = function() {
      return Module["asm"]["_pico_dns_client_add_query"].apply(null, arguments)
    };

    var _pico_dns_client_addr_label_check_len = Module["_pico_dns_client_addr_label_check_len"] = function() {
      return Module["asm"]["_pico_dns_client_addr_label_check_len"].apply(null, arguments)
    };

    var _pico_dns_client_callback = Module["_pico_dns_client_callback"] = function() {
      return Module["asm"]["_pico_dns_client_callback"].apply(null, arguments)
    };

    var _pico_dns_client_check_asuffix = Module["_pico_dns_client_check_asuffix"] = function() {
      return Module["asm"]["_pico_dns_client_check_asuffix"].apply(null, arguments)
    };

    var _pico_dns_client_check_header = Module["_pico_dns_client_check_header"] = function() {
      return Module["asm"]["_pico_dns_client_check_header"].apply(null, arguments)
    };

    var _pico_dns_client_check_qsuffix = Module["_pico_dns_client_check_qsuffix"] = function() {
      return Module["asm"]["_pico_dns_client_check_qsuffix"].apply(null, arguments)
    };

    var _pico_dns_client_check_rdlength = Module["_pico_dns_client_check_rdlength"] = function() {
      return Module["asm"]["_pico_dns_client_check_rdlength"].apply(null, arguments)
    };

    var _pico_dns_client_check_url = Module["_pico_dns_client_check_url"] = function() {
      return Module["asm"]["_pico_dns_client_check_url"].apply(null, arguments)
    };

    var _pico_dns_client_del_ns = Module["_pico_dns_client_del_ns"] = function() {
      return Module["asm"]["_pico_dns_client_del_ns"].apply(null, arguments)
    };

    var _pico_dns_client_del_query = Module["_pico_dns_client_del_query"] = function() {
      return Module["asm"]["_pico_dns_client_del_query"].apply(null, arguments)
    };

    var _pico_dns_client_find_query = Module["_pico_dns_client_find_query"] = function() {
      return Module["asm"]["_pico_dns_client_find_query"].apply(null, arguments)
    };

    var _pico_dns_client_getaddr = Module["_pico_dns_client_getaddr"] = function() {
      return Module["asm"]["_pico_dns_client_getaddr"].apply(null, arguments)
    };

    var _pico_dns_client_getaddr_check = Module["_pico_dns_client_getaddr_check"] = function() {
      return Module["asm"]["_pico_dns_client_getaddr_check"].apply(null, arguments)
    };

    var _pico_dns_client_getaddr_init = Module["_pico_dns_client_getaddr_init"] = function() {
      return Module["asm"]["_pico_dns_client_getaddr_init"].apply(null, arguments)
    };

    var _pico_dns_client_getname = Module["_pico_dns_client_getname"] = function() {
      return Module["asm"]["_pico_dns_client_getname"].apply(null, arguments)
    };

    var _pico_dns_client_idcheck = Module["_pico_dns_client_idcheck"] = function() {
      return Module["asm"]["_pico_dns_client_idcheck"].apply(null, arguments)
    };

    var _pico_dns_client_init = Module["_pico_dns_client_init"] = function() {
      return Module["asm"]["_pico_dns_client_init"].apply(null, arguments)
    };

    var _pico_dns_client_nameserver = Module["_pico_dns_client_nameserver"] = function() {
      return Module["asm"]["_pico_dns_client_nameserver"].apply(null, arguments)
    };

    var _pico_dns_client_next_ns = Module["_pico_dns_client_next_ns"] = function() {
      return Module["asm"]["_pico_dns_client_next_ns"].apply(null, arguments)
    };

    var _pico_dns_client_query_header = Module["_pico_dns_client_query_header"] = function() {
      return Module["asm"]["_pico_dns_client_query_header"].apply(null, arguments)
    };

    var _pico_dns_client_retransmission = Module["_pico_dns_client_retransmission"] = function() {
      return Module["asm"]["_pico_dns_client_retransmission"].apply(null, arguments)
    };

    var _pico_dns_client_seek = Module["_pico_dns_client_seek"] = function() {
      return Module["asm"]["_pico_dns_client_seek"].apply(null, arguments)
    };

    var _pico_dns_client_seek_suffix = Module["_pico_dns_client_seek_suffix"] = function() {
      return Module["asm"]["_pico_dns_client_seek_suffix"].apply(null, arguments)
    };

    var _pico_dns_client_send = Module["_pico_dns_client_send"] = function() {
      return Module["asm"]["_pico_dns_client_send"].apply(null, arguments)
    };

    var _pico_dns_client_user_callback = Module["_pico_dns_client_user_callback"] = function() {
      return Module["asm"]["_pico_dns_client_user_callback"].apply(null, arguments)
    };

    var _pico_dns_create_message = Module["_pico_dns_create_message"] = function() {
      return Module["asm"]["_pico_dns_create_message"].apply(null, arguments)
    };

    var _pico_dns_decompress_name = Module["_pico_dns_decompress_name"] = function() {
      return Module["asm"]["_pico_dns_decompress_name"].apply(null, arguments)
    };

    var _pico_dns_fill_packet_header = Module["_pico_dns_fill_packet_header"] = function() {
      return Module["asm"]["_pico_dns_fill_packet_header"].apply(null, arguments)
    };

    var _pico_dns_getname_univ = Module["_pico_dns_getname_univ"] = function() {
      return Module["asm"]["_pico_dns_getname_univ"].apply(null, arguments)
    };

    var _pico_dns_ipv6_set_ptr = Module["_pico_dns_ipv6_set_ptr"] = function() {
      return Module["asm"]["_pico_dns_ipv6_set_ptr"].apply(null, arguments)
    };

    var _pico_dns_mirror_addr = Module["_pico_dns_mirror_addr"] = function() {
      return Module["asm"]["_pico_dns_mirror_addr"].apply(null, arguments)
    };

    var _pico_dns_name_to_dns_notation = Module["_pico_dns_name_to_dns_notation"] = function() {
      return Module["asm"]["_pico_dns_name_to_dns_notation"].apply(null, arguments)
    };

    var _pico_dns_notation_to_name = Module["_pico_dns_notation_to_name"] = function() {
      return Module["asm"]["_pico_dns_notation_to_name"].apply(null, arguments)
    };

    var _pico_dns_question_fill_suffix = Module["_pico_dns_question_fill_suffix"] = function() {
      return Module["asm"]["_pico_dns_question_fill_suffix"].apply(null, arguments)
    };

    var _pico_dns_strlen = Module["_pico_dns_strlen"] = function() {
      return Module["asm"]["_pico_dns_strlen"].apply(null, arguments)
    };

    var _pico_dns_try_fallback_cname = Module["_pico_dns_try_fallback_cname"] = function() {
      return Module["asm"]["_pico_dns_try_fallback_cname"].apply(null, arguments)
    };

    var _pico_dualbuffer_checksum = Module["_pico_dualbuffer_checksum"] = function() {
      return Module["asm"]["_pico_dualbuffer_checksum"].apply(null, arguments)
    };

    var _pico_endpoint_free = Module["_pico_endpoint_free"] = function() {
      return Module["asm"]["_pico_endpoint_free"].apply(null, arguments)
    };

    var _pico_enqueue = Module["_pico_enqueue"] = function() {
      return Module["asm"]["_pico_enqueue"].apply(null, arguments)
    };

    var _pico_enqueue_111 = Module["_pico_enqueue_111"] = function() {
      return Module["asm"]["_pico_enqueue_111"].apply(null, arguments)
    };

    var _pico_enqueue_151 = Module["_pico_enqueue_151"] = function() {
      return Module["asm"]["_pico_enqueue_151"].apply(null, arguments)
    };

    var _pico_enqueue_157 = Module["_pico_enqueue_157"] = function() {
      return Module["asm"]["_pico_enqueue_157"].apply(null, arguments)
    };

    var _pico_enqueue_257 = Module["_pico_enqueue_257"] = function() {
      return Module["asm"]["_pico_enqueue_257"].apply(null, arguments)
    };

    var _pico_enqueue_326 = Module["_pico_enqueue_326"] = function() {
      return Module["asm"]["_pico_enqueue_326"].apply(null, arguments)
    };

    var _pico_enqueue_415 = Module["_pico_enqueue_415"] = function() {
      return Module["asm"]["_pico_enqueue_415"].apply(null, arguments)
    };

    var _pico_enqueue_and_wakeup_if_needed = Module["_pico_enqueue_and_wakeup_if_needed"] = function() {
      return Module["asm"]["_pico_enqueue_and_wakeup_if_needed"].apply(null, arguments)
    };

    var _pico_enqueue_segment = Module["_pico_enqueue_segment"] = function() {
      return Module["asm"]["_pico_enqueue_segment"].apply(null, arguments)
    };

    var _pico_eth_check_bcast = Module["_pico_eth_check_bcast"] = function() {
      return Module["asm"]["_pico_eth_check_bcast"].apply(null, arguments)
    };

    var _pico_eth_receive = Module["_pico_eth_receive"] = function() {
      return Module["asm"]["_pico_eth_receive"].apply(null, arguments)
    };

    var _pico_ethernet_alloc = Module["_pico_ethernet_alloc"] = function() {
      return Module["asm"]["_pico_ethernet_alloc"].apply(null, arguments)
    };

    var _pico_ethernet_ipv6_dst = Module["_pico_ethernet_ipv6_dst"] = function() {
      return Module["asm"]["_pico_ethernet_ipv6_dst"].apply(null, arguments)
    };

    var _pico_ethernet_mcast6_translate = Module["_pico_ethernet_mcast6_translate"] = function() {
      return Module["asm"]["_pico_ethernet_mcast6_translate"].apply(null, arguments)
    };

    var _pico_ethernet_mcast_translate = Module["_pico_ethernet_mcast_translate"] = function() {
      return Module["asm"]["_pico_ethernet_mcast_translate"].apply(null, arguments)
    };

    var _pico_ethernet_process_in = Module["_pico_ethernet_process_in"] = function() {
      return Module["asm"]["_pico_ethernet_process_in"].apply(null, arguments)
    };

    var _pico_ethernet_process_out = Module["_pico_ethernet_process_out"] = function() {
      return Module["asm"]["_pico_ethernet_process_out"].apply(null, arguments)
    };

    var _pico_ethernet_receive = Module["_pico_ethernet_receive"] = function() {
      return Module["asm"]["_pico_ethernet_receive"].apply(null, arguments)
    };

    var _pico_ethernet_send = Module["_pico_ethernet_send"] = function() {
      return Module["asm"]["_pico_ethernet_send"].apply(null, arguments)
    };

    var _pico_ethsend_bcast = Module["_pico_ethsend_bcast"] = function() {
      return Module["asm"]["_pico_ethsend_bcast"].apply(null, arguments)
    };

    var _pico_ethsend_dispatch = Module["_pico_ethsend_dispatch"] = function() {
      return Module["asm"]["_pico_ethsend_dispatch"].apply(null, arguments)
    };

    var _pico_ethsend_local = Module["_pico_ethsend_local"] = function() {
      return Module["asm"]["_pico_ethsend_local"].apply(null, arguments)
    };

    var _pico_frag_expire = Module["_pico_frag_expire"] = function() {
      return Module["asm"]["_pico_frag_expire"].apply(null, arguments)
    };

    var _pico_fragments_check_complete = Module["_pico_fragments_check_complete"] = function() {
      return Module["asm"]["_pico_fragments_check_complete"].apply(null, arguments)
    };

    var _pico_fragments_complete = Module["_pico_fragments_complete"] = function() {
      return Module["asm"]["_pico_fragments_complete"].apply(null, arguments)
    };

    var _pico_fragments_empty_tree = Module["_pico_fragments_empty_tree"] = function() {
      return Module["asm"]["_pico_fragments_empty_tree"].apply(null, arguments)
    };

    var _pico_fragments_get_header_length = Module["_pico_fragments_get_header_length"] = function() {
      return Module["asm"]["_pico_fragments_get_header_length"].apply(null, arguments)
    };

    var _pico_fragments_get_more_flag = Module["_pico_fragments_get_more_flag"] = function() {
      return Module["asm"]["_pico_fragments_get_more_flag"].apply(null, arguments)
    };

    var _pico_fragments_get_offset = Module["_pico_fragments_get_offset"] = function() {
      return Module["asm"]["_pico_fragments_get_offset"].apply(null, arguments)
    };

    var _pico_fragments_reassemble = Module["_pico_fragments_reassemble"] = function() {
      return Module["asm"]["_pico_fragments_reassemble"].apply(null, arguments)
    };

    var _pico_fragments_send_notify = Module["_pico_fragments_send_notify"] = function() {
      return Module["asm"]["_pico_fragments_send_notify"].apply(null, arguments)
    };

    var _pico_frame_alloc = Module["_pico_frame_alloc"] = function() {
      return Module["asm"]["_pico_frame_alloc"].apply(null, arguments)
    };

    var _pico_frame_alloc_skeleton = Module["_pico_frame_alloc_skeleton"] = function() {
      return Module["asm"]["_pico_frame_alloc_skeleton"].apply(null, arguments)
    };

    var _pico_frame_copy = Module["_pico_frame_copy"] = function() {
      return Module["asm"]["_pico_frame_copy"].apply(null, arguments)
    };

    var _pico_frame_discard = Module["_pico_frame_discard"] = function() {
      return Module["asm"]["_pico_frame_discard"].apply(null, arguments)
    };

    var _pico_frame_do_alloc = Module["_pico_frame_do_alloc"] = function() {
      return Module["asm"]["_pico_frame_do_alloc"].apply(null, arguments)
    };

    var _pico_frame_dst_is_unicast = Module["_pico_frame_dst_is_unicast"] = function() {
      return Module["asm"]["_pico_frame_dst_is_unicast"].apply(null, arguments)
    };

    var _pico_frame_grow_head = Module["_pico_frame_grow_head"] = function() {
      return Module["asm"]["_pico_frame_grow_head"].apply(null, arguments)
    };

    var _pico_frame_new_buffer = Module["_pico_frame_new_buffer"] = function() {
      return Module["asm"]["_pico_frame_new_buffer"].apply(null, arguments)
    };

    var _pico_frame_skeleton_set_buffer = Module["_pico_frame_skeleton_set_buffer"] = function() {
      return Module["asm"]["_pico_frame_skeleton_set_buffer"].apply(null, arguments)
    };

    var _pico_frame_update_pointers = Module["_pico_frame_update_pointers"] = function() {
      return Module["asm"]["_pico_frame_update_pointers"].apply(null, arguments)
    };

    var _pico_generic_port_in_use = Module["_pico_generic_port_in_use"] = function() {
      return Module["asm"]["_pico_generic_port_in_use"].apply(null, arguments)
    };

    var _pico_get_device = Module["_pico_get_device"] = function() {
      return Module["asm"]["_pico_get_device"].apply(null, arguments)
    };

    var _pico_get_sockport = Module["_pico_get_sockport"] = function() {
      return Module["asm"]["_pico_get_sockport"].apply(null, arguments)
    };

    var _pico_hash = Module["_pico_hash"] = function() {
      return Module["asm"]["_pico_hash"].apply(null, arguments)
    };

    var _pico_hash_431 = Module["_pico_hash_431"] = function() {
      return Module["asm"]["_pico_hash_431"].apply(null, arguments)
    };

    var _pico_hold_segment_make = Module["_pico_hold_segment_make"] = function() {
      return Module["asm"]["_pico_hold_segment_make"].apply(null, arguments)
    };

    var _pico_icmp4_checksum = Module["_pico_icmp4_checksum"] = function() {
      return Module["asm"]["_pico_icmp4_checksum"].apply(null, arguments)
    };

    var _pico_icmp4_dest_unreachable = Module["_pico_icmp4_dest_unreachable"] = function() {
      return Module["asm"]["_pico_icmp4_dest_unreachable"].apply(null, arguments)
    };

    var _pico_icmp4_frag_expired = Module["_pico_icmp4_frag_expired"] = function() {
      return Module["asm"]["_pico_icmp4_frag_expired"].apply(null, arguments)
    };

    var _pico_icmp4_mtu_exceeded = Module["_pico_icmp4_mtu_exceeded"] = function() {
      return Module["asm"]["_pico_icmp4_mtu_exceeded"].apply(null, arguments)
    };

    var _pico_icmp4_notify = Module["_pico_icmp4_notify"] = function() {
      return Module["asm"]["_pico_icmp4_notify"].apply(null, arguments)
    };

    var _pico_icmp4_param_problem = Module["_pico_icmp4_param_problem"] = function() {
      return Module["asm"]["_pico_icmp4_param_problem"].apply(null, arguments)
    };

    var _pico_icmp4_ping = Module["_pico_icmp4_ping"] = function() {
      return Module["asm"]["_pico_icmp4_ping"].apply(null, arguments)
    };

    var _pico_icmp4_port_unreachable = Module["_pico_icmp4_port_unreachable"] = function() {
      return Module["asm"]["_pico_icmp4_port_unreachable"].apply(null, arguments)
    };

    var _pico_icmp4_process_in = Module["_pico_icmp4_process_in"] = function() {
      return Module["asm"]["_pico_icmp4_process_in"].apply(null, arguments)
    };

    var _pico_icmp4_process_out = Module["_pico_icmp4_process_out"] = function() {
      return Module["asm"]["_pico_icmp4_process_out"].apply(null, arguments)
    };

    var _pico_icmp4_proto_unreachable = Module["_pico_icmp4_proto_unreachable"] = function() {
      return Module["asm"]["_pico_icmp4_proto_unreachable"].apply(null, arguments)
    };

    var _pico_icmp4_send_echo = Module["_pico_icmp4_send_echo"] = function() {
      return Module["asm"]["_pico_icmp4_send_echo"].apply(null, arguments)
    };

    var _pico_icmp4_ttl_expired = Module["_pico_icmp4_ttl_expired"] = function() {
      return Module["asm"]["_pico_icmp4_ttl_expired"].apply(null, arguments)
    };

    var _pico_icmp6_address_to_prefix = Module["_pico_icmp6_address_to_prefix"] = function() {
      return Module["asm"]["_pico_icmp6_address_to_prefix"].apply(null, arguments)
    };

    var _pico_icmp6_checksum = Module["_pico_icmp6_checksum"] = function() {
      return Module["asm"]["_pico_icmp6_checksum"].apply(null, arguments)
    };

    var _pico_icmp6_dest_unreachable = Module["_pico_icmp6_dest_unreachable"] = function() {
      return Module["asm"]["_pico_icmp6_dest_unreachable"].apply(null, arguments)
    };

    var _pico_icmp6_frag_expired = Module["_pico_icmp6_frag_expired"] = function() {
      return Module["asm"]["_pico_icmp6_frag_expired"].apply(null, arguments)
    };

    var _pico_icmp6_neigh_sol_prep = Module["_pico_icmp6_neigh_sol_prep"] = function() {
      return Module["asm"]["_pico_icmp6_neigh_sol_prep"].apply(null, arguments)
    };

    var _pico_icmp6_neighbor_advertisement = Module["_pico_icmp6_neighbor_advertisement"] = function() {
      return Module["asm"]["_pico_icmp6_neighbor_advertisement"].apply(null, arguments)
    };

    var _pico_icmp6_neighbor_solicitation = Module["_pico_icmp6_neighbor_solicitation"] = function() {
      return Module["asm"]["_pico_icmp6_neighbor_solicitation"].apply(null, arguments)
    };

    var _pico_icmp6_notify = Module["_pico_icmp6_notify"] = function() {
      return Module["asm"]["_pico_icmp6_notify"].apply(null, arguments)
    };

    var _pico_icmp6_parameter_problem = Module["_pico_icmp6_parameter_problem"] = function() {
      return Module["asm"]["_pico_icmp6_parameter_problem"].apply(null, arguments)
    };

    var _pico_icmp6_ping_recv_reply = Module["_pico_icmp6_ping_recv_reply"] = function() {
      return Module["asm"]["_pico_icmp6_ping_recv_reply"].apply(null, arguments)
    };

    var _pico_icmp6_pkt_too_big = Module["_pico_icmp6_pkt_too_big"] = function() {
      return Module["asm"]["_pico_icmp6_pkt_too_big"].apply(null, arguments)
    };

    var _pico_icmp6_port_unreachable = Module["_pico_icmp6_port_unreachable"] = function() {
      return Module["asm"]["_pico_icmp6_port_unreachable"].apply(null, arguments)
    };

    var _pico_icmp6_process_in = Module["_pico_icmp6_process_in"] = function() {
      return Module["asm"]["_pico_icmp6_process_in"].apply(null, arguments)
    };

    var _pico_icmp6_process_out = Module["_pico_icmp6_process_out"] = function() {
      return Module["asm"]["_pico_icmp6_process_out"].apply(null, arguments)
    };

    var _pico_icmp6_proto_unreachable = Module["_pico_icmp6_proto_unreachable"] = function() {
      return Module["asm"]["_pico_icmp6_proto_unreachable"].apply(null, arguments)
    };

    var _pico_icmp6_provide_llao = Module["_pico_icmp6_provide_llao"] = function() {
      return Module["asm"]["_pico_icmp6_provide_llao"].apply(null, arguments)
    };

    var _pico_icmp6_router_advertisement = Module["_pico_icmp6_router_advertisement"] = function() {
      return Module["asm"]["_pico_icmp6_router_advertisement"].apply(null, arguments)
    };

    var _pico_icmp6_router_solicitation = Module["_pico_icmp6_router_solicitation"] = function() {
      return Module["asm"]["_pico_icmp6_router_solicitation"].apply(null, arguments)
    };

    var _pico_icmp6_send_echoreply = Module["_pico_icmp6_send_echoreply"] = function() {
      return Module["asm"]["_pico_icmp6_send_echoreply"].apply(null, arguments)
    };

    var _pico_icmp6_ttl_expired = Module["_pico_icmp6_ttl_expired"] = function() {
      return Module["asm"]["_pico_icmp6_ttl_expired"].apply(null, arguments)
    };

    var _pico_igmp_analyse_packet = Module["_pico_igmp_analyse_packet"] = function() {
      return Module["asm"]["_pico_igmp_analyse_packet"].apply(null, arguments)
    };

    var _pico_igmp_compatibility_mode = Module["_pico_igmp_compatibility_mode"] = function() {
      return Module["asm"]["_pico_igmp_compatibility_mode"].apply(null, arguments)
    };

    var _pico_igmp_delete_parameter = Module["_pico_igmp_delete_parameter"] = function() {
      return Module["asm"]["_pico_igmp_delete_parameter"].apply(null, arguments)
    };

    var _pico_igmp_find_parameter = Module["_pico_igmp_find_parameter"] = function() {
      return Module["asm"]["_pico_igmp_find_parameter"].apply(null, arguments)
    };

    var _pico_igmp_find_timer = Module["_pico_igmp_find_timer"] = function() {
      return Module["asm"]["_pico_igmp_find_timer"].apply(null, arguments)
    };

    var _pico_igmp_generate_report = Module["_pico_igmp_generate_report"] = function() {
      return Module["asm"]["_pico_igmp_generate_report"].apply(null, arguments)
    };

    var _pico_igmp_is_checksum_valid = Module["_pico_igmp_is_checksum_valid"] = function() {
      return Module["asm"]["_pico_igmp_is_checksum_valid"].apply(null, arguments)
    };

    var _pico_igmp_process_event = Module["_pico_igmp_process_event"] = function() {
      return Module["asm"]["_pico_igmp_process_event"].apply(null, arguments)
    };

    var _pico_igmp_process_in = Module["_pico_igmp_process_in"] = function() {
      return Module["asm"]["_pico_igmp_process_in"].apply(null, arguments)
    };

    var _pico_igmp_process_out = Module["_pico_igmp_process_out"] = function() {
      return Module["asm"]["_pico_igmp_process_out"].apply(null, arguments)
    };

    var _pico_igmp_report_expired = Module["_pico_igmp_report_expired"] = function() {
      return Module["asm"]["_pico_igmp_report_expired"].apply(null, arguments)
    };

    var _pico_igmp_send_report = Module["_pico_igmp_send_report"] = function() {
      return Module["asm"]["_pico_igmp_send_report"].apply(null, arguments)
    };

    var _pico_igmp_state_change = Module["_pico_igmp_state_change"] = function() {
      return Module["asm"]["_pico_igmp_state_change"].apply(null, arguments)
    };

    var _pico_igmp_timer_expired = Module["_pico_igmp_timer_expired"] = function() {
      return Module["asm"]["_pico_igmp_timer_expired"].apply(null, arguments)
    };

    var _pico_igmp_timer_is_running = Module["_pico_igmp_timer_is_running"] = function() {
      return Module["asm"]["_pico_igmp_timer_is_running"].apply(null, arguments)
    };

    var _pico_igmp_timer_reset = Module["_pico_igmp_timer_reset"] = function() {
      return Module["asm"]["_pico_igmp_timer_reset"].apply(null, arguments)
    };

    var _pico_igmp_timer_start = Module["_pico_igmp_timer_start"] = function() {
      return Module["asm"]["_pico_igmp_timer_start"].apply(null, arguments)
    };

    var _pico_igmp_timer_stop = Module["_pico_igmp_timer_stop"] = function() {
      return Module["asm"]["_pico_igmp_timer_stop"].apply(null, arguments)
    };

    var _pico_igmp_v2querier_expired = Module["_pico_igmp_v2querier_expired"] = function() {
      return Module["asm"]["_pico_igmp_v2querier_expired"].apply(null, arguments)
    };

    var _pico_igmpv2_generate_report = Module["_pico_igmpv2_generate_report"] = function() {
      return Module["asm"]["_pico_igmpv2_generate_report"].apply(null, arguments)
    };

    var _pico_igmpv3_generate_filter = Module["_pico_igmpv3_generate_filter"] = function() {
      return Module["asm"]["_pico_igmpv3_generate_filter"].apply(null, arguments)
    };

    var _pico_igmpv3_generate_report = Module["_pico_igmpv3_generate_report"] = function() {
      return Module["asm"]["_pico_igmpv3_generate_report"].apply(null, arguments)
    };

    var _pico_ipv4_alloc = Module["_pico_ipv4_alloc"] = function() {
      return Module["asm"]["_pico_ipv4_alloc"].apply(null, arguments)
    };

    var _pico_ipv4_checksum = Module["_pico_ipv4_checksum"] = function() {
      return Module["asm"]["_pico_ipv4_checksum"].apply(null, arguments)
    };

    var _pico_ipv4_cleanup_routes = Module["_pico_ipv4_cleanup_routes"] = function() {
      return Module["asm"]["_pico_ipv4_cleanup_routes"].apply(null, arguments)
    };

    var _pico_ipv4_compare = Module["_pico_ipv4_compare"] = function() {
      return Module["asm"]["_pico_ipv4_compare"].apply(null, arguments)
    };

    var _pico_ipv4_crc_check = Module["_pico_ipv4_crc_check"] = function() {
      return Module["asm"]["_pico_ipv4_crc_check"].apply(null, arguments)
    };

    var _pico_ipv4_ethernet_receive = Module["_pico_ipv4_ethernet_receive"] = function() {
      return Module["asm"]["_pico_ipv4_ethernet_receive"].apply(null, arguments)
    };

    var _pico_ipv4_forward = Module["_pico_ipv4_forward"] = function() {
      return Module["asm"]["_pico_ipv4_forward"].apply(null, arguments)
    };

    var _pico_ipv4_forward_check_dev = Module["_pico_ipv4_forward_check_dev"] = function() {
      return Module["asm"]["_pico_ipv4_forward_check_dev"].apply(null, arguments)
    };

    var _pico_ipv4_frag_compare = Module["_pico_ipv4_frag_compare"] = function() {
      return Module["asm"]["_pico_ipv4_frag_compare"].apply(null, arguments)
    };

    var _pico_ipv4_frag_match = Module["_pico_ipv4_frag_match"] = function() {
      return Module["asm"]["_pico_ipv4_frag_match"].apply(null, arguments)
    };

    var _pico_ipv4_frag_timer_on = Module["_pico_ipv4_frag_timer_on"] = function() {
      return Module["asm"]["_pico_ipv4_frag_timer_on"].apply(null, arguments)
    };

    var _pico_ipv4_fragments_complete = Module["_pico_ipv4_fragments_complete"] = function() {
      return Module["asm"]["_pico_ipv4_fragments_complete"].apply(null, arguments)
    };

    var _pico_ipv4_frame_push = Module["_pico_ipv4_frame_push"] = function() {
      return Module["asm"]["_pico_ipv4_frame_push"].apply(null, arguments)
    };

    var _pico_ipv4_frame_sock_push = Module["_pico_ipv4_frame_sock_push"] = function() {
      return Module["asm"]["_pico_ipv4_frame_sock_push"].apply(null, arguments)
    };

    var _pico_ipv4_get_default_mcastlink = Module["_pico_ipv4_get_default_mcastlink"] = function() {
      return Module["asm"]["_pico_ipv4_get_default_mcastlink"].apply(null, arguments)
    };

    var _pico_ipv4_is_broadcast = Module["_pico_ipv4_is_broadcast"] = function() {
      return Module["asm"]["_pico_ipv4_is_broadcast"].apply(null, arguments)
    };

    var _pico_ipv4_is_invalid_loopback = Module["_pico_ipv4_is_invalid_loopback"] = function() {
      return Module["asm"]["_pico_ipv4_is_invalid_loopback"].apply(null, arguments)
    };

    var _pico_ipv4_is_loopback = Module["_pico_ipv4_is_loopback"] = function() {
      return Module["asm"]["_pico_ipv4_is_loopback"].apply(null, arguments)
    };

    var _pico_ipv4_is_multicast = Module["_pico_ipv4_is_multicast"] = function() {
      return Module["asm"]["_pico_ipv4_is_multicast"].apply(null, arguments)
    };

    var _pico_ipv4_is_unicast = Module["_pico_ipv4_is_unicast"] = function() {
      return Module["asm"]["_pico_ipv4_is_unicast"].apply(null, arguments)
    };

    var _pico_ipv4_is_valid_src = Module["_pico_ipv4_is_valid_src"] = function() {
      return Module["asm"]["_pico_ipv4_is_valid_src"].apply(null, arguments)
    };

    var _pico_ipv4_link_add = Module["_pico_ipv4_link_add"] = function() {
      return Module["asm"]["_pico_ipv4_link_add"].apply(null, arguments)
    };

    var _pico_ipv4_link_by_dev = Module["_pico_ipv4_link_by_dev"] = function() {
      return Module["asm"]["_pico_ipv4_link_by_dev"].apply(null, arguments)
    };

    var _pico_ipv4_link_by_dev_next = Module["_pico_ipv4_link_by_dev_next"] = function() {
      return Module["asm"]["_pico_ipv4_link_by_dev_next"].apply(null, arguments)
    };

    var _pico_ipv4_link_del = Module["_pico_ipv4_link_del"] = function() {
      return Module["asm"]["_pico_ipv4_link_del"].apply(null, arguments)
    };

    var _pico_ipv4_link_find = Module["_pico_ipv4_link_find"] = function() {
      return Module["asm"]["_pico_ipv4_link_find"].apply(null, arguments)
    };

    var _pico_ipv4_link_get = Module["_pico_ipv4_link_get"] = function() {
      return Module["asm"]["_pico_ipv4_link_get"].apply(null, arguments)
    };

    var _pico_ipv4_mcast_filter = Module["_pico_ipv4_mcast_filter"] = function() {
      return Module["asm"]["_pico_ipv4_mcast_filter"].apply(null, arguments)
    };

    var _pico_ipv4_mcast_join = Module["_pico_ipv4_mcast_join"] = function() {
      return Module["asm"]["_pico_ipv4_mcast_join"].apply(null, arguments)
    };

    var _pico_ipv4_mcast_leave = Module["_pico_ipv4_mcast_leave"] = function() {
      return Module["asm"]["_pico_ipv4_mcast_leave"].apply(null, arguments)
    };

    var _pico_ipv4_mcast_print_groups = Module["_pico_ipv4_mcast_print_groups"] = function() {
      return Module["asm"]["_pico_ipv4_mcast_print_groups"].apply(null, arguments)
    };

    var _pico_ipv4_nat_add = Module["_pico_ipv4_nat_add"] = function() {
      return Module["asm"]["_pico_ipv4_nat_add"].apply(null, arguments)
    };

    var _pico_ipv4_nat_find = Module["_pico_ipv4_nat_find"] = function() {
      return Module["asm"]["_pico_ipv4_nat_find"].apply(null, arguments)
    };

    var _pico_ipv4_nat_find_tuple = Module["_pico_ipv4_nat_find_tuple"] = function() {
      return Module["asm"]["_pico_ipv4_nat_find_tuple"].apply(null, arguments)
    };

    var _pico_ipv4_nat_generate_tuple = Module["_pico_ipv4_nat_generate_tuple"] = function() {
      return Module["asm"]["_pico_ipv4_nat_generate_tuple"].apply(null, arguments)
    };

    var _pico_ipv4_nat_inbound = Module["_pico_ipv4_nat_inbound"] = function() {
      return Module["asm"]["_pico_ipv4_nat_inbound"].apply(null, arguments)
    };

    var _pico_ipv4_nat_is_enabled = Module["_pico_ipv4_nat_is_enabled"] = function() {
      return Module["asm"]["_pico_ipv4_nat_is_enabled"].apply(null, arguments)
    };

    var _pico_ipv4_nat_outbound = Module["_pico_ipv4_nat_outbound"] = function() {
      return Module["asm"]["_pico_ipv4_nat_outbound"].apply(null, arguments)
    };

    var _pico_ipv4_nat_set_tcp_flags = Module["_pico_ipv4_nat_set_tcp_flags"] = function() {
      return Module["asm"]["_pico_ipv4_nat_set_tcp_flags"].apply(null, arguments)
    };

    var _pico_ipv4_nat_sniff_session = Module["_pico_ipv4_nat_sniff_session"] = function() {
      return Module["asm"]["_pico_ipv4_nat_sniff_session"].apply(null, arguments)
    };

    var _pico_ipv4_pre_forward_checks = Module["_pico_ipv4_pre_forward_checks"] = function() {
      return Module["asm"]["_pico_ipv4_pre_forward_checks"].apply(null, arguments)
    };

    var _pico_ipv4_process_bcast_in = Module["_pico_ipv4_process_bcast_in"] = function() {
      return Module["asm"]["_pico_ipv4_process_bcast_in"].apply(null, arguments)
    };

    var _pico_ipv4_process_finally_try_forward = Module["_pico_ipv4_process_finally_try_forward"] = function() {
      return Module["asm"]["_pico_ipv4_process_finally_try_forward"].apply(null, arguments)
    };

    var _pico_ipv4_process_frag = Module["_pico_ipv4_process_frag"] = function() {
      return Module["asm"]["_pico_ipv4_process_frag"].apply(null, arguments)
    };

    var _pico_ipv4_process_in = Module["_pico_ipv4_process_in"] = function() {
      return Module["asm"]["_pico_ipv4_process_in"].apply(null, arguments)
    };

    var _pico_ipv4_process_local_unicast_in = Module["_pico_ipv4_process_local_unicast_in"] = function() {
      return Module["asm"]["_pico_ipv4_process_local_unicast_in"].apply(null, arguments)
    };

    var _pico_ipv4_process_mcast_in = Module["_pico_ipv4_process_mcast_in"] = function() {
      return Module["asm"]["_pico_ipv4_process_mcast_in"].apply(null, arguments)
    };

    var _pico_ipv4_process_out = Module["_pico_ipv4_process_out"] = function() {
      return Module["asm"]["_pico_ipv4_process_out"].apply(null, arguments)
    };

    var _pico_ipv4_rebound = Module["_pico_ipv4_rebound"] = function() {
      return Module["asm"]["_pico_ipv4_rebound"].apply(null, arguments)
    };

    var _pico_ipv4_rebound_large = Module["_pico_ipv4_rebound_large"] = function() {
      return Module["asm"]["_pico_ipv4_rebound_large"].apply(null, arguments)
    };

    var _pico_ipv4_route_add = Module["_pico_ipv4_route_add"] = function() {
      return Module["asm"]["_pico_ipv4_route_add"].apply(null, arguments)
    };

    var _pico_ipv4_route_del = Module["_pico_ipv4_route_del"] = function() {
      return Module["asm"]["_pico_ipv4_route_del"].apply(null, arguments)
    };

    var _pico_ipv4_route_get_gateway = Module["_pico_ipv4_route_get_gateway"] = function() {
      return Module["asm"]["_pico_ipv4_route_get_gateway"].apply(null, arguments)
    };

    var _pico_ipv4_route_set_bcast_link = Module["_pico_ipv4_route_set_bcast_link"] = function() {
      return Module["asm"]["_pico_ipv4_route_set_bcast_link"].apply(null, arguments)
    };

    var _pico_ipv4_source_dev_find = Module["_pico_ipv4_source_dev_find"] = function() {
      return Module["asm"]["_pico_ipv4_source_dev_find"].apply(null, arguments)
    };

    var _pico_ipv4_source_find = Module["_pico_ipv4_source_find"] = function() {
      return Module["asm"]["_pico_ipv4_source_find"].apply(null, arguments)
    };

    var _pico_ipv4_to_string = Module["_pico_ipv4_to_string"] = function() {
      return Module["asm"]["_pico_ipv4_to_string"].apply(null, arguments)
    };

    var _pico_ipv4_unreachable = Module["_pico_ipv4_unreachable"] = function() {
      return Module["asm"]["_pico_ipv4_unreachable"].apply(null, arguments)
    };

    var _pico_ipv6_alloc = Module["_pico_ipv6_alloc"] = function() {
      return Module["asm"]["_pico_ipv6_alloc"].apply(null, arguments)
    };

    var _pico_ipv6_check_aligned = Module["_pico_ipv6_check_aligned"] = function() {
      return Module["asm"]["_pico_ipv6_check_aligned"].apply(null, arguments)
    };

    var _pico_ipv6_check_headers_sequence = Module["_pico_ipv6_check_headers_sequence"] = function() {
      return Module["asm"]["_pico_ipv6_check_headers_sequence"].apply(null, arguments)
    };

    var _pico_ipv6_check_lifetime_expired = Module["_pico_ipv6_check_lifetime_expired"] = function() {
      return Module["asm"]["_pico_ipv6_check_lifetime_expired"].apply(null, arguments)
    };

    var _pico_ipv6_cleanup_routes = Module["_pico_ipv6_cleanup_routes"] = function() {
      return Module["asm"]["_pico_ipv6_cleanup_routes"].apply(null, arguments)
    };

    var _pico_ipv6_compare = Module["_pico_ipv6_compare"] = function() {
      return Module["asm"]["_pico_ipv6_compare"].apply(null, arguments)
    };

    var _pico_ipv6_dec_to_char = Module["_pico_ipv6_dec_to_char"] = function() {
      return Module["asm"]["_pico_ipv6_dec_to_char"].apply(null, arguments)
    };

    var _pico_ipv6_do_link_add = Module["_pico_ipv6_do_link_add"] = function() {
      return Module["asm"]["_pico_ipv6_do_link_add"].apply(null, arguments)
    };

    var _pico_ipv6_ethernet_receive = Module["_pico_ipv6_ethernet_receive"] = function() {
      return Module["asm"]["_pico_ipv6_ethernet_receive"].apply(null, arguments)
    };

    var _pico_ipv6_extension_headers = Module["_pico_ipv6_extension_headers"] = function() {
      return Module["asm"]["_pico_ipv6_extension_headers"].apply(null, arguments)
    };

    var _pico_ipv6_forward = Module["_pico_ipv6_forward"] = function() {
      return Module["asm"]["_pico_ipv6_forward"].apply(null, arguments)
    };

    var _pico_ipv6_forward_check_dev = Module["_pico_ipv6_forward_check_dev"] = function() {
      return Module["asm"]["_pico_ipv6_forward_check_dev"].apply(null, arguments)
    };

    var _pico_ipv6_frag_compare = Module["_pico_ipv6_frag_compare"] = function() {
      return Module["asm"]["_pico_ipv6_frag_compare"].apply(null, arguments)
    };

    var _pico_ipv6_frag_match = Module["_pico_ipv6_frag_match"] = function() {
      return Module["asm"]["_pico_ipv6_frag_match"].apply(null, arguments)
    };

    var _pico_ipv6_frag_timer_on = Module["_pico_ipv6_frag_timer_on"] = function() {
      return Module["asm"]["_pico_ipv6_frag_timer_on"].apply(null, arguments)
    };

    var _pico_ipv6_fragments_complete = Module["_pico_ipv6_fragments_complete"] = function() {
      return Module["asm"]["_pico_ipv6_fragments_complete"].apply(null, arguments)
    };

    var _pico_ipv6_frame_push = Module["_pico_ipv6_frame_push"] = function() {
      return Module["asm"]["_pico_ipv6_frame_push"].apply(null, arguments)
    };

    var _pico_ipv6_frame_sock_push = Module["_pico_ipv6_frame_sock_push"] = function() {
      return Module["asm"]["_pico_ipv6_frame_sock_push"].apply(null, arguments)
    };

    var _pico_ipv6_get_default_mcastlink = Module["_pico_ipv6_get_default_mcastlink"] = function() {
      return Module["asm"]["_pico_ipv6_get_default_mcastlink"].apply(null, arguments)
    };

    var _pico_ipv6_get_neighbor = Module["_pico_ipv6_get_neighbor"] = function() {
      return Module["asm"]["_pico_ipv6_get_neighbor"].apply(null, arguments)
    };

    var _pico_ipv6_global_get = Module["_pico_ipv6_global_get"] = function() {
      return Module["asm"]["_pico_ipv6_global_get"].apply(null, arguments)
    };

    var _pico_ipv6_hex_to_dec = Module["_pico_ipv6_hex_to_dec"] = function() {
      return Module["asm"]["_pico_ipv6_hex_to_dec"].apply(null, arguments)
    };

    var _pico_ipv6_is_allhosts_multicast = Module["_pico_ipv6_is_allhosts_multicast"] = function() {
      return Module["asm"]["_pico_ipv6_is_allhosts_multicast"].apply(null, arguments)
    };

    var _pico_ipv6_is_global = Module["_pico_ipv6_is_global"] = function() {
      return Module["asm"]["_pico_ipv6_is_global"].apply(null, arguments)
    };

    var _pico_ipv6_is_linklocal = Module["_pico_ipv6_is_linklocal"] = function() {
      return Module["asm"]["_pico_ipv6_is_linklocal"].apply(null, arguments)
    };

    var _pico_ipv6_is_localhost = Module["_pico_ipv6_is_localhost"] = function() {
      return Module["asm"]["_pico_ipv6_is_localhost"].apply(null, arguments)
    };

    var _pico_ipv6_is_multicast = Module["_pico_ipv6_is_multicast"] = function() {
      return Module["asm"]["_pico_ipv6_is_multicast"].apply(null, arguments)
    };

    var _pico_ipv6_is_null_address = Module["_pico_ipv6_is_null_address"] = function() {
      return Module["asm"]["_pico_ipv6_is_null_address"].apply(null, arguments)
    };

    var _pico_ipv6_is_sitelocal = Module["_pico_ipv6_is_sitelocal"] = function() {
      return Module["asm"]["_pico_ipv6_is_sitelocal"].apply(null, arguments)
    };

    var _pico_ipv6_is_solnode_multicast = Module["_pico_ipv6_is_solnode_multicast"] = function() {
      return Module["asm"]["_pico_ipv6_is_solnode_multicast"].apply(null, arguments)
    };

    var _pico_ipv6_is_unicast = Module["_pico_ipv6_is_unicast"] = function() {
      return Module["asm"]["_pico_ipv6_is_unicast"].apply(null, arguments)
    };

    var _pico_ipv6_is_uniquelocal = Module["_pico_ipv6_is_uniquelocal"] = function() {
      return Module["asm"]["_pico_ipv6_is_uniquelocal"].apply(null, arguments)
    };

    var _pico_ipv6_is_unspecified = Module["_pico_ipv6_is_unspecified"] = function() {
      return Module["asm"]["_pico_ipv6_is_unspecified"].apply(null, arguments)
    };

    var _pico_ipv6_lifetime_set = Module["_pico_ipv6_lifetime_set"] = function() {
      return Module["asm"]["_pico_ipv6_lifetime_set"].apply(null, arguments)
    };

    var _pico_ipv6_link_add = Module["_pico_ipv6_link_add"] = function() {
      return Module["asm"]["_pico_ipv6_link_add"].apply(null, arguments)
    };

    var _pico_ipv6_link_add_local = Module["_pico_ipv6_link_add_local"] = function() {
      return Module["asm"]["_pico_ipv6_link_add_local"].apply(null, arguments)
    };

    var _pico_ipv6_link_by_dev = Module["_pico_ipv6_link_by_dev"] = function() {
      return Module["asm"]["_pico_ipv6_link_by_dev"].apply(null, arguments)
    };

    var _pico_ipv6_link_by_dev_next = Module["_pico_ipv6_link_by_dev_next"] = function() {
      return Module["asm"]["_pico_ipv6_link_by_dev_next"].apply(null, arguments)
    };

    var _pico_ipv6_link_del = Module["_pico_ipv6_link_del"] = function() {
      return Module["asm"]["_pico_ipv6_link_del"].apply(null, arguments)
    };

    var _pico_ipv6_link_find = Module["_pico_ipv6_link_find"] = function() {
      return Module["asm"]["_pico_ipv6_link_find"].apply(null, arguments)
    };

    var _pico_ipv6_link_get = Module["_pico_ipv6_link_get"] = function() {
      return Module["asm"]["_pico_ipv6_link_get"].apply(null, arguments)
    };

    var _pico_ipv6_link_istentative = Module["_pico_ipv6_link_istentative"] = function() {
      return Module["asm"]["_pico_ipv6_link_istentative"].apply(null, arguments)
    };

    var _pico_ipv6_linklocal_get = Module["_pico_ipv6_linklocal_get"] = function() {
      return Module["asm"]["_pico_ipv6_linklocal_get"].apply(null, arguments)
    };

    var _pico_ipv6_mcast_filter = Module["_pico_ipv6_mcast_filter"] = function() {
      return Module["asm"]["_pico_ipv6_mcast_filter"].apply(null, arguments)
    };

    var _pico_ipv6_mcast_join = Module["_pico_ipv6_mcast_join"] = function() {
      return Module["asm"]["_pico_ipv6_mcast_join"].apply(null, arguments)
    };

    var _pico_ipv6_mcast_leave = Module["_pico_ipv6_mcast_leave"] = function() {
      return Module["asm"]["_pico_ipv6_mcast_leave"].apply(null, arguments)
    };

    var _pico_ipv6_nd_dad = Module["_pico_ipv6_nd_dad"] = function() {
      return Module["asm"]["_pico_ipv6_nd_dad"].apply(null, arguments)
    };

    var _pico_ipv6_nd_init = Module["_pico_ipv6_nd_init"] = function() {
      return Module["asm"]["_pico_ipv6_nd_init"].apply(null, arguments)
    };

    var _pico_ipv6_nd_postpone = Module["_pico_ipv6_nd_postpone"] = function() {
      return Module["asm"]["_pico_ipv6_nd_postpone"].apply(null, arguments)
    };

    var _pico_ipv6_nd_queued_trigger = Module["_pico_ipv6_nd_queued_trigger"] = function() {
      return Module["asm"]["_pico_ipv6_nd_queued_trigger"].apply(null, arguments)
    };

    var _pico_ipv6_nd_ra_timer_callback = Module["_pico_ipv6_nd_ra_timer_callback"] = function() {
      return Module["asm"]["_pico_ipv6_nd_ra_timer_callback"].apply(null, arguments)
    };

    var _pico_ipv6_nd_recv = Module["_pico_ipv6_nd_recv"] = function() {
      return Module["asm"]["_pico_ipv6_nd_recv"].apply(null, arguments)
    };

    var _pico_ipv6_nd_timer_callback = Module["_pico_ipv6_nd_timer_callback"] = function() {
      return Module["asm"]["_pico_ipv6_nd_timer_callback"].apply(null, arguments)
    };

    var _pico_ipv6_nd_timer_elapsed = Module["_pico_ipv6_nd_timer_elapsed"] = function() {
      return Module["asm"]["_pico_ipv6_nd_timer_elapsed"].apply(null, arguments)
    };

    var _pico_ipv6_nd_unreachable = Module["_pico_ipv6_nd_unreachable"] = function() {
      return Module["asm"]["_pico_ipv6_nd_unreachable"].apply(null, arguments)
    };

    var _pico_ipv6_neighbor_compare = Module["_pico_ipv6_neighbor_compare"] = function() {
      return Module["asm"]["_pico_ipv6_neighbor_compare"].apply(null, arguments)
    };

    var _pico_ipv6_neighbor_compare_stored = Module["_pico_ipv6_neighbor_compare_stored"] = function() {
      return Module["asm"]["_pico_ipv6_neighbor_compare_stored"].apply(null, arguments)
    };

    var _pico_ipv6_neighbor_from_sol_new = Module["_pico_ipv6_neighbor_from_sol_new"] = function() {
      return Module["asm"]["_pico_ipv6_neighbor_from_sol_new"].apply(null, arguments)
    };

    var _pico_ipv6_neighbor_from_unsolicited = Module["_pico_ipv6_neighbor_from_unsolicited"] = function() {
      return Module["asm"]["_pico_ipv6_neighbor_from_unsolicited"].apply(null, arguments)
    };

    var _pico_ipv6_neighbor_update = Module["_pico_ipv6_neighbor_update"] = function() {
      return Module["asm"]["_pico_ipv6_neighbor_update"].apply(null, arguments)
    };

    var _pico_ipv6_pre_forward_checks = Module["_pico_ipv6_pre_forward_checks"] = function() {
      return Module["asm"]["_pico_ipv6_pre_forward_checks"].apply(null, arguments)
    };

    var _pico_ipv6_prefix_configured = Module["_pico_ipv6_prefix_configured"] = function() {
      return Module["asm"]["_pico_ipv6_prefix_configured"].apply(null, arguments)
    };

    var _pico_ipv6_process_destopt = Module["_pico_ipv6_process_destopt"] = function() {
      return Module["asm"]["_pico_ipv6_process_destopt"].apply(null, arguments)
    };

    var _pico_ipv6_process_frag = Module["_pico_ipv6_process_frag"] = function() {
      return Module["asm"]["_pico_ipv6_process_frag"].apply(null, arguments)
    };

    var _pico_ipv6_process_hopbyhop = Module["_pico_ipv6_process_hopbyhop"] = function() {
      return Module["asm"]["_pico_ipv6_process_hopbyhop"].apply(null, arguments)
    };

    var _pico_ipv6_process_in = Module["_pico_ipv6_process_in"] = function() {
      return Module["asm"]["_pico_ipv6_process_in"].apply(null, arguments)
    };

    var _pico_ipv6_process_mcast_in = Module["_pico_ipv6_process_mcast_in"] = function() {
      return Module["asm"]["_pico_ipv6_process_mcast_in"].apply(null, arguments)
    };

    var _pico_ipv6_process_out = Module["_pico_ipv6_process_out"] = function() {
      return Module["asm"]["_pico_ipv6_process_out"].apply(null, arguments)
    };

    var _pico_ipv6_process_routing = Module["_pico_ipv6_process_routing"] = function() {
      return Module["asm"]["_pico_ipv6_process_routing"].apply(null, arguments)
    };

    var _pico_ipv6_route_add = Module["_pico_ipv6_route_add"] = function() {
      return Module["asm"]["_pico_ipv6_route_add"].apply(null, arguments)
    };

    var _pico_ipv6_route_del = Module["_pico_ipv6_route_del"] = function() {
      return Module["asm"]["_pico_ipv6_route_del"].apply(null, arguments)
    };

    var _pico_ipv6_route_find = Module["_pico_ipv6_route_find"] = function() {
      return Module["asm"]["_pico_ipv6_route_find"].apply(null, arguments)
    };

    var _pico_ipv6_route_get_gateway = Module["_pico_ipv6_route_get_gateway"] = function() {
      return Module["asm"]["_pico_ipv6_route_get_gateway"].apply(null, arguments)
    };

    var _pico_ipv6_router_down = Module["_pico_ipv6_router_down"] = function() {
      return Module["asm"]["_pico_ipv6_router_down"].apply(null, arguments)
    };

    var _pico_ipv6_sitelocal_get = Module["_pico_ipv6_sitelocal_get"] = function() {
      return Module["asm"]["_pico_ipv6_sitelocal_get"].apply(null, arguments)
    };

    var _pico_ipv6_source_dev_find = Module["_pico_ipv6_source_dev_find"] = function() {
      return Module["asm"]["_pico_ipv6_source_dev_find"].apply(null, arguments)
    };

    var _pico_ipv6_source_find = Module["_pico_ipv6_source_find"] = function() {
      return Module["asm"]["_pico_ipv6_source_find"].apply(null, arguments)
    };

    var _pico_ipv6_to_string = Module["_pico_ipv6_to_string"] = function() {
      return Module["asm"]["_pico_ipv6_to_string"].apply(null, arguments)
    };

    var _pico_ipv6_unreachable = Module["_pico_ipv6_unreachable"] = function() {
      return Module["asm"]["_pico_ipv6_unreachable"].apply(null, arguments)
    };

    var _pico_is_digit = Module["_pico_is_digit"] = function() {
      return Module["asm"]["_pico_is_digit"].apply(null, arguments)
    };

    var _pico_is_hex = Module["_pico_is_hex"] = function() {
      return Module["asm"]["_pico_is_hex"].apply(null, arguments)
    };

    var _pico_is_port_free = Module["_pico_is_port_free"] = function() {
      return Module["asm"]["_pico_is_port_free"].apply(null, arguments)
    };

    var _pico_js_create = Module["_pico_js_create"] = function() {
      return Module["asm"]["_pico_js_create"].apply(null, arguments)
    };

    var _pico_js_poll = Module["_pico_js_poll"] = function() {
      return Module["asm"]["_pico_js_poll"].apply(null, arguments)
    };

    var _pico_js_send = Module["_pico_js_send"] = function() {
      return Module["asm"]["_pico_js_send"].apply(null, arguments)
    };

    var _pico_mcast_filter_excl_excl = Module["_pico_mcast_filter_excl_excl"] = function() {
      return Module["asm"]["_pico_mcast_filter_excl_excl"].apply(null, arguments)
    };

    var _pico_mcast_filter_excl_incl = Module["_pico_mcast_filter_excl_incl"] = function() {
      return Module["asm"]["_pico_mcast_filter_excl_incl"].apply(null, arguments)
    };

    var _pico_mcast_filter_incl_excl = Module["_pico_mcast_filter_incl_excl"] = function() {
      return Module["asm"]["_pico_mcast_filter_incl_excl"].apply(null, arguments)
    };

    var _pico_mcast_filter_incl_incl = Module["_pico_mcast_filter_incl_incl"] = function() {
      return Module["asm"]["_pico_mcast_filter_incl_incl"].apply(null, arguments)
    };

    var _pico_mcast_generate_filter = Module["_pico_mcast_generate_filter"] = function() {
      return Module["asm"]["_pico_mcast_generate_filter"].apply(null, arguments)
    };

    var _pico_mcast_src_filtering_cleanup = Module["_pico_mcast_src_filtering_cleanup"] = function() {
      return Module["asm"]["_pico_mcast_src_filtering_cleanup"].apply(null, arguments)
    };

    var _pico_mcast_src_filtering_excl_excl = Module["_pico_mcast_src_filtering_excl_excl"] = function() {
      return Module["asm"]["_pico_mcast_src_filtering_excl_excl"].apply(null, arguments)
    };

    var _pico_mcast_src_filtering_excl_inc = Module["_pico_mcast_src_filtering_excl_inc"] = function() {
      return Module["asm"]["_pico_mcast_src_filtering_excl_inc"].apply(null, arguments)
    };

    var _pico_mcast_src_filtering_inc_excl = Module["_pico_mcast_src_filtering_inc_excl"] = function() {
      return Module["asm"]["_pico_mcast_src_filtering_inc_excl"].apply(null, arguments)
    };

    var _pico_mcast_src_filtering_inc_inc = Module["_pico_mcast_src_filtering_inc_inc"] = function() {
      return Module["asm"]["_pico_mcast_src_filtering_inc_inc"].apply(null, arguments)
    };

    var _pico_mld_analyse_packet = Module["_pico_mld_analyse_packet"] = function() {
      return Module["asm"]["_pico_mld_analyse_packet"].apply(null, arguments)
    };

    var _pico_mld_check_hopbyhop = Module["_pico_mld_check_hopbyhop"] = function() {
      return Module["asm"]["_pico_mld_check_hopbyhop"].apply(null, arguments)
    };

    var _pico_mld_checksum = Module["_pico_mld_checksum"] = function() {
      return Module["asm"]["_pico_mld_checksum"].apply(null, arguments)
    };

    var _pico_mld_compatibility_mode = Module["_pico_mld_compatibility_mode"] = function() {
      return Module["asm"]["_pico_mld_compatibility_mode"].apply(null, arguments)
    };

    var _pico_mld_delete_parameter = Module["_pico_mld_delete_parameter"] = function() {
      return Module["asm"]["_pico_mld_delete_parameter"].apply(null, arguments)
    };

    var _pico_mld_fill_hopbyhop = Module["_pico_mld_fill_hopbyhop"] = function() {
      return Module["asm"]["_pico_mld_fill_hopbyhop"].apply(null, arguments)
    };

    var _pico_mld_find_parameter = Module["_pico_mld_find_parameter"] = function() {
      return Module["asm"]["_pico_mld_find_parameter"].apply(null, arguments)
    };

    var _pico_mld_find_timer = Module["_pico_mld_find_timer"] = function() {
      return Module["asm"]["_pico_mld_find_timer"].apply(null, arguments)
    };

    var _pico_mld_generate_report = Module["_pico_mld_generate_report"] = function() {
      return Module["asm"]["_pico_mld_generate_report"].apply(null, arguments)
    };

    var _pico_mld_is_checksum_valid = Module["_pico_mld_is_checksum_valid"] = function() {
      return Module["asm"]["_pico_mld_is_checksum_valid"].apply(null, arguments)
    };

    var _pico_mld_process_event = Module["_pico_mld_process_event"] = function() {
      return Module["asm"]["_pico_mld_process_event"].apply(null, arguments)
    };

    var _pico_mld_process_in = Module["_pico_mld_process_in"] = function() {
      return Module["asm"]["_pico_mld_process_in"].apply(null, arguments)
    };

    var _pico_mld_report_expired = Module["_pico_mld_report_expired"] = function() {
      return Module["asm"]["_pico_mld_report_expired"].apply(null, arguments)
    };

    var _pico_mld_send_done = Module["_pico_mld_send_done"] = function() {
      return Module["asm"]["_pico_mld_send_done"].apply(null, arguments)
    };

    var _pico_mld_send_report = Module["_pico_mld_send_report"] = function() {
      return Module["asm"]["_pico_mld_send_report"].apply(null, arguments)
    };

    var _pico_mld_state_change = Module["_pico_mld_state_change"] = function() {
      return Module["asm"]["_pico_mld_state_change"].apply(null, arguments)
    };

    var _pico_mld_timer_expired = Module["_pico_mld_timer_expired"] = function() {
      return Module["asm"]["_pico_mld_timer_expired"].apply(null, arguments)
    };

    var _pico_mld_timer_is_running = Module["_pico_mld_timer_is_running"] = function() {
      return Module["asm"]["_pico_mld_timer_is_running"].apply(null, arguments)
    };

    var _pico_mld_timer_reset = Module["_pico_mld_timer_reset"] = function() {
      return Module["asm"]["_pico_mld_timer_reset"].apply(null, arguments)
    };

    var _pico_mld_timer_start = Module["_pico_mld_timer_start"] = function() {
      return Module["asm"]["_pico_mld_timer_start"].apply(null, arguments)
    };

    var _pico_mld_timer_stop = Module["_pico_mld_timer_stop"] = function() {
      return Module["asm"]["_pico_mld_timer_stop"].apply(null, arguments)
    };

    var _pico_mld_v1querier_expired = Module["_pico_mld_v1querier_expired"] = function() {
      return Module["asm"]["_pico_mld_v1querier_expired"].apply(null, arguments)
    };

    var _pico_mldv1_generate_report = Module["_pico_mldv1_generate_report"] = function() {
      return Module["asm"]["_pico_mldv1_generate_report"].apply(null, arguments)
    };

    var _pico_mldv2_generate_filter = Module["_pico_mldv2_generate_filter"] = function() {
      return Module["asm"]["_pico_mldv2_generate_filter"].apply(null, arguments)
    };

    var _pico_mldv2_generate_report = Module["_pico_mldv2_generate_report"] = function() {
      return Module["asm"]["_pico_mldv2_generate_report"].apply(null, arguments)
    };

    var _pico_multicast_delete = Module["_pico_multicast_delete"] = function() {
      return Module["asm"]["_pico_multicast_delete"].apply(null, arguments)
    };

    var _pico_nat_generate_tuple_trans = Module["_pico_nat_generate_tuple_trans"] = function() {
      return Module["asm"]["_pico_nat_generate_tuple_trans"].apply(null, arguments)
    };

    var _pico_nd_add = Module["_pico_nd_add"] = function() {
      return Module["asm"]["_pico_nd_add"].apply(null, arguments)
    };

    var _pico_nd_discover = Module["_pico_nd_discover"] = function() {
      return Module["asm"]["_pico_nd_discover"].apply(null, arguments)
    };

    var _pico_nd_find_neighbor = Module["_pico_nd_find_neighbor"] = function() {
      return Module["asm"]["_pico_nd_find_neighbor"].apply(null, arguments)
    };

    var _pico_nd_get = Module["_pico_nd_get"] = function() {
      return Module["asm"]["_pico_nd_get"].apply(null, arguments)
    };

    var _pico_nd_get_neighbor = Module["_pico_nd_get_neighbor"] = function() {
      return Module["asm"]["_pico_nd_get_neighbor"].apply(null, arguments)
    };

    var _pico_nd_neigh_adv_recv = Module["_pico_nd_neigh_adv_recv"] = function() {
      return Module["asm"]["_pico_nd_neigh_adv_recv"].apply(null, arguments)
    };

    var _pico_nd_neigh_sol_recv = Module["_pico_nd_neigh_sol_recv"] = function() {
      return Module["asm"]["_pico_nd_neigh_sol_recv"].apply(null, arguments)
    };

    var _pico_nd_new_expire_time = Module["_pico_nd_new_expire_time"] = function() {
      return Module["asm"]["_pico_nd_new_expire_time"].apply(null, arguments)
    };

    var _pico_nd_redirect_recv = Module["_pico_nd_redirect_recv"] = function() {
      return Module["asm"]["_pico_nd_redirect_recv"].apply(null, arguments)
    };

    var _pico_nd_router_adv_recv = Module["_pico_nd_router_adv_recv"] = function() {
      return Module["asm"]["_pico_nd_router_adv_recv"].apply(null, arguments)
    };

    var _pico_nd_router_sol_recv = Module["_pico_nd_router_sol_recv"] = function() {
      return Module["asm"]["_pico_nd_router_sol_recv"].apply(null, arguments)
    };

    var _pico_network_receive = Module["_pico_network_receive"] = function() {
      return Module["asm"]["_pico_network_receive"].apply(null, arguments)
    };

    var _pico_network_send = Module["_pico_network_send"] = function() {
      return Module["asm"]["_pico_network_send"].apply(null, arguments)
    };

    var _pico_notify_dest_unreachable = Module["_pico_notify_dest_unreachable"] = function() {
      return Module["asm"]["_pico_notify_dest_unreachable"].apply(null, arguments)
    };

    var _pico_notify_frag_expired = Module["_pico_notify_frag_expired"] = function() {
      return Module["asm"]["_pico_notify_frag_expired"].apply(null, arguments)
    };

    var _pico_notify_pkt_too_big = Module["_pico_notify_pkt_too_big"] = function() {
      return Module["asm"]["_pico_notify_pkt_too_big"].apply(null, arguments)
    };

    var _pico_notify_proto_unreachable = Module["_pico_notify_proto_unreachable"] = function() {
      return Module["asm"]["_pico_notify_proto_unreachable"].apply(null, arguments)
    };

    var _pico_notify_socket_unreachable = Module["_pico_notify_socket_unreachable"] = function() {
      return Module["asm"]["_pico_notify_socket_unreachable"].apply(null, arguments)
    };

    var _pico_notify_ttl_expired = Module["_pico_notify_ttl_expired"] = function() {
      return Module["asm"]["_pico_notify_ttl_expired"].apply(null, arguments)
    };

    var _pico_paws = Module["_pico_paws"] = function() {
      return Module["asm"]["_pico_paws"].apply(null, arguments)
    };

    var _pico_port_in_use_by_nat = Module["_pico_port_in_use_by_nat"] = function() {
      return Module["asm"]["_pico_port_in_use_by_nat"].apply(null, arguments)
    };

    var _pico_port_in_use_ipv4 = Module["_pico_port_in_use_ipv4"] = function() {
      return Module["asm"]["_pico_port_in_use_ipv4"].apply(null, arguments)
    };

    var _pico_port_in_use_ipv6 = Module["_pico_port_in_use_ipv6"] = function() {
      return Module["asm"]["_pico_port_in_use_ipv6"].apply(null, arguments)
    };

    var _pico_port_in_use_with_this_ipv4_address = Module["_pico_port_in_use_with_this_ipv4_address"] = function() {
      return Module["asm"]["_pico_port_in_use_with_this_ipv4_address"].apply(null, arguments)
    };

    var _pico_port_in_use_with_this_ipv6_address = Module["_pico_port_in_use_with_this_ipv6_address"] = function() {
      return Module["asm"]["_pico_port_in_use_with_this_ipv6_address"].apply(null, arguments)
    };

    var _pico_proto_cmp = Module["_pico_proto_cmp"] = function() {
      return Module["asm"]["_pico_proto_cmp"].apply(null, arguments)
    };

    var _pico_protocol_datalink_loop = Module["_pico_protocol_datalink_loop"] = function() {
      return Module["asm"]["_pico_protocol_datalink_loop"].apply(null, arguments)
    };

    var _pico_protocol_generic_loop = Module["_pico_protocol_generic_loop"] = function() {
      return Module["asm"]["_pico_protocol_generic_loop"].apply(null, arguments)
    };

    var _pico_protocol_init = Module["_pico_protocol_init"] = function() {
      return Module["asm"]["_pico_protocol_init"].apply(null, arguments)
    };

    var _pico_protocol_network_loop = Module["_pico_protocol_network_loop"] = function() {
      return Module["asm"]["_pico_protocol_network_loop"].apply(null, arguments)
    };

    var _pico_protocol_socket_loop = Module["_pico_protocol_socket_loop"] = function() {
      return Module["asm"]["_pico_protocol_socket_loop"].apply(null, arguments)
    };

    var _pico_protocol_transport_loop = Module["_pico_protocol_transport_loop"] = function() {
      return Module["asm"]["_pico_protocol_transport_loop"].apply(null, arguments)
    };

    var _pico_queue_peek = Module["_pico_queue_peek"] = function() {
      return Module["asm"]["_pico_queue_peek"].apply(null, arguments)
    };

    var _pico_queue_peek_167 = Module["_pico_queue_peek_167"] = function() {
      return Module["asm"]["_pico_queue_peek_167"].apply(null, arguments)
    };

    var _pico_rand = Module["_pico_rand"] = function() {
      return Module["asm"]["_pico_rand"].apply(null, arguments)
    };

    var _pico_rand_feed = Module["_pico_rand_feed"] = function() {
      return Module["asm"]["_pico_rand_feed"].apply(null, arguments)
    };

    var _pico_sendto_dev = Module["_pico_sendto_dev"] = function() {
      return Module["asm"]["_pico_sendto_dev"].apply(null, arguments)
    };

    var _pico_seq_compare = Module["_pico_seq_compare"] = function() {
      return Module["asm"]["_pico_seq_compare"].apply(null, arguments)
    };

    var _pico_socket_accept = Module["_pico_socket_accept"] = function() {
      return Module["asm"]["_pico_socket_accept"].apply(null, arguments)
    };

    var _pico_socket_adapt_mss_to_proto = Module["_pico_socket_adapt_mss_to_proto"] = function() {
      return Module["asm"]["_pico_socket_adapt_mss_to_proto"].apply(null, arguments)
    };

    var _pico_socket_add = Module["_pico_socket_add"] = function() {
      return Module["asm"]["_pico_socket_add"].apply(null, arguments)
    };

    var _pico_socket_aggregate_mcastfilters = Module["_pico_socket_aggregate_mcastfilters"] = function() {
      return Module["asm"]["_pico_socket_aggregate_mcastfilters"].apply(null, arguments)
    };

    var _pico_socket_alter_state = Module["_pico_socket_alter_state"] = function() {
      return Module["asm"]["_pico_socket_alter_state"].apply(null, arguments)
    };

    var _pico_socket_bind = Module["_pico_socket_bind"] = function() {
      return Module["asm"]["_pico_socket_bind"].apply(null, arguments)
    };

    var _pico_socket_check_empty_sockport = Module["_pico_socket_check_empty_sockport"] = function() {
      return Module["asm"]["_pico_socket_check_empty_sockport"].apply(null, arguments)
    };

    var _pico_socket_clone = Module["_pico_socket_clone"] = function() {
      return Module["asm"]["_pico_socket_clone"].apply(null, arguments)
    };

    var _pico_socket_clone_assign_address = Module["_pico_socket_clone_assign_address"] = function() {
      return Module["asm"]["_pico_socket_clone_assign_address"].apply(null, arguments)
    };

    var _pico_socket_close = Module["_pico_socket_close"] = function() {
      return Module["asm"]["_pico_socket_close"].apply(null, arguments)
    };

    var _pico_socket_connect = Module["_pico_socket_connect"] = function() {
      return Module["asm"]["_pico_socket_connect"].apply(null, arguments)
    };

    var _pico_socket_del = Module["_pico_socket_del"] = function() {
      return Module["asm"]["_pico_socket_del"].apply(null, arguments)
    };

    var _pico_socket_deliver = Module["_pico_socket_deliver"] = function() {
      return Module["asm"]["_pico_socket_deliver"].apply(null, arguments)
    };

    var _pico_socket_final_xmit = Module["_pico_socket_final_xmit"] = function() {
      return Module["asm"]["_pico_socket_final_xmit"].apply(null, arguments)
    };

    var _pico_socket_frame_alloc = Module["_pico_socket_frame_alloc"] = function() {
      return Module["asm"]["_pico_socket_frame_alloc"].apply(null, arguments)
    };

    var _pico_socket_get_mss = Module["_pico_socket_get_mss"] = function() {
      return Module["asm"]["_pico_socket_get_mss"].apply(null, arguments)
    };

    var _pico_socket_high_port = Module["_pico_socket_high_port"] = function() {
      return Module["asm"]["_pico_socket_high_port"].apply(null, arguments)
    };

    var _pico_socket_listen = Module["_pico_socket_listen"] = function() {
      return Module["asm"]["_pico_socket_listen"].apply(null, arguments)
    };

    var _pico_socket_mcast_filter = Module["_pico_socket_mcast_filter"] = function() {
      return Module["asm"]["_pico_socket_mcast_filter"].apply(null, arguments)
    };

    var _pico_socket_mcast_filter_exclude = Module["_pico_socket_mcast_filter_exclude"] = function() {
      return Module["asm"]["_pico_socket_mcast_filter_exclude"].apply(null, arguments)
    };

    var _pico_socket_mcast_filter_include = Module["_pico_socket_mcast_filter_include"] = function() {
      return Module["asm"]["_pico_socket_mcast_filter_include"].apply(null, arguments)
    };

    var _pico_socket_mcast_filter_link_get = Module["_pico_socket_mcast_filter_link_get"] = function() {
      return Module["asm"]["_pico_socket_mcast_filter_link_get"].apply(null, arguments)
    };

    var _pico_socket_mcast_source_filtering = Module["_pico_socket_mcast_source_filtering"] = function() {
      return Module["asm"]["_pico_socket_mcast_source_filtering"].apply(null, arguments)
    };

    var _pico_socket_open = Module["_pico_socket_open"] = function() {
      return Module["asm"]["_pico_socket_open"].apply(null, arguments)
    };

    var _pico_socket_read = Module["_pico_socket_read"] = function() {
      return Module["asm"]["_pico_socket_read"].apply(null, arguments)
    };

    var _pico_socket_recvfrom = Module["_pico_socket_recvfrom"] = function() {
      return Module["asm"]["_pico_socket_recvfrom"].apply(null, arguments)
    };

    var _pico_socket_recvfrom_extended = Module["_pico_socket_recvfrom_extended"] = function() {
      return Module["asm"]["_pico_socket_recvfrom_extended"].apply(null, arguments)
    };

    var _pico_socket_send = Module["_pico_socket_send"] = function() {
      return Module["asm"]["_pico_socket_send"].apply(null, arguments)
    };

    var _pico_socket_sendto = Module["_pico_socket_sendto"] = function() {
      return Module["asm"]["_pico_socket_sendto"].apply(null, arguments)
    };

    var _pico_socket_sendto_dest_check = Module["_pico_socket_sendto_dest_check"] = function() {
      return Module["asm"]["_pico_socket_sendto_dest_check"].apply(null, arguments)
    };

    var _pico_socket_sendto_destination = Module["_pico_socket_sendto_destination"] = function() {
      return Module["asm"]["_pico_socket_sendto_destination"].apply(null, arguments)
    };

    var _pico_socket_sendto_destination_ipv4 = Module["_pico_socket_sendto_destination_ipv4"] = function() {
      return Module["asm"]["_pico_socket_sendto_destination_ipv4"].apply(null, arguments)
    };

    var _pico_socket_sendto_destination_ipv6 = Module["_pico_socket_sendto_destination_ipv6"] = function() {
      return Module["asm"]["_pico_socket_sendto_destination_ipv6"].apply(null, arguments)
    };

    var _pico_socket_sendto_extended = Module["_pico_socket_sendto_extended"] = function() {
      return Module["asm"]["_pico_socket_sendto_extended"].apply(null, arguments)
    };

    var _pico_socket_sendto_get_ip4_src = Module["_pico_socket_sendto_get_ip4_src"] = function() {
      return Module["asm"]["_pico_socket_sendto_get_ip4_src"].apply(null, arguments)
    };

    var _pico_socket_sendto_get_ip6_src = Module["_pico_socket_sendto_get_ip6_src"] = function() {
      return Module["asm"]["_pico_socket_sendto_get_ip6_src"].apply(null, arguments)
    };

    var _pico_socket_sendto_get_src = Module["_pico_socket_sendto_get_src"] = function() {
      return Module["asm"]["_pico_socket_sendto_get_src"].apply(null, arguments)
    };

    var _pico_socket_sendto_initial_checks = Module["_pico_socket_sendto_initial_checks"] = function() {
      return Module["asm"]["_pico_socket_sendto_initial_checks"].apply(null, arguments)
    };

    var _pico_socket_sendto_set_dport = Module["_pico_socket_sendto_set_dport"] = function() {
      return Module["asm"]["_pico_socket_sendto_set_dport"].apply(null, arguments)
    };

    var _pico_socket_sendto_set_localport = Module["_pico_socket_sendto_set_localport"] = function() {
      return Module["asm"]["_pico_socket_sendto_set_localport"].apply(null, arguments)
    };

    var _pico_socket_sendto_transport_offset = Module["_pico_socket_sendto_transport_offset"] = function() {
      return Module["asm"]["_pico_socket_sendto_transport_offset"].apply(null, arguments)
    };

    var _pico_socket_set_family = Module["_pico_socket_set_family"] = function() {
      return Module["asm"]["_pico_socket_set_family"].apply(null, arguments)
    };

    var _pico_socket_set_info = Module["_pico_socket_set_info"] = function() {
      return Module["asm"]["_pico_socket_set_info"].apply(null, arguments)
    };

    var _pico_socket_shutdown = Module["_pico_socket_shutdown"] = function() {
      return Module["asm"]["_pico_socket_shutdown"].apply(null, arguments)
    };

    var _pico_socket_tcp_cleanup = Module["_pico_socket_tcp_cleanup"] = function() {
      return Module["asm"]["_pico_socket_tcp_cleanup"].apply(null, arguments)
    };

    var _pico_socket_tcp_delete = Module["_pico_socket_tcp_delete"] = function() {
      return Module["asm"]["_pico_socket_tcp_delete"].apply(null, arguments)
    };

    var _pico_socket_tcp_deliver = Module["_pico_socket_tcp_deliver"] = function() {
      return Module["asm"]["_pico_socket_tcp_deliver"].apply(null, arguments)
    };

    var _pico_socket_tcp_open = Module["_pico_socket_tcp_open"] = function() {
      return Module["asm"]["_pico_socket_tcp_open"].apply(null, arguments)
    };

    var _pico_socket_tcp_read = Module["_pico_socket_tcp_read"] = function() {
      return Module["asm"]["_pico_socket_tcp_read"].apply(null, arguments)
    };

    var _pico_socket_transport_deliver = Module["_pico_socket_transport_deliver"] = function() {
      return Module["asm"]["_pico_socket_transport_deliver"].apply(null, arguments)
    };

    var _pico_socket_transport_open = Module["_pico_socket_transport_open"] = function() {
      return Module["asm"]["_pico_socket_transport_open"].apply(null, arguments)
    };

    var _pico_socket_transport_read = Module["_pico_socket_transport_read"] = function() {
      return Module["asm"]["_pico_socket_transport_read"].apply(null, arguments)
    };

    var _pico_socket_udp_deliver = Module["_pico_socket_udp_deliver"] = function() {
      return Module["asm"]["_pico_socket_udp_deliver"].apply(null, arguments)
    };

    var _pico_socket_udp_deliver_ipv4 = Module["_pico_socket_udp_deliver_ipv4"] = function() {
      return Module["asm"]["_pico_socket_udp_deliver_ipv4"].apply(null, arguments)
    };

    var _pico_socket_udp_deliver_ipv4_mcast = Module["_pico_socket_udp_deliver_ipv4_mcast"] = function() {
      return Module["asm"]["_pico_socket_udp_deliver_ipv4_mcast"].apply(null, arguments)
    };

    var _pico_socket_udp_deliver_ipv4_mcast_initial_checks = Module["_pico_socket_udp_deliver_ipv4_mcast_initial_checks"] = function() {
      return Module["asm"]["_pico_socket_udp_deliver_ipv4_mcast_initial_checks"].apply(null, arguments)
    };

    var _pico_socket_udp_deliver_ipv4_unicast = Module["_pico_socket_udp_deliver_ipv4_unicast"] = function() {
      return Module["asm"]["_pico_socket_udp_deliver_ipv4_unicast"].apply(null, arguments)
    };

    var _pico_socket_udp_deliver_ipv6 = Module["_pico_socket_udp_deliver_ipv6"] = function() {
      return Module["asm"]["_pico_socket_udp_deliver_ipv6"].apply(null, arguments)
    };

    var _pico_socket_udp_deliver_ipv6_mcast = Module["_pico_socket_udp_deliver_ipv6_mcast"] = function() {
      return Module["asm"]["_pico_socket_udp_deliver_ipv6_mcast"].apply(null, arguments)
    };

    var _pico_socket_udp_open = Module["_pico_socket_udp_open"] = function() {
      return Module["asm"]["_pico_socket_udp_open"].apply(null, arguments)
    };

    var _pico_socket_update_tcp_state = Module["_pico_socket_update_tcp_state"] = function() {
      return Module["asm"]["_pico_socket_update_tcp_state"].apply(null, arguments)
    };

    var _pico_socket_write = Module["_pico_socket_write"] = function() {
      return Module["asm"]["_pico_socket_write"].apply(null, arguments)
    };

    var _pico_socket_write_attempt = Module["_pico_socket_write_attempt"] = function() {
      return Module["asm"]["_pico_socket_write_attempt"].apply(null, arguments)
    };

    var _pico_socket_write_check_state = Module["_pico_socket_write_check_state"] = function() {
      return Module["asm"]["_pico_socket_write_check_state"].apply(null, arguments)
    };

    var _pico_socket_xmit = Module["_pico_socket_xmit"] = function() {
      return Module["asm"]["_pico_socket_xmit"].apply(null, arguments)
    };

    var _pico_socket_xmit_avail_space = Module["_pico_socket_xmit_avail_space"] = function() {
      return Module["asm"]["_pico_socket_xmit_avail_space"].apply(null, arguments)
    };

    var _pico_socket_xmit_first_fragment_setup = Module["_pico_socket_xmit_first_fragment_setup"] = function() {
      return Module["asm"]["_pico_socket_xmit_first_fragment_setup"].apply(null, arguments)
    };

    var _pico_socket_xmit_fragments = Module["_pico_socket_xmit_fragments"] = function() {
      return Module["asm"]["_pico_socket_xmit_fragments"].apply(null, arguments)
    };

    var _pico_socket_xmit_next_fragment_setup = Module["_pico_socket_xmit_next_fragment_setup"] = function() {
      return Module["asm"]["_pico_socket_xmit_next_fragment_setup"].apply(null, arguments)
    };

    var _pico_socket_xmit_one = Module["_pico_socket_xmit_one"] = function() {
      return Module["asm"]["_pico_socket_xmit_one"].apply(null, arguments)
    };

    var _pico_sockets_loop = Module["_pico_sockets_loop"] = function() {
      return Module["asm"]["_pico_sockets_loop"].apply(null, arguments)
    };

    var _pico_sockets_loop_tcp = Module["_pico_sockets_loop_tcp"] = function() {
      return Module["asm"]["_pico_sockets_loop_tcp"].apply(null, arguments)
    };

    var _pico_sockets_loop_udp = Module["_pico_sockets_loop_udp"] = function() {
      return Module["asm"]["_pico_sockets_loop_udp"].apply(null, arguments)
    };

    var _pico_source_is_local = Module["_pico_source_is_local"] = function() {
      return Module["asm"]["_pico_source_is_local"].apply(null, arguments)
    };

    var _pico_stack_init = Module["_pico_stack_init"] = function() {
      return Module["asm"]["_pico_stack_init"].apply(null, arguments)
    };

    var _pico_stack_recv = Module["_pico_stack_recv"] = function() {
      return Module["asm"]["_pico_stack_recv"].apply(null, arguments)
    };

    var _pico_stack_recv_new_frame = Module["_pico_stack_recv_new_frame"] = function() {
      return Module["asm"]["_pico_stack_recv_new_frame"].apply(null, arguments)
    };

    var _pico_stack_recv_zerocopy = Module["_pico_stack_recv_zerocopy"] = function() {
      return Module["asm"]["_pico_stack_recv_zerocopy"].apply(null, arguments)
    };

    var _pico_stack_tick = Module["_pico_stack_tick"] = function() {
      return Module["asm"]["_pico_stack_tick"].apply(null, arguments)
    };

    var _pico_store_network_origin = Module["_pico_store_network_origin"] = function() {
      return Module["asm"]["_pico_store_network_origin"].apply(null, arguments)
    };

    var _pico_string_check_null_args = Module["_pico_string_check_null_args"] = function() {
      return Module["asm"]["_pico_string_check_null_args"].apply(null, arguments)
    };

    var _pico_string_to_ipv4 = Module["_pico_string_to_ipv4"] = function() {
      return Module["asm"]["_pico_string_to_ipv4"].apply(null, arguments)
    };

    var _pico_string_to_ipv6 = Module["_pico_string_to_ipv6"] = function() {
      return Module["asm"]["_pico_string_to_ipv6"].apply(null, arguments)
    };

    var _pico_tcp_check_listen_close = Module["_pico_tcp_check_listen_close"] = function() {
      return Module["asm"]["_pico_tcp_check_listen_close"].apply(null, arguments)
    };

    var _pico_tcp_checksum = Module["_pico_tcp_checksum"] = function() {
      return Module["asm"]["_pico_tcp_checksum"].apply(null, arguments)
    };

    var _pico_tcp_checksum_ipv4 = Module["_pico_tcp_checksum_ipv4"] = function() {
      return Module["asm"]["_pico_tcp_checksum_ipv4"].apply(null, arguments)
    };

    var _pico_tcp_checksum_ipv6 = Module["_pico_tcp_checksum_ipv6"] = function() {
      return Module["asm"]["_pico_tcp_checksum_ipv6"].apply(null, arguments)
    };

    var _pico_tcp_cleanup_queues = Module["_pico_tcp_cleanup_queues"] = function() {
      return Module["asm"]["_pico_tcp_cleanup_queues"].apply(null, arguments)
    };

    var _pico_tcp_flags_update = Module["_pico_tcp_flags_update"] = function() {
      return Module["asm"]["_pico_tcp_flags_update"].apply(null, arguments)
    };

    var _pico_tcp_get_socket_mss = Module["_pico_tcp_get_socket_mss"] = function() {
      return Module["asm"]["_pico_tcp_get_socket_mss"].apply(null, arguments)
    };

    var _pico_tcp_initconn = Module["_pico_tcp_initconn"] = function() {
      return Module["asm"]["_pico_tcp_initconn"].apply(null, arguments)
    };

    var _pico_tcp_input = Module["_pico_tcp_input"] = function() {
      return Module["asm"]["_pico_tcp_input"].apply(null, arguments)
    };

    var _pico_tcp_keepalive = Module["_pico_tcp_keepalive"] = function() {
      return Module["asm"]["_pico_tcp_keepalive"].apply(null, arguments)
    };

    var _pico_tcp_notify_closing = Module["_pico_tcp_notify_closing"] = function() {
      return Module["asm"]["_pico_tcp_notify_closing"].apply(null, arguments)
    };

    var _pico_tcp_open = Module["_pico_tcp_open"] = function() {
      return Module["asm"]["_pico_tcp_open"].apply(null, arguments)
    };

    var _pico_tcp_output = Module["_pico_tcp_output"] = function() {
      return Module["asm"]["_pico_tcp_output"].apply(null, arguments)
    };

    var _pico_tcp_overhead = Module["_pico_tcp_overhead"] = function() {
      return Module["asm"]["_pico_tcp_overhead"].apply(null, arguments)
    };

    var _pico_tcp_process_out = Module["_pico_tcp_process_out"] = function() {
      return Module["asm"]["_pico_tcp_process_out"].apply(null, arguments)
    };

    var _pico_tcp_push = Module["_pico_tcp_push"] = function() {
      return Module["asm"]["_pico_tcp_push"].apply(null, arguments)
    };

    var _pico_tcp_push_nagle_enqueue = Module["_pico_tcp_push_nagle_enqueue"] = function() {
      return Module["asm"]["_pico_tcp_push_nagle_enqueue"].apply(null, arguments)
    };

    var _pico_tcp_push_nagle_hold = Module["_pico_tcp_push_nagle_hold"] = function() {
      return Module["asm"]["_pico_tcp_push_nagle_hold"].apply(null, arguments)
    };

    var _pico_tcp_push_nagle_on = Module["_pico_tcp_push_nagle_on"] = function() {
      return Module["asm"]["_pico_tcp_push_nagle_on"].apply(null, arguments)
    };

    var _pico_tcp_queue_in_is_empty = Module["_pico_tcp_queue_in_is_empty"] = function() {
      return Module["asm"]["_pico_tcp_queue_in_is_empty"].apply(null, arguments)
    };

    var _pico_tcp_read = Module["_pico_tcp_read"] = function() {
      return Module["asm"]["_pico_tcp_read"].apply(null, arguments)
    };

    var _pico_tcp_reply_rst = Module["_pico_tcp_reply_rst"] = function() {
      return Module["asm"]["_pico_tcp_reply_rst"].apply(null, arguments)
    };

    var _pico_timer_add = Module["_pico_timer_add"] = function() {
      return Module["asm"]["_pico_timer_add"].apply(null, arguments)
    };

    var _pico_timer_cancel = Module["_pico_timer_cancel"] = function() {
      return Module["asm"]["_pico_timer_cancel"].apply(null, arguments)
    };

    var _pico_timer_create = Module["_pico_timer_create"] = function() {
      return Module["asm"]["_pico_timer_create"].apply(null, arguments)
    };

    var _pico_timer_ref_add = Module["_pico_timer_ref_add"] = function() {
      return Module["asm"]["_pico_timer_ref_add"].apply(null, arguments)
    };

    var _pico_transport_crc_check = Module["_pico_transport_crc_check"] = function() {
      return Module["asm"]["_pico_transport_crc_check"].apply(null, arguments)
    };

    var _pico_transport_error = Module["_pico_transport_error"] = function() {
      return Module["asm"]["_pico_transport_error"].apply(null, arguments)
    };

    var _pico_transport_error_set_picoerr = Module["_pico_transport_error_set_picoerr"] = function() {
      return Module["asm"]["_pico_transport_error_set_picoerr"].apply(null, arguments)
    };

    var _pico_transport_process_in = Module["_pico_transport_process_in"] = function() {
      return Module["asm"]["_pico_transport_process_in"].apply(null, arguments)
    };

    var _pico_transport_receive = Module["_pico_transport_receive"] = function() {
      return Module["asm"]["_pico_transport_receive"].apply(null, arguments)
    };

    var _pico_tree_delete = Module["_pico_tree_delete"] = function() {
      return Module["asm"]["_pico_tree_delete"].apply(null, arguments)
    };

    var _pico_tree_delete_check_switch = Module["_pico_tree_delete_check_switch"] = function() {
      return Module["asm"]["_pico_tree_delete_check_switch"].apply(null, arguments)
    };

    var _pico_tree_delete_implementation = Module["_pico_tree_delete_implementation"] = function() {
      return Module["asm"]["_pico_tree_delete_implementation"].apply(null, arguments)
    };

    var _pico_tree_delete_node = Module["_pico_tree_delete_node"] = function() {
      return Module["asm"]["_pico_tree_delete_node"].apply(null, arguments)
    };

    var _pico_tree_empty = Module["_pico_tree_empty"] = function() {
      return Module["asm"]["_pico_tree_empty"].apply(null, arguments)
    };

    var _pico_tree_findKey = Module["_pico_tree_findKey"] = function() {
      return Module["asm"]["_pico_tree_findKey"].apply(null, arguments)
    };

    var _pico_tree_findNode = Module["_pico_tree_findNode"] = function() {
      return Module["asm"]["_pico_tree_findNode"].apply(null, arguments)
    };

    var _pico_tree_first = Module["_pico_tree_first"] = function() {
      return Module["asm"]["_pico_tree_first"].apply(null, arguments)
    };

    var _pico_tree_firstNode = Module["_pico_tree_firstNode"] = function() {
      return Module["asm"]["_pico_tree_firstNode"].apply(null, arguments)
    };

    var _pico_tree_insert = Module["_pico_tree_insert"] = function() {
      return Module["asm"]["_pico_tree_insert"].apply(null, arguments)
    };

    var _pico_tree_insert_implementation = Module["_pico_tree_insert_implementation"] = function() {
      return Module["asm"]["_pico_tree_insert_implementation"].apply(null, arguments)
    };

    var _pico_tree_insert_node = Module["_pico_tree_insert_node"] = function() {
      return Module["asm"]["_pico_tree_insert_node"].apply(null, arguments)
    };

    var _pico_tree_lastNode = Module["_pico_tree_lastNode"] = function() {
      return Module["asm"]["_pico_tree_lastNode"].apply(null, arguments)
    };

    var _pico_tree_next = Module["_pico_tree_next"] = function() {
      return Module["asm"]["_pico_tree_next"].apply(null, arguments)
    };

    var _pico_tree_prev = Module["_pico_tree_prev"] = function() {
      return Module["asm"]["_pico_tree_prev"].apply(null, arguments)
    };

    var _pico_udp_checksum_ipv4 = Module["_pico_udp_checksum_ipv4"] = function() {
      return Module["asm"]["_pico_udp_checksum_ipv4"].apply(null, arguments)
    };

    var _pico_udp_checksum_ipv6 = Module["_pico_udp_checksum_ipv6"] = function() {
      return Module["asm"]["_pico_udp_checksum_ipv6"].apply(null, arguments)
    };

    var _pico_udp_get_mc_ttl = Module["_pico_udp_get_mc_ttl"] = function() {
      return Module["asm"]["_pico_udp_get_mc_ttl"].apply(null, arguments)
    };

    var _pico_udp_get_msginfo = Module["_pico_udp_get_msginfo"] = function() {
      return Module["asm"]["_pico_udp_get_msginfo"].apply(null, arguments)
    };

    var _pico_udp_open = Module["_pico_udp_open"] = function() {
      return Module["asm"]["_pico_udp_open"].apply(null, arguments)
    };

    var _pico_udp_process_out = Module["_pico_udp_process_out"] = function() {
      return Module["asm"]["_pico_udp_process_out"].apply(null, arguments)
    };

    var _pico_udp_push = Module["_pico_udp_push"] = function() {
      return Module["asm"]["_pico_udp_push"].apply(null, arguments)
    };

    var _pico_udp_recv = Module["_pico_udp_recv"] = function() {
      return Module["asm"]["_pico_udp_recv"].apply(null, arguments)
    };

    var _pico_xmit_frame_set_nofrag = Module["_pico_xmit_frame_set_nofrag"] = function() {
      return Module["asm"]["_pico_xmit_frame_set_nofrag"].apply(null, arguments)
    };

    var _ping_recv_reply = Module["_ping_recv_reply"] = function() {
      return Module["asm"]["_ping_recv_reply"].apply(null, arguments)
    };

    var _ping_timeout = Module["_ping_timeout"] = function() {
      return Module["asm"]["_ping_timeout"].apply(null, arguments)
    };

    var _pop_arg = Module["_pop_arg"] = function() {
      return Module["asm"]["_pop_arg"].apply(null, arguments)
    };

    var _pop_arg_long_double = Module["_pop_arg_long_double"] = function() {
      return Module["asm"]["_pop_arg_long_double"].apply(null, arguments)
    };

    var _printf = Module["_printf"] = function() {
      return Module["asm"]["_printf"].apply(null, arguments)
    };

    var _printf_core = Module["_printf_core"] = function() {
      return Module["asm"]["_printf_core"].apply(null, arguments)
    };

    var _proto_layer_rr_reset = Module["_proto_layer_rr_reset"] = function() {
      return Module["asm"]["_proto_layer_rr_reset"].apply(null, arguments)
    };

    var _proto_loop = Module["_proto_loop"] = function() {
      return Module["asm"]["_proto_loop"].apply(null, arguments)
    };

    var _proto_loop_in = Module["_proto_loop_in"] = function() {
      return Module["asm"]["_proto_loop_in"].apply(null, arguments)
    };

    var _proto_loop_out = Module["_proto_loop_out"] = function() {
      return Module["asm"]["_proto_loop_out"].apply(null, arguments)
    };

    var _pthread_self = Module["_pthread_self"] = function() {
      return Module["asm"]["_pthread_self"].apply(null, arguments)
    };

    var _puts = Module["_puts"] = function() {
      return Module["asm"]["_puts"].apply(null, arguments)
    };

    var _radv_process = Module["_radv_process"] = function() {
      return Module["asm"]["_radv_process"].apply(null, arguments)
    };

    var _rebind = Module["_rebind"] = function() {
      return Module["asm"]["_rebind"].apply(null, arguments)
    };

    var _recv_ack = Module["_recv_ack"] = function() {
      return Module["asm"]["_recv_ack"].apply(null, arguments)
    };

    var _recv_offer = Module["_recv_offer"] = function() {
      return Module["asm"]["_recv_offer"].apply(null, arguments)
    };

    var _release_all_until = Module["_release_all_until"] = function() {
      return Module["asm"]["_release_all_until"].apply(null, arguments)
    };

    var _release_until = Module["_release_until"] = function() {
      return Module["asm"]["_release_until"].apply(null, arguments)
    };

    var _renew = Module["_renew"] = function() {
      return Module["asm"]["_renew"].apply(null, arguments)
    };

    var _reset = Module["_reset"] = function() {
      return Module["asm"]["_reset"].apply(null, arguments)
    };

    var _retransmit = Module["_retransmit"] = function() {
      return Module["asm"]["_retransmit"].apply(null, arguments)
    };

    var _rotateToLeft = Module["_rotateToLeft"] = function() {
      return Module["asm"]["_rotateToLeft"].apply(null, arguments)
    };

    var _rotateToRight = Module["_rotateToRight"] = function() {
      return Module["asm"]["_rotateToRight"].apply(null, arguments)
    };

    var _roundrobin_end = Module["_roundrobin_end"] = function() {
      return Module["asm"]["_roundrobin_end"].apply(null, arguments)
    };

    var _roundrobin_init = Module["_roundrobin_init"] = function() {
      return Module["asm"]["_roundrobin_init"].apply(null, arguments)
    };

    var _route_find = Module["_route_find"] = function() {
      return Module["asm"]["_route_find"].apply(null, arguments)
    };

    var _router_adv_validity_checks = Module["_router_adv_validity_checks"] = function() {
      return Module["asm"]["_router_adv_validity_checks"].apply(null, arguments)
    };

    var _rtimrtct = Module["_rtimrtct"] = function() {
      return Module["asm"]["_rtimrtct"].apply(null, arguments)
    };

    var _rto_set = Module["_rto_set"] = function() {
      return Module["asm"]["_rto_set"].apply(null, arguments)
    };

    var _sbrk = Module["_sbrk"] = function() {
      return Module["asm"]["_sbrk"].apply(null, arguments)
    };

    var _segment_compare = Module["_segment_compare"] = function() {
      return Module["asm"]["_segment_compare"].apply(null, arguments)
    };

    var _segment_from_frame = Module["_segment_from_frame"] = function() {
      return Module["asm"]["_segment_from_frame"].apply(null, arguments)
    };

    var _send_ping = Module["_send_ping"] = function() {
      return Module["asm"]["_send_ping"].apply(null, arguments)
    };

    var _short_be = Module["_short_be"] = function() {
      return Module["asm"]["_short_be"].apply(null, arguments)
    };

    var _short_be_1 = Module["_short_be_1"] = function() {
      return Module["asm"]["_short_be_1"].apply(null, arguments)
    };

    var _short_be_112 = Module["_short_be_112"] = function() {
      return Module["asm"]["_short_be_112"].apply(null, arguments)
    };

    var _short_be_140 = Module["_short_be_140"] = function() {
      return Module["asm"]["_short_be_140"].apply(null, arguments)
    };

    var _short_be_143 = Module["_short_be_143"] = function() {
      return Module["asm"]["_short_be_143"].apply(null, arguments)
    };

    var _short_be_150 = Module["_short_be_150"] = function() {
      return Module["asm"]["_short_be_150"].apply(null, arguments)
    };

    var _short_be_156 = Module["_short_be_156"] = function() {
      return Module["asm"]["_short_be_156"].apply(null, arguments)
    };

    var _short_be_178 = Module["_short_be_178"] = function() {
      return Module["asm"]["_short_be_178"].apply(null, arguments)
    };

    var _short_be_209 = Module["_short_be_209"] = function() {
      return Module["asm"]["_short_be_209"].apply(null, arguments)
    };

    var _short_be_309 = Module["_short_be_309"] = function() {
      return Module["asm"]["_short_be_309"].apply(null, arguments)
    };

    var _short_be_33 = Module["_short_be_33"] = function() {
      return Module["asm"]["_short_be_33"].apply(null, arguments)
    };

    var _short_be_336 = Module["_short_be_336"] = function() {
      return Module["asm"]["_short_be_336"].apply(null, arguments)
    };

    var _short_be_36 = Module["_short_be_36"] = function() {
      return Module["asm"]["_short_be_36"].apply(null, arguments)
    };

    var _short_be_367 = Module["_short_be_367"] = function() {
      return Module["asm"]["_short_be_367"].apply(null, arguments)
    };

    var _short_be_373 = Module["_short_be_373"] = function() {
      return Module["asm"]["_short_be_373"].apply(null, arguments)
    };

    var _short_be_38 = Module["_short_be_38"] = function() {
      return Module["asm"]["_short_be_38"].apply(null, arguments)
    };

    var _short_be_59 = Module["_short_be_59"] = function() {
      return Module["asm"]["_short_be_59"].apply(null, arguments)
    };

    var _short_be_65 = Module["_short_be_65"] = function() {
      return Module["asm"]["_short_be_65"].apply(null, arguments)
    };

    var _short_be_74 = Module["_short_be_74"] = function() {
      return Module["asm"]["_short_be_74"].apply(null, arguments)
    };

    var _short_from = Module["_short_from"] = function() {
      return Module["asm"]["_short_from"].apply(null, arguments)
    };

    var _short_from_153 = Module["_short_from_153"] = function() {
      return Module["asm"]["_short_from_153"].apply(null, arguments)
    };

    var _slifs = Module["_slifs"] = function() {
      return Module["asm"]["_slifs"].apply(null, arguments)
    };

    var _socket_clean_queues = Module["_socket_clean_queues"] = function() {
      return Module["asm"]["_socket_clean_queues"].apply(null, arguments)
    };

    var _socket_cmp = Module["_socket_cmp"] = function() {
      return Module["asm"]["_socket_cmp"].apply(null, arguments)
    };

    var _socket_cmp_addresses = Module["_socket_cmp_addresses"] = function() {
      return Module["asm"]["_socket_cmp_addresses"].apply(null, arguments)
    };

    var _socket_cmp_family = Module["_socket_cmp_family"] = function() {
      return Module["asm"]["_socket_cmp_family"].apply(null, arguments)
    };

    var _socket_cmp_ipv4 = Module["_socket_cmp_ipv4"] = function() {
      return Module["asm"]["_socket_cmp_ipv4"].apply(null, arguments)
    };

    var _socket_cmp_ipv6 = Module["_socket_cmp_ipv6"] = function() {
      return Module["asm"]["_socket_cmp_ipv6"].apply(null, arguments)
    };

    var _socket_cmp_remotehost = Module["_socket_cmp_remotehost"] = function() {
      return Module["asm"]["_socket_cmp_remotehost"].apply(null, arguments)
    };

    var _socket_garbage_collect = Module["_socket_garbage_collect"] = function() {
      return Module["asm"]["_socket_garbage_collect"].apply(null, arguments)
    };

    var _socket_tcp_deliver_ipv4 = Module["_socket_tcp_deliver_ipv4"] = function() {
      return Module["asm"]["_socket_tcp_deliver_ipv4"].apply(null, arguments)
    };

    var _socket_tcp_deliver_ipv6 = Module["_socket_tcp_deliver_ipv6"] = function() {
      return Module["asm"]["_socket_tcp_deliver_ipv6"].apply(null, arguments)
    };

    var _socket_tcp_do_deliver = Module["_socket_tcp_do_deliver"] = function() {
      return Module["asm"]["_socket_tcp_do_deliver"].apply(null, arguments)
    };

    var _sockport_cmp = Module["_sockport_cmp"] = function() {
      return Module["asm"]["_sockport_cmp"].apply(null, arguments)
    };

    var _srsf = Module["_srsf"] = function() {
      return Module["asm"]["_srsf"].apply(null, arguments)
    };

    var _srsfst = Module["_srsfst"] = function() {
      return Module["asm"]["_srsfst"].apply(null, arguments)
    };

    var _srst = Module["_srst"] = function() {
      return Module["asm"]["_srst"].apply(null, arguments)
    };

    var _st = Module["_st"] = function() {
      return Module["asm"]["_st"].apply(null, arguments)
    };

    var _stcl = Module["_stcl"] = function() {
      return Module["asm"]["_stcl"].apply(null, arguments)
    };

    var _strcasecmp = Module["_strcasecmp"] = function() {
      return Module["asm"]["_strcasecmp"].apply(null, arguments)
    };

    var _strcmp = Module["_strcmp"] = function() {
      return Module["asm"]["_strcmp"].apply(null, arguments)
    };

    var _strlen = Module["_strlen"] = function() {
      return Module["asm"]["_strlen"].apply(null, arguments)
    };

    var _strncpy = Module["_strncpy"] = function() {
      return Module["asm"]["_strncpy"].apply(null, arguments)
    };

    var _stslifs = Module["_stslifs"] = function() {
      return Module["asm"]["_stslifs"].apply(null, arguments)
    };

    var _switchNodes = Module["_switchNodes"] = function() {
      return Module["asm"]["_switchNodes"].apply(null, arguments)
    };

    var _tcp_ack = Module["_tcp_ack"] = function() {
      return Module["asm"]["_tcp_ack"].apply(null, arguments)
    };

    var _tcp_ack_advance_una = Module["_tcp_ack_advance_una"] = function() {
      return Module["asm"]["_tcp_ack_advance_una"].apply(null, arguments)
    };

    var _tcp_action_by_flags = Module["_tcp_action_by_flags"] = function() {
      return Module["asm"]["_tcp_action_by_flags"].apply(null, arguments)
    };

    var _tcp_action_call = Module["_tcp_action_call"] = function() {
      return Module["asm"]["_tcp_action_call"].apply(null, arguments)
    };

    var _tcp_add_header = Module["_tcp_add_header"] = function() {
      return Module["asm"]["_tcp_add_header"].apply(null, arguments)
    };

    var _tcp_add_options = Module["_tcp_add_options"] = function() {
      return Module["asm"]["_tcp_add_options"].apply(null, arguments)
    };

    var _tcp_add_options_frame = Module["_tcp_add_options_frame"] = function() {
      return Module["asm"]["_tcp_add_options_frame"].apply(null, arguments)
    };

    var _tcp_add_sack_option = Module["_tcp_add_sack_option"] = function() {
      return Module["asm"]["_tcp_add_sack_option"].apply(null, arguments)
    };

    var _tcp_attempt_closewait = Module["_tcp_attempt_closewait"] = function() {
      return Module["asm"]["_tcp_attempt_closewait"].apply(null, arguments)
    };

    var _tcp_closeconn = Module["_tcp_closeconn"] = function() {
      return Module["asm"]["_tcp_closeconn"].apply(null, arguments)
    };

    var _tcp_closewait = Module["_tcp_closewait"] = function() {
      return Module["asm"]["_tcp_closewait"].apply(null, arguments)
    };

    var _tcp_closing_ack = Module["_tcp_closing_ack"] = function() {
      return Module["asm"]["_tcp_closing_ack"].apply(null, arguments)
    };

    var _tcp_congestion_control = Module["_tcp_congestion_control"] = function() {
      return Module["asm"]["_tcp_congestion_control"].apply(null, arguments)
    };

    var _tcp_data_in = Module["_tcp_data_in"] = function() {
      return Module["asm"]["_tcp_data_in"].apply(null, arguments)
    };

    var _tcp_data_in_expected = Module["_tcp_data_in_expected"] = function() {
      return Module["asm"]["_tcp_data_in_expected"].apply(null, arguments)
    };

    var _tcp_data_in_high_segment = Module["_tcp_data_in_high_segment"] = function() {
      return Module["asm"]["_tcp_data_in_high_segment"].apply(null, arguments)
    };

    var _tcp_data_in_send_ack = Module["_tcp_data_in_send_ack"] = function() {
      return Module["asm"]["_tcp_data_in_send_ack"].apply(null, arguments)
    };

    var _tcp_deltcb = Module["_tcp_deltcb"] = function() {
      return Module["asm"]["_tcp_deltcb"].apply(null, arguments)
    };

    var _tcp_discard_all_segments = Module["_tcp_discard_all_segments"] = function() {
      return Module["asm"]["_tcp_discard_all_segments"].apply(null, arguments)
    };

    var _tcp_do_send_rst = Module["_tcp_do_send_rst"] = function() {
      return Module["asm"]["_tcp_do_send_rst"].apply(null, arguments)
    };

    var _tcp_fill_rst_header = Module["_tcp_fill_rst_header"] = function() {
      return Module["asm"]["_tcp_fill_rst_header"].apply(null, arguments)
    };

    var _tcp_fill_rst_payload = Module["_tcp_fill_rst_payload"] = function() {
      return Module["asm"]["_tcp_fill_rst_payload"].apply(null, arguments)
    };

    var _tcp_finack = Module["_tcp_finack"] = function() {
      return Module["asm"]["_tcp_finack"].apply(null, arguments)
    };

    var _tcp_finwaitack = Module["_tcp_finwaitack"] = function() {
      return Module["asm"]["_tcp_finwaitack"].apply(null, arguments)
    };

    var _tcp_finwaitfin = Module["_tcp_finwaitfin"] = function() {
      return Module["asm"]["_tcp_finwaitfin"].apply(null, arguments)
    };

    var _tcp_first_ack = Module["_tcp_first_ack"] = function() {
      return Module["asm"]["_tcp_first_ack"].apply(null, arguments)
    };

    var _tcp_first_timeout = Module["_tcp_first_timeout"] = function() {
      return Module["asm"]["_tcp_first_timeout"].apply(null, arguments)
    };

    var _tcp_force_closed = Module["_tcp_force_closed"] = function() {
      return Module["asm"]["_tcp_force_closed"].apply(null, arguments)
    };

    var _tcp_halfopencon = Module["_tcp_halfopencon"] = function() {
      return Module["asm"]["_tcp_halfopencon"].apply(null, arguments)
    };

    var _tcp_is_allowed_to_send = Module["_tcp_is_allowed_to_send"] = function() {
      return Module["asm"]["_tcp_is_allowed_to_send"].apply(null, arguments)
    };

    var _tcp_lastackwait = Module["_tcp_lastackwait"] = function() {
      return Module["asm"]["_tcp_lastackwait"].apply(null, arguments)
    };

    var _tcp_linger = Module["_tcp_linger"] = function() {
      return Module["asm"]["_tcp_linger"].apply(null, arguments)
    };

    var _tcp_next_zerowindow_probe = Module["_tcp_next_zerowindow_probe"] = function() {
      return Module["asm"]["_tcp_next_zerowindow_probe"].apply(null, arguments)
    };

    var _tcp_nosync_rst = Module["_tcp_nosync_rst"] = function() {
      return Module["asm"]["_tcp_nosync_rst"].apply(null, arguments)
    };

    var _tcp_options_size = Module["_tcp_options_size"] = function() {
      return Module["asm"]["_tcp_options_size"].apply(null, arguments)
    };

    var _tcp_options_size_frame = Module["_tcp_options_size_frame"] = function() {
      return Module["asm"]["_tcp_options_size_frame"].apply(null, arguments)
    };

    var _tcp_parse_option_mss = Module["_tcp_parse_option_mss"] = function() {
      return Module["asm"]["_tcp_parse_option_mss"].apply(null, arguments)
    };

    var _tcp_parse_option_sack_ok = Module["_tcp_parse_option_sack_ok"] = function() {
      return Module["asm"]["_tcp_parse_option_sack_ok"].apply(null, arguments)
    };

    var _tcp_parse_option_timestamp = Module["_tcp_parse_option_timestamp"] = function() {
      return Module["asm"]["_tcp_parse_option_timestamp"].apply(null, arguments)
    };

    var _tcp_parse_option_ws = Module["_tcp_parse_option_ws"] = function() {
      return Module["asm"]["_tcp_parse_option_ws"].apply(null, arguments)
    };

    var _tcp_parse_options = Module["_tcp_parse_options"] = function() {
      return Module["asm"]["_tcp_parse_options"].apply(null, arguments)
    };

    var _tcp_process_sack = Module["_tcp_process_sack"] = function() {
      return Module["asm"]["_tcp_process_sack"].apply(null, arguments)
    };

    var _tcp_rcv_sack = Module["_tcp_rcv_sack"] = function() {
      return Module["asm"]["_tcp_rcv_sack"].apply(null, arguments)
    };

    var _tcp_rcvfin = Module["_tcp_rcvfin"] = function() {
      return Module["asm"]["_tcp_rcvfin"].apply(null, arguments)
    };

    var _tcp_read_check_segment_done = Module["_tcp_read_check_segment_done"] = function() {
      return Module["asm"]["_tcp_read_check_segment_done"].apply(null, arguments)
    };

    var _tcp_read_finish = Module["_tcp_read_finish"] = function() {
      return Module["asm"]["_tcp_read_finish"].apply(null, arguments)
    };

    var _tcp_read_in_frame_len = Module["_tcp_read_in_frame_len"] = function() {
      return Module["asm"]["_tcp_read_in_frame_len"].apply(null, arguments)
    };

    var _tcp_retrans = Module["_tcp_retrans"] = function() {
      return Module["asm"]["_tcp_retrans"].apply(null, arguments)
    };

    var _tcp_retrans_timeout = Module["_tcp_retrans_timeout"] = function() {
      return Module["asm"]["_tcp_retrans_timeout"].apply(null, arguments)
    };

    var _tcp_retrans_timeout_check_queue = Module["_tcp_retrans_timeout_check_queue"] = function() {
      return Module["asm"]["_tcp_retrans_timeout_check_queue"].apply(null, arguments)
    };

    var _tcp_rst = Module["_tcp_rst"] = function() {
      return Module["asm"]["_tcp_rst"].apply(null, arguments)
    };

    var _tcp_rto_xmit = Module["_tcp_rto_xmit"] = function() {
      return Module["asm"]["_tcp_rto_xmit"].apply(null, arguments)
    };

    var _tcp_rtt = Module["_tcp_rtt"] = function() {
      return Module["asm"]["_tcp_rtt"].apply(null, arguments)
    };

    var _tcp_sack_marker = Module["_tcp_sack_marker"] = function() {
      return Module["asm"]["_tcp_sack_marker"].apply(null, arguments)
    };

    var _tcp_sack_prepare = Module["_tcp_sack_prepare"] = function() {
      return Module["asm"]["_tcp_sack_prepare"].apply(null, arguments)
    };

    var _tcp_send = Module["_tcp_send"] = function() {
      return Module["asm"]["_tcp_send"].apply(null, arguments)
    };

    var _tcp_send_ack = Module["_tcp_send_ack"] = function() {
      return Module["asm"]["_tcp_send_ack"].apply(null, arguments)
    };

    var _tcp_send_add_tcpflags = Module["_tcp_send_add_tcpflags"] = function() {
      return Module["asm"]["_tcp_send_add_tcpflags"].apply(null, arguments)
    };

    var _tcp_send_empty = Module["_tcp_send_empty"] = function() {
      return Module["asm"]["_tcp_send_empty"].apply(null, arguments)
    };

    var _tcp_send_fin = Module["_tcp_send_fin"] = function() {
      return Module["asm"]["_tcp_send_fin"].apply(null, arguments)
    };

    var _tcp_send_probe = Module["_tcp_send_probe"] = function() {
      return Module["asm"]["_tcp_send_probe"].apply(null, arguments)
    };

    var _tcp_send_rst = Module["_tcp_send_rst"] = function() {
      return Module["asm"]["_tcp_send_rst"].apply(null, arguments)
    };

    var _tcp_send_synack = Module["_tcp_send_synack"] = function() {
      return Module["asm"]["_tcp_send_synack"].apply(null, arguments)
    };

    var _tcp_send_try_enqueue = Module["_tcp_send_try_enqueue"] = function() {
      return Module["asm"]["_tcp_send_try_enqueue"].apply(null, arguments)
    };

    var _tcp_set_init_point = Module["_tcp_set_init_point"] = function() {
      return Module["asm"]["_tcp_set_init_point"].apply(null, arguments)
    };

    var _tcp_set_space = Module["_tcp_set_space"] = function() {
      return Module["asm"]["_tcp_set_space"].apply(null, arguments)
    };

    var _tcp_set_space_check_winupdate = Module["_tcp_set_space_check_winupdate"] = function() {
      return Module["asm"]["_tcp_set_space_check_winupdate"].apply(null, arguments)
    };

    var _tcp_split_segment = Module["_tcp_split_segment"] = function() {
      return Module["asm"]["_tcp_split_segment"].apply(null, arguments)
    };

    var _tcp_syn = Module["_tcp_syn"] = function() {
      return Module["asm"]["_tcp_syn"].apply(null, arguments)
    };

    var _tcp_synack = Module["_tcp_synack"] = function() {
      return Module["asm"]["_tcp_synack"].apply(null, arguments)
    };

    var _tcp_synrecv_syn = Module["_tcp_synrecv_syn"] = function() {
      return Module["asm"]["_tcp_synrecv_syn"].apply(null, arguments)
    };

    var _tcp_wakeup_pending = Module["_tcp_wakeup_pending"] = function() {
      return Module["asm"]["_tcp_wakeup_pending"].apply(null, arguments)
    };

    var _tcpopt_len_check = Module["_tcpopt_len_check"] = function() {
      return Module["asm"]["_tcpopt_len_check"].apply(null, arguments)
    };

    var _time_diff = Module["_time_diff"] = function() {
      return Module["asm"]["_time_diff"].apply(null, arguments)
    };

    var _tolower = Module["_tolower"] = function() {
      return Module["asm"]["_tolower"].apply(null, arguments)
    };

    var _transport_flags_update = Module["_transport_flags_update"] = function() {
      return Module["asm"]["_transport_flags_update"].apply(null, arguments)
    };

    var _update_max_arp_reqs = Module["_update_max_arp_reqs"] = function() {
      return Module["asm"]["_update_max_arp_reqs"].apply(null, arguments)
    };

    var _vfprintf = Module["_vfprintf"] = function() {
      return Module["asm"]["_vfprintf"].apply(null, arguments)
    };

    var _wcrtomb = Module["_wcrtomb"] = function() {
      return Module["asm"]["_wcrtomb"].apply(null, arguments)
    };

    var _wctomb = Module["_wctomb"] = function() {
      return Module["asm"]["_wctomb"].apply(null, arguments)
    };

    var establishStackSpace = Module["establishStackSpace"] = function() {
      return Module["asm"]["establishStackSpace"].apply(null, arguments)
    };

    var stackAlloc = Module["stackAlloc"] = function() {
      return Module["asm"]["stackAlloc"].apply(null, arguments)
    };

    var stackRestore = Module["stackRestore"] = function() {
      return Module["asm"]["stackRestore"].apply(null, arguments)
    };

    var stackSave = Module["stackSave"] = function() {
      return Module["asm"]["stackSave"].apply(null, arguments)
    };

    var dynCall_ii = Module["dynCall_ii"] = function() {
      return Module["asm"]["dynCall_ii"].apply(null, arguments)
    };

    var dynCall_iidiiii = Module["dynCall_iidiiii"] = function() {
      return Module["asm"]["dynCall_iidiiii"].apply(null, arguments)
    };

    var dynCall_iii = Module["dynCall_iii"] = function() {
      return Module["asm"]["dynCall_iii"].apply(null, arguments)
    };

    var dynCall_iiii = Module["dynCall_iiii"] = function() {
      return Module["asm"]["dynCall_iiii"].apply(null, arguments)
    };

    var dynCall_jiji = Module["dynCall_jiji"] = function() {
      return Module["asm"]["dynCall_jiji"].apply(null, arguments)
    };

    var dynCall_vi = Module["dynCall_vi"] = function() {
      return Module["asm"]["dynCall_vi"].apply(null, arguments)
    };

    var dynCall_vii = Module["dynCall_vii"] = function() {
      return Module["asm"]["dynCall_vii"].apply(null, arguments)
    };

    var dynCall_viiii = Module["dynCall_viiii"] = function() {
      return Module["asm"]["dynCall_viiii"].apply(null, arguments)
    };

    var dynCall_vji = Module["dynCall_vji"] = function() {
      return Module["asm"]["dynCall_vji"].apply(null, arguments)
    };



    // === Auto-generated postamble setup entry stuff ===

    Module['asm'] = asm;



    Module["ccall"] = ccall;
    Module["cwrap"] = cwrap;















































    Module["addFunction"] = addFunction;
    Module["removeFunction"] = removeFunction;
























    var calledRun;

    // Modularize mode returns a function, which can be called to
    // create instances. The instances provide a then() method,
    // must like a Promise, that receives a callback. The callback
    // is called when the module is ready to run, with the module
    // as a parameter. (Like a Promise, it also returns the module
    // so you can use the output of .then(..)).
    Module['then'] = function(func) {
      // We may already be ready to run code at this time. if
      // so, just queue a call to the callback.
      if (calledRun) {
        func(Module);
      } else {
        // we are not ready to call then() yet. we must call it
        // at the same time we would call onRuntimeInitialized.
        var old = Module['onRuntimeInitialized'];
        Module['onRuntimeInitialized'] = function() {
          if (old) old();
          func(Module);
        };
      }
      return Module;
    };

    /**
     * @constructor
     * @this {ExitStatus}
     */
    function ExitStatus(status) {
      this.name = "ExitStatus";
      this.message = "Program terminated with exit(" + status + ")";
      this.status = status;
    }


    dependenciesFulfilled = function runCaller() {
      // If run has never been called, and we should call run (INVOKE_RUN is true, and Module.noInitialRun is not false)
      if (!calledRun) run();
      if (!calledRun) dependenciesFulfilled = runCaller; // try this again later, after new deps are fulfilled
    };

    function callMain(args) {

      var entryFunction = Module['_main'];


      args = args || [];

      var argc = args.length+1;
      var argv = stackAlloc((argc + 1) * 4);
      HEAP32[argv >> 2] = allocateUTF8OnStack(thisProgram);
      for (var i = 1; i < argc; i++) {
        HEAP32[(argv >> 2) + i] = allocateUTF8OnStack(args[i - 1]);
      }
      HEAP32[(argv >> 2) + argc] = 0;


      try {


        var ret = entryFunction(argc, argv);


        // if we're not running an evented main loop, it's time to exit
          exit(ret, /* implicit = */ true);
      }
      catch(e) {
        if (e instanceof ExitStatus) {
          // exit() throws this once it's done to make sure execution
          // has been stopped completely
          return;
        } else if (e == 'SimulateInfiniteLoop') {
          // running an evented main loop, don't immediately exit
          noExitRuntime = true;
          return;
        } else {
          var toLog = e;
          if (e && typeof e === 'object' && e.stack) {
            toLog = [e, e.stack];
          }
          err('exception thrown: ' + toLog);
          quit_(1, e);
        }
      } finally {
      }
    }




    /** @type {function(Array=)} */
    function run(args) {
      args = args || arguments_;

      if (runDependencies > 0) {
        return;
      }


      preRun();

      if (runDependencies > 0) return; // a preRun added a dependency, run will be called later

      function doRun() {
        // run may have just been called through dependencies being fulfilled just in this very frame,
        // or while the async setStatus time below was happening
        if (calledRun) return;
        calledRun = true;

        if (ABORT) return;

        initRuntime();

        preMain();

        if (Module['onRuntimeInitialized']) Module['onRuntimeInitialized']();

        if (shouldRunNow) callMain(args);

        postRun();
      }

      if (Module['setStatus']) {
        Module['setStatus']('Running...');
        setTimeout(function() {
          setTimeout(function() {
            Module['setStatus']('');
          }, 1);
          doRun();
        }, 1);
      } else
      {
        doRun();
      }
    }
    Module['run'] = run;


    function exit(status, implicit) {

      // if this is just main exit-ing implicitly, and the status is 0, then we
      // don't need to do anything here and can just leave. if the status is
      // non-zero, though, then we need to report it.
      // (we may have warned about this earlier, if a situation justifies doing so)
      if (implicit && noExitRuntime && status === 0) {
        return;
      }

      if (noExitRuntime) ; else {

        ABORT = true;

        if (Module['onExit']) Module['onExit'](status);
      }

      quit_(status, new ExitStatus(status));
    }

    if (Module['preInit']) {
      if (typeof Module['preInit'] == 'function') Module['preInit'] = [Module['preInit']];
      while (Module['preInit'].length > 0) {
        Module['preInit'].pop()();
      }
    }

    // shouldRunNow refers to calling main(), not run().
    var shouldRunNow = true;

    if (Module['noInitialRun']) shouldRunNow = false;


      noExitRuntime = true;

    run();





    // {{MODULE_ADDITIONS}}





      return Module
    }
    );
    })();
    if (typeof exports === 'object' && typeof module === 'object')
          module.exports = Module;
        else if (typeof define === 'function' && define['amd'])
          define([], function() { return Module; });
        else if (typeof exports === 'object')
          exports["Module"] = Module;
        // HACK: Work around <https://github.com/kripken/emscripten/issues/5820>.
    const _Module = new Proxy(Module, {
        apply(target, thisArg, args) {
            return new Promise(resolve => Reflect.apply(target, thisArg, args)
                .then(m => {
                    delete m.then;
                    resolve(m);
                }));
        }
    });

    class SyncWritableReadableStream extends ReadableStream {
        constructor(...args) {
            let controller;
            super({
                start: _controller => controller = _controller,
            }, ...args);
            this.controller = controller;
        }
        _write(...args) {
            this.controller.enqueue(...args);
        }
        _close() {
            if (this.isClosed) return;
            this.controller.close();
            this.isClosed = true;
        }
    }

    const EOF = Symbol("EOF");

    class SyncSink {
        constructor({size = () => 1, highWaterMark = 1} = {}) {
            this._queue = [];
            this._queueTotalSize = 0;
            this._strategyHWM = highWaterMark;
            this._strategySizeAlgorithm = size;
            this._ready = Promise.resolve();
            this._readyResolve = () => {};
            this._readyReject = () => {};
            this._isAborted = false;
        }
        write(chunk, controller) {
            if (chunk === EOF) return;
            const size = this._strategySizeAlgorithm(chunk);
            this._queueTotalSize += size;
            this._queue.push([chunk, size]);
            if (this._queueTotalSize < this._strategyHWM) return;
            this._ready = new Promise((resolve, reject) => {
                this._readyResolve = resolve;
                this._readyReject = reject;
            });
            if (this._onData) {
                this._onData();
                this._onData = null;
            }
            return this._ready;
        }
        close() {
            this._queue.push([EOF, 0]);
        }
        abort(reason) {
            this._isAborted = reason;
            this._queue = [];
        }
        read() {
            if (this._queue.length === 0) return [];
            const [chunk, size] = this._queue.shift();
            this._queueTotalSize -= size;
            if (this._queueTotalSize < 0) this._queueTotalSize = 0;
            if (this._queueTotalSize < this._strategyHWM) this._readyResolve();
            return [chunk];
        }
    }

    class SyncReadableWritableStream extends WritableStream {
        constructor(sinkArgs, ...args) {
            const sink = new SyncSink(sinkArgs);
            super(sink, ...args);
            this._sink = sink;
        }
        _read() {
            return this._sink.read()[0];
        }
        get EOF() {
            return EOF;
        }
        get isAborted() {
            return this._sink.isAborted;
        }
        get ready() {
            return this._sink._ready;
        }
        set _onData(val) {
            this._sink._onData = val;
        }
        *[Symbol.iterator]() {
            for (let v; v = this._sink.read();) {
                if (v.length === 0) break;
                yield v[0];
            }
        }
    }

    // Copyright 2018 The Emulation-as-a-Service Authors.

    const pcapHeader = new Blob([new Uint32Array([
        0xa1b2c3d4,
        0x00040002,
        0x00000000,
        0x00000000,
        0x0000ffff,
        0x00000001,
    ])]);

    function randomMac() {
        const mac = self.crypto.getRandomValues(new Uint8Array(6));
        // Unicast, locally administered.
        mac[0] = mac[0] & ~0b00000001 | 0b00000010;
        return mac;
    }

    class NetworkStack {
        constructor({mac, ipv4} = {}) {
            return (async () => {
                this._picotcp = await _Module();
                this.start();
                return this;
            })();
        }

        start() {
            this._interval = setInterval(this.tick.bind(this), 10/*500*/);
        }
        stop() {
            clearInterval(this._interval);
            this._interval = null;
        }
        tick() {
            this._picotcp._pico_stack_tick();
        }
        async addInterface({mac = randomMac(), ip}) {
            const dev = await new NIC(this, mac);
            if (ip) dev.addIPv4(ip);
            return dev;
        }
    }

    let defaultNetwork;

    const callAsync = async (emscriptenModule, executor, removeFunction = true, transform = (...args) => args) => {
        let resolve;
        const promise = new Promise(_resolve => resolve = _resolve);
        const ptr = emscriptenModule.addFunction((...args) => resolve(transform(...args)));
        executor(ptr);
        await promise;
        if (removeFunction) emscriptenModule.removeFunction(ptr);
        return promise;
    };

    class NIC {
        constructor(stack, mac = randomMac()) {
            return (async () => {
                if (!stack) {
                    if (!defaultNetwork) defaultNetwork = new NetworkStack();
                    stack = await defaultNetwork;
                }
                this.stack = stack;
                this.dev = this.stack._picotcp.ccall("pico_js_create", "number", ["string", "array"], ["", mac]);
                this.stack._dev = this.dev;
                this.mac = mac;
                return this;
            })();
        }
        addIPv4(ip = "", netmask = "255.255.255.0") {
            this.stack._picotcp.ccall("js_add_ipv4", "number", ["number", "string", "string"], [this.dev, ip, netmask]);
        }
        async ping(dst, timeout = 1000) {
            return callAsync(this.stack._picotcp, ptr => this.stack._picotcp.ccall(
                "pico_icmp4_ping", "number",
                ["string", "number", "number", "number", "number", "number"],
                [dst, 1, 1, timeout, 64, ptr]));
        }
        async startDHCPClient() {
            const xidPtr = this.stack._picotcp._malloc(4);
            const [cli, code] = await callAsync(this.stack._picotcp, ptr => this.stack._picotcp.ccall(
                "pico_dhcp_initiate_negotiation", "number",
                ["number", "number", "number"],
                [this.dev, ptr, xidPtr]), false);
            const xid = this.stack._picotcp.HEAPU32[xidPtr / 4];
            this.stack._picotcp._js_accept_nameserver(cli);
            // Do not free xidPtr as picoTCP will use it again when
            // renewing the DHCP lease (not documented in picoTCP documentation).
            return [cli, code, xid];
        }
        startDHCPServer(ip) {
            const settingsPtr = this.stack._picotcp._malloc(9 * 4);
            const HEAPU32 = this.stack._picotcp.HEAPU32.subarray(settingsPtr / 4);
            HEAPU32[0] = 0;
            HEAPU32[1] = 0;
            HEAPU32[2] = 0;
            HEAPU32[3] = 0;
            HEAPU32[4] = this.dev;
            HEAPU32[5] = 0;
            HEAPU32[6] = new Uint32Array(Uint8Array.from(
                ip.split(/\./).map(v => parseInt(v, 10))).buffer)[0];
            HEAPU32[7] = 0;
            HEAPU32[8] = 0;
            const ret = this.stack._picotcp.ccall(
                "pico_dhcp_server_initiate", "number", ["number"], [settingsPtr]
            );
            this.stack._picotcp._free(settingsPtr);
            return ret;
        }
        async getAddr(addr) {
            // TODO: This leaks `ptr` if `pico_dns_client_getaddr() != 0`.
            const {HEAPU8} = this.stack._picotcp;
            // HACK: IP addresses will never be longer than 255 bytes.
            const name = await callAsync(this.stack._picotcp, ptr =>
                this.stack._picotcp.ccall("pico_dns_client_getaddr", "number",
                    ["string", "number", "number"], [addr, ptr, 0]), true,
                    ipPtr => new TextDecoder().decode(
                        HEAPU8.subarray(ipPtr, ipPtr + 256)).split("\0")[0]);
            return name;
        }
        get readable() {
            return this.stack._picotcp.pointers[this.dev].readable;
        }
        get writable() {
            return this.stack._picotcp.pointers[this.dev].writable;
        }
        get TCPSocket() {
            const self = this;
            return class extends TCPSocket {
                get NIC() {return self;}
            }
        }
        get TCPServerSocket() {
            const self = this;
            return class extends TCPServerSocket {
                get NIC() {return self;}
            }
        }
    }

    /**
     * @see https://www.w3.org/TR/tcp-udp-sockets/#interface-tcpsocket
     */
    class TCPSocket {
        constructor(remoteAddress, remotePort, options = {}) {
            const PICO_PROTO_IPV4 = 0;
            this._ptr = this.NIC.stack._picotcp.ccall("js_socket_open", "number", ["number", "number"], [PICO_PROTO_IPV4, new.target._proto]);
            ({readable: this.readable, writable: this.writable} = this.NIC.stack._picotcp.pointers[this._ptr]);
            console.log(this.NIC.stack._picotcp.ccall("js_socket_connect", "number", ["number", "string", "number"], [this._ptr, remoteAddress, remotePort]));
            console.log(this.NIC.stack._picotcp._js_pico_err());
        }

        static get _proto() {
            const PICO_PROTO_TCP = 6;
            return PICO_PROTO_TCP;
        }
    }

    /**
     * @see https://www.w3.org/TR/tcp-udp-sockets/#interface-tcpserversocket
     */
    class TCPServerSocket {
        constructor({localAddress, localPort} = {}) {
            const PICO_PROTO_IPV4 = 0;
            this._ptr = this.NIC.stack._picotcp.ccall("js_socket_open", "number", ["number", "number"], [PICO_PROTO_IPV4, new.target._proto]);
            ({readable: this.readable, writable: this.writable} = this.NIC.stack._picotcp.pointers[this._ptr]);
            console.log(this.NIC.stack._picotcp.ccall("js_socket_bind", "number", ["number", "string", "number"], [this._ptr, localAddress, localPort]));
            console.log(this.NIC.stack._picotcp._js_pico_err());
        }

        static get _proto() {
            const PICO_PROTO_TCP = 6;
            return PICO_PROTO_TCP;
        }
    }



    /*
    wait = ms=>{for(const end = performance.now() + ms; performance.now() < end;);}
    setInterval(()=>{console.log(++x);wait(1100*a);console.log("done",x);}, 1000);x=0;a=1
    */

    /** @param {Uint8Array} buffer */
    self.SEND = buffer => {
        const length = buffer.length;
        // console.log("SENDING into VM -->", buffer, length);
        const blob = new Blob([new Uint8Array([length >> 8, length & 0xff]), buffer]);
        //ws.send(blob);
        console.log("SEND called");
        return length;
    };

    self.POLL = (n, dev, module) => {
        while (n--) {
            if (!self.NET_Q.length) break;
            const buf = self.NET_Q.shift();
            // TODO: When do we need to free this?
            const pointer = module._malloc(buf.length);
            module.writeArrayToMemory(buf, pointer);
            // console.log("<-- GETTING from VM", new Uint8Array(buf), buf.length, pointer);
            module.ccall("pico_stack_recv", "number", ["number", "number", "number"],
                [dev, pointer, buf.length]);
        }
        return n;
    };

    self.NET_Q = [];

        // if (typeof TransformStream === "undefined") await import("https://rawgit.com/creatorrr/web-streams-polyfill/master/dist/polyfill.min.js");

        //const urls = Object.entries(data).filter(([k]) => k.startsWith("ws+ethernet+"));
        //const url = new URL(urls[0][1]);
        //const ws = new WebSocket(url);

    /*    window.ws = ws;
        const stream = wrapWebSocket(ws)
            .pipeThrough(new Uint8ArrayStream())
            .pipeThrough(new VDEParser())
            // VDE does not send a CRC.
            .pipeThrough(new EthernetParser({crcLength: 0}))
            // .pipeThrough(new EthernetPrinter())
            .pipeThrough(new IPv4Parser())
            .pipeThrough(new UDPParser())
            ;
        const read = stream.getReader();
    */
    //    for await (const chunk of read) {
    //        window.Q.push(chunk);
    //        try {stack._pico_stack_tick();} catch (e) {}
    //        // console.log(chunk);
    //    }

    //}

    new ReadableStream().getReader().__proto__[Symbol.asyncIterator] = function () {
        return {
            next: () => this.read(),
        };
    };

    // Copyright 2018 The Emulation-as-a-Service Authors.

    /**
     * @see <https://tools.ietf.org/html/rfc791>
     */
    class IPv4Parser extends TransformStream {
        /**
         * @param {payload: Uint8Array} lower
         * @param {*} controller
         */
        static transform(lower, controller) {
            const {type, payload} = lower;
            if (type !== 0x800) return;
            const ret = {
                version: payload[0] >> 4,
                ihl: payload[0] & 0b1111,
                dscp: payload[1] >> 2,
                ecn: payload[1] & 0b11,
                length: payload[2] << 8 | payload[3],
                id: payload[4] << 8 | payload[5],
                flags: payload[6] >> 5,
                fragmentOffset: (payload[6] & 0b11111) << 8 | payload[7],
                ttl: payload[8],
                /** @see <https://www.iana.org/assignments/protocol-numbers/protocol-numbers.xhtml> */
                protocol: payload[9],
                headerChecksum: payload[10] << 8 | payload[11],
                source: payload.subarray(12, 12 + 4),
                dest: payload.subarray(16, 16 + 4),
            };
            const headerLength = 20;
            // TODO: options.
            Object.assign(ret, {
                payload: payload.subarray(headerLength, ret.length),
                lower,
            });
            controller.enqueue(ret);
        }
        constructor() {super(new.target);}
    }

    /**
     * @see <https://en.wikipedia.org/wiki/Ethernet_frame>
     */
    class EthernetParser extends TransformStream {
        constructor({crcLength = 0} = {}) {
            super({
                /**
                 * @param {Uint8Array} frame
                 * @param {*} controller
                 */
                transform(frame, controller) {
                    const dest = frame.subarray(0, 6);
                    const source = frame.subarray(6, 12);
                    /** @see <https://www.iana.org/assignments/ieee-802-numbers/ieee-802-numbers.xhtml> */
                    const type = frame[12] << 8 | frame[13];
                    const payload = frame.subarray(14, crcLength ? -crcLength : undefined);
                    const crc = crcLength ? frame.subarray(-4) : null;
                    controller.enqueue({source, dest, type, payload, crc, lower: frame});
                }
            });
        }
    }

    // Copyright 2018 The Emulation-as-a-Service Authors.


    const iterator = reader => ({
        [Symbol.asyncIterator]: function () {return this;},
        next: () => reader.read(),
        return: () => ({}),
    });


    async function main() {
      const nic = await new NIC(undefined, new Uint8Array([34, 250, 80, 37, 2, 130]));
      nic.readable.pipeThrough(broadcastStream("ethernet")).pipeThrough(nic);

      monitorNic();
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

}());
