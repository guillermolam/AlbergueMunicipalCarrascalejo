import __RETTO_WASM__ from "./retto_wasm.wasm";
globalThis.__RETTO_WASM__ = __RETTO_WASM__;
// node_modules/.pnpm/@nekoimageland+retto-wasm@0.1.5/node_modules/@nekoimageland/retto-wasm/dist/index.js
var __defProp = Object.defineProperty;
var __export = (target, all2) => {
  for (var name in all2) __defProp(target, name, {
    get: all2[name],
    enumerable: true
  });
};
var Module = (() => {
  var _scriptName = import.meta.url || "file:///worker.mjs";
  return async function(moduleArg = {}) {
    var moduleRtn;
    var Module$1 = moduleArg;
    var readyPromiseResolve, readyPromiseReject;
    var readyPromise = new Promise((resolve, reject) => {
      readyPromiseResolve = resolve;
      readyPromiseReject = reject;
    });
    var ENVIRONMENT_IS_WEB = typeof window == "object";
    var ENVIRONMENT_IS_WORKER = typeof WorkerGlobalScope != "undefined";
    var ENVIRONMENT_IS_NODE = typeof process == "object" && typeof process.versions == "object" && typeof process.versions.node == "string" && process.type != "renderer";
    var ENVIRONMENT_IS_PTHREAD = ENVIRONMENT_IS_WORKER && self.name?.startsWith("em-pthread");
    if (ENVIRONMENT_IS_NODE) {
      const { createRequire } = await import("module");
      var require$1 = createRequire(import.meta.url || "file:///worker.mjs");
      var worker_threads = require$1("worker_threads");
      global.Worker = worker_threads.Worker;
      ENVIRONMENT_IS_WORKER = !worker_threads.isMainThread;
      ENVIRONMENT_IS_PTHREAD = ENVIRONMENT_IS_WORKER && worker_threads["workerData"] == "em-pthread";
    }
    var moduleOverrides = Object.assign({}, Module$1);
    var arguments_ = [];
    var thisProgram = "./this.program";
    var quit_ = (status, toThrow) => {
      throw toThrow;
    };
    var scriptDirectory = "";
    function locateFile(path) {
      if (Module$1["locateFile"]) return Module$1["locateFile"](path, scriptDirectory);
      return scriptDirectory + path;
    }
    var readAsync, readBinary;
    if (ENVIRONMENT_IS_NODE) {
      var fs = require$1("fs");
      var nodePath = require$1("path");
      if (!import.meta.url.startsWith("data:")) scriptDirectory = nodePath.dirname(require$1("url").fileURLToPath(import.meta.url || "file:///worker.mjs")) + "/";
      readBinary = (filename) => {
        filename = isFileURI(filename) ? new URL(filename) : filename;
        var ret = fs.readFileSync(filename);
        return ret;
      };
      readAsync = async (filename, binary = true) => {
        filename = isFileURI(filename) ? new URL(filename) : filename;
        var ret = fs.readFileSync(filename, binary ? void 0 : "utf8");
        return ret;
      };
      if (!Module$1["thisProgram"] && process.argv.length > 1) thisProgram = process.argv[1].replace(/\\/g, "/");
      arguments_ = process.argv.slice(2);
      quit_ = (status, toThrow) => {
        process.exitCode = status;
        throw toThrow;
      };
    } else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
      if (ENVIRONMENT_IS_WORKER) scriptDirectory = self.location.href;
      else if (typeof document != "undefined" && document.currentScript) scriptDirectory = document.currentScript.src;
      if (_scriptName) scriptDirectory = _scriptName;
      if (scriptDirectory.startsWith("blob:")) scriptDirectory = "";
      else scriptDirectory = scriptDirectory.slice(0, scriptDirectory.replace(/[?#].*/, "").lastIndexOf("/") + 1);
      if (!ENVIRONMENT_IS_NODE) {
        if (ENVIRONMENT_IS_WORKER) readBinary = (url) => {
          var xhr = new XMLHttpRequest();
          xhr.open("GET", url, false);
          xhr.responseType = "arraybuffer";
          xhr.send(null);
          return new Uint8Array(xhr.response);
        };
        readAsync = async (url) => {
          if (isFileURI(url)) return new Promise((resolve, reject) => {
            var xhr = new XMLHttpRequest();
            xhr.open("GET", url, true);
            xhr.responseType = "arraybuffer";
            xhr.onload = () => {
              if (xhr.status == 200 || xhr.status == 0 && xhr.response) {
                resolve(xhr.response);
                return;
              }
              reject(xhr.status);
            };
            xhr.onerror = reject;
            xhr.send(null);
          });
          var response = await fetch(url, { credentials: "same-origin" });
          if (response.ok) return response.arrayBuffer();
          throw new Error(response.status + " : " + response.url);
        };
      }
    }
    var defaultPrint = console.log.bind(console);
    var defaultPrintErr = console.error.bind(console);
    if (ENVIRONMENT_IS_NODE) {
      defaultPrint = (...args) => fs.writeSync(1, args.join(" ") + "\n");
      defaultPrintErr = (...args) => fs.writeSync(2, args.join(" ") + "\n");
    }
    var out = Module$1["print"] || defaultPrint;
    var err = Module$1["printErr"] || defaultPrintErr;
    Object.assign(Module$1, moduleOverrides);
    moduleOverrides = null;
    if (Module$1["arguments"]) arguments_ = Module$1["arguments"];
    if (Module$1["thisProgram"]) thisProgram = Module$1["thisProgram"];
    var wasmBinary = Module$1["wasmBinary"];
    var wasmMemory;
    var wasmModule;
    var ABORT = false;
    var EXITSTATUS;
    var HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAP64, HEAPU64, HEAPF64;
    var runtimeInitialized = false;
    var isFileURI = (filename) => filename.startsWith("file://");
    if (ENVIRONMENT_IS_PTHREAD) {
      let threadPrintErr = function(...args) {
        var text = args.join(" ");
        if (ENVIRONMENT_IS_NODE) {
          fs.writeSync(2, text + "\n");
          return;
        }
        console.error(text);
      }, threadAlert = function(...args) {
        var text = args.join(" ");
        postMessage({
          cmd: "alert",
          text,
          threadId: _pthread_self()
        });
      }, handleMessage = function(e) {
        try {
          var msgData = e["data"];
          var cmd = msgData.cmd;
          if (cmd === "load") {
            let messageQueue = [];
            self.onmessage = (e$1) => messageQueue.push(e$1);
            self.startWorker = (instance) => {
              postMessage({ cmd: "loaded" });
              for (let msg of messageQueue) handleMessage(msg);
              self.onmessage = handleMessage;
            };
            for (const handler of msgData.handlers) if (!Module$1[handler] || Module$1[handler].proxy) {
              Module$1[handler] = (...args) => {
                postMessage({
                  cmd: "callHandler",
                  handler,
                  args
                });
              };
              if (handler == "print") out = Module$1[handler];
              if (handler == "printErr") err = Module$1[handler];
            }
            wasmMemory = msgData.wasmMemory;
            updateMemoryViews();
            wasmModuleReceived(msgData.wasmModule);
          } else if (cmd === "run") {
            establishStackSpace(msgData.pthread_ptr);
            __emscripten_thread_init(msgData.pthread_ptr, 0, 0, 1, 0, 0);
            PThread.threadInitTLS();
            __emscripten_thread_mailbox_await(msgData.pthread_ptr);
            if (!initializedJS) initializedJS = true;
            try {
              invokeEntryPoint(msgData.start_routine, msgData.arg);
            } catch (ex) {
              if (ex != "unwind") throw ex;
            }
          } else if (msgData.target === "setimmediate") {
          } else if (cmd === "checkMailbox") {
            if (initializedJS) checkMailbox();
          } else if (cmd) {
            err(`worker: received unknown command ${cmd}`);
            err(msgData);
          }
        } catch (ex) {
          __emscripten_thread_crashed();
          throw ex;
        }
      };
      var wasmModuleReceived;
      if (ENVIRONMENT_IS_NODE) {
        var parentPort = worker_threads["parentPort"];
        parentPort.on("message", (msg) => onmessage({ data: msg }));
        Object.assign(globalThis, {
          self: global,
          postMessage: (msg) => parentPort.postMessage(msg)
        });
      }
      var initializedJS = false;
      if (!Module$1["printErr"]) err = threadPrintErr;
      self.alert = threadAlert;
      self.onunhandledrejection = (e) => {
        throw e.reason || e;
      };
      self.onmessage = handleMessage;
    }
    function updateMemoryViews() {
      var b = wasmMemory.buffer;
      Module$1["HEAP8"] = HEAP8 = new Int8Array(b);
      Module$1["HEAP16"] = HEAP16 = new Int16Array(b);
      Module$1["HEAPU8"] = HEAPU8 = new Uint8Array(b);
      Module$1["HEAPU16"] = HEAPU16 = new Uint16Array(b);
      Module$1["HEAP32"] = HEAP32 = new Int32Array(b);
      Module$1["HEAPU32"] = HEAPU32 = new Uint32Array(b);
      Module$1["HEAPF32"] = HEAPF32 = new Float32Array(b);
      Module$1["HEAPF64"] = HEAPF64 = new Float64Array(b);
      Module$1["HEAP64"] = HEAP64 = new BigInt64Array(b);
      Module$1["HEAPU64"] = HEAPU64 = new BigUint64Array(b);
    }
    if (!ENVIRONMENT_IS_PTHREAD) {
      if (Module$1["wasmMemory"]) wasmMemory = Module$1["wasmMemory"];
      else {
        var INITIAL_MEMORY = Module$1["INITIAL_MEMORY"] || 1073741824;
        wasmMemory = new WebAssembly.Memory({
          initial: INITIAL_MEMORY / 65536,
          maximum: INITIAL_MEMORY / 65536,
          shared: true
        });
      }
      updateMemoryViews();
    }
    function preRun() {
      if (Module$1["preRun"]) {
        if (typeof Module$1["preRun"] == "function") Module$1["preRun"] = [Module$1["preRun"]];
        while (Module$1["preRun"].length) addOnPreRun(Module$1["preRun"].shift());
      }
      callRuntimeCallbacks(onPreRuns);
    }
    function initRuntime() {
      runtimeInitialized = true;
      if (ENVIRONMENT_IS_PTHREAD) return startWorker(Module$1);
      if (!Module$1["noFSInit"] && !FS.initialized) FS.init();
      TTY.init();
      wasmExports["kb"]();
      FS.ignorePermissions = false;
    }
    function postRun() {
      if (ENVIRONMENT_IS_PTHREAD) return;
      if (Module$1["postRun"]) {
        if (typeof Module$1["postRun"] == "function") Module$1["postRun"] = [Module$1["postRun"]];
        while (Module$1["postRun"].length) addOnPostRun(Module$1["postRun"].shift());
      }
      callRuntimeCallbacks(onPostRuns);
    }
    var runDependencies = 0;
    var dependenciesFulfilled = null;
    function getUniqueRunDependency(id) {
      return id;
    }
    function addRunDependency(id) {
      runDependencies++;
      Module$1["monitorRunDependencies"]?.(runDependencies);
    }
    function removeRunDependency(id) {
      runDependencies--;
      Module$1["monitorRunDependencies"]?.(runDependencies);
      if (runDependencies == 0) {
        if (dependenciesFulfilled) {
          var callback = dependenciesFulfilled;
          dependenciesFulfilled = null;
          callback();
        }
      }
    }
    function abort(what) {
      Module$1["onAbort"]?.(what);
      what = "Aborted(" + what + ")";
      err(what);
      ABORT = true;
      what += ". Build with -sASSERTIONS for more info.";
      var e = new WebAssembly.RuntimeError(what);
      readyPromiseReject(e);
      throw e;
    }
    var wasmBinaryFile;
    function findWasmBinary() {
      if (Module$1["locateFile"]) return locateFile("retto_wasm.wasm");
      return new URL("retto_wasm.wasm", import.meta.url || "file:///worker.mjs").href;
    }
    function getBinarySync(file) {
      if (file == wasmBinaryFile && wasmBinary) return new Uint8Array(wasmBinary);
      if (readBinary) return readBinary(file);
      throw "both async and sync fetching of the wasm failed";
    }
    async function getWasmBinary(binaryFile) {
      if (!wasmBinary) try {
        var response = await readAsync(binaryFile);
        return new Uint8Array(response);
      } catch {
      }
      return getBinarySync(binaryFile);
    }
    async function instantiateArrayBuffer(binaryFile, imports) {
      try {
        var binary = await getWasmBinary(binaryFile);
        var instance = await WebAssembly.instantiate(binary, imports);
        return instance;
      } catch (reason) {
        err(`failed to asynchronously prepare wasm: ${reason}`);
        abort(reason);
      }
    }
    async function instantiateAsync(binary, binaryFile, imports) {
      if (!binary && typeof WebAssembly.instantiateStreaming == "function" && !isFileURI(binaryFile) && !ENVIRONMENT_IS_NODE) try {
        var response = fetch(binaryFile, { credentials: "same-origin" });
        var instantiationResult = await WebAssembly.instantiateStreaming(response, imports);
        return instantiationResult;
      } catch (reason) {
        err(`wasm streaming compile failed: ${reason}`);
        err("falling back to ArrayBuffer instantiation");
      }
      return instantiateArrayBuffer(binaryFile, imports);
    }
    function getWasmImports() {
      assignWasmImports();
      return { a: wasmImports };
    }
    async function createWasm() {
      function receiveInstance(instance, module) {
        wasmExports = instance.exports;
        registerTLSInit(wasmExports["sb"]);
        wasmTable = wasmExports["lb"];
        wasmModule = module;
        removeRunDependency("wasm-instantiate");
        return wasmExports;
      }
      addRunDependency("wasm-instantiate");
      function receiveInstantiationResult(result$1) {
        return receiveInstance(result$1["instance"], result$1["module"]);
      }
      var info = getWasmImports();
      if (Module$1["instantiateWasm"]) return new Promise((resolve, reject) => {
        Module$1["instantiateWasm"](info, (mod, inst) => {
          receiveInstance(mod, inst);
          resolve(mod.exports);
        });
      });
      if (ENVIRONMENT_IS_PTHREAD) return new Promise((resolve) => {
        wasmModuleReceived = (module) => {
          var instance = new WebAssembly.Instance(module, getWasmImports());
          resolve(receiveInstance(instance, module));
        };
      });
      wasmBinaryFile ??= findWasmBinary();
      try {
        var result = await instantiateAsync(wasmBinary, wasmBinaryFile, info);
        var exports = receiveInstantiationResult(result);
        return exports;
      } catch (e) {
        readyPromiseReject(e);
        return Promise.reject(e);
      }
    }
    var ASM_CONSTS = {
      1520172: ($0, $1, $2, $3, $4) => {
        if (typeof Module$1 == "undefined" || !Module$1.MountedFiles) return 1;
        let fileName = UTF8ToString(Number($0 >>> 0));
        if (fileName.startsWith("./")) fileName = fileName.substring(2);
        const fileData = Module$1.MountedFiles.get(fileName);
        if (!fileData) return 2;
        const offset = Number($1 >>> 0);
        const length = Number($2 >>> 0);
        const dataIdOrBuffer = Number($3 >>> 0);
        const loadType = $4;
        if (offset + length > fileData.byteLength) return 3;
        try {
          const data = fileData.subarray(offset, offset + length);
          switch (loadType) {
            case 0:
              HEAPU8.set(data, dataIdOrBuffer);
              break;
            case 1:
              if (Module$1.webgpuUploadExternalBuffer) Module$1.webgpuUploadExternalBuffer(dataIdOrBuffer, data);
              else Module$1.jsepUploadExternalBuffer(dataIdOrBuffer, data);
              break;
            default:
              return 4;
          }
          return 0;
        } catch {
          return 4;
        }
      },
      1520996: () => typeof wasmOffsetConverter !== "undefined"
    };
    function retto_notify_det_done(session_id, msg) {
      if (Module$1.onRettoNotifyDetDone) Module$1.onRettoNotifyDetDone(UTF8ToString(session_id), UTF8ToString(msg));
    }
    function retto_notify_cls_done(session_id, msg) {
      if (Module$1.onRettoNotifyClsDone) Module$1.onRettoNotifyClsDone(UTF8ToString(session_id), UTF8ToString(msg));
    }
    function retto_notify_rec_done(session_id, msg) {
      if (Module$1.onRettoNotifyRecDone) Module$1.onRettoNotifyRecDone(UTF8ToString(session_id), UTF8ToString(msg));
    }
    function HaveOffsetConverter() {
      return typeof wasmOffsetConverter !== "undefined";
    }
    class ExitStatus {
      name = "ExitStatus";
      constructor(status) {
        this.message = `Program terminated with exit(${status})`;
        this.status = status;
      }
    }
    Module$1["ExitStatus"] = ExitStatus;
    var terminateWorker = (worker) => {
      worker.terminate();
      worker.onmessage = (e) => {
      };
    };
    Module$1["terminateWorker"] = terminateWorker;
    var cleanupThread = (pthread_ptr) => {
      var worker = PThread.pthreads[pthread_ptr];
      PThread.returnWorkerToPool(worker);
    };
    Module$1["cleanupThread"] = cleanupThread;
    var callRuntimeCallbacks = (callbacks) => {
      while (callbacks.length > 0) callbacks.shift()(Module$1);
    };
    Module$1["callRuntimeCallbacks"] = callRuntimeCallbacks;
    var onPreRuns = [];
    Module$1["onPreRuns"] = onPreRuns;
    var addOnPreRun = (cb) => onPreRuns.unshift(cb);
    Module$1["addOnPreRun"] = addOnPreRun;
    var spawnThread = (threadParams) => {
      var worker = PThread.getNewWorker();
      if (!worker) return 6;
      PThread.runningWorkers.push(worker);
      PThread.pthreads[threadParams.pthread_ptr] = worker;
      worker.pthread_ptr = threadParams.pthread_ptr;
      var msg = {
        cmd: "run",
        start_routine: threadParams.startRoutine,
        arg: threadParams.arg,
        pthread_ptr: threadParams.pthread_ptr
      };
      if (ENVIRONMENT_IS_NODE) worker.unref();
      worker.postMessage(msg, threadParams.transferList);
      return 0;
    };
    Module$1["spawnThread"] = spawnThread;
    var runtimeKeepaliveCounter = 0;
    Module$1["runtimeKeepaliveCounter"] = runtimeKeepaliveCounter;
    var keepRuntimeAlive = () => noExitRuntime || runtimeKeepaliveCounter > 0;
    Module$1["keepRuntimeAlive"] = keepRuntimeAlive;
    var stackSave = () => _emscripten_stack_get_current();
    Module$1["stackSave"] = stackSave;
    var stackRestore = (val) => __emscripten_stack_restore(val);
    Module$1["stackRestore"] = stackRestore;
    var stackAlloc = (sz) => __emscripten_stack_alloc(sz);
    Module$1["stackAlloc"] = stackAlloc;
    var INT53_MAX = 9007199254740992;
    Module$1["INT53_MAX"] = INT53_MAX;
    var INT53_MIN = -9007199254740992;
    Module$1["INT53_MIN"] = INT53_MIN;
    var bigintToI53Checked = (num) => num < INT53_MIN || num > INT53_MAX ? NaN : Number(num);
    Module$1["bigintToI53Checked"] = bigintToI53Checked;
    var proxyToMainThread = (funcIndex, emAsmAddr, sync, ...callArgs) => {
      var serializedNumCallArgs = callArgs.length * 2;
      var sp = stackSave();
      var args = stackAlloc(serializedNumCallArgs * 8);
      var b = args >> 3;
      for (var i = 0; i < callArgs.length; i++) {
        var arg = callArgs[i];
        if (typeof arg == "bigint") {
          HEAP64[b + 2 * i] = 1n;
          HEAP64[b + 2 * i + 1] = arg;
        } else {
          HEAP64[b + 2 * i] = 0n;
          HEAPF64[b + 2 * i + 1] = arg;
        }
      }
      var rtn = __emscripten_run_on_main_thread_js(funcIndex, emAsmAddr, serializedNumCallArgs, args, sync);
      stackRestore(sp);
      return rtn;
    };
    Module$1["proxyToMainThread"] = proxyToMainThread;
    function _proc_exit(code) {
      if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(0, 0, 1, code);
      EXITSTATUS = code;
      if (!keepRuntimeAlive()) {
        PThread.terminateAllThreads();
        Module$1["onExit"]?.(code);
        ABORT = true;
      }
      quit_(code, new ExitStatus(code));
    }
    Module$1["_proc_exit"] = _proc_exit;
    var handleException = (e) => {
      if (e instanceof ExitStatus || e == "unwind") return EXITSTATUS;
      quit_(1, e);
    };
    Module$1["handleException"] = handleException;
    function exitOnMainThread(returnCode) {
      if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(1, 0, 0, returnCode);
      _exit(returnCode);
    }
    Module$1["exitOnMainThread"] = exitOnMainThread;
    var exitJS = (status, implicit) => {
      EXITSTATUS = status;
      if (ENVIRONMENT_IS_PTHREAD) {
        exitOnMainThread(status);
        throw "unwind";
      }
      _proc_exit(status);
    };
    Module$1["exitJS"] = exitJS;
    var _exit = exitJS;
    Module$1["_exit"] = _exit;
    var PThread = {
      unusedWorkers: [],
      runningWorkers: [],
      tlsInitFunctions: [],
      pthreads: {},
      init() {
        if (!ENVIRONMENT_IS_PTHREAD) PThread.initMainThread();
      },
      initMainThread() {
        var pthreadPoolSize = 20;
        while (pthreadPoolSize--) PThread.allocateUnusedWorker();
        addOnPreRun(() => {
          addRunDependency("loading-workers");
          PThread.loadWasmModuleToAllWorkers(() => removeRunDependency("loading-workers"));
        });
      },
      terminateAllThreads: () => {
        for (var worker of PThread.runningWorkers) terminateWorker(worker);
        for (var worker of PThread.unusedWorkers) terminateWorker(worker);
        PThread.unusedWorkers = [];
        PThread.runningWorkers = [];
        PThread.pthreads = {};
      },
      returnWorkerToPool: (worker) => {
        var pthread_ptr = worker.pthread_ptr;
        delete PThread.pthreads[pthread_ptr];
        PThread.unusedWorkers.push(worker);
        PThread.runningWorkers.splice(PThread.runningWorkers.indexOf(worker), 1);
        worker.pthread_ptr = 0;
        __emscripten_thread_free_data(pthread_ptr);
      },
      threadInitTLS() {
        PThread.tlsInitFunctions.forEach((f) => f());
      },
      loadWasmModuleToWorker: (worker) => new Promise((onFinishedLoading) => {
        worker.onmessage = (e) => {
          var d = e["data"];
          var cmd = d.cmd;
          if (d.targetThread && d.targetThread != _pthread_self()) {
            var targetWorker = PThread.pthreads[d.targetThread];
            if (targetWorker) targetWorker.postMessage(d, d.transferList);
            else err(`Internal error! Worker sent a message "${cmd}" to target pthread ${d.targetThread}, but that thread no longer exists!`);
            return;
          }
          if (cmd === "checkMailbox") checkMailbox();
          else if (cmd === "spawnThread") spawnThread(d);
          else if (cmd === "cleanupThread") cleanupThread(d.thread);
          else if (cmd === "loaded") {
            worker.loaded = true;
            if (ENVIRONMENT_IS_NODE && !worker.pthread_ptr) worker.unref();
            onFinishedLoading(worker);
          } else if (cmd === "alert") alert(`Thread ${d.threadId}: ${d.text}`);
          else if (d.target === "setimmediate") worker.postMessage(d);
          else if (cmd === "callHandler") Module$1[d.handler](...d.args);
          else if (cmd) err(`worker sent an unknown command ${cmd}`);
        };
        worker.onerror = (e) => {
          var message = "worker sent an error!";
          err(`${message} ${e.filename}:${e.lineno}: ${e.message}`);
          throw e;
        };
        if (ENVIRONMENT_IS_NODE) {
          worker.on("message", (data) => worker.onmessage({ data }));
          worker.on("error", (e) => worker.onerror(e));
        }
        var handlers = [];
        var knownHandlers = [
          "onExit",
          "onAbort",
          "print",
          "printErr"
        ];
        for (var handler of knownHandlers) if (Module$1.propertyIsEnumerable(handler)) handlers.push(handler);
        worker.postMessage({
          cmd: "load",
          handlers,
          wasmMemory,
          wasmModule
        });
      }),
      loadWasmModuleToAllWorkers(onMaybeReady) {
        if (ENVIRONMENT_IS_PTHREAD) return onMaybeReady();
        let pthreadPoolReady = Promise.all(PThread.unusedWorkers.map(PThread.loadWasmModuleToWorker));
        pthreadPoolReady.then(onMaybeReady);
      },
      allocateUnusedWorker() {
        var worker;
        worker = new Worker(new URL("retto_wasm.js", import.meta.url || "file:///worker.mjs"), {
          type: "module",
          workerData: "em-pthread",
          name: "em-pthread"
        });
        PThread.unusedWorkers.push(worker);
      },
      getNewWorker() {
        if (PThread.unusedWorkers.length == 0) {
          PThread.allocateUnusedWorker();
          PThread.loadWasmModuleToWorker(PThread.unusedWorkers[0]);
        }
        return PThread.unusedWorkers.pop();
      }
    };
    Module$1["PThread"] = PThread;
    var onPostRuns = [];
    Module$1["onPostRuns"] = onPostRuns;
    var addOnPostRun = (cb) => onPostRuns.unshift(cb);
    Module$1["addOnPostRun"] = addOnPostRun;
    var establishStackSpace = (pthread_ptr) => {
      var stackHigh = HEAPU32[pthread_ptr + 52 >> 2];
      var stackSize = HEAPU32[pthread_ptr + 56 >> 2];
      var stackLow = stackHigh - stackSize;
      _emscripten_stack_set_limits(stackHigh, stackLow);
      stackRestore(stackHigh);
    };
    Module$1["establishStackSpace"] = establishStackSpace;
    function getValue(ptr, type = "i8") {
      if (type.endsWith("*")) type = "*";
      switch (type) {
        case "i1":
          return HEAP8[ptr];
        case "i8":
          return HEAP8[ptr];
        case "i16":
          return HEAP16[ptr >> 1];
        case "i32":
          return HEAP32[ptr >> 2];
        case "i64":
          return HEAP64[ptr >> 3];
        case "float":
          return HEAPF32[ptr >> 2];
        case "double":
          return HEAPF64[ptr >> 3];
        case "*":
          return HEAPU32[ptr >> 2];
        default:
          abort(`invalid type for getValue: ${type}`);
      }
    }
    Module$1["getValue"] = getValue;
    var wasmTable;
    Module$1["wasmTable"] = wasmTable;
    var getWasmTableEntry = (funcPtr) => wasmTable.get(funcPtr);
    Module$1["getWasmTableEntry"] = getWasmTableEntry;
    var invokeEntryPoint = (ptr, arg) => {
      runtimeKeepaliveCounter = 0;
      noExitRuntime = 0;
      var result = getWasmTableEntry(ptr)(arg);
      function finish(result$1) {
        if (keepRuntimeAlive()) EXITSTATUS = result$1;
        else __emscripten_thread_exit(result$1);
      }
      finish(result);
    };
    Module$1["invokeEntryPoint"] = invokeEntryPoint;
    var noExitRuntime = Module$1["noExitRuntime"] || true;
    Module$1["noExitRuntime"] = noExitRuntime;
    var registerTLSInit = (tlsInitFunc) => PThread.tlsInitFunctions.push(tlsInitFunc);
    Module$1["registerTLSInit"] = registerTLSInit;
    function setValue(ptr, value, type = "i8") {
      if (type.endsWith("*")) type = "*";
      switch (type) {
        case "i1":
          HEAP8[ptr] = value;
          break;
        case "i8":
          HEAP8[ptr] = value;
          break;
        case "i16":
          HEAP16[ptr >> 1] = value;
          break;
        case "i32":
          HEAP32[ptr >> 2] = value;
          break;
        case "i64":
          HEAP64[ptr >> 3] = BigInt(value);
          break;
        case "float":
          HEAPF32[ptr >> 2] = value;
          break;
        case "double":
          HEAPF64[ptr >> 3] = value;
          break;
        case "*":
          HEAPU32[ptr >> 2] = value;
          break;
        default:
          abort(`invalid type for setValue: ${type}`);
      }
    }
    Module$1["setValue"] = setValue;
    var exceptionCaught = [];
    Module$1["exceptionCaught"] = exceptionCaught;
    var uncaughtExceptionCount = 0;
    Module$1["uncaughtExceptionCount"] = uncaughtExceptionCount;
    var ___cxa_begin_catch = (ptr) => {
      var info = new ExceptionInfo(ptr);
      if (!info.get_caught()) {
        info.set_caught(true);
        uncaughtExceptionCount--;
      }
      info.set_rethrown(false);
      exceptionCaught.push(info);
      ___cxa_increment_exception_refcount(ptr);
      return ___cxa_get_exception_ptr(ptr);
    };
    Module$1["___cxa_begin_catch"] = ___cxa_begin_catch;
    var exceptionLast = 0;
    Module$1["exceptionLast"] = exceptionLast;
    var ___cxa_end_catch = () => {
      _setThrew(0, 0);
      var info = exceptionCaught.pop();
      ___cxa_decrement_exception_refcount(info.excPtr);
      exceptionLast = 0;
    };
    Module$1["___cxa_end_catch"] = ___cxa_end_catch;
    class ExceptionInfo {
      constructor(excPtr) {
        this.excPtr = excPtr;
        this.ptr = excPtr - 24;
      }
      set_type(type) {
        HEAPU32[this.ptr + 4 >> 2] = type;
      }
      get_type() {
        return HEAPU32[this.ptr + 4 >> 2];
      }
      set_destructor(destructor) {
        HEAPU32[this.ptr + 8 >> 2] = destructor;
      }
      get_destructor() {
        return HEAPU32[this.ptr + 8 >> 2];
      }
      set_caught(caught) {
        caught = caught ? 1 : 0;
        HEAP8[this.ptr + 12] = caught;
      }
      get_caught() {
        return HEAP8[this.ptr + 12] != 0;
      }
      set_rethrown(rethrown) {
        rethrown = rethrown ? 1 : 0;
        HEAP8[this.ptr + 13] = rethrown;
      }
      get_rethrown() {
        return HEAP8[this.ptr + 13] != 0;
      }
      init(type, destructor) {
        this.set_adjusted_ptr(0);
        this.set_type(type);
        this.set_destructor(destructor);
      }
      set_adjusted_ptr(adjustedPtr) {
        HEAPU32[this.ptr + 16 >> 2] = adjustedPtr;
      }
      get_adjusted_ptr() {
        return HEAPU32[this.ptr + 16 >> 2];
      }
    }
    Module$1["ExceptionInfo"] = ExceptionInfo;
    var ___resumeException = (ptr) => {
      if (!exceptionLast) exceptionLast = ptr;
      throw exceptionLast;
    };
    Module$1["___resumeException"] = ___resumeException;
    var setTempRet0 = (val) => __emscripten_tempret_set(val);
    Module$1["setTempRet0"] = setTempRet0;
    var findMatchingCatch = (args) => {
      var thrown = exceptionLast;
      if (!thrown) {
        setTempRet0(0);
        return 0;
      }
      var info = new ExceptionInfo(thrown);
      info.set_adjusted_ptr(thrown);
      var thrownType = info.get_type();
      if (!thrownType) {
        setTempRet0(0);
        return thrown;
      }
      for (var caughtType of args) {
        if (caughtType === 0 || caughtType === thrownType) break;
        var adjusted_ptr_addr = info.ptr + 16;
        if (___cxa_can_catch(caughtType, thrownType, adjusted_ptr_addr)) {
          setTempRet0(caughtType);
          return thrown;
        }
      }
      setTempRet0(thrownType);
      return thrown;
    };
    Module$1["findMatchingCatch"] = findMatchingCatch;
    var ___cxa_find_matching_catch_2 = () => findMatchingCatch([]);
    Module$1["___cxa_find_matching_catch_2"] = ___cxa_find_matching_catch_2;
    var ___cxa_find_matching_catch_3 = (arg0) => findMatchingCatch([arg0]);
    Module$1["___cxa_find_matching_catch_3"] = ___cxa_find_matching_catch_3;
    var ___cxa_find_matching_catch_4 = (arg0, arg1) => findMatchingCatch([arg0, arg1]);
    Module$1["___cxa_find_matching_catch_4"] = ___cxa_find_matching_catch_4;
    var ___cxa_rethrow = () => {
      var info = exceptionCaught.pop();
      if (!info) abort("no exception to throw");
      var ptr = info.excPtr;
      if (!info.get_rethrown()) {
        exceptionCaught.push(info);
        info.set_rethrown(true);
        info.set_caught(false);
        uncaughtExceptionCount++;
      }
      exceptionLast = ptr;
      throw exceptionLast;
    };
    Module$1["___cxa_rethrow"] = ___cxa_rethrow;
    var ___cxa_throw = (ptr, type, destructor) => {
      var info = new ExceptionInfo(ptr);
      info.init(type, destructor);
      exceptionLast = ptr;
      uncaughtExceptionCount++;
      throw exceptionLast;
    };
    Module$1["___cxa_throw"] = ___cxa_throw;
    var ___cxa_uncaught_exceptions = () => uncaughtExceptionCount;
    Module$1["___cxa_uncaught_exceptions"] = ___cxa_uncaught_exceptions;
    function pthreadCreateProxied(pthread_ptr, attr, startRoutine, arg) {
      if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(2, 0, 1, pthread_ptr, attr, startRoutine, arg);
      return ___pthread_create_js(pthread_ptr, attr, startRoutine, arg);
    }
    Module$1["pthreadCreateProxied"] = pthreadCreateProxied;
    var _emscripten_has_threading_support = () => typeof SharedArrayBuffer != "undefined";
    Module$1["_emscripten_has_threading_support"] = _emscripten_has_threading_support;
    var ___pthread_create_js = (pthread_ptr, attr, startRoutine, arg) => {
      if (!_emscripten_has_threading_support()) return 6;
      var transferList = [];
      var error = 0;
      if (ENVIRONMENT_IS_PTHREAD && (transferList.length === 0 || error)) return pthreadCreateProxied(pthread_ptr, attr, startRoutine, arg);
      if (error) return error;
      var threadParams = {
        startRoutine,
        pthread_ptr,
        arg,
        transferList
      };
      if (ENVIRONMENT_IS_PTHREAD) {
        threadParams.cmd = "spawnThread";
        postMessage(threadParams, transferList);
        return 0;
      }
      return spawnThread(threadParams);
    };
    Module$1["___pthread_create_js"] = ___pthread_create_js;
    var syscallGetVarargI = () => {
      var ret = HEAP32[+SYSCALLS.varargs >> 2];
      SYSCALLS.varargs += 4;
      return ret;
    };
    Module$1["syscallGetVarargI"] = syscallGetVarargI;
    var syscallGetVarargP = syscallGetVarargI;
    Module$1["syscallGetVarargP"] = syscallGetVarargP;
    var PATH = {
      isAbs: (path) => path.charAt(0) === "/",
      splitPath: (filename) => {
        var splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
        return splitPathRe.exec(filename).slice(1);
      },
      normalizeArray: (parts, allowAboveRoot) => {
        var up = 0;
        for (var i = parts.length - 1; i >= 0; i--) {
          var last = parts[i];
          if (last === ".") parts.splice(i, 1);
          else if (last === "..") {
            parts.splice(i, 1);
            up++;
          } else if (up) {
            parts.splice(i, 1);
            up--;
          }
        }
        if (allowAboveRoot) for (; up; up--) parts.unshift("..");
        return parts;
      },
      normalize: (path) => {
        var isAbsolute = PATH.isAbs(path), trailingSlash = path.slice(-1) === "/";
        path = PATH.normalizeArray(path.split("/").filter((p) => !!p), !isAbsolute).join("/");
        if (!path && !isAbsolute) path = ".";
        if (path && trailingSlash) path += "/";
        return (isAbsolute ? "/" : "") + path;
      },
      dirname: (path) => {
        var result = PATH.splitPath(path), root = result[0], dir = result[1];
        if (!root && !dir) return ".";
        if (dir) dir = dir.slice(0, -1);
        return root + dir;
      },
      basename: (path) => path && path.match(/([^\/]+|\/)\/*$/)[1],
      join: (...paths) => PATH.normalize(paths.join("/")),
      join2: (l, r) => PATH.normalize(l + "/" + r)
    };
    Module$1["PATH"] = PATH;
    var initRandomFill = () => {
      if (ENVIRONMENT_IS_NODE) {
        var nodeCrypto = require$1("crypto");
        return (view) => nodeCrypto.randomFillSync(view);
      }
      return (view) => view.set(crypto.getRandomValues(new Uint8Array(view.byteLength)));
    };
    Module$1["initRandomFill"] = initRandomFill;
    var randomFill = (view) => {
      (randomFill = initRandomFill())(view);
    };
    Module$1["randomFill"] = randomFill;
    var PATH_FS = {
      resolve: (...args) => {
        var resolvedPath = "", resolvedAbsolute = false;
        for (var i = args.length - 1; i >= -1 && !resolvedAbsolute; i--) {
          var path = i >= 0 ? args[i] : FS.cwd();
          if (typeof path != "string") throw new TypeError("Arguments to path.resolve must be strings");
          else if (!path) return "";
          resolvedPath = path + "/" + resolvedPath;
          resolvedAbsolute = PATH.isAbs(path);
        }
        resolvedPath = PATH.normalizeArray(resolvedPath.split("/").filter((p) => !!p), !resolvedAbsolute).join("/");
        return (resolvedAbsolute ? "/" : "") + resolvedPath || ".";
      },
      relative: (from, to) => {
        from = PATH_FS.resolve(from).slice(1);
        to = PATH_FS.resolve(to).slice(1);
        function trim$1(arr) {
          var start = 0;
          for (; start < arr.length; start++) if (arr[start] !== "") break;
          var end = arr.length - 1;
          for (; end >= 0; end--) if (arr[end] !== "") break;
          if (start > end) return [];
          return arr.slice(start, end - start + 1);
        }
        var fromParts = trim$1(from.split("/"));
        var toParts = trim$1(to.split("/"));
        var length = Math.min(fromParts.length, toParts.length);
        var samePartsLength = length;
        for (var i = 0; i < length; i++) if (fromParts[i] !== toParts[i]) {
          samePartsLength = i;
          break;
        }
        var outputParts = [];
        for (var i = samePartsLength; i < fromParts.length; i++) outputParts.push("..");
        outputParts = outputParts.concat(toParts.slice(samePartsLength));
        return outputParts.join("/");
      }
    };
    Module$1["PATH_FS"] = PATH_FS;
    var UTF8Decoder = typeof TextDecoder != "undefined" ? new TextDecoder() : void 0;
    Module$1["UTF8Decoder"] = UTF8Decoder;
    var UTF8ArrayToString = (heapOrArray, idx = 0, maxBytesToRead = NaN) => {
      var endIdx = idx + maxBytesToRead;
      var endPtr = idx;
      while (heapOrArray[endPtr] && !(endPtr >= endIdx)) ++endPtr;
      if (endPtr - idx > 16 && heapOrArray.buffer && UTF8Decoder) return UTF8Decoder.decode(heapOrArray.buffer instanceof ArrayBuffer ? heapOrArray.subarray(idx, endPtr) : heapOrArray.slice(idx, endPtr));
      var str = "";
      while (idx < endPtr) {
        var u0 = heapOrArray[idx++];
        if (!(u0 & 128)) {
          str += String.fromCharCode(u0);
          continue;
        }
        var u1 = heapOrArray[idx++] & 63;
        if ((u0 & 224) == 192) {
          str += String.fromCharCode((u0 & 31) << 6 | u1);
          continue;
        }
        var u2 = heapOrArray[idx++] & 63;
        if ((u0 & 240) == 224) u0 = (u0 & 15) << 12 | u1 << 6 | u2;
        else u0 = (u0 & 7) << 18 | u1 << 12 | u2 << 6 | heapOrArray[idx++] & 63;
        if (u0 < 65536) str += String.fromCharCode(u0);
        else {
          var ch = u0 - 65536;
          str += String.fromCharCode(55296 | ch >> 10, 56320 | ch & 1023);
        }
      }
      return str;
    };
    Module$1["UTF8ArrayToString"] = UTF8ArrayToString;
    var FS_stdin_getChar_buffer = [];
    Module$1["FS_stdin_getChar_buffer"] = FS_stdin_getChar_buffer;
    var lengthBytesUTF8 = (str) => {
      var len = 0;
      for (var i = 0; i < str.length; ++i) {
        var c = str.charCodeAt(i);
        if (c <= 127) len++;
        else if (c <= 2047) len += 2;
        else if (c >= 55296 && c <= 57343) {
          len += 4;
          ++i;
        } else len += 3;
      }
      return len;
    };
    Module$1["lengthBytesUTF8"] = lengthBytesUTF8;
    var stringToUTF8Array = (str, heap, outIdx, maxBytesToWrite) => {
      if (!(maxBytesToWrite > 0)) return 0;
      var startIdx = outIdx;
      var endIdx = outIdx + maxBytesToWrite - 1;
      for (var i = 0; i < str.length; ++i) {
        var u = str.charCodeAt(i);
        if (u >= 55296 && u <= 57343) {
          var u1 = str.charCodeAt(++i);
          u = 65536 + ((u & 1023) << 10) | u1 & 1023;
        }
        if (u <= 127) {
          if (outIdx >= endIdx) break;
          heap[outIdx++] = u;
        } else if (u <= 2047) {
          if (outIdx + 1 >= endIdx) break;
          heap[outIdx++] = 192 | u >> 6;
          heap[outIdx++] = 128 | u & 63;
        } else if (u <= 65535) {
          if (outIdx + 2 >= endIdx) break;
          heap[outIdx++] = 224 | u >> 12;
          heap[outIdx++] = 128 | u >> 6 & 63;
          heap[outIdx++] = 128 | u & 63;
        } else {
          if (outIdx + 3 >= endIdx) break;
          heap[outIdx++] = 240 | u >> 18;
          heap[outIdx++] = 128 | u >> 12 & 63;
          heap[outIdx++] = 128 | u >> 6 & 63;
          heap[outIdx++] = 128 | u & 63;
        }
      }
      heap[outIdx] = 0;
      return outIdx - startIdx;
    };
    Module$1["stringToUTF8Array"] = stringToUTF8Array;
    var intArrayFromString = (stringy, dontAddNull, length) => {
      var len = length > 0 ? length : lengthBytesUTF8(stringy) + 1;
      var u8array = new Array(len);
      var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
      if (dontAddNull) u8array.length = numBytesWritten;
      return u8array;
    };
    Module$1["intArrayFromString"] = intArrayFromString;
    var FS_stdin_getChar = () => {
      if (!FS_stdin_getChar_buffer.length) {
        var result = null;
        if (ENVIRONMENT_IS_NODE) {
          var BUFSIZE = 256;
          var buf = Buffer.alloc(BUFSIZE);
          var bytesRead = 0;
          var fd = process.stdin.fd;
          try {
            bytesRead = fs.readSync(fd, buf, 0, BUFSIZE);
          } catch (e) {
            if (e.toString().includes("EOF")) bytesRead = 0;
            else throw e;
          }
          if (bytesRead > 0) result = buf.slice(0, bytesRead).toString("utf-8");
        } else if (typeof window != "undefined" && typeof window.prompt == "function") {
          result = window.prompt("Input: ");
          if (result !== null) result += "\n";
        }
        if (!result) return null;
        FS_stdin_getChar_buffer = intArrayFromString(result, true);
      }
      return FS_stdin_getChar_buffer.shift();
    };
    Module$1["FS_stdin_getChar"] = FS_stdin_getChar;
    var TTY = {
      ttys: [],
      init() {
      },
      shutdown() {
      },
      register(dev, ops) {
        TTY.ttys[dev] = {
          input: [],
          output: [],
          ops
        };
        FS.registerDevice(dev, TTY.stream_ops);
      },
      stream_ops: {
        open(stream) {
          var tty = TTY.ttys[stream.node.rdev];
          if (!tty) throw new FS.ErrnoError(43);
          stream.tty = tty;
          stream.seekable = false;
        },
        close(stream) {
          stream.tty.ops.fsync(stream.tty);
        },
        fsync(stream) {
          stream.tty.ops.fsync(stream.tty);
        },
        read(stream, buffer, offset, length, pos) {
          if (!stream.tty || !stream.tty.ops.get_char) throw new FS.ErrnoError(60);
          var bytesRead = 0;
          for (var i = 0; i < length; i++) {
            var result;
            try {
              result = stream.tty.ops.get_char(stream.tty);
            } catch (e) {
              throw new FS.ErrnoError(29);
            }
            if (result === void 0 && bytesRead === 0) throw new FS.ErrnoError(6);
            if (result === null || result === void 0) break;
            bytesRead++;
            buffer[offset + i] = result;
          }
          if (bytesRead) stream.node.atime = Date.now();
          return bytesRead;
        },
        write(stream, buffer, offset, length, pos) {
          if (!stream.tty || !stream.tty.ops.put_char) throw new FS.ErrnoError(60);
          try {
            for (var i = 0; i < length; i++) stream.tty.ops.put_char(stream.tty, buffer[offset + i]);
          } catch (e) {
            throw new FS.ErrnoError(29);
          }
          if (length) stream.node.mtime = stream.node.ctime = Date.now();
          return i;
        }
      },
      default_tty_ops: {
        get_char(tty) {
          return FS_stdin_getChar();
        },
        put_char(tty, val) {
          if (val === null || val === 10) {
            out(UTF8ArrayToString(tty.output));
            tty.output = [];
          } else if (val != 0) tty.output.push(val);
        },
        fsync(tty) {
          if (tty.output?.length > 0) {
            out(UTF8ArrayToString(tty.output));
            tty.output = [];
          }
        },
        ioctl_tcgets(tty) {
          return {
            c_iflag: 25856,
            c_oflag: 5,
            c_cflag: 191,
            c_lflag: 35387,
            c_cc: [
              3,
              28,
              127,
              21,
              4,
              0,
              1,
              0,
              17,
              19,
              26,
              0,
              18,
              15,
              23,
              22,
              0,
              0,
              0,
              0,
              0,
              0,
              0,
              0,
              0,
              0,
              0,
              0,
              0,
              0,
              0,
              0
            ]
          };
        },
        ioctl_tcsets(tty, optional_actions, data) {
          return 0;
        },
        ioctl_tiocgwinsz(tty) {
          return [24, 80];
        }
      },
      default_tty1_ops: {
        put_char(tty, val) {
          if (val === null || val === 10) {
            err(UTF8ArrayToString(tty.output));
            tty.output = [];
          } else if (val != 0) tty.output.push(val);
        },
        fsync(tty) {
          if (tty.output?.length > 0) {
            err(UTF8ArrayToString(tty.output));
            tty.output = [];
          }
        }
      }
    };
    Module$1["TTY"] = TTY;
    var zeroMemory = (address, size) => {
      HEAPU8.fill(0, address, address + size);
    };
    Module$1["zeroMemory"] = zeroMemory;
    var alignMemory = (size, alignment) => Math.ceil(size / alignment) * alignment;
    Module$1["alignMemory"] = alignMemory;
    var mmapAlloc = (size) => {
      size = alignMemory(size, 65536);
      var ptr = _emscripten_builtin_memalign(65536, size);
      if (ptr) zeroMemory(ptr, size);
      return ptr;
    };
    Module$1["mmapAlloc"] = mmapAlloc;
    var MEMFS = {
      ops_table: null,
      mount(mount) {
        return MEMFS.createNode(null, "/", 16895, 0);
      },
      createNode(parent, name, mode, dev) {
        if (FS.isBlkdev(mode) || FS.isFIFO(mode)) throw new FS.ErrnoError(63);
        MEMFS.ops_table ||= {
          dir: {
            node: {
              getattr: MEMFS.node_ops.getattr,
              setattr: MEMFS.node_ops.setattr,
              lookup: MEMFS.node_ops.lookup,
              mknod: MEMFS.node_ops.mknod,
              rename: MEMFS.node_ops.rename,
              unlink: MEMFS.node_ops.unlink,
              rmdir: MEMFS.node_ops.rmdir,
              readdir: MEMFS.node_ops.readdir,
              symlink: MEMFS.node_ops.symlink
            },
            stream: { llseek: MEMFS.stream_ops.llseek }
          },
          file: {
            node: {
              getattr: MEMFS.node_ops.getattr,
              setattr: MEMFS.node_ops.setattr
            },
            stream: {
              llseek: MEMFS.stream_ops.llseek,
              read: MEMFS.stream_ops.read,
              write: MEMFS.stream_ops.write,
              allocate: MEMFS.stream_ops.allocate,
              mmap: MEMFS.stream_ops.mmap,
              msync: MEMFS.stream_ops.msync
            }
          },
          link: {
            node: {
              getattr: MEMFS.node_ops.getattr,
              setattr: MEMFS.node_ops.setattr,
              readlink: MEMFS.node_ops.readlink
            },
            stream: {}
          },
          chrdev: {
            node: {
              getattr: MEMFS.node_ops.getattr,
              setattr: MEMFS.node_ops.setattr
            },
            stream: FS.chrdev_stream_ops
          }
        };
        var node = FS.createNode(parent, name, mode, dev);
        if (FS.isDir(node.mode)) {
          node.node_ops = MEMFS.ops_table.dir.node;
          node.stream_ops = MEMFS.ops_table.dir.stream;
          node.contents = {};
        } else if (FS.isFile(node.mode)) {
          node.node_ops = MEMFS.ops_table.file.node;
          node.stream_ops = MEMFS.ops_table.file.stream;
          node.usedBytes = 0;
          node.contents = null;
        } else if (FS.isLink(node.mode)) {
          node.node_ops = MEMFS.ops_table.link.node;
          node.stream_ops = MEMFS.ops_table.link.stream;
        } else if (FS.isChrdev(node.mode)) {
          node.node_ops = MEMFS.ops_table.chrdev.node;
          node.stream_ops = MEMFS.ops_table.chrdev.stream;
        }
        node.atime = node.mtime = node.ctime = Date.now();
        if (parent) {
          parent.contents[name] = node;
          parent.atime = parent.mtime = parent.ctime = node.atime;
        }
        return node;
      },
      getFileDataAsTypedArray(node) {
        if (!node.contents) return new Uint8Array(0);
        if (node.contents.subarray) return node.contents.subarray(0, node.usedBytes);
        return new Uint8Array(node.contents);
      },
      expandFileStorage(node, newCapacity) {
        var prevCapacity = node.contents ? node.contents.length : 0;
        if (prevCapacity >= newCapacity) return;
        var CAPACITY_DOUBLING_MAX = 1024 * 1024;
        newCapacity = Math.max(newCapacity, prevCapacity * (prevCapacity < CAPACITY_DOUBLING_MAX ? 2 : 1.125) >>> 0);
        if (prevCapacity != 0) newCapacity = Math.max(newCapacity, 256);
        var oldContents = node.contents;
        node.contents = new Uint8Array(newCapacity);
        if (node.usedBytes > 0) node.contents.set(oldContents.subarray(0, node.usedBytes), 0);
      },
      resizeFileStorage(node, newSize) {
        if (node.usedBytes == newSize) return;
        if (newSize == 0) {
          node.contents = null;
          node.usedBytes = 0;
        } else {
          var oldContents = node.contents;
          node.contents = new Uint8Array(newSize);
          if (oldContents) node.contents.set(oldContents.subarray(0, Math.min(newSize, node.usedBytes)));
          node.usedBytes = newSize;
        }
      },
      node_ops: {
        getattr(node) {
          var attr = {};
          attr.dev = FS.isChrdev(node.mode) ? node.id : 1;
          attr.ino = node.id;
          attr.mode = node.mode;
          attr.nlink = 1;
          attr.uid = 0;
          attr.gid = 0;
          attr.rdev = node.rdev;
          if (FS.isDir(node.mode)) attr.size = 4096;
          else if (FS.isFile(node.mode)) attr.size = node.usedBytes;
          else if (FS.isLink(node.mode)) attr.size = node.link.length;
          else attr.size = 0;
          attr.atime = new Date(node.atime);
          attr.mtime = new Date(node.mtime);
          attr.ctime = new Date(node.ctime);
          attr.blksize = 4096;
          attr.blocks = Math.ceil(attr.size / attr.blksize);
          return attr;
        },
        setattr(node, attr) {
          for (const key of [
            "mode",
            "atime",
            "mtime",
            "ctime"
          ]) if (attr[key] != null) node[key] = attr[key];
          if (attr.size !== void 0) MEMFS.resizeFileStorage(node, attr.size);
        },
        lookup(parent, name) {
          throw MEMFS.doesNotExistError;
        },
        mknod(parent, name, mode, dev) {
          return MEMFS.createNode(parent, name, mode, dev);
        },
        rename(old_node, new_dir, new_name) {
          var new_node;
          try {
            new_node = FS.lookupNode(new_dir, new_name);
          } catch (e) {
          }
          if (new_node) {
            if (FS.isDir(old_node.mode)) for (var i in new_node.contents) throw new FS.ErrnoError(55);
            FS.hashRemoveNode(new_node);
          }
          delete old_node.parent.contents[old_node.name];
          new_dir.contents[new_name] = old_node;
          old_node.name = new_name;
          new_dir.ctime = new_dir.mtime = old_node.parent.ctime = old_node.parent.mtime = Date.now();
        },
        unlink(parent, name) {
          delete parent.contents[name];
          parent.ctime = parent.mtime = Date.now();
        },
        rmdir(parent, name) {
          var node = FS.lookupNode(parent, name);
          for (var i in node.contents) throw new FS.ErrnoError(55);
          delete parent.contents[name];
          parent.ctime = parent.mtime = Date.now();
        },
        readdir(node) {
          return [
            ".",
            "..",
            ...Object.keys(node.contents)
          ];
        },
        symlink(parent, newname, oldpath) {
          var node = MEMFS.createNode(parent, newname, 41471, 0);
          node.link = oldpath;
          return node;
        },
        readlink(node) {
          if (!FS.isLink(node.mode)) throw new FS.ErrnoError(28);
          return node.link;
        }
      },
      stream_ops: {
        read(stream, buffer, offset, length, position) {
          var contents = stream.node.contents;
          if (position >= stream.node.usedBytes) return 0;
          var size = Math.min(stream.node.usedBytes - position, length);
          if (size > 8 && contents.subarray) buffer.set(contents.subarray(position, position + size), offset);
          else for (var i = 0; i < size; i++) buffer[offset + i] = contents[position + i];
          return size;
        },
        write(stream, buffer, offset, length, position, canOwn) {
          if (!length) return 0;
          var node = stream.node;
          node.mtime = node.ctime = Date.now();
          if (buffer.subarray && (!node.contents || node.contents.subarray)) {
            if (canOwn) {
              node.contents = buffer.subarray(offset, offset + length);
              node.usedBytes = length;
              return length;
            } else if (node.usedBytes === 0 && position === 0) {
              node.contents = buffer.slice(offset, offset + length);
              node.usedBytes = length;
              return length;
            } else if (position + length <= node.usedBytes) {
              node.contents.set(buffer.subarray(offset, offset + length), position);
              return length;
            }
          }
          MEMFS.expandFileStorage(node, position + length);
          if (node.contents.subarray && buffer.subarray) node.contents.set(buffer.subarray(offset, offset + length), position);
          else for (var i = 0; i < length; i++) node.contents[position + i] = buffer[offset + i];
          node.usedBytes = Math.max(node.usedBytes, position + length);
          return length;
        },
        llseek(stream, offset, whence) {
          var position = offset;
          if (whence === 1) position += stream.position;
          else if (whence === 2) {
            if (FS.isFile(stream.node.mode)) position += stream.node.usedBytes;
          }
          if (position < 0) throw new FS.ErrnoError(28);
          return position;
        },
        allocate(stream, offset, length) {
          MEMFS.expandFileStorage(stream.node, offset + length);
          stream.node.usedBytes = Math.max(stream.node.usedBytes, offset + length);
        },
        mmap(stream, length, position, prot, flags) {
          if (!FS.isFile(stream.node.mode)) throw new FS.ErrnoError(43);
          var ptr;
          var allocated;
          var contents = stream.node.contents;
          if (!(flags & 2) && contents && contents.buffer === HEAP8.buffer) {
            allocated = false;
            ptr = contents.byteOffset;
          } else {
            allocated = true;
            ptr = mmapAlloc(length);
            if (!ptr) throw new FS.ErrnoError(48);
            if (contents) {
              if (position > 0 || position + length < contents.length) if (contents.subarray) contents = contents.subarray(position, position + length);
              else contents = Array.prototype.slice.call(contents, position, position + length);
              HEAP8.set(contents, ptr);
            }
          }
          return {
            ptr,
            allocated
          };
        },
        msync(stream, buffer, offset, length, mmapFlags) {
          MEMFS.stream_ops.write(stream, buffer, 0, length, offset, false);
          return 0;
        }
      }
    };
    Module$1["MEMFS"] = MEMFS;
    var asyncLoad = async (url) => {
      var arrayBuffer = await readAsync(url);
      return new Uint8Array(arrayBuffer);
    };
    Module$1["asyncLoad"] = asyncLoad;
    var FS_createDataFile = (parent, name, fileData, canRead, canWrite, canOwn) => {
      FS.createDataFile(parent, name, fileData, canRead, canWrite, canOwn);
    };
    Module$1["FS_createDataFile"] = FS_createDataFile;
    var preloadPlugins = Module$1["preloadPlugins"] || [];
    Module$1["preloadPlugins"] = preloadPlugins;
    var FS_handledByPreloadPlugin = (byteArray, fullname, finish, onerror) => {
      if (typeof Browser != "undefined") Browser.init();
      var handled = false;
      preloadPlugins.forEach((plugin) => {
        if (handled) return;
        if (plugin["canHandle"](fullname)) {
          plugin["handle"](byteArray, fullname, finish, onerror);
          handled = true;
        }
      });
      return handled;
    };
    Module$1["FS_handledByPreloadPlugin"] = FS_handledByPreloadPlugin;
    var FS_createPreloadedFile = (parent, name, url, canRead, canWrite, onload, onerror, dontCreateFile, canOwn, preFinish) => {
      var fullname = name ? PATH_FS.resolve(PATH.join2(parent, name)) : parent;
      var dep = getUniqueRunDependency(`cp ${fullname}`);
      function processData(byteArray) {
        function finish(byteArray$1) {
          preFinish?.();
          if (!dontCreateFile) FS_createDataFile(parent, name, byteArray$1, canRead, canWrite, canOwn);
          onload?.();
          removeRunDependency(dep);
        }
        if (FS_handledByPreloadPlugin(byteArray, fullname, finish, () => {
          onerror?.();
          removeRunDependency(dep);
        })) return;
        finish(byteArray);
      }
      addRunDependency(dep);
      if (typeof url == "string") asyncLoad(url).then(processData, onerror);
      else processData(url);
    };
    Module$1["FS_createPreloadedFile"] = FS_createPreloadedFile;
    var FS_modeStringToFlags = (str) => {
      var flagModes = {
        r: 0,
        "r+": 2,
        w: 577,
        "w+": 578,
        a: 1089,
        "a+": 1090
      };
      var flags = flagModes[str];
      if (typeof flags == "undefined") throw new Error(`Unknown file open mode: ${str}`);
      return flags;
    };
    Module$1["FS_modeStringToFlags"] = FS_modeStringToFlags;
    var FS_getMode = (canRead, canWrite) => {
      var mode = 0;
      if (canRead) mode |= 365;
      if (canWrite) mode |= 146;
      return mode;
    };
    Module$1["FS_getMode"] = FS_getMode;
    var FS = {
      root: null,
      mounts: [],
      devices: {},
      streams: [],
      nextInode: 1,
      nameTable: null,
      currentPath: "/",
      initialized: false,
      ignorePermissions: true,
      filesystems: null,
      syncFSRequests: 0,
      readFiles: {},
      ErrnoError: class {
        name = "ErrnoError";
        constructor(errno) {
          this.errno = errno;
        }
      },
      FSStream: class {
        shared = {};
        get object() {
          return this.node;
        }
        set object(val) {
          this.node = val;
        }
        get isRead() {
          return (this.flags & 2097155) !== 1;
        }
        get isWrite() {
          return (this.flags & 2097155) !== 0;
        }
        get isAppend() {
          return this.flags & 1024;
        }
        get flags() {
          return this.shared.flags;
        }
        set flags(val) {
          this.shared.flags = val;
        }
        get position() {
          return this.shared.position;
        }
        set position(val) {
          this.shared.position = val;
        }
      },
      FSNode: class {
        node_ops = {};
        stream_ops = {};
        readMode = 365;
        writeMode = 146;
        mounted = null;
        constructor(parent, name, mode, rdev) {
          if (!parent) parent = this;
          this.parent = parent;
          this.mount = parent.mount;
          this.id = FS.nextInode++;
          this.name = name;
          this.mode = mode;
          this.rdev = rdev;
          this.atime = this.mtime = this.ctime = Date.now();
        }
        get read() {
          return (this.mode & this.readMode) === this.readMode;
        }
        set read(val) {
          val ? this.mode |= this.readMode : this.mode &= ~this.readMode;
        }
        get write() {
          return (this.mode & this.writeMode) === this.writeMode;
        }
        set write(val) {
          val ? this.mode |= this.writeMode : this.mode &= ~this.writeMode;
        }
        get isFolder() {
          return FS.isDir(this.mode);
        }
        get isDevice() {
          return FS.isChrdev(this.mode);
        }
      },
      lookupPath(path, opts = {}) {
        if (!path) throw new FS.ErrnoError(44);
        opts.follow_mount ??= true;
        if (!PATH.isAbs(path)) path = FS.cwd() + "/" + path;
        linkloop: for (var nlinks = 0; nlinks < 40; nlinks++) {
          var parts = path.split("/").filter((p) => !!p);
          var current = FS.root;
          var current_path = "/";
          for (var i = 0; i < parts.length; i++) {
            var islast = i === parts.length - 1;
            if (islast && opts.parent) break;
            if (parts[i] === ".") continue;
            if (parts[i] === "..") {
              current_path = PATH.dirname(current_path);
              current = current.parent;
              continue;
            }
            current_path = PATH.join2(current_path, parts[i]);
            try {
              current = FS.lookupNode(current, parts[i]);
            } catch (e) {
              if (e?.errno === 44 && islast && opts.noent_okay) return { path: current_path };
              throw e;
            }
            if (FS.isMountpoint(current) && (!islast || opts.follow_mount)) current = current.mounted.root;
            if (FS.isLink(current.mode) && (!islast || opts.follow)) {
              if (!current.node_ops.readlink) throw new FS.ErrnoError(52);
              var link = current.node_ops.readlink(current);
              if (!PATH.isAbs(link)) link = PATH.dirname(current_path) + "/" + link;
              path = link + "/" + parts.slice(i + 1).join("/");
              continue linkloop;
            }
          }
          return {
            path: current_path,
            node: current
          };
        }
        throw new FS.ErrnoError(32);
      },
      getPath(node) {
        var path;
        while (true) {
          if (FS.isRoot(node)) {
            var mount = node.mount.mountpoint;
            if (!path) return mount;
            return mount[mount.length - 1] !== "/" ? `${mount}/${path}` : mount + path;
          }
          path = path ? `${node.name}/${path}` : node.name;
          node = node.parent;
        }
      },
      hashName(parentid, name) {
        var hash = 0;
        for (var i = 0; i < name.length; i++) hash = (hash << 5) - hash + name.charCodeAt(i) | 0;
        return (parentid + hash >>> 0) % FS.nameTable.length;
      },
      hashAddNode(node) {
        var hash = FS.hashName(node.parent.id, node.name);
        node.name_next = FS.nameTable[hash];
        FS.nameTable[hash] = node;
      },
      hashRemoveNode(node) {
        var hash = FS.hashName(node.parent.id, node.name);
        if (FS.nameTable[hash] === node) FS.nameTable[hash] = node.name_next;
        else {
          var current = FS.nameTable[hash];
          while (current) {
            if (current.name_next === node) {
              current.name_next = node.name_next;
              break;
            }
            current = current.name_next;
          }
        }
      },
      lookupNode(parent, name) {
        var errCode = FS.mayLookup(parent);
        if (errCode) throw new FS.ErrnoError(errCode);
        var hash = FS.hashName(parent.id, name);
        for (var node = FS.nameTable[hash]; node; node = node.name_next) {
          var nodeName = node.name;
          if (node.parent.id === parent.id && nodeName === name) return node;
        }
        return FS.lookup(parent, name);
      },
      createNode(parent, name, mode, rdev) {
        var node = new FS.FSNode(parent, name, mode, rdev);
        FS.hashAddNode(node);
        return node;
      },
      destroyNode(node) {
        FS.hashRemoveNode(node);
      },
      isRoot(node) {
        return node === node.parent;
      },
      isMountpoint(node) {
        return !!node.mounted;
      },
      isFile(mode) {
        return (mode & 61440) === 32768;
      },
      isDir(mode) {
        return (mode & 61440) === 16384;
      },
      isLink(mode) {
        return (mode & 61440) === 40960;
      },
      isChrdev(mode) {
        return (mode & 61440) === 8192;
      },
      isBlkdev(mode) {
        return (mode & 61440) === 24576;
      },
      isFIFO(mode) {
        return (mode & 61440) === 4096;
      },
      isSocket(mode) {
        return (mode & 49152) === 49152;
      },
      flagsToPermissionString(flag) {
        var perms = [
          "r",
          "w",
          "rw"
        ][flag & 3];
        if (flag & 512) perms += "w";
        return perms;
      },
      nodePermissions(node, perms) {
        if (FS.ignorePermissions) return 0;
        if (perms.includes("r") && !(node.mode & 292)) return 2;
        else if (perms.includes("w") && !(node.mode & 146)) return 2;
        else if (perms.includes("x") && !(node.mode & 73)) return 2;
        return 0;
      },
      mayLookup(dir) {
        if (!FS.isDir(dir.mode)) return 54;
        var errCode = FS.nodePermissions(dir, "x");
        if (errCode) return errCode;
        if (!dir.node_ops.lookup) return 2;
        return 0;
      },
      mayCreate(dir, name) {
        if (!FS.isDir(dir.mode)) return 54;
        try {
          var node = FS.lookupNode(dir, name);
          return 20;
        } catch (e) {
        }
        return FS.nodePermissions(dir, "wx");
      },
      mayDelete(dir, name, isdir) {
        var node;
        try {
          node = FS.lookupNode(dir, name);
        } catch (e) {
          return e.errno;
        }
        var errCode = FS.nodePermissions(dir, "wx");
        if (errCode) return errCode;
        if (isdir) {
          if (!FS.isDir(node.mode)) return 54;
          if (FS.isRoot(node) || FS.getPath(node) === FS.cwd()) return 10;
        } else if (FS.isDir(node.mode)) return 31;
        return 0;
      },
      mayOpen(node, flags) {
        if (!node) return 44;
        if (FS.isLink(node.mode)) return 32;
        else if (FS.isDir(node.mode)) {
          if (FS.flagsToPermissionString(flags) !== "r" || flags & 576) return 31;
        }
        return FS.nodePermissions(node, FS.flagsToPermissionString(flags));
      },
      checkOpExists(op, err$1) {
        if (!op) throw new FS.ErrnoError(err$1);
        return op;
      },
      MAX_OPEN_FDS: 4096,
      nextfd() {
        for (var fd = 0; fd <= FS.MAX_OPEN_FDS; fd++) if (!FS.streams[fd]) return fd;
        throw new FS.ErrnoError(33);
      },
      getStreamChecked(fd) {
        var stream = FS.getStream(fd);
        if (!stream) throw new FS.ErrnoError(8);
        return stream;
      },
      getStream: (fd) => FS.streams[fd],
      createStream(stream, fd = -1) {
        stream = Object.assign(new FS.FSStream(), stream);
        if (fd == -1) fd = FS.nextfd();
        stream.fd = fd;
        FS.streams[fd] = stream;
        return stream;
      },
      closeStream(fd) {
        FS.streams[fd] = null;
      },
      dupStream(origStream, fd = -1) {
        var stream = FS.createStream(origStream, fd);
        stream.stream_ops?.dup?.(stream);
        return stream;
      },
      doSetAttr(stream, node, attr) {
        var setattr = stream?.stream_ops.setattr;
        var arg = setattr ? stream : node;
        setattr ??= node.node_ops.setattr;
        FS.checkOpExists(setattr, 63);
        setattr(arg, attr);
      },
      chrdev_stream_ops: {
        open(stream) {
          var device = FS.getDevice(stream.node.rdev);
          stream.stream_ops = device.stream_ops;
          stream.stream_ops.open?.(stream);
        },
        llseek() {
          throw new FS.ErrnoError(70);
        }
      },
      major: (dev) => dev >> 8,
      minor: (dev) => dev & 255,
      makedev: (ma, mi) => ma << 8 | mi,
      registerDevice(dev, ops) {
        FS.devices[dev] = { stream_ops: ops };
      },
      getDevice: (dev) => FS.devices[dev],
      getMounts(mount) {
        var mounts = [];
        var check = [mount];
        while (check.length) {
          var m = check.pop();
          mounts.push(m);
          check.push(...m.mounts);
        }
        return mounts;
      },
      syncfs(populate, callback) {
        if (typeof populate == "function") {
          callback = populate;
          populate = false;
        }
        FS.syncFSRequests++;
        if (FS.syncFSRequests > 1) err(`warning: ${FS.syncFSRequests} FS.syncfs operations in flight at once, probably just doing extra work`);
        var mounts = FS.getMounts(FS.root.mount);
        var completed = 0;
        function doCallback(errCode) {
          FS.syncFSRequests--;
          return callback(errCode);
        }
        function done(errCode) {
          if (errCode) {
            if (!done.errored) {
              done.errored = true;
              return doCallback(errCode);
            }
            return;
          }
          if (++completed >= mounts.length) doCallback(null);
        }
        mounts.forEach((mount) => {
          if (!mount.type.syncfs) return done(null);
          mount.type.syncfs(mount, populate, done);
        });
      },
      mount(type, opts, mountpoint) {
        var root = mountpoint === "/";
        var pseudo = !mountpoint;
        var node;
        if (root && FS.root) throw new FS.ErrnoError(10);
        else if (!root && !pseudo) {
          var lookup = FS.lookupPath(mountpoint, { follow_mount: false });
          mountpoint = lookup.path;
          node = lookup.node;
          if (FS.isMountpoint(node)) throw new FS.ErrnoError(10);
          if (!FS.isDir(node.mode)) throw new FS.ErrnoError(54);
        }
        var mount = {
          type,
          opts,
          mountpoint,
          mounts: []
        };
        var mountRoot = type.mount(mount);
        mountRoot.mount = mount;
        mount.root = mountRoot;
        if (root) FS.root = mountRoot;
        else if (node) {
          node.mounted = mount;
          if (node.mount) node.mount.mounts.push(mount);
        }
        return mountRoot;
      },
      unmount(mountpoint) {
        var lookup = FS.lookupPath(mountpoint, { follow_mount: false });
        if (!FS.isMountpoint(lookup.node)) throw new FS.ErrnoError(28);
        var node = lookup.node;
        var mount = node.mounted;
        var mounts = FS.getMounts(mount);
        Object.keys(FS.nameTable).forEach((hash) => {
          var current = FS.nameTable[hash];
          while (current) {
            var next = current.name_next;
            if (mounts.includes(current.mount)) FS.destroyNode(current);
            current = next;
          }
        });
        node.mounted = null;
        var idx = node.mount.mounts.indexOf(mount);
        node.mount.mounts.splice(idx, 1);
      },
      lookup(parent, name) {
        return parent.node_ops.lookup(parent, name);
      },
      mknod(path, mode, dev) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        if (!name) throw new FS.ErrnoError(28);
        if (name === "." || name === "..") throw new FS.ErrnoError(20);
        var errCode = FS.mayCreate(parent, name);
        if (errCode) throw new FS.ErrnoError(errCode);
        if (!parent.node_ops.mknod) throw new FS.ErrnoError(63);
        return parent.node_ops.mknod(parent, name, mode, dev);
      },
      statfs(path) {
        return FS.statfsNode(FS.lookupPath(path, { follow: true }).node);
      },
      statfsStream(stream) {
        return FS.statfsNode(stream.node);
      },
      statfsNode(node) {
        var rtn = {
          bsize: 4096,
          frsize: 4096,
          blocks: 1e6,
          bfree: 5e5,
          bavail: 5e5,
          files: FS.nextInode,
          ffree: FS.nextInode - 1,
          fsid: 42,
          flags: 2,
          namelen: 255
        };
        if (node.node_ops.statfs) Object.assign(rtn, node.node_ops.statfs(node.mount.opts.root));
        return rtn;
      },
      create(path, mode = 438) {
        mode &= 4095;
        mode |= 32768;
        return FS.mknod(path, mode, 0);
      },
      mkdir(path, mode = 511) {
        mode &= 1023;
        mode |= 16384;
        return FS.mknod(path, mode, 0);
      },
      mkdirTree(path, mode) {
        var dirs = path.split("/");
        var d = "";
        for (var i = 0; i < dirs.length; ++i) {
          if (!dirs[i]) continue;
          d += "/" + dirs[i];
          try {
            FS.mkdir(d, mode);
          } catch (e) {
            if (e.errno != 20) throw e;
          }
        }
      },
      mkdev(path, mode, dev) {
        if (typeof dev == "undefined") {
          dev = mode;
          mode = 438;
        }
        mode |= 8192;
        return FS.mknod(path, mode, dev);
      },
      symlink(oldpath, newpath) {
        if (!PATH_FS.resolve(oldpath)) throw new FS.ErrnoError(44);
        var lookup = FS.lookupPath(newpath, { parent: true });
        var parent = lookup.node;
        if (!parent) throw new FS.ErrnoError(44);
        var newname = PATH.basename(newpath);
        var errCode = FS.mayCreate(parent, newname);
        if (errCode) throw new FS.ErrnoError(errCode);
        if (!parent.node_ops.symlink) throw new FS.ErrnoError(63);
        return parent.node_ops.symlink(parent, newname, oldpath);
      },
      rename(old_path, new_path) {
        var old_dirname = PATH.dirname(old_path);
        var new_dirname = PATH.dirname(new_path);
        var old_name = PATH.basename(old_path);
        var new_name = PATH.basename(new_path);
        var lookup, old_dir, new_dir;
        lookup = FS.lookupPath(old_path, { parent: true });
        old_dir = lookup.node;
        lookup = FS.lookupPath(new_path, { parent: true });
        new_dir = lookup.node;
        if (!old_dir || !new_dir) throw new FS.ErrnoError(44);
        if (old_dir.mount !== new_dir.mount) throw new FS.ErrnoError(75);
        var old_node = FS.lookupNode(old_dir, old_name);
        var relative = PATH_FS.relative(old_path, new_dirname);
        if (relative.charAt(0) !== ".") throw new FS.ErrnoError(28);
        relative = PATH_FS.relative(new_path, old_dirname);
        if (relative.charAt(0) !== ".") throw new FS.ErrnoError(55);
        var new_node;
        try {
          new_node = FS.lookupNode(new_dir, new_name);
        } catch (e) {
        }
        if (old_node === new_node) return;
        var isdir = FS.isDir(old_node.mode);
        var errCode = FS.mayDelete(old_dir, old_name, isdir);
        if (errCode) throw new FS.ErrnoError(errCode);
        errCode = new_node ? FS.mayDelete(new_dir, new_name, isdir) : FS.mayCreate(new_dir, new_name);
        if (errCode) throw new FS.ErrnoError(errCode);
        if (!old_dir.node_ops.rename) throw new FS.ErrnoError(63);
        if (FS.isMountpoint(old_node) || new_node && FS.isMountpoint(new_node)) throw new FS.ErrnoError(10);
        if (new_dir !== old_dir) {
          errCode = FS.nodePermissions(old_dir, "w");
          if (errCode) throw new FS.ErrnoError(errCode);
        }
        FS.hashRemoveNode(old_node);
        try {
          old_dir.node_ops.rename(old_node, new_dir, new_name);
          old_node.parent = new_dir;
        } catch (e) {
          throw e;
        } finally {
          FS.hashAddNode(old_node);
        }
      },
      rmdir(path) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        var node = FS.lookupNode(parent, name);
        var errCode = FS.mayDelete(parent, name, true);
        if (errCode) throw new FS.ErrnoError(errCode);
        if (!parent.node_ops.rmdir) throw new FS.ErrnoError(63);
        if (FS.isMountpoint(node)) throw new FS.ErrnoError(10);
        parent.node_ops.rmdir(parent, name);
        FS.destroyNode(node);
      },
      readdir(path) {
        var lookup = FS.lookupPath(path, { follow: true });
        var node = lookup.node;
        var readdir = FS.checkOpExists(node.node_ops.readdir, 54);
        return readdir(node);
      },
      unlink(path) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        if (!parent) throw new FS.ErrnoError(44);
        var name = PATH.basename(path);
        var node = FS.lookupNode(parent, name);
        var errCode = FS.mayDelete(parent, name, false);
        if (errCode) throw new FS.ErrnoError(errCode);
        if (!parent.node_ops.unlink) throw new FS.ErrnoError(63);
        if (FS.isMountpoint(node)) throw new FS.ErrnoError(10);
        parent.node_ops.unlink(parent, name);
        FS.destroyNode(node);
      },
      readlink(path) {
        var lookup = FS.lookupPath(path);
        var link = lookup.node;
        if (!link) throw new FS.ErrnoError(44);
        if (!link.node_ops.readlink) throw new FS.ErrnoError(28);
        return link.node_ops.readlink(link);
      },
      stat(path, dontFollow) {
        var lookup = FS.lookupPath(path, { follow: !dontFollow });
        var node = lookup.node;
        var getattr = FS.checkOpExists(node.node_ops.getattr, 63);
        return getattr(node);
      },
      fstat(fd) {
        var stream = FS.getStreamChecked(fd);
        var node = stream.node;
        var getattr = stream.stream_ops.getattr;
        var arg = getattr ? stream : node;
        getattr ??= node.node_ops.getattr;
        FS.checkOpExists(getattr, 63);
        return getattr(arg);
      },
      lstat(path) {
        return FS.stat(path, true);
      },
      doChmod(stream, node, mode, dontFollow) {
        FS.doSetAttr(stream, node, {
          mode: mode & 4095 | node.mode & -4096,
          ctime: Date.now(),
          dontFollow
        });
      },
      chmod(path, mode, dontFollow) {
        var node;
        if (typeof path == "string") {
          var lookup = FS.lookupPath(path, { follow: !dontFollow });
          node = lookup.node;
        } else node = path;
        FS.doChmod(null, node, mode, dontFollow);
      },
      lchmod(path, mode) {
        FS.chmod(path, mode, true);
      },
      fchmod(fd, mode) {
        var stream = FS.getStreamChecked(fd);
        FS.doChmod(stream, stream.node, mode, false);
      },
      doChown(stream, node, dontFollow) {
        FS.doSetAttr(stream, node, {
          timestamp: Date.now(),
          dontFollow
        });
      },
      chown(path, uid, gid, dontFollow) {
        var node;
        if (typeof path == "string") {
          var lookup = FS.lookupPath(path, { follow: !dontFollow });
          node = lookup.node;
        } else node = path;
        FS.doChown(null, node, dontFollow);
      },
      lchown(path, uid, gid) {
        FS.chown(path, uid, gid, true);
      },
      fchown(fd, uid, gid) {
        var stream = FS.getStreamChecked(fd);
        FS.doChown(stream, stream.node, false);
      },
      doTruncate(stream, node, len) {
        if (FS.isDir(node.mode)) throw new FS.ErrnoError(31);
        if (!FS.isFile(node.mode)) throw new FS.ErrnoError(28);
        var errCode = FS.nodePermissions(node, "w");
        if (errCode) throw new FS.ErrnoError(errCode);
        FS.doSetAttr(stream, node, {
          size: len,
          timestamp: Date.now()
        });
      },
      truncate(path, len) {
        if (len < 0) throw new FS.ErrnoError(28);
        var node;
        if (typeof path == "string") {
          var lookup = FS.lookupPath(path, { follow: true });
          node = lookup.node;
        } else node = path;
        FS.doTruncate(null, node, len);
      },
      ftruncate(fd, len) {
        var stream = FS.getStreamChecked(fd);
        if (len < 0 || (stream.flags & 2097155) === 0) throw new FS.ErrnoError(28);
        FS.doTruncate(stream, stream.node, len);
      },
      utime(path, atime, mtime) {
        var lookup = FS.lookupPath(path, { follow: true });
        var node = lookup.node;
        var setattr = FS.checkOpExists(node.node_ops.setattr, 63);
        setattr(node, {
          atime,
          mtime
        });
      },
      open(path, flags, mode = 438) {
        if (path === "") throw new FS.ErrnoError(44);
        flags = typeof flags == "string" ? FS_modeStringToFlags(flags) : flags;
        if (flags & 64) mode = mode & 4095 | 32768;
        else mode = 0;
        var node;
        var isDirPath;
        if (typeof path == "object") node = path;
        else {
          isDirPath = path.endsWith("/");
          var lookup = FS.lookupPath(path, {
            follow: !(flags & 131072),
            noent_okay: true
          });
          node = lookup.node;
          path = lookup.path;
        }
        var created = false;
        if (flags & 64) if (node) {
          if (flags & 128) throw new FS.ErrnoError(20);
        } else if (isDirPath) throw new FS.ErrnoError(31);
        else {
          node = FS.mknod(path, mode | 511, 0);
          created = true;
        }
        if (!node) throw new FS.ErrnoError(44);
        if (FS.isChrdev(node.mode)) flags &= -513;
        if (flags & 65536 && !FS.isDir(node.mode)) throw new FS.ErrnoError(54);
        if (!created) {
          var errCode = FS.mayOpen(node, flags);
          if (errCode) throw new FS.ErrnoError(errCode);
        }
        if (flags & 512 && !created) FS.truncate(node, 0);
        flags &= -131713;
        var stream = FS.createStream({
          node,
          path: FS.getPath(node),
          flags,
          seekable: true,
          position: 0,
          stream_ops: node.stream_ops,
          ungotten: [],
          error: false
        });
        if (stream.stream_ops.open) stream.stream_ops.open(stream);
        if (created) FS.chmod(node, mode & 511);
        if (Module$1["logReadFiles"] && !(flags & 1)) {
          if (!(path in FS.readFiles)) FS.readFiles[path] = 1;
        }
        return stream;
      },
      close(stream) {
        if (FS.isClosed(stream)) throw new FS.ErrnoError(8);
        if (stream.getdents) stream.getdents = null;
        try {
          if (stream.stream_ops.close) stream.stream_ops.close(stream);
        } catch (e) {
          throw e;
        } finally {
          FS.closeStream(stream.fd);
        }
        stream.fd = null;
      },
      isClosed(stream) {
        return stream.fd === null;
      },
      llseek(stream, offset, whence) {
        if (FS.isClosed(stream)) throw new FS.ErrnoError(8);
        if (!stream.seekable || !stream.stream_ops.llseek) throw new FS.ErrnoError(70);
        if (whence != 0 && whence != 1 && whence != 2) throw new FS.ErrnoError(28);
        stream.position = stream.stream_ops.llseek(stream, offset, whence);
        stream.ungotten = [];
        return stream.position;
      },
      read(stream, buffer, offset, length, position) {
        if (length < 0 || position < 0) throw new FS.ErrnoError(28);
        if (FS.isClosed(stream)) throw new FS.ErrnoError(8);
        if ((stream.flags & 2097155) === 1) throw new FS.ErrnoError(8);
        if (FS.isDir(stream.node.mode)) throw new FS.ErrnoError(31);
        if (!stream.stream_ops.read) throw new FS.ErrnoError(28);
        var seeking = typeof position != "undefined";
        if (!seeking) position = stream.position;
        else if (!stream.seekable) throw new FS.ErrnoError(70);
        var bytesRead = stream.stream_ops.read(stream, buffer, offset, length, position);
        if (!seeking) stream.position += bytesRead;
        return bytesRead;
      },
      write(stream, buffer, offset, length, position, canOwn) {
        if (length < 0 || position < 0) throw new FS.ErrnoError(28);
        if (FS.isClosed(stream)) throw new FS.ErrnoError(8);
        if ((stream.flags & 2097155) === 0) throw new FS.ErrnoError(8);
        if (FS.isDir(stream.node.mode)) throw new FS.ErrnoError(31);
        if (!stream.stream_ops.write) throw new FS.ErrnoError(28);
        if (stream.seekable && stream.flags & 1024) FS.llseek(stream, 0, 2);
        var seeking = typeof position != "undefined";
        if (!seeking) position = stream.position;
        else if (!stream.seekable) throw new FS.ErrnoError(70);
        var bytesWritten = stream.stream_ops.write(stream, buffer, offset, length, position, canOwn);
        if (!seeking) stream.position += bytesWritten;
        return bytesWritten;
      },
      allocate(stream, offset, length) {
        if (FS.isClosed(stream)) throw new FS.ErrnoError(8);
        if (offset < 0 || length <= 0) throw new FS.ErrnoError(28);
        if ((stream.flags & 2097155) === 0) throw new FS.ErrnoError(8);
        if (!FS.isFile(stream.node.mode) && !FS.isDir(stream.node.mode)) throw new FS.ErrnoError(43);
        if (!stream.stream_ops.allocate) throw new FS.ErrnoError(138);
        stream.stream_ops.allocate(stream, offset, length);
      },
      mmap(stream, length, position, prot, flags) {
        if ((prot & 2) !== 0 && (flags & 2) === 0 && (stream.flags & 2097155) !== 2) throw new FS.ErrnoError(2);
        if ((stream.flags & 2097155) === 1) throw new FS.ErrnoError(2);
        if (!stream.stream_ops.mmap) throw new FS.ErrnoError(43);
        if (!length) throw new FS.ErrnoError(28);
        return stream.stream_ops.mmap(stream, length, position, prot, flags);
      },
      msync(stream, buffer, offset, length, mmapFlags) {
        if (!stream.stream_ops.msync) return 0;
        return stream.stream_ops.msync(stream, buffer, offset, length, mmapFlags);
      },
      ioctl(stream, cmd, arg) {
        if (!stream.stream_ops.ioctl) throw new FS.ErrnoError(59);
        return stream.stream_ops.ioctl(stream, cmd, arg);
      },
      readFile(path, opts = {}) {
        opts.flags = opts.flags || 0;
        opts.encoding = opts.encoding || "binary";
        if (opts.encoding !== "utf8" && opts.encoding !== "binary") throw new Error(`Invalid encoding type "${opts.encoding}"`);
        var ret;
        var stream = FS.open(path, opts.flags);
        var stat = FS.stat(path);
        var length = stat.size;
        var buf = new Uint8Array(length);
        FS.read(stream, buf, 0, length, 0);
        if (opts.encoding === "utf8") ret = UTF8ArrayToString(buf);
        else if (opts.encoding === "binary") ret = buf;
        FS.close(stream);
        return ret;
      },
      writeFile(path, data, opts = {}) {
        opts.flags = opts.flags || 577;
        var stream = FS.open(path, opts.flags, opts.mode);
        if (typeof data == "string") {
          var buf = new Uint8Array(lengthBytesUTF8(data) + 1);
          var actualNumBytes = stringToUTF8Array(data, buf, 0, buf.length);
          FS.write(stream, buf, 0, actualNumBytes, void 0, opts.canOwn);
        } else if (ArrayBuffer.isView(data)) FS.write(stream, data, 0, data.byteLength, void 0, opts.canOwn);
        else throw new Error("Unsupported data type");
        FS.close(stream);
      },
      cwd: () => FS.currentPath,
      chdir(path) {
        var lookup = FS.lookupPath(path, { follow: true });
        if (lookup.node === null) throw new FS.ErrnoError(44);
        if (!FS.isDir(lookup.node.mode)) throw new FS.ErrnoError(54);
        var errCode = FS.nodePermissions(lookup.node, "x");
        if (errCode) throw new FS.ErrnoError(errCode);
        FS.currentPath = lookup.path;
      },
      createDefaultDirectories() {
        FS.mkdir("/tmp");
        FS.mkdir("/home");
        FS.mkdir("/home/web_user");
      },
      createDefaultDevices() {
        FS.mkdir("/dev");
        FS.registerDevice(FS.makedev(1, 3), {
          read: () => 0,
          write: (stream, buffer, offset, length, pos) => length,
          llseek: () => 0
        });
        FS.mkdev("/dev/null", FS.makedev(1, 3));
        TTY.register(FS.makedev(5, 0), TTY.default_tty_ops);
        TTY.register(FS.makedev(6, 0), TTY.default_tty1_ops);
        FS.mkdev("/dev/tty", FS.makedev(5, 0));
        FS.mkdev("/dev/tty1", FS.makedev(6, 0));
        var randomBuffer = new Uint8Array(1024), randomLeft = 0;
        var randomByte = () => {
          if (randomLeft === 0) {
            randomFill(randomBuffer);
            randomLeft = randomBuffer.byteLength;
          }
          return randomBuffer[--randomLeft];
        };
        FS.createDevice("/dev", "random", randomByte);
        FS.createDevice("/dev", "urandom", randomByte);
        FS.mkdir("/dev/shm");
        FS.mkdir("/dev/shm/tmp");
      },
      createSpecialDirectories() {
        FS.mkdir("/proc");
        var proc_self = FS.mkdir("/proc/self");
        FS.mkdir("/proc/self/fd");
        FS.mount({ mount() {
          var node = FS.createNode(proc_self, "fd", 16895, 73);
          node.stream_ops = { llseek: MEMFS.stream_ops.llseek };
          node.node_ops = {
            lookup(parent, name) {
              var fd = +name;
              var stream = FS.getStreamChecked(fd);
              var ret = {
                parent: null,
                mount: { mountpoint: "fake" },
                node_ops: { readlink: () => stream.path },
                id: fd + 1
              };
              ret.parent = ret;
              return ret;
            },
            readdir() {
              return Array.from(FS.streams.entries()).filter(([k, v]) => v).map(([k, v]) => k.toString());
            }
          };
          return node;
        } }, {}, "/proc/self/fd");
      },
      createStandardStreams(input, output, error) {
        if (input) FS.createDevice("/dev", "stdin", input);
        else FS.symlink("/dev/tty", "/dev/stdin");
        if (output) FS.createDevice("/dev", "stdout", null, output);
        else FS.symlink("/dev/tty", "/dev/stdout");
        if (error) FS.createDevice("/dev", "stderr", null, error);
        else FS.symlink("/dev/tty1", "/dev/stderr");
        var stdin = FS.open("/dev/stdin", 0);
        var stdout = FS.open("/dev/stdout", 1);
        var stderr = FS.open("/dev/stderr", 1);
      },
      staticInit() {
        FS.nameTable = new Array(4096);
        FS.mount(MEMFS, {}, "/");
        FS.createDefaultDirectories();
        FS.createDefaultDevices();
        FS.createSpecialDirectories();
        FS.filesystems = { MEMFS };
      },
      init(input, output, error) {
        FS.initialized = true;
        input ??= Module$1["stdin"];
        output ??= Module$1["stdout"];
        error ??= Module$1["stderr"];
        FS.createStandardStreams(input, output, error);
      },
      quit() {
        FS.initialized = false;
        for (var i = 0; i < FS.streams.length; i++) {
          var stream = FS.streams[i];
          if (!stream) continue;
          FS.close(stream);
        }
      },
      findObject(path, dontResolveLastLink) {
        var ret = FS.analyzePath(path, dontResolveLastLink);
        if (!ret.exists) return null;
        return ret.object;
      },
      analyzePath(path, dontResolveLastLink) {
        try {
          var lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
          path = lookup.path;
        } catch (e) {
        }
        var ret = {
          isRoot: false,
          exists: false,
          error: 0,
          name: null,
          path: null,
          object: null,
          parentExists: false,
          parentPath: null,
          parentObject: null
        };
        try {
          var lookup = FS.lookupPath(path, { parent: true });
          ret.parentExists = true;
          ret.parentPath = lookup.path;
          ret.parentObject = lookup.node;
          ret.name = PATH.basename(path);
          lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
          ret.exists = true;
          ret.path = lookup.path;
          ret.object = lookup.node;
          ret.name = lookup.node.name;
          ret.isRoot = lookup.path === "/";
        } catch (e) {
          ret.error = e.errno;
        }
        return ret;
      },
      createPath(parent, path, canRead, canWrite) {
        parent = typeof parent == "string" ? parent : FS.getPath(parent);
        var parts = path.split("/").reverse();
        while (parts.length) {
          var part = parts.pop();
          if (!part) continue;
          var current = PATH.join2(parent, part);
          try {
            FS.mkdir(current);
          } catch (e) {
            if (e.errno != 20) throw e;
          }
          parent = current;
        }
        return current;
      },
      createFile(parent, name, properties, canRead, canWrite) {
        var path = PATH.join2(typeof parent == "string" ? parent : FS.getPath(parent), name);
        var mode = FS_getMode(canRead, canWrite);
        return FS.create(path, mode);
      },
      createDataFile(parent, name, data, canRead, canWrite, canOwn) {
        var path = name;
        if (parent) {
          parent = typeof parent == "string" ? parent : FS.getPath(parent);
          path = name ? PATH.join2(parent, name) : parent;
        }
        var mode = FS_getMode(canRead, canWrite);
        var node = FS.create(path, mode);
        if (data) {
          if (typeof data == "string") {
            var arr = new Array(data.length);
            for (var i = 0, len = data.length; i < len; ++i) arr[i] = data.charCodeAt(i);
            data = arr;
          }
          FS.chmod(node, mode | 146);
          var stream = FS.open(node, 577);
          FS.write(stream, data, 0, data.length, 0, canOwn);
          FS.close(stream);
          FS.chmod(node, mode);
        }
      },
      createDevice(parent, name, input, output) {
        var path = PATH.join2(typeof parent == "string" ? parent : FS.getPath(parent), name);
        var mode = FS_getMode(!!input, !!output);
        FS.createDevice.major ??= 64;
        var dev = FS.makedev(FS.createDevice.major++, 0);
        FS.registerDevice(dev, {
          open(stream) {
            stream.seekable = false;
          },
          close(stream) {
            if (output?.buffer?.length) output(10);
          },
          read(stream, buffer, offset, length, pos) {
            var bytesRead = 0;
            for (var i = 0; i < length; i++) {
              var result;
              try {
                result = input();
              } catch (e) {
                throw new FS.ErrnoError(29);
              }
              if (result === void 0 && bytesRead === 0) throw new FS.ErrnoError(6);
              if (result === null || result === void 0) break;
              bytesRead++;
              buffer[offset + i] = result;
            }
            if (bytesRead) stream.node.atime = Date.now();
            return bytesRead;
          },
          write(stream, buffer, offset, length, pos) {
            for (var i = 0; i < length; i++) try {
              output(buffer[offset + i]);
            } catch (e) {
              throw new FS.ErrnoError(29);
            }
            if (length) stream.node.mtime = stream.node.ctime = Date.now();
            return i;
          }
        });
        return FS.mkdev(path, mode, dev);
      },
      forceLoadFile(obj) {
        if (obj.isDevice || obj.isFolder || obj.link || obj.contents) return true;
        if (typeof XMLHttpRequest != "undefined") throw new Error("Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.");
        else try {
          obj.contents = readBinary(obj.url);
          obj.usedBytes = obj.contents.length;
        } catch (e) {
          throw new FS.ErrnoError(29);
        }
      },
      createLazyFile(parent, name, url, canRead, canWrite) {
        class LazyUint8Array {
          lengthKnown = false;
          chunks = [];
          get(idx) {
            if (idx > this.length - 1 || idx < 0) return void 0;
            var chunkOffset = idx % this.chunkSize;
            var chunkNum = idx / this.chunkSize | 0;
            return this.getter(chunkNum)[chunkOffset];
          }
          setDataGetter(getter) {
            this.getter = getter;
          }
          cacheLength() {
            var xhr = new XMLHttpRequest();
            xhr.open("HEAD", url, false);
            xhr.send(null);
            if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
            var datalength = Number(xhr.getResponseHeader("Content-length"));
            var header;
            var hasByteServing = (header = xhr.getResponseHeader("Accept-Ranges")) && header === "bytes";
            var usesGzip = (header = xhr.getResponseHeader("Content-Encoding")) && header === "gzip";
            var chunkSize = 1024 * 1024;
            if (!hasByteServing) chunkSize = datalength;
            var doXHR = (from, to) => {
              if (from > to) throw new Error("invalid range (" + from + ", " + to + ") or no bytes requested!");
              if (to > datalength - 1) throw new Error("only " + datalength + " bytes available! programmer error!");
              var xhr$1 = new XMLHttpRequest();
              xhr$1.open("GET", url, false);
              if (datalength !== chunkSize) xhr$1.setRequestHeader("Range", "bytes=" + from + "-" + to);
              xhr$1.responseType = "arraybuffer";
              if (xhr$1.overrideMimeType) xhr$1.overrideMimeType("text/plain; charset=x-user-defined");
              xhr$1.send(null);
              if (!(xhr$1.status >= 200 && xhr$1.status < 300 || xhr$1.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr$1.status);
              if (xhr$1.response !== void 0) return new Uint8Array(xhr$1.response || []);
              return intArrayFromString(xhr$1.responseText || "", true);
            };
            var lazyArray$1 = this;
            lazyArray$1.setDataGetter((chunkNum) => {
              var start = chunkNum * chunkSize;
              var end = (chunkNum + 1) * chunkSize - 1;
              end = Math.min(end, datalength - 1);
              if (typeof lazyArray$1.chunks[chunkNum] == "undefined") lazyArray$1.chunks[chunkNum] = doXHR(start, end);
              if (typeof lazyArray$1.chunks[chunkNum] == "undefined") throw new Error("doXHR failed!");
              return lazyArray$1.chunks[chunkNum];
            });
            if (usesGzip || !datalength) {
              chunkSize = datalength = 1;
              datalength = this.getter(0).length;
              chunkSize = datalength;
              out("LazyFiles on gzip forces download of the whole file when length is accessed");
            }
            this._length = datalength;
            this._chunkSize = chunkSize;
            this.lengthKnown = true;
          }
          get length() {
            if (!this.lengthKnown) this.cacheLength();
            return this._length;
          }
          get chunkSize() {
            if (!this.lengthKnown) this.cacheLength();
            return this._chunkSize;
          }
        }
        if (typeof XMLHttpRequest != "undefined") {
          if (!ENVIRONMENT_IS_WORKER) throw "Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc";
          var lazyArray = new LazyUint8Array();
          var properties = {
            isDevice: false,
            contents: lazyArray
          };
        } else var properties = {
          isDevice: false,
          url
        };
        var node = FS.createFile(parent, name, properties, canRead, canWrite);
        if (properties.contents) node.contents = properties.contents;
        else if (properties.url) {
          node.contents = null;
          node.url = properties.url;
        }
        Object.defineProperties(node, { usedBytes: { get: function() {
          return this.contents.length;
        } } });
        var stream_ops = {};
        var keys = Object.keys(node.stream_ops);
        keys.forEach((key) => {
          var fn = node.stream_ops[key];
          stream_ops[key] = (...args) => {
            FS.forceLoadFile(node);
            return fn(...args);
          };
        });
        function writeChunks(stream, buffer, offset, length, position) {
          var contents = stream.node.contents;
          if (position >= contents.length) return 0;
          var size = Math.min(contents.length - position, length);
          if (contents.slice) for (var i = 0; i < size; i++) buffer[offset + i] = contents[position + i];
          else for (var i = 0; i < size; i++) buffer[offset + i] = contents.get(position + i);
          return size;
        }
        stream_ops.read = (stream, buffer, offset, length, position) => {
          FS.forceLoadFile(node);
          return writeChunks(stream, buffer, offset, length, position);
        };
        stream_ops.mmap = (stream, length, position, prot, flags) => {
          FS.forceLoadFile(node);
          var ptr = mmapAlloc(length);
          if (!ptr) throw new FS.ErrnoError(48);
          writeChunks(stream, HEAP8, ptr, length, position);
          return {
            ptr,
            allocated: true
          };
        };
        node.stream_ops = stream_ops;
        return node;
      }
    };
    Module$1["FS"] = FS;
    var UTF8ToString = (ptr, maxBytesToRead) => ptr ? UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead) : "";
    Module$1["UTF8ToString"] = UTF8ToString;
    var SYSCALLS = {
      DEFAULT_POLLMASK: 5,
      calculateAt(dirfd, path, allowEmpty) {
        if (PATH.isAbs(path)) return path;
        var dir;
        if (dirfd === -100) dir = FS.cwd();
        else {
          var dirstream = SYSCALLS.getStreamFromFD(dirfd);
          dir = dirstream.path;
        }
        if (path.length == 0) {
          if (!allowEmpty) throw new FS.ErrnoError(44);
          return dir;
        }
        return dir + "/" + path;
      },
      writeStat(buf, stat) {
        HEAP32[buf >> 2] = stat.dev;
        HEAP32[buf + 4 >> 2] = stat.mode;
        HEAPU32[buf + 8 >> 2] = stat.nlink;
        HEAP32[buf + 12 >> 2] = stat.uid;
        HEAP32[buf + 16 >> 2] = stat.gid;
        HEAP32[buf + 20 >> 2] = stat.rdev;
        HEAP64[buf + 24 >> 3] = BigInt(stat.size);
        HEAP32[buf + 32 >> 2] = 4096;
        HEAP32[buf + 36 >> 2] = stat.blocks;
        var atime = stat.atime.getTime();
        var mtime = stat.mtime.getTime();
        var ctime = stat.ctime.getTime();
        HEAP64[buf + 40 >> 3] = BigInt(Math.floor(atime / 1e3));
        HEAPU32[buf + 48 >> 2] = atime % 1e3 * 1e3 * 1e3;
        HEAP64[buf + 56 >> 3] = BigInt(Math.floor(mtime / 1e3));
        HEAPU32[buf + 64 >> 2] = mtime % 1e3 * 1e3 * 1e3;
        HEAP64[buf + 72 >> 3] = BigInt(Math.floor(ctime / 1e3));
        HEAPU32[buf + 80 >> 2] = ctime % 1e3 * 1e3 * 1e3;
        HEAP64[buf + 88 >> 3] = BigInt(stat.ino);
        return 0;
      },
      writeStatFs(buf, stats) {
        HEAP32[buf + 4 >> 2] = stats.bsize;
        HEAP32[buf + 40 >> 2] = stats.bsize;
        HEAP32[buf + 8 >> 2] = stats.blocks;
        HEAP32[buf + 12 >> 2] = stats.bfree;
        HEAP32[buf + 16 >> 2] = stats.bavail;
        HEAP32[buf + 20 >> 2] = stats.files;
        HEAP32[buf + 24 >> 2] = stats.ffree;
        HEAP32[buf + 28 >> 2] = stats.fsid;
        HEAP32[buf + 44 >> 2] = stats.flags;
        HEAP32[buf + 36 >> 2] = stats.namelen;
      },
      doMsync(addr, stream, len, flags, offset) {
        if (!FS.isFile(stream.node.mode)) throw new FS.ErrnoError(43);
        if (flags & 2) return 0;
        var buffer = HEAPU8.slice(addr, addr + len);
        FS.msync(stream, buffer, offset, len, flags);
      },
      getStreamFromFD(fd) {
        var stream = FS.getStreamChecked(fd);
        return stream;
      },
      varargs: void 0,
      getStr(ptr) {
        var ret = UTF8ToString(ptr);
        return ret;
      }
    };
    Module$1["SYSCALLS"] = SYSCALLS;
    function ___syscall_fcntl64(fd, cmd, varargs) {
      if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(3, 0, 1, fd, cmd, varargs);
      SYSCALLS.varargs = varargs;
      try {
        var stream = SYSCALLS.getStreamFromFD(fd);
        switch (cmd) {
          case 0: {
            var arg = syscallGetVarargI();
            if (arg < 0) return -28;
            while (FS.streams[arg]) arg++;
            var newStream;
            newStream = FS.dupStream(stream, arg);
            return newStream.fd;
          }
          case 1:
          case 2:
            return 0;
          case 3:
            return stream.flags;
          case 4: {
            var arg = syscallGetVarargI();
            stream.flags |= arg;
            return 0;
          }
          case 12: {
            var arg = syscallGetVarargP();
            var offset = 0;
            HEAP16[arg + offset >> 1] = 2;
            return 0;
          }
          case 13:
          case 14:
            return 0;
        }
        return -28;
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
        return -e.errno;
      }
    }
    Module$1["___syscall_fcntl64"] = ___syscall_fcntl64;
    function ___syscall_fstat64(fd, buf) {
      if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(4, 0, 1, fd, buf);
      try {
        return SYSCALLS.writeStat(buf, FS.fstat(fd));
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
        return -e.errno;
      }
    }
    Module$1["___syscall_fstat64"] = ___syscall_fstat64;
    var stringToUTF8 = (str, outPtr, maxBytesToWrite) => stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite);
    Module$1["stringToUTF8"] = stringToUTF8;
    function ___syscall_getcwd(buf, size) {
      if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(5, 0, 1, buf, size);
      try {
        if (size === 0) return -28;
        var cwd = FS.cwd();
        var cwdLengthInBytes = lengthBytesUTF8(cwd) + 1;
        if (size < cwdLengthInBytes) return -68;
        stringToUTF8(cwd, buf, size);
        return cwdLengthInBytes;
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
        return -e.errno;
      }
    }
    Module$1["___syscall_getcwd"] = ___syscall_getcwd;
    function ___syscall_getdents64(fd, dirp, count) {
      if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(6, 0, 1, fd, dirp, count);
      try {
        var stream = SYSCALLS.getStreamFromFD(fd);
        stream.getdents ||= FS.readdir(stream.path);
        var struct_size = 280;
        var pos = 0;
        var off = FS.llseek(stream, 0, 1);
        var startIdx = Math.floor(off / struct_size);
        var endIdx = Math.min(stream.getdents.length, startIdx + Math.floor(count / struct_size));
        for (var idx = startIdx; idx < endIdx; idx++) {
          var id;
          var type;
          var name = stream.getdents[idx];
          if (name === ".") {
            id = stream.node.id;
            type = 4;
          } else if (name === "..") {
            var lookup = FS.lookupPath(stream.path, { parent: true });
            id = lookup.node.id;
            type = 4;
          } else {
            var child;
            try {
              child = FS.lookupNode(stream.node, name);
            } catch (e) {
              if (e?.errno === 28) continue;
              throw e;
            }
            id = child.id;
            type = FS.isChrdev(child.mode) ? 2 : FS.isDir(child.mode) ? 4 : FS.isLink(child.mode) ? 10 : 8;
          }
          HEAP64[dirp + pos >> 3] = BigInt(id);
          HEAP64[dirp + pos + 8 >> 3] = BigInt((idx + 1) * struct_size);
          HEAP16[dirp + pos + 16 >> 1] = 280;
          HEAP8[dirp + pos + 18] = type;
          stringToUTF8(name, dirp + pos + 19, 256);
          pos += struct_size;
        }
        FS.llseek(stream, idx * struct_size, 0);
        return pos;
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
        return -e.errno;
      }
    }
    Module$1["___syscall_getdents64"] = ___syscall_getdents64;
    function ___syscall_ioctl(fd, op, varargs) {
      if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(7, 0, 1, fd, op, varargs);
      SYSCALLS.varargs = varargs;
      try {
        var stream = SYSCALLS.getStreamFromFD(fd);
        switch (op) {
          case 21509: {
            if (!stream.tty) return -59;
            return 0;
          }
          case 21505: {
            if (!stream.tty) return -59;
            if (stream.tty.ops.ioctl_tcgets) {
              var termios = stream.tty.ops.ioctl_tcgets(stream);
              var argp = syscallGetVarargP();
              HEAP32[argp >> 2] = termios.c_iflag || 0;
              HEAP32[argp + 4 >> 2] = termios.c_oflag || 0;
              HEAP32[argp + 8 >> 2] = termios.c_cflag || 0;
              HEAP32[argp + 12 >> 2] = termios.c_lflag || 0;
              for (var i = 0; i < 32; i++) HEAP8[argp + i + 17] = termios.c_cc[i] || 0;
              return 0;
            }
            return 0;
          }
          case 21510:
          case 21511:
          case 21512: {
            if (!stream.tty) return -59;
            return 0;
          }
          case 21506:
          case 21507:
          case 21508: {
            if (!stream.tty) return -59;
            if (stream.tty.ops.ioctl_tcsets) {
              var argp = syscallGetVarargP();
              var c_iflag = HEAP32[argp >> 2];
              var c_oflag = HEAP32[argp + 4 >> 2];
              var c_cflag = HEAP32[argp + 8 >> 2];
              var c_lflag = HEAP32[argp + 12 >> 2];
              var c_cc = [];
              for (var i = 0; i < 32; i++) c_cc.push(HEAP8[argp + i + 17]);
              return stream.tty.ops.ioctl_tcsets(stream.tty, op, {
                c_iflag,
                c_oflag,
                c_cflag,
                c_lflag,
                c_cc
              });
            }
            return 0;
          }
          case 21519: {
            if (!stream.tty) return -59;
            var argp = syscallGetVarargP();
            HEAP32[argp >> 2] = 0;
            return 0;
          }
          case 21520: {
            if (!stream.tty) return -59;
            return -28;
          }
          case 21531: {
            var argp = syscallGetVarargP();
            return FS.ioctl(stream, op, argp);
          }
          case 21523: {
            if (!stream.tty) return -59;
            if (stream.tty.ops.ioctl_tiocgwinsz) {
              var winsize = stream.tty.ops.ioctl_tiocgwinsz(stream.tty);
              var argp = syscallGetVarargP();
              HEAP16[argp >> 1] = winsize[0];
              HEAP16[argp + 2 >> 1] = winsize[1];
            }
            return 0;
          }
          case 21524: {
            if (!stream.tty) return -59;
            return 0;
          }
          case 21515: {
            if (!stream.tty) return -59;
            return 0;
          }
          default:
            return -28;
        }
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
        return -e.errno;
      }
    }
    Module$1["___syscall_ioctl"] = ___syscall_ioctl;
    function ___syscall_lstat64(path, buf) {
      if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(8, 0, 1, path, buf);
      try {
        path = SYSCALLS.getStr(path);
        return SYSCALLS.writeStat(buf, FS.lstat(path));
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
        return -e.errno;
      }
    }
    Module$1["___syscall_lstat64"] = ___syscall_lstat64;
    function ___syscall_mkdirat(dirfd, path, mode) {
      if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(9, 0, 1, dirfd, path, mode);
      try {
        path = SYSCALLS.getStr(path);
        path = SYSCALLS.calculateAt(dirfd, path);
        FS.mkdir(path, mode, 0);
        return 0;
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
        return -e.errno;
      }
    }
    Module$1["___syscall_mkdirat"] = ___syscall_mkdirat;
    function ___syscall_newfstatat(dirfd, path, buf, flags) {
      if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(10, 0, 1, dirfd, path, buf, flags);
      try {
        path = SYSCALLS.getStr(path);
        var nofollow = flags & 256;
        var allowEmpty = flags & 4096;
        flags = flags & -6401;
        path = SYSCALLS.calculateAt(dirfd, path, allowEmpty);
        return SYSCALLS.writeStat(buf, nofollow ? FS.lstat(path) : FS.stat(path));
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
        return -e.errno;
      }
    }
    Module$1["___syscall_newfstatat"] = ___syscall_newfstatat;
    function ___syscall_openat(dirfd, path, flags, varargs) {
      if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(11, 0, 1, dirfd, path, flags, varargs);
      SYSCALLS.varargs = varargs;
      try {
        path = SYSCALLS.getStr(path);
        path = SYSCALLS.calculateAt(dirfd, path);
        var mode = varargs ? syscallGetVarargI() : 0;
        return FS.open(path, flags, mode).fd;
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
        return -e.errno;
      }
    }
    Module$1["___syscall_openat"] = ___syscall_openat;
    function ___syscall_readlinkat(dirfd, path, buf, bufsize) {
      if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(12, 0, 1, dirfd, path, buf, bufsize);
      try {
        path = SYSCALLS.getStr(path);
        path = SYSCALLS.calculateAt(dirfd, path);
        if (bufsize <= 0) return -28;
        var ret = FS.readlink(path);
        var len = Math.min(bufsize, lengthBytesUTF8(ret));
        var endChar = HEAP8[buf + len];
        stringToUTF8(ret, buf, bufsize + 1);
        HEAP8[buf + len] = endChar;
        return len;
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
        return -e.errno;
      }
    }
    Module$1["___syscall_readlinkat"] = ___syscall_readlinkat;
    function ___syscall_rmdir(path) {
      if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(13, 0, 1, path);
      try {
        path = SYSCALLS.getStr(path);
        FS.rmdir(path);
        return 0;
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
        return -e.errno;
      }
    }
    Module$1["___syscall_rmdir"] = ___syscall_rmdir;
    function ___syscall_stat64(path, buf) {
      if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(14, 0, 1, path, buf);
      try {
        path = SYSCALLS.getStr(path);
        return SYSCALLS.writeStat(buf, FS.stat(path));
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
        return -e.errno;
      }
    }
    Module$1["___syscall_stat64"] = ___syscall_stat64;
    function ___syscall_unlinkat(dirfd, path, flags) {
      if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(15, 0, 1, dirfd, path, flags);
      try {
        path = SYSCALLS.getStr(path);
        path = SYSCALLS.calculateAt(dirfd, path);
        if (flags === 0) FS.unlink(path);
        else if (flags === 512) FS.rmdir(path);
        else abort("Invalid flags passed to unlinkat");
        return 0;
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
        return -e.errno;
      }
    }
    Module$1["___syscall_unlinkat"] = ___syscall_unlinkat;
    var __abort_js = () => abort("");
    Module$1["__abort_js"] = __abort_js;
    var __emscripten_init_main_thread_js = (tb) => {
      __emscripten_thread_init(tb, !ENVIRONMENT_IS_WORKER, 1, !ENVIRONMENT_IS_WEB, 2097152, false);
      PThread.threadInitTLS();
    };
    Module$1["__emscripten_init_main_thread_js"] = __emscripten_init_main_thread_js;
    var maybeExit = () => {
      if (!keepRuntimeAlive()) try {
        if (ENVIRONMENT_IS_PTHREAD) __emscripten_thread_exit(EXITSTATUS);
        else _exit(EXITSTATUS);
      } catch (e) {
        handleException(e);
      }
    };
    Module$1["maybeExit"] = maybeExit;
    var callUserCallback = (func) => {
      if (ABORT) return;
      try {
        func();
        maybeExit();
      } catch (e) {
        handleException(e);
      }
    };
    Module$1["callUserCallback"] = callUserCallback;
    var __emscripten_thread_mailbox_await = (pthread_ptr) => {
      if (typeof Atomics.waitAsync === "function") {
        var wait = Atomics.waitAsync(HEAP32, pthread_ptr >> 2, pthread_ptr);
        wait.value.then(checkMailbox);
        var waitingAsync = pthread_ptr + 128;
        Atomics.store(HEAP32, waitingAsync >> 2, 1);
      }
    };
    Module$1["__emscripten_thread_mailbox_await"] = __emscripten_thread_mailbox_await;
    var checkMailbox = () => {
      var pthread_ptr = _pthread_self();
      if (pthread_ptr) {
        __emscripten_thread_mailbox_await(pthread_ptr);
        callUserCallback(__emscripten_check_mailbox);
      }
    };
    Module$1["checkMailbox"] = checkMailbox;
    var __emscripten_notify_mailbox_postmessage = (targetThread, currThreadId) => {
      if (targetThread == currThreadId) setTimeout(checkMailbox);
      else if (ENVIRONMENT_IS_PTHREAD) postMessage({
        targetThread,
        cmd: "checkMailbox"
      });
      else {
        var worker = PThread.pthreads[targetThread];
        if (!worker) return;
        worker.postMessage({ cmd: "checkMailbox" });
      }
    };
    Module$1["__emscripten_notify_mailbox_postmessage"] = __emscripten_notify_mailbox_postmessage;
    var proxiedJSCallArgs = [];
    Module$1["proxiedJSCallArgs"] = proxiedJSCallArgs;
    var __emscripten_receive_on_main_thread_js = (funcIndex, emAsmAddr, callingThread, numCallArgs, args) => {
      numCallArgs /= 2;
      proxiedJSCallArgs.length = numCallArgs;
      var b = args >> 3;
      for (var i = 0; i < numCallArgs; i++) if (HEAP64[b + 2 * i]) proxiedJSCallArgs[i] = HEAP64[b + 2 * i + 1];
      else proxiedJSCallArgs[i] = HEAPF64[b + 2 * i + 1];
      var func = emAsmAddr ? ASM_CONSTS[emAsmAddr] : proxiedFunctionTable[funcIndex];
      PThread.currentProxiedOperationCallerThread = callingThread;
      var rtn = func(...proxiedJSCallArgs);
      PThread.currentProxiedOperationCallerThread = 0;
      return rtn;
    };
    Module$1["__emscripten_receive_on_main_thread_js"] = __emscripten_receive_on_main_thread_js;
    var __emscripten_runtime_keepalive_clear = () => {
      noExitRuntime = false;
      runtimeKeepaliveCounter = 0;
    };
    Module$1["__emscripten_runtime_keepalive_clear"] = __emscripten_runtime_keepalive_clear;
    var __emscripten_thread_cleanup = (thread) => {
      if (!ENVIRONMENT_IS_PTHREAD) cleanupThread(thread);
      else postMessage({
        cmd: "cleanupThread",
        thread
      });
    };
    Module$1["__emscripten_thread_cleanup"] = __emscripten_thread_cleanup;
    var __emscripten_thread_set_strongref = (thread) => {
      if (ENVIRONMENT_IS_NODE) PThread.pthreads[thread].ref();
    };
    Module$1["__emscripten_thread_set_strongref"] = __emscripten_thread_set_strongref;
    function __gmtime_js(time, tmPtr) {
      time = bigintToI53Checked(time);
      var date = /* @__PURE__ */ new Date(time * 1e3);
      HEAP32[tmPtr >> 2] = date.getUTCSeconds();
      HEAP32[tmPtr + 4 >> 2] = date.getUTCMinutes();
      HEAP32[tmPtr + 8 >> 2] = date.getUTCHours();
      HEAP32[tmPtr + 12 >> 2] = date.getUTCDate();
      HEAP32[tmPtr + 16 >> 2] = date.getUTCMonth();
      HEAP32[tmPtr + 20 >> 2] = date.getUTCFullYear() - 1900;
      HEAP32[tmPtr + 24 >> 2] = date.getUTCDay();
      var start = Date.UTC(date.getUTCFullYear(), 0, 1, 0, 0, 0, 0);
      var yday = (date.getTime() - start) / (1e3 * 60 * 60 * 24) | 0;
      HEAP32[tmPtr + 28 >> 2] = yday;
    }
    Module$1["__gmtime_js"] = __gmtime_js;
    var isLeapYear = (year) => year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    Module$1["isLeapYear"] = isLeapYear;
    var MONTH_DAYS_LEAP_CUMULATIVE = [
      0,
      31,
      60,
      91,
      121,
      152,
      182,
      213,
      244,
      274,
      305,
      335
    ];
    Module$1["MONTH_DAYS_LEAP_CUMULATIVE"] = MONTH_DAYS_LEAP_CUMULATIVE;
    var MONTH_DAYS_REGULAR_CUMULATIVE = [
      0,
      31,
      59,
      90,
      120,
      151,
      181,
      212,
      243,
      273,
      304,
      334
    ];
    Module$1["MONTH_DAYS_REGULAR_CUMULATIVE"] = MONTH_DAYS_REGULAR_CUMULATIVE;
    var ydayFromDate = (date) => {
      var leap = isLeapYear(date.getFullYear());
      var monthDaysCumulative = leap ? MONTH_DAYS_LEAP_CUMULATIVE : MONTH_DAYS_REGULAR_CUMULATIVE;
      var yday = monthDaysCumulative[date.getMonth()] + date.getDate() - 1;
      return yday;
    };
    Module$1["ydayFromDate"] = ydayFromDate;
    function __localtime_js(time, tmPtr) {
      time = bigintToI53Checked(time);
      var date = /* @__PURE__ */ new Date(time * 1e3);
      HEAP32[tmPtr >> 2] = date.getSeconds();
      HEAP32[tmPtr + 4 >> 2] = date.getMinutes();
      HEAP32[tmPtr + 8 >> 2] = date.getHours();
      HEAP32[tmPtr + 12 >> 2] = date.getDate();
      HEAP32[tmPtr + 16 >> 2] = date.getMonth();
      HEAP32[tmPtr + 20 >> 2] = date.getFullYear() - 1900;
      HEAP32[tmPtr + 24 >> 2] = date.getDay();
      var yday = ydayFromDate(date) | 0;
      HEAP32[tmPtr + 28 >> 2] = yday;
      HEAP32[tmPtr + 36 >> 2] = -(date.getTimezoneOffset() * 60);
      var start = new Date(date.getFullYear(), 0, 1);
      var summerOffset = new Date(date.getFullYear(), 6, 1).getTimezoneOffset();
      var winterOffset = start.getTimezoneOffset();
      var dst = (summerOffset != winterOffset && date.getTimezoneOffset() == Math.min(winterOffset, summerOffset)) | 0;
      HEAP32[tmPtr + 32 >> 2] = dst;
    }
    Module$1["__localtime_js"] = __localtime_js;
    var __mktime_js = function(tmPtr) {
      var ret = (() => {
        var date = new Date(HEAP32[tmPtr + 20 >> 2] + 1900, HEAP32[tmPtr + 16 >> 2], HEAP32[tmPtr + 12 >> 2], HEAP32[tmPtr + 8 >> 2], HEAP32[tmPtr + 4 >> 2], HEAP32[tmPtr >> 2], 0);
        var dst = HEAP32[tmPtr + 32 >> 2];
        var guessedOffset = date.getTimezoneOffset();
        var start = new Date(date.getFullYear(), 0, 1);
        var summerOffset = new Date(date.getFullYear(), 6, 1).getTimezoneOffset();
        var winterOffset = start.getTimezoneOffset();
        var dstOffset = Math.min(winterOffset, summerOffset);
        if (dst < 0) HEAP32[tmPtr + 32 >> 2] = Number(summerOffset != winterOffset && dstOffset == guessedOffset);
        else if (dst > 0 != (dstOffset == guessedOffset)) {
          var nonDstOffset = Math.max(winterOffset, summerOffset);
          var trueOffset = dst > 0 ? dstOffset : nonDstOffset;
          date.setTime(date.getTime() + (trueOffset - guessedOffset) * 6e4);
        }
        HEAP32[tmPtr + 24 >> 2] = date.getDay();
        var yday = ydayFromDate(date) | 0;
        HEAP32[tmPtr + 28 >> 2] = yday;
        HEAP32[tmPtr >> 2] = date.getSeconds();
        HEAP32[tmPtr + 4 >> 2] = date.getMinutes();
        HEAP32[tmPtr + 8 >> 2] = date.getHours();
        HEAP32[tmPtr + 12 >> 2] = date.getDate();
        HEAP32[tmPtr + 16 >> 2] = date.getMonth();
        HEAP32[tmPtr + 20 >> 2] = date.getYear();
        var timeMs = date.getTime();
        if (isNaN(timeMs)) return -1;
        return timeMs / 1e3;
      })();
      return BigInt(ret);
    };
    Module$1["__mktime_js"] = __mktime_js;
    function __mmap_js(len, prot, flags, fd, offset, allocated, addr) {
      if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(16, 0, 1, len, prot, flags, fd, offset, allocated, addr);
      offset = bigintToI53Checked(offset);
      try {
        if (isNaN(offset)) return 61;
        var stream = SYSCALLS.getStreamFromFD(fd);
        var res = FS.mmap(stream, len, offset, prot, flags);
        var ptr = res.ptr;
        HEAP32[allocated >> 2] = res.allocated;
        HEAPU32[addr >> 2] = ptr;
        return 0;
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
        return -e.errno;
      }
    }
    Module$1["__mmap_js"] = __mmap_js;
    function __munmap_js(addr, len, prot, flags, fd, offset) {
      if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(17, 0, 1, addr, len, prot, flags, fd, offset);
      offset = bigintToI53Checked(offset);
      try {
        var stream = SYSCALLS.getStreamFromFD(fd);
        if (prot & 2) SYSCALLS.doMsync(addr, stream, len, flags, offset);
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
        return -e.errno;
      }
    }
    Module$1["__munmap_js"] = __munmap_js;
    var timers = {};
    Module$1["timers"] = timers;
    var _emscripten_get_now = () => performance.timeOrigin + performance.now();
    Module$1["_emscripten_get_now"] = _emscripten_get_now;
    function __setitimer_js(which, timeout_ms) {
      if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(18, 0, 1, which, timeout_ms);
      if (timers[which]) {
        clearTimeout(timers[which].id);
        delete timers[which];
      }
      if (!timeout_ms) return 0;
      var id = setTimeout(() => {
        delete timers[which];
        callUserCallback(() => __emscripten_timeout(which, _emscripten_get_now()));
      }, timeout_ms);
      timers[which] = {
        id,
        timeout_ms
      };
      return 0;
    }
    Module$1["__setitimer_js"] = __setitimer_js;
    var __tzset_js = (timezone, daylight, std_name, dst_name) => {
      var currentYear = (/* @__PURE__ */ new Date()).getFullYear();
      var winter = new Date(currentYear, 0, 1);
      var summer = new Date(currentYear, 6, 1);
      var winterOffset = winter.getTimezoneOffset();
      var summerOffset = summer.getTimezoneOffset();
      var stdTimezoneOffset = Math.max(winterOffset, summerOffset);
      HEAPU32[timezone >> 2] = stdTimezoneOffset * 60;
      HEAP32[daylight >> 2] = Number(winterOffset != summerOffset);
      var extractZone = (timezoneOffset) => {
        var sign = timezoneOffset >= 0 ? "-" : "+";
        var absOffset = Math.abs(timezoneOffset);
        var hours = String(Math.floor(absOffset / 60)).padStart(2, "0");
        var minutes = String(absOffset % 60).padStart(2, "0");
        return `UTC${sign}${hours}${minutes}`;
      };
      var winterName = extractZone(winterOffset);
      var summerName = extractZone(summerOffset);
      if (summerOffset < winterOffset) {
        stringToUTF8(winterName, std_name, 17);
        stringToUTF8(summerName, dst_name, 17);
      } else {
        stringToUTF8(winterName, dst_name, 17);
        stringToUTF8(summerName, std_name, 17);
      }
    };
    Module$1["__tzset_js"] = __tzset_js;
    var _emscripten_date_now = () => Date.now();
    Module$1["_emscripten_date_now"] = _emscripten_date_now;
    var nowIsMonotonic = 1;
    Module$1["nowIsMonotonic"] = nowIsMonotonic;
    var checkWasiClock = (clock_id) => clock_id >= 0 && clock_id <= 3;
    Module$1["checkWasiClock"] = checkWasiClock;
    function _clock_time_get(clk_id, ignored_precision, ptime) {
      ignored_precision = bigintToI53Checked(ignored_precision);
      if (!checkWasiClock(clk_id)) return 28;
      var now;
      if (clk_id === 0) now = _emscripten_date_now();
      else if (nowIsMonotonic) now = _emscripten_get_now();
      else return 52;
      var nsec = Math.round(now * 1e3 * 1e3);
      HEAP64[ptime >> 3] = BigInt(nsec);
      return 0;
    }
    Module$1["_clock_time_get"] = _clock_time_get;
    var readEmAsmArgsArray = [];
    Module$1["readEmAsmArgsArray"] = readEmAsmArgsArray;
    var readEmAsmArgs = (sigPtr, buf) => {
      readEmAsmArgsArray.length = 0;
      var ch;
      while (ch = HEAPU8[sigPtr++]) {
        var wide = ch != 105;
        wide &= ch != 112;
        buf += wide && buf % 8 ? 4 : 0;
        readEmAsmArgsArray.push(ch == 112 ? HEAPU32[buf >> 2] : ch == 106 ? HEAP64[buf >> 3] : ch == 105 ? HEAP32[buf >> 2] : HEAPF64[buf >> 3]);
        buf += wide ? 8 : 4;
      }
      return readEmAsmArgsArray;
    };
    Module$1["readEmAsmArgs"] = readEmAsmArgs;
    var runEmAsmFunction = (code, sigPtr, argbuf) => {
      var args = readEmAsmArgs(sigPtr, argbuf);
      return ASM_CONSTS[code](...args);
    };
    Module$1["runEmAsmFunction"] = runEmAsmFunction;
    var _emscripten_asm_const_int = (code, sigPtr, argbuf) => runEmAsmFunction(code, sigPtr, argbuf);
    Module$1["_emscripten_asm_const_int"] = _emscripten_asm_const_int;
    var warnOnce = (text) => {
      warnOnce.shown ||= {};
      if (!warnOnce.shown[text]) {
        warnOnce.shown[text] = 1;
        if (ENVIRONMENT_IS_NODE) text = "warning: " + text;
        err(text);
      }
    };
    Module$1["warnOnce"] = warnOnce;
    var _emscripten_check_blocking_allowed = () => {
    };
    Module$1["_emscripten_check_blocking_allowed"] = _emscripten_check_blocking_allowed;
    var _emscripten_errn = (str, len) => err(UTF8ToString(str, len));
    Module$1["_emscripten_errn"] = _emscripten_errn;
    var runtimeKeepalivePush = () => {
      runtimeKeepaliveCounter += 1;
    };
    Module$1["runtimeKeepalivePush"] = runtimeKeepalivePush;
    var _emscripten_exit_with_live_runtime = () => {
      runtimeKeepalivePush();
      throw "unwind";
    };
    Module$1["_emscripten_exit_with_live_runtime"] = _emscripten_exit_with_live_runtime;
    var getHeapMax = () => HEAPU8.length;
    Module$1["getHeapMax"] = getHeapMax;
    var _emscripten_get_heap_max = () => getHeapMax();
    Module$1["_emscripten_get_heap_max"] = _emscripten_get_heap_max;
    var _emscripten_num_logical_cores = () => ENVIRONMENT_IS_NODE ? require$1("os").cpus().length : navigator["hardwareConcurrency"];
    Module$1["_emscripten_num_logical_cores"] = _emscripten_num_logical_cores;
    var _emscripten_pc_get_function = (pc) => {
      abort("Cannot use emscripten_pc_get_function without -sUSE_OFFSET_CONVERTER");
      return 0;
    };
    Module$1["_emscripten_pc_get_function"] = _emscripten_pc_get_function;
    var _emscripten_resize_heap = (requestedSize) => {
      var oldSize = HEAPU8.length;
      requestedSize >>>= 0;
      return false;
    };
    Module$1["_emscripten_resize_heap"] = _emscripten_resize_heap;
    var convertFrameToPC = (frame) => {
      abort("Cannot use convertFrameToPC (needed by __builtin_return_address) without -sUSE_OFFSET_CONVERTER");
      return 0;
    };
    Module$1["convertFrameToPC"] = convertFrameToPC;
    var UNWIND_CACHE = {};
    Module$1["UNWIND_CACHE"] = UNWIND_CACHE;
    var saveInUnwindCache = (callstack) => {
      callstack.forEach((frame) => {
        var pc = convertFrameToPC(frame);
        if (pc) UNWIND_CACHE[pc] = frame;
      });
    };
    Module$1["saveInUnwindCache"] = saveInUnwindCache;
    var jsStackTrace = () => (/* @__PURE__ */ new Error()).stack.toString();
    Module$1["jsStackTrace"] = jsStackTrace;
    var _emscripten_stack_snapshot = () => {
      var callstack = jsStackTrace().split("\n");
      if (callstack[0] == "Error") callstack.shift();
      saveInUnwindCache(callstack);
      UNWIND_CACHE.last_addr = convertFrameToPC(callstack[3]);
      UNWIND_CACHE.last_stack = callstack;
      return UNWIND_CACHE.last_addr;
    };
    Module$1["_emscripten_stack_snapshot"] = _emscripten_stack_snapshot;
    var _emscripten_stack_unwind_buffer = (addr, buffer, count) => {
      var stack;
      if (UNWIND_CACHE.last_addr == addr) stack = UNWIND_CACHE.last_stack;
      else {
        stack = jsStackTrace().split("\n");
        if (stack[0] == "Error") stack.shift();
        saveInUnwindCache(stack);
      }
      var offset = 3;
      while (stack[offset] && convertFrameToPC(stack[offset]) != addr) ++offset;
      for (var i = 0; i < count && stack[i + offset]; ++i) HEAP32[buffer + i * 4 >> 2] = convertFrameToPC(stack[i + offset]);
      return i;
    };
    Module$1["_emscripten_stack_unwind_buffer"] = _emscripten_stack_unwind_buffer;
    var ENV = {};
    Module$1["ENV"] = ENV;
    var getExecutableName = () => thisProgram || "./this.program";
    Module$1["getExecutableName"] = getExecutableName;
    var getEnvStrings = () => {
      if (!getEnvStrings.strings) {
        var lang = (typeof navigator == "object" && navigator.languages && navigator.languages[0] || "C").replace("-", "_") + ".UTF-8";
        var env = {
          USER: "web_user",
          LOGNAME: "web_user",
          PATH: "/",
          PWD: "/",
          HOME: "/home/web_user",
          LANG: lang,
          _: getExecutableName()
        };
        for (var x in ENV) if (ENV[x] === void 0) delete env[x];
        else env[x] = ENV[x];
        var strings = [];
        for (var x in env) strings.push(`${x}=${env[x]}`);
        getEnvStrings.strings = strings;
      }
      return getEnvStrings.strings;
    };
    Module$1["getEnvStrings"] = getEnvStrings;
    var stringToAscii = (str, buffer) => {
      for (var i = 0; i < str.length; ++i) HEAP8[buffer++] = str.charCodeAt(i);
      HEAP8[buffer] = 0;
    };
    Module$1["stringToAscii"] = stringToAscii;
    var _environ_get = function(__environ, environ_buf) {
      if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(19, 0, 1, __environ, environ_buf);
      var bufSize = 0;
      getEnvStrings().forEach((string, i) => {
        var ptr = environ_buf + bufSize;
        HEAPU32[__environ + i * 4 >> 2] = ptr;
        stringToAscii(string, ptr);
        bufSize += string.length + 1;
      });
      return 0;
    };
    Module$1["_environ_get"] = _environ_get;
    var _environ_sizes_get = function(penviron_count, penviron_buf_size) {
      if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(20, 0, 1, penviron_count, penviron_buf_size);
      var strings = getEnvStrings();
      HEAPU32[penviron_count >> 2] = strings.length;
      var bufSize = 0;
      strings.forEach((string) => bufSize += string.length + 1);
      HEAPU32[penviron_buf_size >> 2] = bufSize;
      return 0;
    };
    Module$1["_environ_sizes_get"] = _environ_sizes_get;
    function _fd_close(fd) {
      if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(21, 0, 1, fd);
      try {
        var stream = SYSCALLS.getStreamFromFD(fd);
        FS.close(stream);
        return 0;
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
        return e.errno;
      }
    }
    Module$1["_fd_close"] = _fd_close;
    var doReadv = (stream, iov, iovcnt, offset) => {
      var ret = 0;
      for (var i = 0; i < iovcnt; i++) {
        var ptr = HEAPU32[iov >> 2];
        var len = HEAPU32[iov + 4 >> 2];
        iov += 8;
        var curr = FS.read(stream, HEAP8, ptr, len, offset);
        if (curr < 0) return -1;
        ret += curr;
        if (curr < len) break;
        if (typeof offset != "undefined") offset += curr;
      }
      return ret;
    };
    Module$1["doReadv"] = doReadv;
    function _fd_read(fd, iov, iovcnt, pnum) {
      if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(22, 0, 1, fd, iov, iovcnt, pnum);
      try {
        var stream = SYSCALLS.getStreamFromFD(fd);
        var num = doReadv(stream, iov, iovcnt);
        HEAPU32[pnum >> 2] = num;
        return 0;
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
        return e.errno;
      }
    }
    Module$1["_fd_read"] = _fd_read;
    function _fd_seek(fd, offset, whence, newOffset) {
      if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(23, 0, 1, fd, offset, whence, newOffset);
      offset = bigintToI53Checked(offset);
      try {
        if (isNaN(offset)) return 61;
        var stream = SYSCALLS.getStreamFromFD(fd);
        FS.llseek(stream, offset, whence);
        HEAP64[newOffset >> 3] = BigInt(stream.position);
        if (stream.getdents && offset === 0 && whence === 0) stream.getdents = null;
        return 0;
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
        return e.errno;
      }
    }
    Module$1["_fd_seek"] = _fd_seek;
    var doWritev = (stream, iov, iovcnt, offset) => {
      var ret = 0;
      for (var i = 0; i < iovcnt; i++) {
        var ptr = HEAPU32[iov >> 2];
        var len = HEAPU32[iov + 4 >> 2];
        iov += 8;
        var curr = FS.write(stream, HEAP8, ptr, len, offset);
        if (curr < 0) return -1;
        ret += curr;
        if (curr < len) break;
        if (typeof offset != "undefined") offset += curr;
      }
      return ret;
    };
    Module$1["doWritev"] = doWritev;
    function _fd_write(fd, iov, iovcnt, pnum) {
      if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(24, 0, 1, fd, iov, iovcnt, pnum);
      try {
        var stream = SYSCALLS.getStreamFromFD(fd);
        var num = doWritev(stream, iov, iovcnt);
        HEAPU32[pnum >> 2] = num;
        return 0;
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
        return e.errno;
      }
    }
    Module$1["_fd_write"] = _fd_write;
    var _llvm_eh_typeid_for = (type) => type;
    Module$1["_llvm_eh_typeid_for"] = _llvm_eh_typeid_for;
    function _random_get(buffer, size) {
      try {
        randomFill(HEAPU8.subarray(buffer, buffer + size));
        return 0;
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
        return e.errno;
      }
    }
    Module$1["_random_get"] = _random_get;
    PThread.init();
    FS.createPreloadedFile = FS_createPreloadedFile;
    FS.staticInit();
    MEMFS.doesNotExistError = new FS.ErrnoError(44);
    MEMFS.doesNotExistError.stack = "<generic error, no stack>";
    var proxiedFunctionTable = [
      _proc_exit,
      exitOnMainThread,
      pthreadCreateProxied,
      ___syscall_fcntl64,
      ___syscall_fstat64,
      ___syscall_getcwd,
      ___syscall_getdents64,
      ___syscall_ioctl,
      ___syscall_lstat64,
      ___syscall_mkdirat,
      ___syscall_newfstatat,
      ___syscall_openat,
      ___syscall_readlinkat,
      ___syscall_rmdir,
      ___syscall_stat64,
      ___syscall_unlinkat,
      __mmap_js,
      __munmap_js,
      __setitimer_js,
      _environ_get,
      _environ_sizes_get,
      _fd_close,
      _fd_read,
      _fd_seek,
      _fd_write
    ];
    var wasmImports;
    function assignWasmImports() {
      wasmImports = {
        da: HaveOffsetConverter,
        v: ___cxa_begin_catch,
        y: ___cxa_end_catch,
        b: ___cxa_find_matching_catch_2,
        n: ___cxa_find_matching_catch_3,
        r: ___cxa_find_matching_catch_4,
        ba: ___cxa_rethrow,
        c: ___cxa_throw,
        M: ___cxa_uncaught_exceptions,
        sa: ___pthread_create_js,
        g: ___resumeException,
        O: ___syscall_fcntl64,
        Ka: ___syscall_fstat64,
        Ga: ___syscall_getcwd,
        qa: ___syscall_getdents64,
        La: ___syscall_ioctl,
        Ia: ___syscall_lstat64,
        za: ___syscall_mkdirat,
        Ha: ___syscall_newfstatat,
        aa: ___syscall_openat,
        pa: ___syscall_readlinkat,
        ib: ___syscall_rmdir,
        Ja: ___syscall_stat64,
        jb: ___syscall_unlinkat,
        Qa: __abort_js,
        Ca: __emscripten_init_main_thread_js,
        gb: __emscripten_notify_mailbox_postmessage,
        ta: __emscripten_receive_on_main_thread_js,
        db: __emscripten_runtime_keepalive_clear,
        Z: __emscripten_thread_cleanup,
        Ba: __emscripten_thread_mailbox_await,
        Na: __emscripten_thread_set_strongref,
        wa: __gmtime_js,
        xa: __localtime_js,
        ya: __mktime_js,
        ua: __mmap_js,
        va: __munmap_js,
        eb: __setitimer_js,
        Sa: __tzset_js,
        Pa: _clock_time_get,
        ea: _emscripten_asm_const_int,
        _: _emscripten_check_blocking_allowed,
        Oa: _emscripten_date_now,
        I: _emscripten_errn,
        Ma: _emscripten_exit_with_live_runtime,
        hb: _emscripten_get_heap_max,
        p: _emscripten_get_now,
        J: _emscripten_num_logical_cores,
        ca: _emscripten_pc_get_function,
        fb: _emscripten_resize_heap,
        Ua: _emscripten_stack_snapshot,
        Ta: _emscripten_stack_unwind_buffer,
        Da: _environ_get,
        Ea: _environ_sizes_get,
        ra: _exit,
        P: _fd_close,
        $: _fd_read,
        Aa: _fd_seek,
        N: _fd_write,
        T: invoke_dii,
        S: invoke_diiii,
        Q: invoke_fii,
        t: invoke_i,
        D: invoke_if,
        h: invoke_ii,
        k: invoke_iii,
        m: invoke_iiii,
        s: invoke_iiiii,
        cb: invoke_iiiiid,
        C: invoke_iiiiii,
        x: invoke_iiiiiii,
        ma: invoke_iiiiiiii,
        H: invoke_iiiiiiiiiiii,
        X: invoke_iiiiij,
        bb: invoke_iiiij,
        ja: invoke_iiij,
        F: invoke_iij,
        fa: invoke_iijj,
        W: invoke_iji,
        $a: invoke_ijijj,
        na: invoke_j,
        E: invoke_ji,
        K: invoke_jii,
        l: invoke_v,
        Xa: invoke_vd,
        d: invoke_vi,
        ka: invoke_vidddd,
        U: invoke_vif,
        z: invoke_viff,
        R: invoke_vifii,
        e: invoke_vii,
        V: invoke_viif,
        f: invoke_viii,
        i: invoke_viiii,
        la: invoke_viiiid,
        ia: invoke_viiiif,
        j: invoke_viiiii,
        o: invoke_viiiiii,
        q: invoke_viiiiiii,
        A: invoke_viiiiiiii,
        G: invoke_viiiiiiiii,
        B: invoke_viiiiiiiiii,
        ha: invoke_viiiiiiiiiii,
        L: invoke_viiiiiiiiiiiiiii,
        Va: invoke_viiiiiiiiiiiiiiiiii,
        Wa: invoke_viiiiijii,
        ga: invoke_viiijj,
        ab: invoke_viijjii,
        oa: invoke_vij,
        u: invoke_viji,
        Y: invoke_vjji,
        w: _llvm_eh_typeid_for,
        a: wasmMemory,
        Ra: _proc_exit,
        Fa: _random_get,
        Ya: retto_notify_cls_done,
        _a: retto_notify_det_done,
        Za: retto_notify_rec_done
      };
    }
    var wasmExports = await createWasm();
    var ___wasm_call_ctors = () => (___wasm_call_ctors = wasmExports["kb"])();
    var _alloc = Module$1["_alloc"] = (a0) => (_alloc = Module$1["_alloc"] = wasmExports["mb"])(a0);
    var _dealloc = Module$1["_dealloc"] = (a0, a1) => (_dealloc = Module$1["_dealloc"] = wasmExports["nb"])(a0, a1);
    var _retto_init = Module$1["_retto_init"] = (a0, a1, a2, a3, a4, a5, a6, a7) => (_retto_init = Module$1["_retto_init"] = wasmExports["ob"])(a0, a1, a2, a3, a4, a5, a6, a7);
    var _retto_rec = Module$1["_retto_rec"] = (a0, a1) => (_retto_rec = Module$1["_retto_rec"] = wasmExports["pb"])(a0, a1);
    var _pthread_self = () => (_pthread_self = wasmExports["qb"])();
    var ___cxa_free_exception = (a0) => (___cxa_free_exception = wasmExports["rb"])(a0);
    var __emscripten_tls_init = () => (__emscripten_tls_init = wasmExports["sb"])();
    var _emscripten_builtin_memalign = (a0, a1) => (_emscripten_builtin_memalign = wasmExports["tb"])(a0, a1);
    var __emscripten_thread_init = (a0, a1, a2, a3, a4, a5) => (__emscripten_thread_init = wasmExports["ub"])(a0, a1, a2, a3, a4, a5);
    var __emscripten_thread_crashed = () => (__emscripten_thread_crashed = wasmExports["vb"])();
    var __emscripten_run_on_main_thread_js = (a0, a1, a2, a3, a4) => (__emscripten_run_on_main_thread_js = wasmExports["wb"])(a0, a1, a2, a3, a4);
    var __emscripten_thread_free_data = (a0) => (__emscripten_thread_free_data = wasmExports["xb"])(a0);
    var __emscripten_thread_exit = (a0) => (__emscripten_thread_exit = wasmExports["yb"])(a0);
    var __emscripten_timeout = (a0, a1) => (__emscripten_timeout = wasmExports["zb"])(a0, a1);
    var __emscripten_check_mailbox = () => (__emscripten_check_mailbox = wasmExports["Ab"])();
    var _setThrew = (a0, a1) => (_setThrew = wasmExports["Bb"])(a0, a1);
    var __emscripten_tempret_set = (a0) => (__emscripten_tempret_set = wasmExports["Cb"])(a0);
    var _emscripten_stack_set_limits = (a0, a1) => (_emscripten_stack_set_limits = wasmExports["Db"])(a0, a1);
    var __emscripten_stack_restore = (a0) => (__emscripten_stack_restore = wasmExports["Eb"])(a0);
    var __emscripten_stack_alloc = (a0) => (__emscripten_stack_alloc = wasmExports["Fb"])(a0);
    var _emscripten_stack_get_current = () => (_emscripten_stack_get_current = wasmExports["Gb"])();
    var ___cxa_decrement_exception_refcount = (a0) => (___cxa_decrement_exception_refcount = wasmExports["Hb"])(a0);
    var ___cxa_increment_exception_refcount = (a0) => (___cxa_increment_exception_refcount = wasmExports["Ib"])(a0);
    var ___cxa_can_catch = (a0, a1, a2) => (___cxa_can_catch = wasmExports["Jb"])(a0, a1, a2);
    var ___cxa_get_exception_ptr = (a0) => (___cxa_get_exception_ptr = wasmExports["Kb"])(a0);
    function invoke_vii(index, a1, a2) {
      var sp = stackSave();
      try {
        getWasmTableEntry(index)(a1, a2);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0);
      }
    }
    function invoke_viii(index, a1, a2, a3) {
      var sp = stackSave();
      try {
        getWasmTableEntry(index)(a1, a2, a3);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0);
      }
    }
    function invoke_vi(index, a1) {
      var sp = stackSave();
      try {
        getWasmTableEntry(index)(a1);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0);
      }
    }
    function invoke_viiiif(index, a1, a2, a3, a4, a5) {
      var sp = stackSave();
      try {
        getWasmTableEntry(index)(a1, a2, a3, a4, a5);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0);
      }
    }
    function invoke_viiiii(index, a1, a2, a3, a4, a5) {
      var sp = stackSave();
      try {
        getWasmTableEntry(index)(a1, a2, a3, a4, a5);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0);
      }
    }
    function invoke_viiiiiii(index, a1, a2, a3, a4, a5, a6, a7) {
      var sp = stackSave();
      try {
        getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6, a7);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0);
      }
    }
    function invoke_viiii(index, a1, a2, a3, a4) {
      var sp = stackSave();
      try {
        getWasmTableEntry(index)(a1, a2, a3, a4);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0);
      }
    }
    function invoke_ii(index, a1) {
      var sp = stackSave();
      try {
        return getWasmTableEntry(index)(a1);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0);
      }
    }
    function invoke_i(index) {
      var sp = stackSave();
      try {
        return getWasmTableEntry(index)();
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0);
      }
    }
    function invoke_iii(index, a1, a2) {
      var sp = stackSave();
      try {
        return getWasmTableEntry(index)(a1, a2);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0);
      }
    }
    function invoke_viijjii(index, a1, a2, a3, a4, a5, a6) {
      var sp = stackSave();
      try {
        getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0);
      }
    }
    function invoke_ijijj(index, a1, a2, a3, a4) {
      var sp = stackSave();
      try {
        return getWasmTableEntry(index)(a1, a2, a3, a4);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0);
      }
    }
    function invoke_iji(index, a1, a2) {
      var sp = stackSave();
      try {
        return getWasmTableEntry(index)(a1, a2);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0);
      }
    }
    function invoke_v(index) {
      var sp = stackSave();
      try {
        getWasmTableEntry(index)();
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0);
      }
    }
    function invoke_viif(index, a1, a2, a3) {
      var sp = stackSave();
      try {
        getWasmTableEntry(index)(a1, a2, a3);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0);
      }
    }
    function invoke_vif(index, a1, a2) {
      var sp = stackSave();
      try {
        getWasmTableEntry(index)(a1, a2);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0);
      }
    }
    function invoke_ji(index, a1) {
      var sp = stackSave();
      try {
        return getWasmTableEntry(index)(a1);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0);
        return 0n;
      }
    }
    function invoke_if(index, a1) {
      var sp = stackSave();
      try {
        return getWasmTableEntry(index)(a1);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0);
      }
    }
    function invoke_iiiii(index, a1, a2, a3, a4) {
      var sp = stackSave();
      try {
        return getWasmTableEntry(index)(a1, a2, a3, a4);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0);
      }
    }
    function invoke_viiiiii(index, a1, a2, a3, a4, a5, a6) {
      var sp = stackSave();
      try {
        getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0);
      }
    }
    function invoke_iiii(index, a1, a2, a3) {
      var sp = stackSave();
      try {
        return getWasmTableEntry(index)(a1, a2, a3);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0);
      }
    }
    function invoke_dii(index, a1, a2) {
      var sp = stackSave();
      try {
        return getWasmTableEntry(index)(a1, a2);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0);
      }
    }
    function invoke_diiii(index, a1, a2, a3, a4) {
      var sp = stackSave();
      try {
        return getWasmTableEntry(index)(a1, a2, a3, a4);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0);
      }
    }
    function invoke_viiiid(index, a1, a2, a3, a4, a5) {
      var sp = stackSave();
      try {
        getWasmTableEntry(index)(a1, a2, a3, a4, a5);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0);
      }
    }
    function invoke_vidddd(index, a1, a2, a3, a4, a5) {
      var sp = stackSave();
      try {
        getWasmTableEntry(index)(a1, a2, a3, a4, a5);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0);
      }
    }
    function invoke_viiiiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10) {
      var sp = stackSave();
      try {
        getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6, a7, a8, a9, a10);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0);
      }
    }
    function invoke_viiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8) {
      var sp = stackSave();
      try {
        getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6, a7, a8);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0);
      }
    }
    function invoke_iiiiiiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11) {
      var sp = stackSave();
      try {
        return getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0);
      }
    }
    function invoke_vd(index, a1) {
      var sp = stackSave();
      try {
        getWasmTableEntry(index)(a1);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0);
      }
    }
    function invoke_viiiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9) {
      var sp = stackSave();
      try {
        getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6, a7, a8, a9);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0);
      }
    }
    function invoke_vifii(index, a1, a2, a3, a4) {
      var sp = stackSave();
      try {
        getWasmTableEntry(index)(a1, a2, a3, a4);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0);
      }
    }
    function invoke_iiij(index, a1, a2, a3) {
      var sp = stackSave();
      try {
        return getWasmTableEntry(index)(a1, a2, a3);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0);
      }
    }
    function invoke_viji(index, a1, a2, a3) {
      var sp = stackSave();
      try {
        getWasmTableEntry(index)(a1, a2, a3);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0);
      }
    }
    function invoke_viiiiiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11) {
      var sp = stackSave();
      try {
        getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0);
      }
    }
    function invoke_iiiiiii(index, a1, a2, a3, a4, a5, a6) {
      var sp = stackSave();
      try {
        return getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0);
      }
    }
    function invoke_iij(index, a1, a2) {
      var sp = stackSave();
      try {
        return getWasmTableEntry(index)(a1, a2);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0);
      }
    }
    function invoke_viiiiijii(index, a1, a2, a3, a4, a5, a6, a7, a8) {
      var sp = stackSave();
      try {
        getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6, a7, a8);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0);
      }
    }
    function invoke_viiiiiiiiiiiiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13, a14, a15, a16, a17, a18) {
      var sp = stackSave();
      try {
        getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13, a14, a15, a16, a17, a18);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0);
      }
    }
    function invoke_viiijj(index, a1, a2, a3, a4, a5) {
      var sp = stackSave();
      try {
        getWasmTableEntry(index)(a1, a2, a3, a4, a5);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0);
      }
    }
    function invoke_jii(index, a1, a2) {
      var sp = stackSave();
      try {
        return getWasmTableEntry(index)(a1, a2);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0);
        return 0n;
      }
    }
    function invoke_iijj(index, a1, a2, a3) {
      var sp = stackSave();
      try {
        return getWasmTableEntry(index)(a1, a2, a3);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0);
      }
    }
    function invoke_iiiiii(index, a1, a2, a3, a4, a5) {
      var sp = stackSave();
      try {
        return getWasmTableEntry(index)(a1, a2, a3, a4, a5);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0);
      }
    }
    function invoke_fii(index, a1, a2) {
      var sp = stackSave();
      try {
        return getWasmTableEntry(index)(a1, a2);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0);
      }
    }
    function invoke_viff(index, a1, a2, a3) {
      var sp = stackSave();
      try {
        getWasmTableEntry(index)(a1, a2, a3);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0);
      }
    }
    function invoke_vjji(index, a1, a2, a3) {
      var sp = stackSave();
      try {
        getWasmTableEntry(index)(a1, a2, a3);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0);
      }
    }
    function invoke_vij(index, a1, a2) {
      var sp = stackSave();
      try {
        getWasmTableEntry(index)(a1, a2);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0);
      }
    }
    function invoke_j(index) {
      var sp = stackSave();
      try {
        return getWasmTableEntry(index)();
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0);
        return 0n;
      }
    }
    function invoke_iiiiij(index, a1, a2, a3, a4, a5) {
      var sp = stackSave();
      try {
        return getWasmTableEntry(index)(a1, a2, a3, a4, a5);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0);
      }
    }
    function invoke_iiiiid(index, a1, a2, a3, a4, a5) {
      var sp = stackSave();
      try {
        return getWasmTableEntry(index)(a1, a2, a3, a4, a5);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0);
      }
    }
    function invoke_iiiiiiii(index, a1, a2, a3, a4, a5, a6, a7) {
      var sp = stackSave();
      try {
        return getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6, a7);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0);
      }
    }
    function invoke_viiiiiiiiiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13, a14, a15) {
      var sp = stackSave();
      try {
        getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13, a14, a15);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0);
      }
    }
    function invoke_iiiij(index, a1, a2, a3, a4) {
      var sp = stackSave();
      try {
        return getWasmTableEntry(index)(a1, a2, a3, a4);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0);
      }
    }
    function run() {
      if (runDependencies > 0) {
        dependenciesFulfilled = run;
        return;
      }
      if (ENVIRONMENT_IS_PTHREAD) {
        readyPromiseResolve(Module$1);
        initRuntime();
        return;
      }
      preRun();
      if (runDependencies > 0) {
        dependenciesFulfilled = run;
        return;
      }
      function doRun() {
        Module$1["calledRun"] = true;
        if (ABORT) return;
        initRuntime();
        readyPromiseResolve(Module$1);
        Module$1["onRuntimeInitialized"]?.();
        postRun();
      }
      if (Module$1["setStatus"]) {
        Module$1["setStatus"]("Running...");
        setTimeout(() => {
          setTimeout(() => Module$1["setStatus"](""), 1);
          doRun();
        }, 1);
      } else doRun();
    }
    if (Module$1["preInit"]) {
      if (typeof Module$1["preInit"] == "function") Module$1["preInit"] = [Module$1["preInit"]];
      while (Module$1["preInit"].length > 0) Module$1["preInit"].pop()();
    }
    run();
    moduleRtn = readyPromise;
    return moduleRtn;
  };
})();
var retto_wasm_default = Module;
var isPthread = globalThis.self?.name?.startsWith("em-pthread");
var isNode = typeof globalThis.process?.versions?.node == "string";
if (isNode) isPthread = (await import("worker_threads")).workerData === "em-pthread";
isPthread && Module();
function bind(fn, thisArg) {
  return function wrap() {
    return fn.apply(thisArg, arguments);
  };
}
var { toString } = Object.prototype;
var { getPrototypeOf } = Object;
var { iterator, toStringTag } = Symbol;
var kindOf = /* @__PURE__ */ ((cache) => (thing) => {
  const str = toString.call(thing);
  return cache[str] || (cache[str] = str.slice(8, -1).toLowerCase());
})(/* @__PURE__ */ Object.create(null));
var kindOfTest = (type) => {
  type = type.toLowerCase();
  return (thing) => kindOf(thing) === type;
};
var typeOfTest = (type) => (thing) => typeof thing === type;
var { isArray } = Array;
var isUndefined = typeOfTest("undefined");
function isBuffer(val) {
  return val !== null && !isUndefined(val) && val.constructor !== null && !isUndefined(val.constructor) && isFunction(val.constructor.isBuffer) && val.constructor.isBuffer(val);
}
var isArrayBuffer = kindOfTest("ArrayBuffer");
function isArrayBufferView(val) {
  let result;
  if (typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView) result = ArrayBuffer.isView(val);
  else result = val && val.buffer && isArrayBuffer(val.buffer);
  return result;
}
var isString = typeOfTest("string");
var isFunction = typeOfTest("function");
var isNumber = typeOfTest("number");
var isObject = (thing) => thing !== null && typeof thing === "object";
var isBoolean = (thing) => thing === true || thing === false;
var isPlainObject = (val) => {
  if (kindOf(val) !== "object") return false;
  const prototype$2 = getPrototypeOf(val);
  return (prototype$2 === null || prototype$2 === Object.prototype || Object.getPrototypeOf(prototype$2) === null) && !(toStringTag in val) && !(iterator in val);
};
var isDate = kindOfTest("Date");
var isFile = kindOfTest("File");
var isBlob = kindOfTest("Blob");
var isFileList = kindOfTest("FileList");
var isStream = (val) => isObject(val) && isFunction(val.pipe);
var isFormData = (thing) => {
  let kind;
  return thing && (typeof FormData === "function" && thing instanceof FormData || isFunction(thing.append) && ((kind = kindOf(thing)) === "formdata" || kind === "object" && isFunction(thing.toString) && thing.toString() === "[object FormData]"));
};
var isURLSearchParams = kindOfTest("URLSearchParams");
var [isReadableStream, isRequest, isResponse, isHeaders] = [
  "ReadableStream",
  "Request",
  "Response",
  "Headers"
].map(kindOfTest);
var trim = (str) => str.trim ? str.trim() : str.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, "");
function forEach(obj, fn, { allOwnKeys = false } = {}) {
  if (obj === null || typeof obj === "undefined") return;
  let i;
  let l;
  if (typeof obj !== "object") obj = [obj];
  if (isArray(obj)) for (i = 0, l = obj.length; i < l; i++) fn.call(null, obj[i], i, obj);
  else {
    const keys = allOwnKeys ? Object.getOwnPropertyNames(obj) : Object.keys(obj);
    const len = keys.length;
    let key;
    for (i = 0; i < len; i++) {
      key = keys[i];
      fn.call(null, obj[key], key, obj);
    }
  }
}
function findKey(obj, key) {
  key = key.toLowerCase();
  const keys = Object.keys(obj);
  let i = keys.length;
  let _key;
  while (i-- > 0) {
    _key = keys[i];
    if (key === _key.toLowerCase()) return _key;
  }
  return null;
}
var _global = (() => {
  if (typeof globalThis !== "undefined") return globalThis;
  return typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : global;
})();
var isContextDefined = (context) => !isUndefined(context) && context !== _global;
function merge() {
  const { caseless } = isContextDefined(this) && this || {};
  const result = {};
  const assignValue = (val, key) => {
    const targetKey = caseless && findKey(result, key) || key;
    if (isPlainObject(result[targetKey]) && isPlainObject(val)) result[targetKey] = merge(result[targetKey], val);
    else if (isPlainObject(val)) result[targetKey] = merge({}, val);
    else if (isArray(val)) result[targetKey] = val.slice();
    else result[targetKey] = val;
  };
  for (let i = 0, l = arguments.length; i < l; i++) arguments[i] && forEach(arguments[i], assignValue);
  return result;
}
var extend = (a, b, thisArg, { allOwnKeys } = {}) => {
  forEach(b, (val, key) => {
    if (thisArg && isFunction(val)) a[key] = bind(val, thisArg);
    else a[key] = val;
  }, { allOwnKeys });
  return a;
};
var stripBOM = (content) => {
  if (content.charCodeAt(0) === 65279) content = content.slice(1);
  return content;
};
var inherits = (constructor, superConstructor, props, descriptors$1) => {
  constructor.prototype = Object.create(superConstructor.prototype, descriptors$1);
  constructor.prototype.constructor = constructor;
  Object.defineProperty(constructor, "super", { value: superConstructor.prototype });
  props && Object.assign(constructor.prototype, props);
};
var toFlatObject = (sourceObj, destObj, filter2, propFilter) => {
  let props;
  let i;
  let prop;
  const merged = {};
  destObj = destObj || {};
  if (sourceObj == null) return destObj;
  do {
    props = Object.getOwnPropertyNames(sourceObj);
    i = props.length;
    while (i-- > 0) {
      prop = props[i];
      if ((!propFilter || propFilter(prop, sourceObj, destObj)) && !merged[prop]) {
        destObj[prop] = sourceObj[prop];
        merged[prop] = true;
      }
    }
    sourceObj = filter2 !== false && getPrototypeOf(sourceObj);
  } while (sourceObj && (!filter2 || filter2(sourceObj, destObj)) && sourceObj !== Object.prototype);
  return destObj;
};
var endsWith = (str, searchString, position) => {
  str = String(str);
  if (position === void 0 || position > str.length) position = str.length;
  position -= searchString.length;
  const lastIndex = str.indexOf(searchString, position);
  return lastIndex !== -1 && lastIndex === position;
};
var toArray = (thing) => {
  if (!thing) return null;
  if (isArray(thing)) return thing;
  let i = thing.length;
  if (!isNumber(i)) return null;
  const arr = new Array(i);
  while (i-- > 0) arr[i] = thing[i];
  return arr;
};
var isTypedArray = /* @__PURE__ */ ((TypedArray) => {
  return (thing) => {
    return TypedArray && thing instanceof TypedArray;
  };
})(typeof Uint8Array !== "undefined" && getPrototypeOf(Uint8Array));
var forEachEntry = (obj, fn) => {
  const generator = obj && obj[iterator];
  const _iterator = generator.call(obj);
  let result;
  while ((result = _iterator.next()) && !result.done) {
    const pair = result.value;
    fn.call(obj, pair[0], pair[1]);
  }
};
var matchAll = (regExp, str) => {
  let matches;
  const arr = [];
  while ((matches = regExp.exec(str)) !== null) arr.push(matches);
  return arr;
};
var isHTMLForm = kindOfTest("HTMLFormElement");
var toCamelCase = (str) => {
  return str.toLowerCase().replace(/[-_\s]([a-z\d])(\w*)/g, function replacer(m, p1, p2) {
    return p1.toUpperCase() + p2;
  });
};
var hasOwnProperty = (({ hasOwnProperty: hasOwnProperty$1 }) => (obj, prop) => hasOwnProperty$1.call(obj, prop))(Object.prototype);
var isRegExp = kindOfTest("RegExp");
var reduceDescriptors = (obj, reducer) => {
  const descriptors$1 = Object.getOwnPropertyDescriptors(obj);
  const reducedDescriptors = {};
  forEach(descriptors$1, (descriptor, name) => {
    let ret;
    if ((ret = reducer(descriptor, name, obj)) !== false) reducedDescriptors[name] = ret || descriptor;
  });
  Object.defineProperties(obj, reducedDescriptors);
};
var freezeMethods = (obj) => {
  reduceDescriptors(obj, (descriptor, name) => {
    if (isFunction(obj) && [
      "arguments",
      "caller",
      "callee"
    ].indexOf(name) !== -1) return false;
    const value = obj[name];
    if (!isFunction(value)) return;
    descriptor.enumerable = false;
    if ("writable" in descriptor) {
      descriptor.writable = false;
      return;
    }
    if (!descriptor.set) descriptor.set = () => {
      throw Error("Can not rewrite read-only method '" + name + "'");
    };
  });
};
var toObjectSet = (arrayOrString, delimiter) => {
  const obj = {};
  const define = (arr) => {
    arr.forEach((value) => {
      obj[value] = true;
    });
  };
  isArray(arrayOrString) ? define(arrayOrString) : define(String(arrayOrString).split(delimiter));
  return obj;
};
var noop = () => {
};
var toFiniteNumber = (value, defaultValue) => {
  return value != null && Number.isFinite(value = +value) ? value : defaultValue;
};
function isSpecCompliantForm(thing) {
  return !!(thing && isFunction(thing.append) && thing[toStringTag] === "FormData" && thing[iterator]);
}
var toJSONObject = (obj) => {
  const stack = new Array(10);
  const visit = (source, i) => {
    if (isObject(source)) {
      if (stack.indexOf(source) >= 0) return;
      if (!("toJSON" in source)) {
        stack[i] = source;
        const target = isArray(source) ? [] : {};
        forEach(source, (value, key) => {
          const reducedValue = visit(value, i + 1);
          !isUndefined(reducedValue) && (target[key] = reducedValue);
        });
        stack[i] = void 0;
        return target;
      }
    }
    return source;
  };
  return visit(obj, 0);
};
var isAsyncFn = kindOfTest("AsyncFunction");
var isThenable = (thing) => thing && (isObject(thing) || isFunction(thing)) && isFunction(thing.then) && isFunction(thing.catch);
var _setImmediate = ((setImmediateSupported, postMessageSupported) => {
  if (setImmediateSupported) return setImmediate;
  return postMessageSupported ? ((token, callbacks) => {
    _global.addEventListener("message", ({ source, data }) => {
      if (source === _global && data === token) callbacks.length && callbacks.shift()();
    }, false);
    return (cb) => {
      callbacks.push(cb);
      _global.postMessage(token, "*");
    };
  })(`axios@${Math.random()}`, []) : (cb) => setTimeout(cb);
})(typeof setImmediate === "function", isFunction(_global.postMessage));
var asap = typeof queueMicrotask !== "undefined" ? queueMicrotask.bind(_global) : typeof process !== "undefined" && process.nextTick || _setImmediate;
var isIterable = (thing) => thing != null && isFunction(thing[iterator]);
var utils_default = {
  isArray,
  isArrayBuffer,
  isBuffer,
  isFormData,
  isArrayBufferView,
  isString,
  isNumber,
  isBoolean,
  isObject,
  isPlainObject,
  isReadableStream,
  isRequest,
  isResponse,
  isHeaders,
  isUndefined,
  isDate,
  isFile,
  isBlob,
  isRegExp,
  isFunction,
  isStream,
  isURLSearchParams,
  isTypedArray,
  isFileList,
  forEach,
  merge,
  extend,
  trim,
  stripBOM,
  inherits,
  toFlatObject,
  kindOf,
  kindOfTest,
  endsWith,
  toArray,
  forEachEntry,
  matchAll,
  isHTMLForm,
  hasOwnProperty,
  hasOwnProp: hasOwnProperty,
  reduceDescriptors,
  freezeMethods,
  toObjectSet,
  toCamelCase,
  noop,
  toFiniteNumber,
  findKey,
  global: _global,
  isContextDefined,
  isSpecCompliantForm,
  toJSONObject,
  isAsyncFn,
  isThenable,
  setImmediate: _setImmediate,
  asap,
  isIterable
};
function AxiosError(message, code, config, request, response) {
  Error.call(this);
  if (Error.captureStackTrace) Error.captureStackTrace(this, this.constructor);
  else this.stack = (/* @__PURE__ */ new Error()).stack;
  this.message = message;
  this.name = "AxiosError";
  code && (this.code = code);
  config && (this.config = config);
  request && (this.request = request);
  if (response) {
    this.response = response;
    this.status = response.status ? response.status : null;
  }
}
utils_default.inherits(AxiosError, Error, { toJSON: function toJSON() {
  return {
    message: this.message,
    name: this.name,
    description: this.description,
    number: this.number,
    fileName: this.fileName,
    lineNumber: this.lineNumber,
    columnNumber: this.columnNumber,
    stack: this.stack,
    config: utils_default.toJSONObject(this.config),
    code: this.code,
    status: this.status
  };
} });
var prototype$1 = AxiosError.prototype;
var descriptors = {};
[
  "ERR_BAD_OPTION_VALUE",
  "ERR_BAD_OPTION",
  "ECONNABORTED",
  "ETIMEDOUT",
  "ERR_NETWORK",
  "ERR_FR_TOO_MANY_REDIRECTS",
  "ERR_DEPRECATED",
  "ERR_BAD_RESPONSE",
  "ERR_BAD_REQUEST",
  "ERR_CANCELED",
  "ERR_NOT_SUPPORT",
  "ERR_INVALID_URL"
].forEach((code) => {
  descriptors[code] = { value: code };
});
Object.defineProperties(AxiosError, descriptors);
Object.defineProperty(prototype$1, "isAxiosError", { value: true });
AxiosError.from = (error, code, config, request, response, customProps) => {
  const axiosError = Object.create(prototype$1);
  utils_default.toFlatObject(error, axiosError, function filter2(obj) {
    return obj !== Error.prototype;
  }, (prop) => {
    return prop !== "isAxiosError";
  });
  AxiosError.call(axiosError, error.message, code, config, request, response);
  axiosError.cause = error;
  axiosError.name = error.name;
  customProps && Object.assign(axiosError, customProps);
  return axiosError;
};
var AxiosError_default = AxiosError;
var null_default = null;
function isVisitable(thing) {
  return utils_default.isPlainObject(thing) || utils_default.isArray(thing);
}
function removeBrackets(key) {
  return utils_default.endsWith(key, "[]") ? key.slice(0, -2) : key;
}
function renderKey(path, key, dots) {
  if (!path) return key;
  return path.concat(key).map(function each(token, i) {
    token = removeBrackets(token);
    return !dots && i ? "[" + token + "]" : token;
  }).join(dots ? "." : "");
}
function isFlatArray(arr) {
  return utils_default.isArray(arr) && !arr.some(isVisitable);
}
var predicates = utils_default.toFlatObject(utils_default, {}, null, function filter(prop) {
  return /^is[A-Z]/.test(prop);
});
function toFormData(obj, formData, options) {
  if (!utils_default.isObject(obj)) throw new TypeError("target must be an object");
  formData = formData || new (null_default || FormData)();
  options = utils_default.toFlatObject(options, {
    metaTokens: true,
    dots: false,
    indexes: false
  }, false, function defined(option, source) {
    return !utils_default.isUndefined(source[option]);
  });
  const metaTokens = options.metaTokens;
  const visitor = options.visitor || defaultVisitor;
  const dots = options.dots;
  const indexes = options.indexes;
  const _Blob = options.Blob || typeof Blob !== "undefined" && Blob;
  const useBlob = _Blob && utils_default.isSpecCompliantForm(formData);
  if (!utils_default.isFunction(visitor)) throw new TypeError("visitor must be a function");
  function convertValue(value) {
    if (value === null) return "";
    if (utils_default.isDate(value)) return value.toISOString();
    if (utils_default.isBoolean(value)) return value.toString();
    if (!useBlob && utils_default.isBlob(value)) throw new AxiosError_default("Blob is not supported. Use a Buffer instead.");
    if (utils_default.isArrayBuffer(value) || utils_default.isTypedArray(value)) return useBlob && typeof Blob === "function" ? new Blob([value]) : Buffer.from(value);
    return value;
  }
  function defaultVisitor(value, key, path) {
    let arr = value;
    if (value && !path && typeof value === "object") {
      if (utils_default.endsWith(key, "{}")) {
        key = metaTokens ? key : key.slice(0, -2);
        value = JSON.stringify(value);
      } else if (utils_default.isArray(value) && isFlatArray(value) || (utils_default.isFileList(value) || utils_default.endsWith(key, "[]")) && (arr = utils_default.toArray(value))) {
        key = removeBrackets(key);
        arr.forEach(function each(el, index) {
          !(utils_default.isUndefined(el) || el === null) && formData.append(indexes === true ? renderKey([key], index, dots) : indexes === null ? key : key + "[]", convertValue(el));
        });
        return false;
      }
    }
    if (isVisitable(value)) return true;
    formData.append(renderKey(path, key, dots), convertValue(value));
    return false;
  }
  const stack = [];
  const exposedHelpers = Object.assign(predicates, {
    defaultVisitor,
    convertValue,
    isVisitable
  });
  function build(value, path) {
    if (utils_default.isUndefined(value)) return;
    if (stack.indexOf(value) !== -1) throw Error("Circular reference detected in " + path.join("."));
    stack.push(value);
    utils_default.forEach(value, function each(el, key) {
      const result = !(utils_default.isUndefined(el) || el === null) && visitor.call(formData, el, utils_default.isString(key) ? key.trim() : key, path, exposedHelpers);
      if (result === true) build(el, path ? path.concat(key) : [key]);
    });
    stack.pop();
  }
  if (!utils_default.isObject(obj)) throw new TypeError("data must be an object");
  build(obj);
  return formData;
}
var toFormData_default = toFormData;
function encode$1(str) {
  const charMap = {
    "!": "%21",
    "'": "%27",
    "(": "%28",
    ")": "%29",
    "~": "%7E",
    "%20": "+",
    "%00": "\0"
  };
  return encodeURIComponent(str).replace(/[!'()~]|%20|%00/g, function replacer(match) {
    return charMap[match];
  });
}
function AxiosURLSearchParams(params, options) {
  this._pairs = [];
  params && toFormData_default(params, this, options);
}
var prototype = AxiosURLSearchParams.prototype;
prototype.append = function append(name, value) {
  this._pairs.push([name, value]);
};
prototype.toString = function toString$1(encoder) {
  const _encode = encoder ? function(value) {
    return encoder.call(this, value, encode$1);
  } : encode$1;
  return this._pairs.map(function each(pair) {
    return _encode(pair[0]) + "=" + _encode(pair[1]);
  }, "").join("&");
};
var AxiosURLSearchParams_default = AxiosURLSearchParams;
function encode(val) {
  return encodeURIComponent(val).replace(/%3A/gi, ":").replace(/%24/g, "$").replace(/%2C/gi, ",").replace(/%20/g, "+").replace(/%5B/gi, "[").replace(/%5D/gi, "]");
}
function buildURL(url, params, options) {
  if (!params) return url;
  const _encode = options && options.encode || encode;
  if (utils_default.isFunction(options)) options = { serialize: options };
  const serializeFn = options && options.serialize;
  let serializedParams;
  if (serializeFn) serializedParams = serializeFn(params, options);
  else serializedParams = utils_default.isURLSearchParams(params) ? params.toString() : new AxiosURLSearchParams_default(params, options).toString(_encode);
  if (serializedParams) {
    const hashmarkIndex = url.indexOf("#");
    if (hashmarkIndex !== -1) url = url.slice(0, hashmarkIndex);
    url += (url.indexOf("?") === -1 ? "?" : "&") + serializedParams;
  }
  return url;
}
var InterceptorManager = class {
  constructor() {
    this.handlers = [];
  }
  /**
  * Add a new interceptor to the stack
  *
  * @param {Function} fulfilled The function to handle `then` for a `Promise`
  * @param {Function} rejected The function to handle `reject` for a `Promise`
  *
  * @return {Number} An ID used to remove interceptor later
  */
  use(fulfilled, rejected, options) {
    this.handlers.push({
      fulfilled,
      rejected,
      synchronous: options ? options.synchronous : false,
      runWhen: options ? options.runWhen : null
    });
    return this.handlers.length - 1;
  }
  /**
  * Remove an interceptor from the stack
  *
  * @param {Number} id The ID that was returned by `use`
  *
  * @returns {Boolean} `true` if the interceptor was removed, `false` otherwise
  */
  eject(id) {
    if (this.handlers[id]) this.handlers[id] = null;
  }
  /**
  * Clear all interceptors from the stack
  *
  * @returns {void}
  */
  clear() {
    if (this.handlers) this.handlers = [];
  }
  /**
  * Iterate over all the registered interceptors
  *
  * This method is particularly useful for skipping over any
  * interceptors that may have become `null` calling `eject`.
  *
  * @param {Function} fn The function to call for each interceptor
  *
  * @returns {void}
  */
  forEach(fn) {
    utils_default.forEach(this.handlers, function forEachHandler(h) {
      if (h !== null) fn(h);
    });
  }
};
var InterceptorManager_default = InterceptorManager;
var transitional_default = {
  silentJSONParsing: true,
  forcedJSONParsing: true,
  clarifyTimeoutError: false
};
var URLSearchParams_default = typeof URLSearchParams !== "undefined" ? URLSearchParams : AxiosURLSearchParams_default;
var FormData_default = typeof FormData !== "undefined" ? FormData : null;
var Blob_default = typeof Blob !== "undefined" ? Blob : null;
var browser_default = {
  isBrowser: true,
  classes: {
    URLSearchParams: URLSearchParams_default,
    FormData: FormData_default,
    Blob: Blob_default
  },
  protocols: [
    "http",
    "https",
    "file",
    "blob",
    "url",
    "data"
  ]
};
var utils_exports = {};
__export(utils_exports, {
  hasBrowserEnv: () => hasBrowserEnv,
  hasStandardBrowserEnv: () => hasStandardBrowserEnv,
  hasStandardBrowserWebWorkerEnv: () => hasStandardBrowserWebWorkerEnv,
  navigator: () => _navigator,
  origin: () => origin
});
var hasBrowserEnv = typeof window !== "undefined" && typeof document !== "undefined";
var _navigator = typeof navigator === "object" && navigator || void 0;
var hasStandardBrowserEnv = hasBrowserEnv && (!_navigator || [
  "ReactNative",
  "NativeScript",
  "NS"
].indexOf(_navigator.product) < 0);
var hasStandardBrowserWebWorkerEnv = (() => {
  return typeof WorkerGlobalScope !== "undefined" && self instanceof WorkerGlobalScope && typeof self.importScripts === "function";
})();
var origin = hasBrowserEnv && window.location.href || "http://localhost";
var platform_default = {
  ...utils_exports,
  ...browser_default
};
function toURLEncodedForm(data, options) {
  return toFormData_default(data, new platform_default.classes.URLSearchParams(), Object.assign({ visitor: function(value, key, path, helpers) {
    if (platform_default.isNode && utils_default.isBuffer(value)) {
      this.append(key, value.toString("base64"));
      return false;
    }
    return helpers.defaultVisitor.apply(this, arguments);
  } }, options));
}
function parsePropPath(name) {
  return utils_default.matchAll(/\w+|\[(\w*)]/g, name).map((match) => {
    return match[0] === "[]" ? "" : match[1] || match[0];
  });
}
function arrayToObject(arr) {
  const obj = {};
  const keys = Object.keys(arr);
  let i;
  const len = keys.length;
  let key;
  for (i = 0; i < len; i++) {
    key = keys[i];
    obj[key] = arr[key];
  }
  return obj;
}
function formDataToJSON(formData) {
  function buildPath(path, value, target, index) {
    let name = path[index++];
    if (name === "__proto__") return true;
    const isNumericKey = Number.isFinite(+name);
    const isLast = index >= path.length;
    name = !name && utils_default.isArray(target) ? target.length : name;
    if (isLast) {
      if (utils_default.hasOwnProp(target, name)) target[name] = [target[name], value];
      else target[name] = value;
      return !isNumericKey;
    }
    if (!target[name] || !utils_default.isObject(target[name])) target[name] = [];
    const result = buildPath(path, value, target[name], index);
    if (result && utils_default.isArray(target[name])) target[name] = arrayToObject(target[name]);
    return !isNumericKey;
  }
  if (utils_default.isFormData(formData) && utils_default.isFunction(formData.entries)) {
    const obj = {};
    utils_default.forEachEntry(formData, (name, value) => {
      buildPath(parsePropPath(name), value, obj, 0);
    });
    return obj;
  }
  return null;
}
var formDataToJSON_default = formDataToJSON;
function stringifySafely(rawValue, parser, encoder) {
  if (utils_default.isString(rawValue)) try {
    (parser || JSON.parse)(rawValue);
    return utils_default.trim(rawValue);
  } catch (e) {
    if (e.name !== "SyntaxError") throw e;
  }
  return (encoder || JSON.stringify)(rawValue);
}
var defaults = {
  transitional: transitional_default,
  adapter: [
    "xhr",
    "http",
    "fetch"
  ],
  transformRequest: [function transformRequest(data, headers) {
    const contentType = headers.getContentType() || "";
    const hasJSONContentType = contentType.indexOf("application/json") > -1;
    const isObjectPayload = utils_default.isObject(data);
    if (isObjectPayload && utils_default.isHTMLForm(data)) data = new FormData(data);
    const isFormData$1 = utils_default.isFormData(data);
    if (isFormData$1) return hasJSONContentType ? JSON.stringify(formDataToJSON_default(data)) : data;
    if (utils_default.isArrayBuffer(data) || utils_default.isBuffer(data) || utils_default.isStream(data) || utils_default.isFile(data) || utils_default.isBlob(data) || utils_default.isReadableStream(data)) return data;
    if (utils_default.isArrayBufferView(data)) return data.buffer;
    if (utils_default.isURLSearchParams(data)) {
      headers.setContentType("application/x-www-form-urlencoded;charset=utf-8", false);
      return data.toString();
    }
    let isFileList$1;
    if (isObjectPayload) {
      if (contentType.indexOf("application/x-www-form-urlencoded") > -1) return toURLEncodedForm(data, this.formSerializer).toString();
      if ((isFileList$1 = utils_default.isFileList(data)) || contentType.indexOf("multipart/form-data") > -1) {
        const _FormData = this.env && this.env.FormData;
        return toFormData_default(isFileList$1 ? { "files[]": data } : data, _FormData && new _FormData(), this.formSerializer);
      }
    }
    if (isObjectPayload || hasJSONContentType) {
      headers.setContentType("application/json", false);
      return stringifySafely(data);
    }
    return data;
  }],
  transformResponse: [function transformResponse(data) {
    const transitional2 = this.transitional || defaults.transitional;
    const forcedJSONParsing = transitional2 && transitional2.forcedJSONParsing;
    const JSONRequested = this.responseType === "json";
    if (utils_default.isResponse(data) || utils_default.isReadableStream(data)) return data;
    if (data && utils_default.isString(data) && (forcedJSONParsing && !this.responseType || JSONRequested)) {
      const silentJSONParsing = transitional2 && transitional2.silentJSONParsing;
      const strictJSONParsing = !silentJSONParsing && JSONRequested;
      try {
        return JSON.parse(data);
      } catch (e) {
        if (strictJSONParsing) {
          if (e.name === "SyntaxError") throw AxiosError_default.from(e, AxiosError_default.ERR_BAD_RESPONSE, this, null, this.response);
          throw e;
        }
      }
    }
    return data;
  }],
  timeout: 0,
  xsrfCookieName: "XSRF-TOKEN",
  xsrfHeaderName: "X-XSRF-TOKEN",
  maxContentLength: -1,
  maxBodyLength: -1,
  env: {
    FormData: platform_default.classes.FormData,
    Blob: platform_default.classes.Blob
  },
  validateStatus: function validateStatus(status) {
    return status >= 200 && status < 300;
  },
  headers: { common: {
    "Accept": "application/json, text/plain, */*",
    "Content-Type": void 0
  } }
};
utils_default.forEach([
  "delete",
  "get",
  "head",
  "post",
  "put",
  "patch"
], (method) => {
  defaults.headers[method] = {};
});
var defaults_default = defaults;
var ignoreDuplicateOf = utils_default.toObjectSet([
  "age",
  "authorization",
  "content-length",
  "content-type",
  "etag",
  "expires",
  "from",
  "host",
  "if-modified-since",
  "if-unmodified-since",
  "last-modified",
  "location",
  "max-forwards",
  "proxy-authorization",
  "referer",
  "retry-after",
  "user-agent"
]);
var parseHeaders_default = (rawHeaders) => {
  const parsed = {};
  let key;
  let val;
  let i;
  rawHeaders && rawHeaders.split("\n").forEach(function parser(line) {
    i = line.indexOf(":");
    key = line.substring(0, i).trim().toLowerCase();
    val = line.substring(i + 1).trim();
    if (!key || parsed[key] && ignoreDuplicateOf[key]) return;
    if (key === "set-cookie") if (parsed[key]) parsed[key].push(val);
    else parsed[key] = [val];
    else parsed[key] = parsed[key] ? parsed[key] + ", " + val : val;
  });
  return parsed;
};
var $internals = Symbol("internals");
function normalizeHeader(header) {
  return header && String(header).trim().toLowerCase();
}
function normalizeValue(value) {
  if (value === false || value == null) return value;
  return utils_default.isArray(value) ? value.map(normalizeValue) : String(value);
}
function parseTokens(str) {
  const tokens = /* @__PURE__ */ Object.create(null);
  const tokensRE = /([^\s,;=]+)\s*(?:=\s*([^,;]+))?/g;
  let match;
  while (match = tokensRE.exec(str)) tokens[match[1]] = match[2];
  return tokens;
}
var isValidHeaderName = (str) => /^[-_a-zA-Z0-9^`|~,!#$%&'*+.]+$/.test(str.trim());
function matchHeaderValue(context, value, header, filter2, isHeaderNameFilter) {
  if (utils_default.isFunction(filter2)) return filter2.call(this, value, header);
  if (isHeaderNameFilter) value = header;
  if (!utils_default.isString(value)) return;
  if (utils_default.isString(filter2)) return value.indexOf(filter2) !== -1;
  if (utils_default.isRegExp(filter2)) return filter2.test(value);
}
function formatHeader(header) {
  return header.trim().toLowerCase().replace(/([a-z\d])(\w*)/g, (w, char, str) => {
    return char.toUpperCase() + str;
  });
}
function buildAccessors(obj, header) {
  const accessorName = utils_default.toCamelCase(" " + header);
  [
    "get",
    "set",
    "has"
  ].forEach((methodName) => {
    Object.defineProperty(obj, methodName + accessorName, {
      value: function(arg1, arg2, arg3) {
        return this[methodName].call(this, header, arg1, arg2, arg3);
      },
      configurable: true
    });
  });
}
var AxiosHeaders = class {
  constructor(headers) {
    headers && this.set(headers);
  }
  set(header, valueOrRewrite, rewrite) {
    const self$1 = this;
    function setHeader(_value, _header, _rewrite) {
      const lHeader = normalizeHeader(_header);
      if (!lHeader) throw new Error("header name must be a non-empty string");
      const key = utils_default.findKey(self$1, lHeader);
      if (!key || self$1[key] === void 0 || _rewrite === true || _rewrite === void 0 && self$1[key] !== false) self$1[key || _header] = normalizeValue(_value);
    }
    const setHeaders = (headers, _rewrite) => utils_default.forEach(headers, (_value, _header) => setHeader(_value, _header, _rewrite));
    if (utils_default.isPlainObject(header) || header instanceof this.constructor) setHeaders(header, valueOrRewrite);
    else if (utils_default.isString(header) && (header = header.trim()) && !isValidHeaderName(header)) setHeaders(parseHeaders_default(header), valueOrRewrite);
    else if (utils_default.isObject(header) && utils_default.isIterable(header)) {
      let obj = {}, dest, key;
      for (const entry of header) {
        if (!utils_default.isArray(entry)) throw TypeError("Object iterator must return a key-value pair");
        obj[key = entry[0]] = (dest = obj[key]) ? utils_default.isArray(dest) ? [...dest, entry[1]] : [dest, entry[1]] : entry[1];
      }
      setHeaders(obj, valueOrRewrite);
    } else header != null && setHeader(valueOrRewrite, header, rewrite);
    return this;
  }
  get(header, parser) {
    header = normalizeHeader(header);
    if (header) {
      const key = utils_default.findKey(this, header);
      if (key) {
        const value = this[key];
        if (!parser) return value;
        if (parser === true) return parseTokens(value);
        if (utils_default.isFunction(parser)) return parser.call(this, value, key);
        if (utils_default.isRegExp(parser)) return parser.exec(value);
        throw new TypeError("parser must be boolean|regexp|function");
      }
    }
  }
  has(header, matcher) {
    header = normalizeHeader(header);
    if (header) {
      const key = utils_default.findKey(this, header);
      return !!(key && this[key] !== void 0 && (!matcher || matchHeaderValue(this, this[key], key, matcher)));
    }
    return false;
  }
  delete(header, matcher) {
    const self$1 = this;
    let deleted = false;
    function deleteHeader(_header) {
      _header = normalizeHeader(_header);
      if (_header) {
        const key = utils_default.findKey(self$1, _header);
        if (key && (!matcher || matchHeaderValue(self$1, self$1[key], key, matcher))) {
          delete self$1[key];
          deleted = true;
        }
      }
    }
    if (utils_default.isArray(header)) header.forEach(deleteHeader);
    else deleteHeader(header);
    return deleted;
  }
  clear(matcher) {
    const keys = Object.keys(this);
    let i = keys.length;
    let deleted = false;
    while (i--) {
      const key = keys[i];
      if (!matcher || matchHeaderValue(this, this[key], key, matcher, true)) {
        delete this[key];
        deleted = true;
      }
    }
    return deleted;
  }
  normalize(format) {
    const self$1 = this;
    const headers = {};
    utils_default.forEach(this, (value, header) => {
      const key = utils_default.findKey(headers, header);
      if (key) {
        self$1[key] = normalizeValue(value);
        delete self$1[header];
        return;
      }
      const normalized = format ? formatHeader(header) : String(header).trim();
      if (normalized !== header) delete self$1[header];
      self$1[normalized] = normalizeValue(value);
      headers[normalized] = true;
    });
    return this;
  }
  concat(...targets) {
    return this.constructor.concat(this, ...targets);
  }
  toJSON(asStrings) {
    const obj = /* @__PURE__ */ Object.create(null);
    utils_default.forEach(this, (value, header) => {
      value != null && value !== false && (obj[header] = asStrings && utils_default.isArray(value) ? value.join(", ") : value);
    });
    return obj;
  }
  [Symbol.iterator]() {
    return Object.entries(this.toJSON())[Symbol.iterator]();
  }
  toString() {
    return Object.entries(this.toJSON()).map(([header, value]) => header + ": " + value).join("\n");
  }
  getSetCookie() {
    return this.get("set-cookie") || [];
  }
  get [Symbol.toStringTag]() {
    return "AxiosHeaders";
  }
  static from(thing) {
    return thing instanceof this ? thing : new this(thing);
  }
  static concat(first, ...targets) {
    const computed = new this(first);
    targets.forEach((target) => computed.set(target));
    return computed;
  }
  static accessor(header) {
    const internals = this[$internals] = this[$internals] = { accessors: {} };
    const accessors = internals.accessors;
    const prototype$2 = this.prototype;
    function defineAccessor(_header) {
      const lHeader = normalizeHeader(_header);
      if (!accessors[lHeader]) {
        buildAccessors(prototype$2, _header);
        accessors[lHeader] = true;
      }
    }
    utils_default.isArray(header) ? header.forEach(defineAccessor) : defineAccessor(header);
    return this;
  }
};
AxiosHeaders.accessor([
  "Content-Type",
  "Content-Length",
  "Accept",
  "Accept-Encoding",
  "User-Agent",
  "Authorization"
]);
utils_default.reduceDescriptors(AxiosHeaders.prototype, ({ value }, key) => {
  let mapped = key[0].toUpperCase() + key.slice(1);
  return {
    get: () => value,
    set(headerValue) {
      this[mapped] = headerValue;
    }
  };
});
utils_default.freezeMethods(AxiosHeaders);
var AxiosHeaders_default = AxiosHeaders;
function transformData(fns, response) {
  const config = this || defaults_default;
  const context = response || config;
  const headers = AxiosHeaders_default.from(context.headers);
  let data = context.data;
  utils_default.forEach(fns, function transform(fn) {
    data = fn.call(config, data, headers.normalize(), response ? response.status : void 0);
  });
  headers.normalize();
  return data;
}
function isCancel(value) {
  return !!(value && value.__CANCEL__);
}
function CanceledError(message, config, request) {
  AxiosError_default.call(this, message == null ? "canceled" : message, AxiosError_default.ERR_CANCELED, config, request);
  this.name = "CanceledError";
}
utils_default.inherits(CanceledError, AxiosError_default, { __CANCEL__: true });
var CanceledError_default = CanceledError;
function settle(resolve, reject, response) {
  const validateStatus2 = response.config.validateStatus;
  if (!response.status || !validateStatus2 || validateStatus2(response.status)) resolve(response);
  else reject(new AxiosError_default("Request failed with status code " + response.status, [AxiosError_default.ERR_BAD_REQUEST, AxiosError_default.ERR_BAD_RESPONSE][Math.floor(response.status / 100) - 4], response.config, response.request, response));
}
function parseProtocol(url) {
  const match = /^([-+\w]{1,25})(:?\/\/|:)/.exec(url);
  return match && match[1] || "";
}
function speedometer(samplesCount, min) {
  samplesCount = samplesCount || 10;
  const bytes = new Array(samplesCount);
  const timestamps = new Array(samplesCount);
  let head = 0;
  let tail = 0;
  let firstSampleTS;
  min = min !== void 0 ? min : 1e3;
  return function push(chunkLength) {
    const now = Date.now();
    const startedAt = timestamps[tail];
    if (!firstSampleTS) firstSampleTS = now;
    bytes[head] = chunkLength;
    timestamps[head] = now;
    let i = tail;
    let bytesCount = 0;
    while (i !== head) {
      bytesCount += bytes[i++];
      i = i % samplesCount;
    }
    head = (head + 1) % samplesCount;
    if (head === tail) tail = (tail + 1) % samplesCount;
    if (now - firstSampleTS < min) return;
    const passed = startedAt && now - startedAt;
    return passed ? Math.round(bytesCount * 1e3 / passed) : void 0;
  };
}
var speedometer_default = speedometer;
function throttle(fn, freq) {
  let timestamp = 0;
  let threshold = 1e3 / freq;
  let lastArgs;
  let timer;
  const invoke = (args, now = Date.now()) => {
    timestamp = now;
    lastArgs = null;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    fn.apply(null, args);
  };
  const throttled = (...args) => {
    const now = Date.now();
    const passed = now - timestamp;
    if (passed >= threshold) invoke(args, now);
    else {
      lastArgs = args;
      if (!timer) timer = setTimeout(() => {
        timer = null;
        invoke(lastArgs);
      }, threshold - passed);
    }
  };
  const flush = () => lastArgs && invoke(lastArgs);
  return [throttled, flush];
}
var throttle_default = throttle;
var progressEventReducer = (listener, isDownloadStream, freq = 3) => {
  let bytesNotified = 0;
  const _speedometer = speedometer_default(50, 250);
  return throttle_default((e) => {
    const loaded = e.loaded;
    const total = e.lengthComputable ? e.total : void 0;
    const progressBytes = loaded - bytesNotified;
    const rate = _speedometer(progressBytes);
    const inRange = loaded <= total;
    bytesNotified = loaded;
    const data = {
      loaded,
      total,
      progress: total ? loaded / total : void 0,
      bytes: progressBytes,
      rate: rate ? rate : void 0,
      estimated: rate && total && inRange ? (total - loaded) / rate : void 0,
      event: e,
      lengthComputable: total != null,
      [isDownloadStream ? "download" : "upload"]: true
    };
    listener(data);
  }, freq);
};
var progressEventDecorator = (total, throttled) => {
  const lengthComputable = total != null;
  return [(loaded) => throttled[0]({
    lengthComputable,
    total,
    loaded
  }), throttled[1]];
};
var asyncDecorator = (fn) => (...args) => utils_default.asap(() => fn(...args));
var isURLSameOrigin_default = platform_default.hasStandardBrowserEnv ? /* @__PURE__ */ ((origin$1, isMSIE) => (url) => {
  url = new URL(url, platform_default.origin);
  return origin$1.protocol === url.protocol && origin$1.host === url.host && (isMSIE || origin$1.port === url.port);
})(new URL(platform_default.origin), platform_default.navigator && /(msie|trident)/i.test(platform_default.navigator.userAgent)) : () => true;
var cookies_default = platform_default.hasStandardBrowserEnv ? {
  write(name, value, expires, path, domain, secure) {
    const cookie = [name + "=" + encodeURIComponent(value)];
    utils_default.isNumber(expires) && cookie.push("expires=" + new Date(expires).toGMTString());
    utils_default.isString(path) && cookie.push("path=" + path);
    utils_default.isString(domain) && cookie.push("domain=" + domain);
    secure === true && cookie.push("secure");
    document.cookie = cookie.join("; ");
  },
  read(name) {
    const match = document.cookie.match(/* @__PURE__ */ new RegExp("(^|;\\s*)(" + name + ")=([^;]*)"));
    return match ? decodeURIComponent(match[3]) : null;
  },
  remove(name) {
    this.write(name, "", Date.now() - 864e5);
  }
} : {
  write() {
  },
  read() {
    return null;
  },
  remove() {
  }
};
function isAbsoluteURL(url) {
  return /^([a-z][a-z\d+\-.]*:)?\/\//i.test(url);
}
function combineURLs(baseURL, relativeURL) {
  return relativeURL ? baseURL.replace(/\/?\/$/, "") + "/" + relativeURL.replace(/^\/+/, "") : baseURL;
}
function buildFullPath(baseURL, requestedURL, allowAbsoluteUrls) {
  let isRelativeUrl = !isAbsoluteURL(requestedURL);
  if (baseURL && (isRelativeUrl || allowAbsoluteUrls == false)) return combineURLs(baseURL, requestedURL);
  return requestedURL;
}
var headersToObject = (thing) => thing instanceof AxiosHeaders_default ? { ...thing } : thing;
function mergeConfig(config1, config2) {
  config2 = config2 || {};
  const config = {};
  function getMergedValue(target, source, prop, caseless) {
    if (utils_default.isPlainObject(target) && utils_default.isPlainObject(source)) return utils_default.merge.call({ caseless }, target, source);
    else if (utils_default.isPlainObject(source)) return utils_default.merge({}, source);
    else if (utils_default.isArray(source)) return source.slice();
    return source;
  }
  function mergeDeepProperties(a, b, prop, caseless) {
    if (!utils_default.isUndefined(b)) return getMergedValue(a, b, prop, caseless);
    else if (!utils_default.isUndefined(a)) return getMergedValue(void 0, a, prop, caseless);
  }
  function valueFromConfig2(a, b) {
    if (!utils_default.isUndefined(b)) return getMergedValue(void 0, b);
  }
  function defaultToConfig2(a, b) {
    if (!utils_default.isUndefined(b)) return getMergedValue(void 0, b);
    else if (!utils_default.isUndefined(a)) return getMergedValue(void 0, a);
  }
  function mergeDirectKeys(a, b, prop) {
    if (prop in config2) return getMergedValue(a, b);
    else if (prop in config1) return getMergedValue(void 0, a);
  }
  const mergeMap = {
    url: valueFromConfig2,
    method: valueFromConfig2,
    data: valueFromConfig2,
    baseURL: defaultToConfig2,
    transformRequest: defaultToConfig2,
    transformResponse: defaultToConfig2,
    paramsSerializer: defaultToConfig2,
    timeout: defaultToConfig2,
    timeoutMessage: defaultToConfig2,
    withCredentials: defaultToConfig2,
    withXSRFToken: defaultToConfig2,
    adapter: defaultToConfig2,
    responseType: defaultToConfig2,
    xsrfCookieName: defaultToConfig2,
    xsrfHeaderName: defaultToConfig2,
    onUploadProgress: defaultToConfig2,
    onDownloadProgress: defaultToConfig2,
    decompress: defaultToConfig2,
    maxContentLength: defaultToConfig2,
    maxBodyLength: defaultToConfig2,
    beforeRedirect: defaultToConfig2,
    transport: defaultToConfig2,
    httpAgent: defaultToConfig2,
    httpsAgent: defaultToConfig2,
    cancelToken: defaultToConfig2,
    socketPath: defaultToConfig2,
    responseEncoding: defaultToConfig2,
    validateStatus: mergeDirectKeys,
    headers: (a, b, prop) => mergeDeepProperties(headersToObject(a), headersToObject(b), prop, true)
  };
  utils_default.forEach(Object.keys(Object.assign({}, config1, config2)), function computeConfigValue(prop) {
    const merge$1 = mergeMap[prop] || mergeDeepProperties;
    const configValue = merge$1(config1[prop], config2[prop], prop);
    utils_default.isUndefined(configValue) && merge$1 !== mergeDirectKeys || (config[prop] = configValue);
  });
  return config;
}
var resolveConfig_default = (config) => {
  const newConfig = mergeConfig({}, config);
  let { data, withXSRFToken, xsrfHeaderName, xsrfCookieName, headers, auth } = newConfig;
  newConfig.headers = headers = AxiosHeaders_default.from(headers);
  newConfig.url = buildURL(buildFullPath(newConfig.baseURL, newConfig.url, newConfig.allowAbsoluteUrls), config.params, config.paramsSerializer);
  if (auth) headers.set("Authorization", "Basic " + btoa((auth.username || "") + ":" + (auth.password ? unescape(encodeURIComponent(auth.password)) : "")));
  let contentType;
  if (utils_default.isFormData(data)) {
    if (platform_default.hasStandardBrowserEnv || platform_default.hasStandardBrowserWebWorkerEnv) headers.setContentType(void 0);
    else if ((contentType = headers.getContentType()) !== false) {
      const [type, ...tokens] = contentType ? contentType.split(";").map((token) => token.trim()).filter(Boolean) : [];
      headers.setContentType([type || "multipart/form-data", ...tokens].join("; "));
    }
  }
  if (platform_default.hasStandardBrowserEnv) {
    withXSRFToken && utils_default.isFunction(withXSRFToken) && (withXSRFToken = withXSRFToken(newConfig));
    if (withXSRFToken || withXSRFToken !== false && isURLSameOrigin_default(newConfig.url)) {
      const xsrfValue = xsrfHeaderName && xsrfCookieName && cookies_default.read(xsrfCookieName);
      if (xsrfValue) headers.set(xsrfHeaderName, xsrfValue);
    }
  }
  return newConfig;
};
var isXHRAdapterSupported = typeof XMLHttpRequest !== "undefined";
var xhr_default = isXHRAdapterSupported && function(config) {
  return new Promise(function dispatchXhrRequest(resolve, reject) {
    const _config = resolveConfig_default(config);
    let requestData = _config.data;
    const requestHeaders = AxiosHeaders_default.from(_config.headers).normalize();
    let { responseType, onUploadProgress, onDownloadProgress } = _config;
    let onCanceled;
    let uploadThrottled, downloadThrottled;
    let flushUpload, flushDownload;
    function done() {
      flushUpload && flushUpload();
      flushDownload && flushDownload();
      _config.cancelToken && _config.cancelToken.unsubscribe(onCanceled);
      _config.signal && _config.signal.removeEventListener("abort", onCanceled);
    }
    let request = new XMLHttpRequest();
    request.open(_config.method.toUpperCase(), _config.url, true);
    request.timeout = _config.timeout;
    function onloadend() {
      if (!request) return;
      const responseHeaders = AxiosHeaders_default.from("getAllResponseHeaders" in request && request.getAllResponseHeaders());
      const responseData = !responseType || responseType === "text" || responseType === "json" ? request.responseText : request.response;
      const response = {
        data: responseData,
        status: request.status,
        statusText: request.statusText,
        headers: responseHeaders,
        config,
        request
      };
      settle(function _resolve(value) {
        resolve(value);
        done();
      }, function _reject(err) {
        reject(err);
        done();
      }, response);
      request = null;
    }
    if ("onloadend" in request) request.onloadend = onloadend;
    else request.onreadystatechange = function handleLoad() {
      if (!request || request.readyState !== 4) return;
      if (request.status === 0 && !(request.responseURL && request.responseURL.indexOf("file:") === 0)) return;
      setTimeout(onloadend);
    };
    request.onabort = function handleAbort() {
      if (!request) return;
      reject(new AxiosError_default("Request aborted", AxiosError_default.ECONNABORTED, config, request));
      request = null;
    };
    request.onerror = function handleError() {
      reject(new AxiosError_default("Network Error", AxiosError_default.ERR_NETWORK, config, request));
      request = null;
    };
    request.ontimeout = function handleTimeout() {
      let timeoutErrorMessage = _config.timeout ? "timeout of " + _config.timeout + "ms exceeded" : "timeout exceeded";
      const transitional2 = _config.transitional || transitional_default;
      if (_config.timeoutErrorMessage) timeoutErrorMessage = _config.timeoutErrorMessage;
      reject(new AxiosError_default(timeoutErrorMessage, transitional2.clarifyTimeoutError ? AxiosError_default.ETIMEDOUT : AxiosError_default.ECONNABORTED, config, request));
      request = null;
    };
    requestData === void 0 && requestHeaders.setContentType(null);
    if ("setRequestHeader" in request) utils_default.forEach(requestHeaders.toJSON(), function setRequestHeader(val, key) {
      request.setRequestHeader(key, val);
    });
    if (!utils_default.isUndefined(_config.withCredentials)) request.withCredentials = !!_config.withCredentials;
    if (responseType && responseType !== "json") request.responseType = _config.responseType;
    if (onDownloadProgress) {
      [downloadThrottled, flushDownload] = progressEventReducer(onDownloadProgress, true);
      request.addEventListener("progress", downloadThrottled);
    }
    if (onUploadProgress && request.upload) {
      [uploadThrottled, flushUpload] = progressEventReducer(onUploadProgress);
      request.upload.addEventListener("progress", uploadThrottled);
      request.upload.addEventListener("loadend", flushUpload);
    }
    if (_config.cancelToken || _config.signal) {
      onCanceled = (cancel) => {
        if (!request) return;
        reject(!cancel || cancel.type ? new CanceledError_default(null, config, request) : cancel);
        request.abort();
        request = null;
      };
      _config.cancelToken && _config.cancelToken.subscribe(onCanceled);
      if (_config.signal) _config.signal.aborted ? onCanceled() : _config.signal.addEventListener("abort", onCanceled);
    }
    const protocol = parseProtocol(_config.url);
    if (protocol && platform_default.protocols.indexOf(protocol) === -1) {
      reject(new AxiosError_default("Unsupported protocol " + protocol + ":", AxiosError_default.ERR_BAD_REQUEST, config));
      return;
    }
    request.send(requestData || null);
  });
};
var composeSignals = (signals, timeout) => {
  const { length } = signals = signals ? signals.filter(Boolean) : [];
  if (timeout || length) {
    let controller = new AbortController();
    let aborted;
    const onabort = function(reason) {
      if (!aborted) {
        aborted = true;
        unsubscribe();
        const err = reason instanceof Error ? reason : this.reason;
        controller.abort(err instanceof AxiosError_default ? err : new CanceledError_default(err instanceof Error ? err.message : err));
      }
    };
    let timer = timeout && setTimeout(() => {
      timer = null;
      onabort(new AxiosError_default(`timeout ${timeout} of ms exceeded`, AxiosError_default.ETIMEDOUT));
    }, timeout);
    const unsubscribe = () => {
      if (signals) {
        timer && clearTimeout(timer);
        timer = null;
        signals.forEach((signal$1) => {
          signal$1.unsubscribe ? signal$1.unsubscribe(onabort) : signal$1.removeEventListener("abort", onabort);
        });
        signals = null;
      }
    };
    signals.forEach((signal$1) => signal$1.addEventListener("abort", onabort));
    const { signal } = controller;
    signal.unsubscribe = () => utils_default.asap(unsubscribe);
    return signal;
  }
};
var composeSignals_default = composeSignals;
var streamChunk = function* (chunk, chunkSize) {
  let len = chunk.byteLength;
  if (!chunkSize || len < chunkSize) {
    yield chunk;
    return;
  }
  let pos = 0;
  let end;
  while (pos < len) {
    end = pos + chunkSize;
    yield chunk.slice(pos, end);
    pos = end;
  }
};
var readBytes = async function* (iterable, chunkSize) {
  for await (const chunk of readStream(iterable)) yield* streamChunk(chunk, chunkSize);
};
var readStream = async function* (stream) {
  if (stream[Symbol.asyncIterator]) {
    yield* stream;
    return;
  }
  const reader = stream.getReader();
  try {
    for (; ; ) {
      const { done, value } = await reader.read();
      if (done) break;
      yield value;
    }
  } finally {
    await reader.cancel();
  }
};
var trackStream = (stream, chunkSize, onProgress, onFinish) => {
  const iterator$1 = readBytes(stream, chunkSize);
  let bytes = 0;
  let done;
  let _onFinish = (e) => {
    if (!done) {
      done = true;
      onFinish && onFinish(e);
    }
  };
  return new ReadableStream({
    async pull(controller) {
      try {
        const { done: done$1, value } = await iterator$1.next();
        if (done$1) {
          _onFinish();
          controller.close();
          return;
        }
        let len = value.byteLength;
        if (onProgress) {
          let loadedBytes = bytes += len;
          onProgress(loadedBytes);
        }
        controller.enqueue(new Uint8Array(value));
      } catch (err) {
        _onFinish(err);
        throw err;
      }
    },
    cancel(reason) {
      _onFinish(reason);
      return iterator$1.return();
    }
  }, { highWaterMark: 2 });
};
var isFetchSupported = typeof fetch === "function" && typeof Request === "function" && typeof Response === "function";
var isReadableStreamSupported = isFetchSupported && typeof ReadableStream === "function";
var encodeText = isFetchSupported && (typeof TextEncoder === "function" ? /* @__PURE__ */ ((encoder) => (str) => encoder.encode(str))(new TextEncoder()) : async (str) => new Uint8Array(await new Response(str).arrayBuffer()));
var test = (fn, ...args) => {
  try {
    return !!fn(...args);
  } catch (e) {
    return false;
  }
};
var supportsRequestStream = isReadableStreamSupported && test(() => {
  let duplexAccessed = false;
  const hasContentType = new Request(platform_default.origin, {
    body: new ReadableStream(),
    method: "POST",
    get duplex() {
      duplexAccessed = true;
      return "half";
    }
  }).headers.has("Content-Type");
  return duplexAccessed && !hasContentType;
});
var DEFAULT_CHUNK_SIZE = 64 * 1024;
var supportsResponseStream = isReadableStreamSupported && test(() => utils_default.isReadableStream(new Response("").body));
var resolvers = { stream: supportsResponseStream && ((res) => res.body) };
isFetchSupported && ((res) => {
  [
    "text",
    "arrayBuffer",
    "blob",
    "formData",
    "stream"
  ].forEach((type) => {
    !resolvers[type] && (resolvers[type] = utils_default.isFunction(res[type]) ? (res$1) => res$1[type]() : (_, config) => {
      throw new AxiosError_default(`Response type '${type}' is not supported`, AxiosError_default.ERR_NOT_SUPPORT, config);
    });
  });
})(new Response());
var getBodyLength = async (body) => {
  if (body == null) return 0;
  if (utils_default.isBlob(body)) return body.size;
  if (utils_default.isSpecCompliantForm(body)) {
    const _request = new Request(platform_default.origin, {
      method: "POST",
      body
    });
    return (await _request.arrayBuffer()).byteLength;
  }
  if (utils_default.isArrayBufferView(body) || utils_default.isArrayBuffer(body)) return body.byteLength;
  if (utils_default.isURLSearchParams(body)) body = body + "";
  if (utils_default.isString(body)) return (await encodeText(body)).byteLength;
};
var resolveBodyLength = async (headers, body) => {
  const length = utils_default.toFiniteNumber(headers.getContentLength());
  return length == null ? getBodyLength(body) : length;
};
var fetch_default = isFetchSupported && (async (config) => {
  let { url, method, data, signal, cancelToken, timeout, onDownloadProgress, onUploadProgress, responseType, headers, withCredentials = "same-origin", fetchOptions } = resolveConfig_default(config);
  responseType = responseType ? (responseType + "").toLowerCase() : "text";
  let composedSignal = composeSignals_default([signal, cancelToken && cancelToken.toAbortSignal()], timeout);
  let request;
  const unsubscribe = composedSignal && composedSignal.unsubscribe && (() => {
    composedSignal.unsubscribe();
  });
  let requestContentLength;
  try {
    if (onUploadProgress && supportsRequestStream && method !== "get" && method !== "head" && (requestContentLength = await resolveBodyLength(headers, data)) !== 0) {
      let _request = new Request(url, {
        method: "POST",
        body: data,
        duplex: "half"
      });
      let contentTypeHeader;
      if (utils_default.isFormData(data) && (contentTypeHeader = _request.headers.get("content-type"))) headers.setContentType(contentTypeHeader);
      if (_request.body) {
        const [onProgress, flush] = progressEventDecorator(requestContentLength, progressEventReducer(asyncDecorator(onUploadProgress)));
        data = trackStream(_request.body, DEFAULT_CHUNK_SIZE, onProgress, flush);
      }
    }
    if (!utils_default.isString(withCredentials)) withCredentials = withCredentials ? "include" : "omit";
    const isCredentialsSupported = "credentials" in Request.prototype;
    request = new Request(url, {
      ...fetchOptions,
      signal: composedSignal,
      method: method.toUpperCase(),
      headers: headers.normalize().toJSON(),
      body: data,
      duplex: "half",
      credentials: isCredentialsSupported ? withCredentials : void 0
    });
    let response = await fetch(request, fetchOptions);
    const isStreamResponse = supportsResponseStream && (responseType === "stream" || responseType === "response");
    if (supportsResponseStream && (onDownloadProgress || isStreamResponse && unsubscribe)) {
      const options = {};
      [
        "status",
        "statusText",
        "headers"
      ].forEach((prop) => {
        options[prop] = response[prop];
      });
      const responseContentLength = utils_default.toFiniteNumber(response.headers.get("content-length"));
      const [onProgress, flush] = onDownloadProgress && progressEventDecorator(responseContentLength, progressEventReducer(asyncDecorator(onDownloadProgress), true)) || [];
      response = new Response(trackStream(response.body, DEFAULT_CHUNK_SIZE, onProgress, () => {
        flush && flush();
        unsubscribe && unsubscribe();
      }), options);
    }
    responseType = responseType || "text";
    let responseData = await resolvers[utils_default.findKey(resolvers, responseType) || "text"](response, config);
    !isStreamResponse && unsubscribe && unsubscribe();
    return await new Promise((resolve, reject) => {
      settle(resolve, reject, {
        data: responseData,
        headers: AxiosHeaders_default.from(response.headers),
        status: response.status,
        statusText: response.statusText,
        config,
        request
      });
    });
  } catch (err) {
    unsubscribe && unsubscribe();
    if (err && err.name === "TypeError" && /Load failed|fetch/i.test(err.message)) throw Object.assign(new AxiosError_default("Network Error", AxiosError_default.ERR_NETWORK, config, request), { cause: err.cause || err });
    throw AxiosError_default.from(err, err && err.code, config, request);
  }
});
var knownAdapters = {
  http: null_default,
  xhr: xhr_default,
  fetch: fetch_default
};
utils_default.forEach(knownAdapters, (fn, value) => {
  if (fn) {
    try {
      Object.defineProperty(fn, "name", { value });
    } catch (e) {
    }
    Object.defineProperty(fn, "adapterName", { value });
  }
});
var renderReason = (reason) => `- ${reason}`;
var isResolvedHandle = (adapter) => utils_default.isFunction(adapter) || adapter === null || adapter === false;
var adapters_default = {
  getAdapter: (adapters) => {
    adapters = utils_default.isArray(adapters) ? adapters : [adapters];
    const { length } = adapters;
    let nameOrAdapter;
    let adapter;
    const rejectedReasons = {};
    for (let i = 0; i < length; i++) {
      nameOrAdapter = adapters[i];
      let id;
      adapter = nameOrAdapter;
      if (!isResolvedHandle(nameOrAdapter)) {
        adapter = knownAdapters[(id = String(nameOrAdapter)).toLowerCase()];
        if (adapter === void 0) throw new AxiosError_default(`Unknown adapter '${id}'`);
      }
      if (adapter) break;
      rejectedReasons[id || "#" + i] = adapter;
    }
    if (!adapter) {
      const reasons = Object.entries(rejectedReasons).map(([id, state]) => `adapter ${id} ` + (state === false ? "is not supported by the environment" : "is not available in the build"));
      let s = length ? reasons.length > 1 ? "since :\n" + reasons.map(renderReason).join("\n") : " " + renderReason(reasons[0]) : "as no adapter specified";
      throw new AxiosError_default(`There is no suitable adapter to dispatch the request ` + s, "ERR_NOT_SUPPORT");
    }
    return adapter;
  },
  adapters: knownAdapters
};
function throwIfCancellationRequested(config) {
  if (config.cancelToken) config.cancelToken.throwIfRequested();
  if (config.signal && config.signal.aborted) throw new CanceledError_default(null, config);
}
function dispatchRequest(config) {
  throwIfCancellationRequested(config);
  config.headers = AxiosHeaders_default.from(config.headers);
  config.data = transformData.call(config, config.transformRequest);
  if ([
    "post",
    "put",
    "patch"
  ].indexOf(config.method) !== -1) config.headers.setContentType("application/x-www-form-urlencoded", false);
  const adapter = adapters_default.getAdapter(config.adapter || defaults_default.adapter);
  return adapter(config).then(function onAdapterResolution(response) {
    throwIfCancellationRequested(config);
    response.data = transformData.call(config, config.transformResponse, response);
    response.headers = AxiosHeaders_default.from(response.headers);
    return response;
  }, function onAdapterRejection(reason) {
    if (!isCancel(reason)) {
      throwIfCancellationRequested(config);
      if (reason && reason.response) {
        reason.response.data = transformData.call(config, config.transformResponse, reason.response);
        reason.response.headers = AxiosHeaders_default.from(reason.response.headers);
      }
    }
    return Promise.reject(reason);
  });
}
var VERSION = "1.10.0";
var validators$1 = {};
[
  "object",
  "boolean",
  "number",
  "function",
  "string",
  "symbol"
].forEach((type, i) => {
  validators$1[type] = function validator(thing) {
    return typeof thing === type || "a" + (i < 1 ? "n " : " ") + type;
  };
});
var deprecatedWarnings = {};
validators$1.transitional = function transitional(validator, version, message) {
  function formatMessage(opt, desc) {
    return "[Axios v" + VERSION + "] Transitional option '" + opt + "'" + desc + (message ? ". " + message : "");
  }
  return (value, opt, opts) => {
    if (validator === false) throw new AxiosError_default(formatMessage(opt, " has been removed" + (version ? " in " + version : "")), AxiosError_default.ERR_DEPRECATED);
    if (version && !deprecatedWarnings[opt]) {
      deprecatedWarnings[opt] = true;
      console.warn(formatMessage(opt, " has been deprecated since v" + version + " and will be removed in the near future"));
    }
    return validator ? validator(value, opt, opts) : true;
  };
};
validators$1.spelling = function spelling(correctSpelling) {
  return (value, opt) => {
    console.warn(`${opt} is likely a misspelling of ${correctSpelling}`);
    return true;
  };
};
function assertOptions(options, schema, allowUnknown) {
  if (typeof options !== "object") throw new AxiosError_default("options must be an object", AxiosError_default.ERR_BAD_OPTION_VALUE);
  const keys = Object.keys(options);
  let i = keys.length;
  while (i-- > 0) {
    const opt = keys[i];
    const validator = schema[opt];
    if (validator) {
      const value = options[opt];
      const result = value === void 0 || validator(value, opt, options);
      if (result !== true) throw new AxiosError_default("option " + opt + " must be " + result, AxiosError_default.ERR_BAD_OPTION_VALUE);
      continue;
    }
    if (allowUnknown !== true) throw new AxiosError_default("Unknown option " + opt, AxiosError_default.ERR_BAD_OPTION);
  }
}
var validator_default = {
  assertOptions,
  validators: validators$1
};
var validators = validator_default.validators;
var Axios = class {
  constructor(instanceConfig) {
    this.defaults = instanceConfig || {};
    this.interceptors = {
      request: new InterceptorManager_default(),
      response: new InterceptorManager_default()
    };
  }
  /**
  * Dispatch a request
  *
  * @param {String|Object} configOrUrl The config specific for this request (merged with this.defaults)
  * @param {?Object} config
  *
  * @returns {Promise} The Promise to be fulfilled
  */
  async request(configOrUrl, config) {
    try {
      return await this._request(configOrUrl, config);
    } catch (err) {
      if (err instanceof Error) {
        let dummy = {};
        Error.captureStackTrace ? Error.captureStackTrace(dummy) : dummy = /* @__PURE__ */ new Error();
        const stack = dummy.stack ? dummy.stack.replace(/^.+\n/, "") : "";
        try {
          if (!err.stack) err.stack = stack;
          else if (stack && !String(err.stack).endsWith(stack.replace(/^.+\n.+\n/, ""))) err.stack += "\n" + stack;
        } catch (e) {
        }
      }
      throw err;
    }
  }
  _request(configOrUrl, config) {
    if (typeof configOrUrl === "string") {
      config = config || {};
      config.url = configOrUrl;
    } else config = configOrUrl || {};
    config = mergeConfig(this.defaults, config);
    const { transitional: transitional2, paramsSerializer, headers } = config;
    if (transitional2 !== void 0) validator_default.assertOptions(transitional2, {
      silentJSONParsing: validators.transitional(validators.boolean),
      forcedJSONParsing: validators.transitional(validators.boolean),
      clarifyTimeoutError: validators.transitional(validators.boolean)
    }, false);
    if (paramsSerializer != null) if (utils_default.isFunction(paramsSerializer)) config.paramsSerializer = { serialize: paramsSerializer };
    else validator_default.assertOptions(paramsSerializer, {
      encode: validators.function,
      serialize: validators.function
    }, true);
    if (config.allowAbsoluteUrls !== void 0) {
    } else if (this.defaults.allowAbsoluteUrls !== void 0) config.allowAbsoluteUrls = this.defaults.allowAbsoluteUrls;
    else config.allowAbsoluteUrls = true;
    validator_default.assertOptions(config, {
      baseUrl: validators.spelling("baseURL"),
      withXsrfToken: validators.spelling("withXSRFToken")
    }, true);
    config.method = (config.method || this.defaults.method || "get").toLowerCase();
    let contextHeaders = headers && utils_default.merge(headers.common, headers[config.method]);
    headers && utils_default.forEach([
      "delete",
      "get",
      "head",
      "post",
      "put",
      "patch",
      "common"
    ], (method) => {
      delete headers[method];
    });
    config.headers = AxiosHeaders_default.concat(contextHeaders, headers);
    const requestInterceptorChain = [];
    let synchronousRequestInterceptors = true;
    this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
      if (typeof interceptor.runWhen === "function" && interceptor.runWhen(config) === false) return;
      synchronousRequestInterceptors = synchronousRequestInterceptors && interceptor.synchronous;
      requestInterceptorChain.unshift(interceptor.fulfilled, interceptor.rejected);
    });
    const responseInterceptorChain = [];
    this.interceptors.response.forEach(function pushResponseInterceptors(interceptor) {
      responseInterceptorChain.push(interceptor.fulfilled, interceptor.rejected);
    });
    let promise;
    let i = 0;
    let len;
    if (!synchronousRequestInterceptors) {
      const chain = [dispatchRequest.bind(this), void 0];
      chain.unshift.apply(chain, requestInterceptorChain);
      chain.push.apply(chain, responseInterceptorChain);
      len = chain.length;
      promise = Promise.resolve(config);
      while (i < len) promise = promise.then(chain[i++], chain[i++]);
      return promise;
    }
    len = requestInterceptorChain.length;
    let newConfig = config;
    i = 0;
    while (i < len) {
      const onFulfilled = requestInterceptorChain[i++];
      const onRejected = requestInterceptorChain[i++];
      try {
        newConfig = onFulfilled(newConfig);
      } catch (error) {
        onRejected.call(this, error);
        break;
      }
    }
    try {
      promise = dispatchRequest.call(this, newConfig);
    } catch (error) {
      return Promise.reject(error);
    }
    i = 0;
    len = responseInterceptorChain.length;
    while (i < len) promise = promise.then(responseInterceptorChain[i++], responseInterceptorChain[i++]);
    return promise;
  }
  getUri(config) {
    config = mergeConfig(this.defaults, config);
    const fullPath = buildFullPath(config.baseURL, config.url, config.allowAbsoluteUrls);
    return buildURL(fullPath, config.params, config.paramsSerializer);
  }
};
utils_default.forEach([
  "delete",
  "get",
  "head",
  "options"
], function forEachMethodNoData(method) {
  Axios.prototype[method] = function(url, config) {
    return this.request(mergeConfig(config || {}, {
      method,
      url,
      data: (config || {}).data
    }));
  };
});
utils_default.forEach([
  "post",
  "put",
  "patch"
], function forEachMethodWithData(method) {
  function generateHTTPMethod(isForm) {
    return function httpMethod(url, data, config) {
      return this.request(mergeConfig(config || {}, {
        method,
        headers: isForm ? { "Content-Type": "multipart/form-data" } : {},
        url,
        data
      }));
    };
  }
  Axios.prototype[method] = generateHTTPMethod();
  Axios.prototype[method + "Form"] = generateHTTPMethod(true);
});
var Axios_default = Axios;
var CancelToken = class CancelToken2 {
  constructor(executor) {
    if (typeof executor !== "function") throw new TypeError("executor must be a function.");
    let resolvePromise;
    this.promise = new Promise(function promiseExecutor(resolve) {
      resolvePromise = resolve;
    });
    const token = this;
    this.promise.then((cancel) => {
      if (!token._listeners) return;
      let i = token._listeners.length;
      while (i-- > 0) token._listeners[i](cancel);
      token._listeners = null;
    });
    this.promise.then = (onfulfilled) => {
      let _resolve;
      const promise = new Promise((resolve) => {
        token.subscribe(resolve);
        _resolve = resolve;
      }).then(onfulfilled);
      promise.cancel = function reject() {
        token.unsubscribe(_resolve);
      };
      return promise;
    };
    executor(function cancel(message, config, request) {
      if (token.reason) return;
      token.reason = new CanceledError_default(message, config, request);
      resolvePromise(token.reason);
    });
  }
  /**
  * Throws a `CanceledError` if cancellation has been requested.
  */
  throwIfRequested() {
    if (this.reason) throw this.reason;
  }
  /**
  * Subscribe to the cancel signal
  */
  subscribe(listener) {
    if (this.reason) {
      listener(this.reason);
      return;
    }
    if (this._listeners) this._listeners.push(listener);
    else this._listeners = [listener];
  }
  /**
  * Unsubscribe from the cancel signal
  */
  unsubscribe(listener) {
    if (!this._listeners) return;
    const index = this._listeners.indexOf(listener);
    if (index !== -1) this._listeners.splice(index, 1);
  }
  toAbortSignal() {
    const controller = new AbortController();
    const abort = (err) => {
      controller.abort(err);
    };
    this.subscribe(abort);
    controller.signal.unsubscribe = () => this.unsubscribe(abort);
    return controller.signal;
  }
  /**
  * Returns an object that contains a new `CancelToken` and a function that, when called,
  * cancels the `CancelToken`.
  */
  static source() {
    let cancel;
    const token = new CancelToken2(function executor(c) {
      cancel = c;
    });
    return {
      token,
      cancel
    };
  }
};
var CancelToken_default = CancelToken;
function spread(callback) {
  return function wrap(arr) {
    return callback.apply(null, arr);
  };
}
function isAxiosError(payload) {
  return utils_default.isObject(payload) && payload.isAxiosError === true;
}
var HttpStatusCode = {
  Continue: 100,
  SwitchingProtocols: 101,
  Processing: 102,
  EarlyHints: 103,
  Ok: 200,
  Created: 201,
  Accepted: 202,
  NonAuthoritativeInformation: 203,
  NoContent: 204,
  ResetContent: 205,
  PartialContent: 206,
  MultiStatus: 207,
  AlreadyReported: 208,
  ImUsed: 226,
  MultipleChoices: 300,
  MovedPermanently: 301,
  Found: 302,
  SeeOther: 303,
  NotModified: 304,
  UseProxy: 305,
  Unused: 306,
  TemporaryRedirect: 307,
  PermanentRedirect: 308,
  BadRequest: 400,
  Unauthorized: 401,
  PaymentRequired: 402,
  Forbidden: 403,
  NotFound: 404,
  MethodNotAllowed: 405,
  NotAcceptable: 406,
  ProxyAuthenticationRequired: 407,
  RequestTimeout: 408,
  Conflict: 409,
  Gone: 410,
  LengthRequired: 411,
  PreconditionFailed: 412,
  PayloadTooLarge: 413,
  UriTooLong: 414,
  UnsupportedMediaType: 415,
  RangeNotSatisfiable: 416,
  ExpectationFailed: 417,
  ImATeapot: 418,
  MisdirectedRequest: 421,
  UnprocessableEntity: 422,
  Locked: 423,
  FailedDependency: 424,
  TooEarly: 425,
  UpgradeRequired: 426,
  PreconditionRequired: 428,
  TooManyRequests: 429,
  RequestHeaderFieldsTooLarge: 431,
  UnavailableForLegalReasons: 451,
  InternalServerError: 500,
  NotImplemented: 501,
  BadGateway: 502,
  ServiceUnavailable: 503,
  GatewayTimeout: 504,
  HttpVersionNotSupported: 505,
  VariantAlsoNegotiates: 506,
  InsufficientStorage: 507,
  LoopDetected: 508,
  NotExtended: 510,
  NetworkAuthenticationRequired: 511
};
Object.entries(HttpStatusCode).forEach(([key, value]) => {
  HttpStatusCode[value] = key;
});
var HttpStatusCode_default = HttpStatusCode;
function createInstance(defaultConfig) {
  const context = new Axios_default(defaultConfig);
  const instance = bind(Axios_default.prototype.request, context);
  utils_default.extend(instance, Axios_default.prototype, context, { allOwnKeys: true });
  utils_default.extend(instance, context, null, { allOwnKeys: true });
  instance.create = function create(instanceConfig) {
    return createInstance(mergeConfig(defaultConfig, instanceConfig));
  };
  return instance;
}
var axios = createInstance(defaults_default);
axios.Axios = Axios_default;
axios.CanceledError = CanceledError_default;
axios.CancelToken = CancelToken_default;
axios.isCancel = isCancel;
axios.VERSION = VERSION;
axios.toFormData = toFormData_default;
axios.AxiosError = AxiosError_default;
axios.Cancel = axios.CanceledError;
axios.all = function all(promises) {
  return Promise.all(promises);
};
axios.spread = spread;
axios.isAxiosError = isAxiosError;
axios.mergeConfig = mergeConfig;
axios.AxiosHeaders = AxiosHeaders_default;
axios.formToJSON = (thing) => formDataToJSON_default(utils_default.isHTMLForm(thing) ? new FormData(thing) : thing);
axios.getAdapter = adapters_default.getAdapter;
axios.HttpStatusCode = HttpStatusCode_default;
axios.default = axios;
var axios_default = axios;
var WasmBufferManager = class {
  constructor(module) {
    this.module = module;
  }
  allocOne(data) {
    const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
    const ptr = this.module._alloc(bytes.length);
    this.module.HEAPU8.set(bytes, ptr);
    return {
      ptr,
      len: bytes.length
    };
  }
  deallocOne({ ptr, len }) {
    this.module._dealloc(ptr, len);
  }
  async ctx(data, fn) {
    const region = this.allocOne(data);
    try {
      const res = fn(region.ptr, region.len);
      return res instanceof Promise ? await res : res;
    } finally {
      this.deallocOne(region);
    }
  }
  async *ctxGen(data, fn) {
    const region = this.allocOne(data);
    try {
      const gen = fn(region.ptr, region.len);
      for await (const v of gen) yield v;
    } finally {
      this.deallocOne(region);
    }
  }
  async ctxRegions(datas, fn) {
    const regions = [];
    try {
      for (const d of datas) regions.push(this.allocOne(d));
      const tupleRegions = regions;
      const result = fn(...tupleRegions);
      return result instanceof Promise ? await result : result;
    } finally {
      for (const reg of regions.reverse()) this.deallocOne(reg);
    }
  }
};
var Retto = class Retto2 {
  bufferManager;
  emitter = new EventTarget();
  constructor(module) {
    this.module = module;
    this.bufferManager = new WasmBufferManager(module);
    this.registerCallbacks();
  }
  static async load(onProgress) {
    const wasmUrl = new URL("./retto_wasm.wasm", "file:///worker.mjs").href;
    const { data } = await axios_default.get(wasmUrl, {
      responseType: "arraybuffer",
      onDownloadProgress: ({ loaded, total }) => {
        if (total && onProgress) onProgress(loaded / total);
      }
    });
    const module = await retto_wasm_default({
      wasmBinary: data,
      locateFile: () => ""
    });
    return new Retto2(module);
  }
  get is_embed_build() {
    return this.module._retto_embed_init !== void 0;
  }
  registerCallbacks() {
    this.module.onRettoNotifyDetDone = (sessionId, msg) => {
      try {
        console.debug("Det done:", sessionId, msg);
        const data = JSON.parse(msg);
        this.emitter.dispatchEvent(new CustomEvent(`${sessionId}:det`, { detail: data }));
      } catch (e) {
        console.error("Error parsing Det result:", e, msg);
      }
    };
    this.module.onRettoNotifyClsDone = (sessionId, msg) => {
      try {
        console.debug("Cls done:", sessionId, msg);
        const data = JSON.parse(msg);
        this.emitter.dispatchEvent(new CustomEvent(`${sessionId}:cls`, { detail: data }));
      } catch (e) {
        console.error("Error parsing Cls result:", e, msg);
      }
    };
    this.module.onRettoNotifyRecDone = (sessionId, msg) => {
      try {
        console.debug("Rec done:", sessionId, msg);
        const data = JSON.parse(msg);
        this.emitter.dispatchEvent(new CustomEvent(`${sessionId}:rec`, { detail: data }));
      } catch (e) {
        console.error("Error parsing Rec result:", e, msg);
      }
    };
  }
  async init(models) {
    if (!this.is_embed_build && !models) throw new Error("Models are required for this build.");
    if (models) {
      const { det_model, cls_model, rec_model, rec_dict } = models;
      await this.bufferManager.ctxRegions([
        det_model,
        cls_model,
        rec_model,
        rec_dict
      ], (det_r, cls_r, rec_r, rec_dict_r) => {
        this.module._retto_init(det_r.ptr, det_r.len, cls_r.ptr, cls_r.len, rec_r.ptr, rec_r.len, rec_dict_r.ptr, rec_dict_r.len);
      });
    } else this.module._retto_embed_init();
  }
  async *recognize(data) {
    const module = this.module;
    const emitter = this.emitter;
    yield* this.bufferManager.ctxGen(data, async function* (ptr, len) {
      const sessionPtr = module._retto_rec(ptr, len);
      const sessionId = module.UTF8ToString(sessionPtr);
      function once(stage) {
        return new Promise((resolve) => {
          const eventName = `${sessionId}:${stage}`;
          const handler = (e) => {
            const data$1 = e.detail;
            resolve(data$1);
            emitter.removeEventListener(eventName, handler);
          };
          emitter.addEventListener(eventName, handler);
        });
      }
      const det = await once("det");
      yield {
        stage: "det",
        result: det
      };
      const cls = await once("cls");
      yield {
        stage: "cls",
        result: cls
      };
      const rec = await once("rec");
      yield {
        stage: "rec",
        result: rec
      };
    });
  }
};

// src/index.ts
var retto = null;
var rettoReady = false;
async function initRetto() {
  if (rettoReady) return;
  console.log("[retto] Initializing with pre-compiled WASM...");
  const wasmModule = __RETTO_WASM__;
  retto = await Retto.load((progress) => {
    console.log(`[retto] Load: ${(progress * 100).toFixed(0)}%`);
  });
  await retto.init({
    det_model: __MODEL_DET__,
    cls_model: __MODEL_CLS__,
    rec_model: __MODEL_REC__,
    rec_dict: __MODEL_DICT__
  });
  rettoReady = true;
  console.log("[retto] Ready");
}
function parseExtractedText(text, docType) {
  const result = {
    document_number: null,
    first_name: null,
    last_name: null,
    date_of_birth: null,
    nationality: "ESP",
    gender: null
  };
  const upper = text.toUpperCase();
  const dniMatch = upper.match(/\b(\d{8}[A-Z])\b/);
  const nieMatch = upper.match(/\b([XYZ]\d{7}[A-Z])\b/);
  if (docType?.toUpperCase() === "NIE" && nieMatch) {
    result.document_number = nieMatch[1];
  } else if (dniMatch) {
    result.document_number = dniMatch[1];
  } else if (nieMatch) {
    result.document_number = nieMatch[1];
  }
  const dateMatch = text.match(/(\d{1,2})[\s\/\-\.](\d{1,2})[\s\/\-\.](\d{4})/);
  if (dateMatch) {
    result.date_of_birth = `${dateMatch[3]}-${dateMatch[2].padStart(2, "0")}-${dateMatch[1].padStart(2, "0")}`;
  }
  return result;
}
var index_default = {
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;
    if (path === "/health") {
      return new Response(JSON.stringify({
        service: "retto-ocr",
        status: rettoReady ? "ok" : "initializing",
        engine: "paddleocr-wasm",
        ready: rettoReady
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }
    if (path === "/ocr" && req.method === "POST") {
      try {
        await initRetto();
        const contentType = req.headers.get("content-type") || "";
        if (!contentType.includes("multipart/form-data")) {
          return new Response(JSON.stringify({ error: "Expected multipart/form-data" }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }
        const formData = await req.formData();
        const front = formData.get("front");
        if (!front) {
          return new Response(JSON.stringify({ error: "Missing 'front' image field" }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }
        const frontBuffer = await front.arrayBuffer();
        console.log("[retto] Running OCR...");
        const results = [];
        for await (const stage of retto.recognize(frontBuffer)) {
          if (stage.result && stage.result.length > 0) {
            results.push(...stage.result);
          }
        }
        const extractedText = results.filter((r) => r.text).map((r) => r.text).join("\n");
        const docType = formData.get("docType")?.toString() || "DNI";
        const extractedData = parseExtractedText(extractedText, docType);
        const confidence = results.length > 0 ? results.reduce((sum, r) => sum + (r.score || 0), 0) / results.length : 0;
        return new Response(JSON.stringify({
          success: true,
          profile_id: "retto-" + Math.random().toString(36).substring(2, 15),
          document_type: docType,
          extracted_data: extractedData,
          confidence,
          raw_text: extractedText
        }), {
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        console.error("[retto] Error:", error);
        return new Response(JSON.stringify({
          error: "OCR processing failed",
          message: error instanceof Error ? error.message : String(error)
        }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" }
    });
  }
};
export {
  index_default as default
};
//# sourceMappingURL=index.js.map
