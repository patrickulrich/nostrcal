import {
  UnheadContext
} from "./chunk-WUPXDLAB.js";
import {
  FlatMetaPlugin,
  SafeInputPlugin
} from "./chunk-ROXIBW6L.js";
import {
  HasElementTags,
  ScriptNetworkEvents,
  TagsWithInnerContent,
  ValidHeadTags
} from "./chunk-A2GBXVCZ.js";
import {
  require_react
} from "./chunk-2CLD7BNN.js";
import {
  __toESM
} from "./chunk-WOOG5QLI.js";

// node_modules/@unhead/react/dist/index.mjs
var import_react = __toESM(require_react(), 1);

// node_modules/unhead/dist/shared/unhead.BPM0-cfG.mjs
function useHead(unhead, input, options = {}) {
  return unhead.push(input || {}, options);
}
function useHeadSafe(unhead, input = {}, options = {}) {
  unhead.use(SafeInputPlugin);
  return useHead(unhead, input, Object.assign(options, { _safe: true }));
}
function useSeoMeta(unhead, input = {}, options) {
  unhead.use(FlatMetaPlugin);
  function normalize(input2) {
    if (input2._flatMeta) {
      return input2;
    }
    const { title, titleTemplate, ...meta } = input2 || {};
    return {
      title,
      titleTemplate,
      _flatMeta: meta
    };
  }
  const entry = unhead.push(normalize(input), options);
  const corePatch = entry.patch;
  if (!entry.__patched) {
    entry.patch = (input2) => corePatch(normalize(input2));
    entry.__patched = true;
  }
  return entry;
}

// node_modules/unhead/dist/shared/unhead.B578PsDV.mjs
function createNoopedRecordingProxy(instance = {}) {
  const stack = [];
  let stackIdx = -1;
  const handler = (reuseStack = false) => ({
    get(_, prop, receiver) {
      if (!reuseStack) {
        const v = Reflect.get(_, prop, receiver);
        if (typeof v !== "undefined") {
          return v;
        }
        stackIdx++;
        stack[stackIdx] = [];
      }
      stack[stackIdx].push({ type: "get", key: prop });
      return new Proxy(() => {
      }, handler(true));
    },
    apply(_, __, args) {
      stack[stackIdx].push({ type: "apply", key: "", args });
      return void 0;
    }
  });
  return {
    proxy: new Proxy(instance || {}, handler()),
    stack
  };
}
function createForwardingProxy(target) {
  const handler = {
    get(_, prop, receiver) {
      const v = Reflect.get(_, prop, receiver);
      if (typeof v === "object") {
        return new Proxy(v, handler);
      }
      return v;
    },
    apply(_, __, args) {
      Reflect.apply(_, __, args);
      return void 0;
    }
  };
  return new Proxy(target, handler);
}
function replayProxyRecordings(target, stack) {
  stack.forEach((recordings) => {
    let context = target;
    let prevContext = target;
    recordings.forEach(({ type, key, args }) => {
      if (type === "get") {
        prevContext = context;
        context = context[key];
      } else if (type === "apply") {
        context = context.call(prevContext, ...args);
      }
    });
  });
}
function resolveScriptKey(input) {
  return input.key || input.src || (typeof input.innerHTML === "string" ? input.innerHTML : "");
}
var PreconnectServerModes = ["preconnect", "dns-prefetch"];
function useScript(head, _input, _options) {
  var _a, _b, _c;
  const input = typeof _input === "string" ? { src: _input } : _input;
  const options = _options || {};
  const id = resolveScriptKey(input);
  const prevScript = (_a = head._scripts) == null ? void 0 : _a[id];
  if (prevScript) {
    prevScript.setupTriggerHandler(options.trigger);
    return prevScript;
  }
  (_b = options.beforeInit) == null ? void 0 : _b.call(options);
  const syncStatus = (s) => {
    script.status = s;
    head.hooks.callHook(`script:updated`, hookCtx);
  };
  ScriptNetworkEvents.forEach((fn) => {
    const k = fn;
    const _fn = typeof input[k] === "function" ? input[k].bind(options.eventContext) : null;
    input[k] = (e) => {
      syncStatus(fn === "onload" ? "loaded" : fn === "onerror" ? "error" : "loading");
      _fn == null ? void 0 : _fn(e);
    };
  });
  const _cbs = { loaded: [], error: [] };
  const _uniqueCbs = /* @__PURE__ */ new Set();
  const _registerCb = (key, cb, options2) => {
    if (head.ssr) {
      return;
    }
    if (options2 == null ? void 0 : options2.key) {
      const key2 = `${options2 == null ? void 0 : options2.key}:${options2.key}`;
      if (_uniqueCbs.has(key2)) {
        return;
      }
      _uniqueCbs.add(key2);
    }
    if (_cbs[key]) {
      const i = _cbs[key].push(cb);
      return () => {
        var _a2;
        return (_a2 = _cbs[key]) == null ? void 0 : _a2.splice(i - 1, 1);
      };
    }
    cb(script.instance);
    return () => {
    };
  };
  const loadPromise = new Promise((resolve) => {
    if (head.ssr)
      return;
    const emit = (api) => requestAnimationFrame(() => resolve(api));
    const _ = head.hooks.hook("script:updated", ({ script: script2 }) => {
      const status = script2.status;
      if (script2.id === id && (status === "loaded" || status === "error")) {
        if (status === "loaded") {
          if (typeof options.use === "function") {
            const api = options.use();
            if (api) {
              emit(api);
            }
          } else {
            emit({});
          }
        } else if (status === "error") {
          resolve(false);
        }
        _();
      }
    });
  });
  const script = {
    _loadPromise: loadPromise,
    instance: !head.ssr && ((_c = options == null ? void 0 : options.use) == null ? void 0 : _c.call(options)) || null,
    proxy: null,
    id,
    status: "awaitingLoad",
    remove() {
      var _a2, _b2, _c2;
      (_a2 = script._triggerAbortController) == null ? void 0 : _a2.abort();
      script._triggerPromises = [];
      (_b2 = script._warmupEl) == null ? void 0 : _b2.dispose();
      if (script.entry) {
        script.entry.dispose();
        script.entry = void 0;
        syncStatus("removed");
        (_c2 = head._scripts) == null ? true : delete _c2[id];
        return true;
      }
      return false;
    },
    warmup(rel) {
      const { src } = input;
      const isCrossOrigin = !src.startsWith("/") || src.startsWith("//");
      const isPreconnect = rel && PreconnectServerModes.includes(rel);
      let href = src;
      if (!rel || isPreconnect && !isCrossOrigin) {
        return;
      }
      if (isPreconnect) {
        const $url = new URL(src);
        href = `${$url.protocol}//${$url.host}`;
      }
      const link = {
        href,
        rel,
        crossorigin: typeof input.crossorigin !== "undefined" ? input.crossorigin : isCrossOrigin ? "anonymous" : void 0,
        referrerpolicy: typeof input.referrerpolicy !== "undefined" ? input.referrerpolicy : isCrossOrigin ? "no-referrer" : void 0,
        fetchpriority: typeof input.fetchpriority !== "undefined" ? input.fetchpriority : "low",
        integrity: input.integrity,
        as: rel === "preload" ? "script" : void 0
      };
      script._warmupEl = head.push({ link: [link] }, { head, tagPriority: "high" });
      return script._warmupEl;
    },
    load(cb) {
      var _a2;
      (_a2 = script._triggerAbortController) == null ? void 0 : _a2.abort();
      script._triggerPromises = [];
      if (!script.entry) {
        syncStatus("loading");
        const defaults = {
          defer: true,
          fetchpriority: "low"
        };
        if (input.src && (input.src.startsWith("http") || input.src.startsWith("//"))) {
          defaults.crossorigin = "anonymous";
          defaults.referrerpolicy = "no-referrer";
        }
        script.entry = head.push({
          script: [{ ...defaults, ...input }]
        }, options);
      }
      if (cb)
        _registerCb("loaded", cb);
      return loadPromise;
    },
    onLoaded(cb, options2) {
      return _registerCb("loaded", cb, options2);
    },
    onError(cb, options2) {
      return _registerCb("error", cb, options2);
    },
    setupTriggerHandler(trigger) {
      if (script.status !== "awaitingLoad") {
        return;
      }
      if ((typeof trigger === "undefined" || trigger === "client") && !head.ssr || trigger === "server") {
        script.load();
      } else if (trigger instanceof Promise) {
        if (head.ssr) {
          return;
        }
        if (!script._triggerAbortController) {
          script._triggerAbortController = new AbortController();
          script._triggerAbortPromise = new Promise((resolve) => {
            script._triggerAbortController.signal.addEventListener("abort", () => {
              script._triggerAbortController = null;
              resolve();
            });
          });
        }
        script._triggerPromises = script._triggerPromises || [];
        const idx = script._triggerPromises.push(Promise.race([
          trigger.then((v) => typeof v === "undefined" || v ? script.load : void 0),
          script._triggerAbortPromise
        ]).catch(() => {
        }).then((res) => {
          res == null ? void 0 : res();
        }).finally(() => {
          var _a2;
          (_a2 = script._triggerPromises) == null ? void 0 : _a2.splice(idx, 1);
        }));
      } else if (typeof trigger === "function") {
        trigger(script.load);
      }
    },
    _cbs
  };
  loadPromise.then((api) => {
    var _a2, _b2;
    if (api !== false) {
      script.instance = api;
      (_a2 = _cbs.loaded) == null ? void 0 : _a2.forEach((cb) => cb(api));
      _cbs.loaded = null;
    } else {
      (_b2 = _cbs.error) == null ? void 0 : _b2.forEach((cb) => cb());
      _cbs.error = null;
    }
  });
  const hookCtx = { script };
  script.setupTriggerHandler(options.trigger);
  if (options.use) {
    const { proxy, stack } = createNoopedRecordingProxy(head.ssr ? {} : options.use() || {});
    script.proxy = proxy;
    script.onLoaded((instance) => {
      replayProxyRecordings(instance, stack);
      script.proxy = createForwardingProxy(instance);
    });
  }
  if (!options.warmupStrategy && (typeof options.trigger === "undefined" || options.trigger === "client")) {
    options.warmupStrategy = "preload";
  }
  if (options.warmupStrategy) {
    script.warmup(options.warmupStrategy);
  }
  head._scripts = Object.assign(head._scripts || {}, { [id]: script });
  return script;
}

// node_modules/@unhead/react/dist/index.mjs
var hookImports = {
  "@unhead/react": [
    "useUnhead",
    "useHead",
    "useSeoMeta",
    "useHeadSafe"
  ]
};
function useUnhead() {
  const instance = (0, import_react.useContext)(UnheadContext);
  if (!instance) {
    throw new Error("useHead() was called without provide context.");
  }
  return instance;
}
function withSideEffects(input, options, fn) {
  const unhead = options.head || useUnhead();
  const [entry] = (0, import_react.useState)(() => fn(unhead, input, options));
  (0, import_react.useEffect)(() => {
    entry.patch(input);
  }, [input]);
  (0, import_react.useEffect)(() => {
    return () => {
      entry.dispose();
    };
  }, []);
  return entry;
}
function useHead2(input = {}, options = {}) {
  return withSideEffects(input, options, useHead);
}
function useHeadSafe2(input = {}, options = {}) {
  return withSideEffects(input, options, useHeadSafe);
}
function useSeoMeta2(input = {}, options = {}) {
  return withSideEffects(input, options, useSeoMeta);
}
function useScript2(_input, _options) {
  const input = typeof _input === "string" ? { src: _input } : _input;
  const options = _options || {};
  const head = (options == null ? void 0 : options.head) || useUnhead();
  options.head = head;
  const mountCbs = [];
  let isMounted = false;
  (0, import_react.useEffect)(() => {
    isMounted = true;
    mountCbs.forEach((i) => i());
    return () => {
      isMounted = false;
    };
  }, []);
  if (typeof options.trigger === "undefined") {
    options.trigger = (load) => {
      if (isMounted) {
        load();
      } else {
        mountCbs.push(load);
      }
    };
  }
  const script = useScript(head, input, options);
  const sideEffects = [];
  (0, import_react.useEffect)(() => {
    return () => {
      var _a;
      (_a = script._triggerAbortController) == null ? void 0 : _a.abort();
      sideEffects.forEach((i) => i());
    };
  }, []);
  const _registerCb = (key, cb) => {
    let i;
    const destroy = () => {
      var _a;
      if (i) {
        (_a = script._cbs[key]) == null ? void 0 : _a.splice(i - 1, 1);
        i = null;
      }
    };
    mountCbs.push(() => {
      if (!script._cbs[key]) {
        cb(script.instance);
        return () => {
        };
      }
      i = script._cbs[key].push(cb);
      sideEffects.push(destroy);
      return destroy;
    });
  };
  script.onLoaded = (cb) => _registerCb("loaded", cb);
  script.onError = (cb) => _registerCb("error", cb);
  return script;
}
var Head = ({ children, titleTemplate }) => {
  const head = useUnhead();
  const processedElements = (0, import_react.useMemo)(() => import_react.default.Children.toArray(children).filter(import_react.default.isValidElement), [children]);
  const getHeadChanges = (0, import_react.useCallback)(() => {
    const input = {
      titleTemplate
    };
    for (const element of processedElements) {
      const reactElement = element;
      const { type, props } = reactElement;
      const tagName = String(type);
      if (!ValidHeadTags.has(tagName)) {
        continue;
      }
      const data = { ...typeof props === "object" ? props : {} };
      if (TagsWithInnerContent.has(tagName) && data.children) {
        const contentKey = tagName === "script" ? "innerHTML" : "textContent";
        data[contentKey] = Array.isArray(data.children) ? data.children.map(String).join("") : String(data.children);
      }
      delete data.children;
      if (HasElementTags.has(tagName)) {
        const key = tagName;
        if (!Array.isArray(input[key])) {
          input[key] = [];
        }
        input[key].push(data);
      } else {
        input[tagName] = data;
      }
    }
    return input;
  }, [processedElements, titleTemplate]);
  const headRef = (0, import_react.useRef)(
    head.push(getHeadChanges())
  );
  (0, import_react.useEffect)(() => {
    return () => {
      var _a;
      if ((_a = headRef.current) == null ? void 0 : _a.dispose) {
        headRef.current.dispose();
      }
      headRef.current = null;
    };
  }, []);
  (0, import_react.useEffect)(() => {
    var _a;
    (_a = headRef.current) == null ? void 0 : _a.patch(getHeadChanges());
  }, [getHeadChanges]);
  return null;
};
export {
  Head,
  hookImports,
  useHead2 as useHead,
  useHeadSafe2 as useHeadSafe,
  useScript2 as useScript,
  useSeoMeta2 as useSeoMeta,
  useUnhead
};
//# sourceMappingURL=@unhead_react.js.map
