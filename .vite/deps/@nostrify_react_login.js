import {
  finalizeEvent,
  generateSecretKey,
  getFilterLimit,
  getPublicKey,
  matchFilters,
  nip04_exports,
  nip19_exports,
  nip44_exports,
  verifyEvent
} from "./chunk-Q2Y7TJID.js";
import {
  require_jsx_runtime
} from "./chunk-X3VLT5EQ.js";
import {
  require_react
} from "./chunk-2CLD7BNN.js";
import {
  __export,
  __privateAdd,
  __privateGet,
  __privateMethod,
  __privateSet,
  __privateWrapper,
  __publicField,
  __toESM
} from "./chunk-WOOG5QLI.js";

// node_modules/@jsr/nostrify__nostrify/BunkerURI.js
var BunkerURI = class _BunkerURI {
  constructor(uri) {
    /** Remote signer pubkey. */
    __publicField(this, "pubkey");
    /** Relay URLs on which the client is listening for responses from the remote-signer. */
    __publicField(this, "relays");
    /** A short random string that the remote-signer should return as the `result` field of its response. */
    __publicField(this, "secret");
    const url = new URL(uri);
    const params = new URLSearchParams(url.search);
    const pubkey = url.hostname || url.pathname.slice(2);
    const relays = params.getAll("relay");
    const secret = params.get("secret") ?? void 0;
    if (!pubkey) {
      throw new Error("Invalid bunker URI");
    }
    this.pubkey = pubkey;
    this.relays = relays;
    this.secret = secret;
  }
  /** Convert into a `bunker://` URI string. */
  get href() {
    return this.toString();
  }
  /** Convert into a `bunker://` URI string. */
  toString() {
    return _BunkerURI.toString(this);
  }
  /** Convert a bunker data object into a `BunkerURI` instance. */
  static fromJSON(data) {
    const uri = _BunkerURI.toString(data);
    return new _BunkerURI(uri);
  }
  /** Convert a bunker data object into a bunker URI string. */
  static toString(data) {
    const search = new URLSearchParams();
    for (const relay of data.relays) {
      search.append("relay", relay);
    }
    if (data.secret) {
      search.set("secret", data.secret);
    }
    return `bunker://${data.pubkey}?${search.toString()}`;
  }
};

// node_modules/@jsr/nostrify__nostrify/NBrowserSigner.js
var NBrowserSigner = class {
  get nostr() {
    const nostr = globalThis.nostr;
    if (!nostr) {
      throw new Error("Browser extension not available");
    }
    return nostr;
  }
  async getPublicKey() {
    const pubkey = await this.nostr.getPublicKey();
    if (typeof pubkey !== "string") {
      throw new Error(`Nostr public key retrieval failed: expected string, got ${JSON.stringify(pubkey)}`);
    }
    return pubkey;
  }
  async signEvent(event) {
    const signed = await this.nostr.signEvent(event);
    if (typeof signed !== "object" || !signed.id || !signed.pubkey || !signed.sig) {
      throw new Error(`Nostr event signing failed: expected object with id, pubkey, and sig, got ${JSON.stringify(signed)}`);
    }
    return signed;
  }
  async getRelays() {
    if (!this.nostr.getRelays) {
      return {};
    }
    const relays = await this.nostr.getRelays();
    if (typeof relays !== "object" || relays === null) {
      throw new Error(`Nostr getRelays failed: expected object, got ${JSON.stringify(relays)}`);
    }
    return this.nostr.getRelays();
  }
  get nip04() {
    const nostr = this.nostr;
    if (!nostr.nip04) {
      return void 0;
    }
    return {
      encrypt: async (pubkey, plaintext) => {
        const encrypted = await nostr.nip04.encrypt(pubkey, plaintext);
        if (typeof encrypted !== "string") {
          throw new Error(`NIP-04 encryption failed: expected string result, got ${JSON.stringify(encrypted)}`);
        }
        return encrypted;
      },
      decrypt: async (pubkey, ciphertext) => {
        const decrypted = await nostr.nip04.decrypt(pubkey, ciphertext);
        if (typeof decrypted !== "string") {
          throw new Error(`NIP-04 decryption failed: expected string result, got ${JSON.stringify(decrypted)}`);
        }
        return decrypted;
      }
    };
  }
  get nip44() {
    const nostr = this.nostr;
    if (!nostr.nip44) {
      return void 0;
    }
    return {
      encrypt: async (pubkey, plaintext) => {
        const encrypted = await nostr.nip44.encrypt(pubkey, plaintext);
        if (typeof encrypted !== "string") {
          throw new Error(`NIP-44 encryption failed: expected string result, got ${JSON.stringify(encrypted)}`);
        }
        return encrypted;
      },
      decrypt: async (pubkey, ciphertext) => {
        const decrypted = await nostr.nip44.decrypt(pubkey, ciphertext);
        if (typeof decrypted !== "string") {
          throw new Error(`NIP-44 decryption failed: expected string result, got ${JSON.stringify(decrypted)}`);
        }
        return decrypted;
      }
    };
  }
};

// node_modules/lru-cache/dist/esm/index.js
var perf = typeof performance === "object" && performance && typeof performance.now === "function" ? performance : Date;
var warned = /* @__PURE__ */ new Set();
var PROCESS = typeof process === "object" && !!process ? process : {};
var emitWarning = (msg, type, code, fn) => {
  typeof PROCESS.emitWarning === "function" ? PROCESS.emitWarning(msg, type, code, fn) : console.error(`[${code}] ${type}: ${msg}`);
};
var AC = globalThis.AbortController;
var AS = globalThis.AbortSignal;
var _a;
if (typeof AC === "undefined") {
  AS = class AbortSignal {
    constructor() {
      __publicField(this, "onabort");
      __publicField(this, "_onabort", []);
      __publicField(this, "reason");
      __publicField(this, "aborted", false);
    }
    addEventListener(_, fn) {
      this._onabort.push(fn);
    }
  };
  AC = class AbortController {
    constructor() {
      __publicField(this, "signal", new AS());
      warnACPolyfill();
    }
    abort(reason) {
      var _a5, _b4;
      if (this.signal.aborted)
        return;
      this.signal.reason = reason;
      this.signal.aborted = true;
      for (const fn of this.signal._onabort) {
        fn(reason);
      }
      (_b4 = (_a5 = this.signal).onabort) == null ? void 0 : _b4.call(_a5, reason);
    }
  };
  let printACPolyfillWarning = ((_a = PROCESS.env) == null ? void 0 : _a.LRU_CACHE_IGNORE_AC_WARNING) !== "1";
  const warnACPolyfill = () => {
    if (!printACPolyfillWarning)
      return;
    printACPolyfillWarning = false;
    emitWarning("AbortController is not defined. If using lru-cache in node 14, load an AbortController polyfill from the `node-abort-controller` package. A minimal polyfill is provided for use by LRUCache.fetch(), but it should not be relied upon in other contexts (eg, passing it to other APIs that use AbortController/AbortSignal might have undesirable effects). You may disable this with LRU_CACHE_IGNORE_AC_WARNING=1 in the env.", "NO_ABORT_CONTROLLER", "ENOTSUP", warnACPolyfill);
  };
}
var shouldWarn = (code) => !warned.has(code);
var TYPE = Symbol("type");
var isPosInt = (n) => n && n === Math.floor(n) && n > 0 && isFinite(n);
var getUintArray = (max) => !isPosInt(max) ? null : max <= Math.pow(2, 8) ? Uint8Array : max <= Math.pow(2, 16) ? Uint16Array : max <= Math.pow(2, 32) ? Uint32Array : max <= Number.MAX_SAFE_INTEGER ? ZeroArray : null;
var ZeroArray = class extends Array {
  constructor(size) {
    super(size);
    this.fill(0);
  }
};
var _constructing;
var _Stack = class _Stack {
  constructor(max, HeapCls) {
    __publicField(this, "heap");
    __publicField(this, "length");
    if (!__privateGet(_Stack, _constructing)) {
      throw new TypeError("instantiate Stack using Stack.create(n)");
    }
    this.heap = new HeapCls(max);
    this.length = 0;
  }
  static create(max) {
    const HeapCls = getUintArray(max);
    if (!HeapCls)
      return [];
    __privateSet(_Stack, _constructing, true);
    const s = new _Stack(max, HeapCls);
    __privateSet(_Stack, _constructing, false);
    return s;
  }
  push(n) {
    this.heap[this.length++] = n;
  }
  pop() {
    return this.heap[--this.length];
  }
};
_constructing = new WeakMap();
// private constructor
__privateAdd(_Stack, _constructing, false);
var Stack = _Stack;
var _a2, _b, _max, _maxSize, _dispose, _disposeAfter, _fetchMethod, _memoMethod, _size, _calculatedSize, _keyMap, _keyList, _valList, _next, _prev, _head, _tail, _free, _disposed, _sizes, _starts, _ttls, _hasDispose, _hasFetchMethod, _hasDisposeAfter, _LRUCache_instances, initializeTTLTracking_fn, _updateItemAge, _statusTTL, _setItemTTL, _isStale, initializeSizeTracking_fn, _removeItemSize, _addItemSize, _requireSize, indexes_fn, rindexes_fn, isValidIndex_fn, evict_fn, backgroundFetch_fn, isBackgroundFetch_fn, connect_fn, moveToTail_fn, delete_fn, clear_fn;
var _LRUCache = class _LRUCache {
  constructor(options) {
    __privateAdd(this, _LRUCache_instances);
    // options that cannot be changed without disaster
    __privateAdd(this, _max);
    __privateAdd(this, _maxSize);
    __privateAdd(this, _dispose);
    __privateAdd(this, _disposeAfter);
    __privateAdd(this, _fetchMethod);
    __privateAdd(this, _memoMethod);
    /**
     * {@link LRUCache.OptionsBase.ttl}
     */
    __publicField(this, "ttl");
    /**
     * {@link LRUCache.OptionsBase.ttlResolution}
     */
    __publicField(this, "ttlResolution");
    /**
     * {@link LRUCache.OptionsBase.ttlAutopurge}
     */
    __publicField(this, "ttlAutopurge");
    /**
     * {@link LRUCache.OptionsBase.updateAgeOnGet}
     */
    __publicField(this, "updateAgeOnGet");
    /**
     * {@link LRUCache.OptionsBase.updateAgeOnHas}
     */
    __publicField(this, "updateAgeOnHas");
    /**
     * {@link LRUCache.OptionsBase.allowStale}
     */
    __publicField(this, "allowStale");
    /**
     * {@link LRUCache.OptionsBase.noDisposeOnSet}
     */
    __publicField(this, "noDisposeOnSet");
    /**
     * {@link LRUCache.OptionsBase.noUpdateTTL}
     */
    __publicField(this, "noUpdateTTL");
    /**
     * {@link LRUCache.OptionsBase.maxEntrySize}
     */
    __publicField(this, "maxEntrySize");
    /**
     * {@link LRUCache.OptionsBase.sizeCalculation}
     */
    __publicField(this, "sizeCalculation");
    /**
     * {@link LRUCache.OptionsBase.noDeleteOnFetchRejection}
     */
    __publicField(this, "noDeleteOnFetchRejection");
    /**
     * {@link LRUCache.OptionsBase.noDeleteOnStaleGet}
     */
    __publicField(this, "noDeleteOnStaleGet");
    /**
     * {@link LRUCache.OptionsBase.allowStaleOnFetchAbort}
     */
    __publicField(this, "allowStaleOnFetchAbort");
    /**
     * {@link LRUCache.OptionsBase.allowStaleOnFetchRejection}
     */
    __publicField(this, "allowStaleOnFetchRejection");
    /**
     * {@link LRUCache.OptionsBase.ignoreFetchAbort}
     */
    __publicField(this, "ignoreFetchAbort");
    // computed properties
    __privateAdd(this, _size);
    __privateAdd(this, _calculatedSize);
    __privateAdd(this, _keyMap);
    __privateAdd(this, _keyList);
    __privateAdd(this, _valList);
    __privateAdd(this, _next);
    __privateAdd(this, _prev);
    __privateAdd(this, _head);
    __privateAdd(this, _tail);
    __privateAdd(this, _free);
    __privateAdd(this, _disposed);
    __privateAdd(this, _sizes);
    __privateAdd(this, _starts);
    __privateAdd(this, _ttls);
    __privateAdd(this, _hasDispose);
    __privateAdd(this, _hasFetchMethod);
    __privateAdd(this, _hasDisposeAfter);
    // conditionally set private methods related to TTL
    __privateAdd(this, _updateItemAge, () => {
    });
    __privateAdd(this, _statusTTL, () => {
    });
    __privateAdd(this, _setItemTTL, () => {
    });
    /* c8 ignore stop */
    __privateAdd(this, _isStale, () => false);
    __privateAdd(this, _removeItemSize, (_i) => {
    });
    __privateAdd(this, _addItemSize, (_i, _s, _st) => {
    });
    __privateAdd(this, _requireSize, (_k, _v, size, sizeCalculation) => {
      if (size || sizeCalculation) {
        throw new TypeError("cannot set size without setting maxSize or maxEntrySize on cache");
      }
      return 0;
    });
    /**
     * A String value that is used in the creation of the default string
     * description of an object. Called by the built-in method
     * `Object.prototype.toString`.
     */
    __publicField(this, _a2, "LRUCache");
    const { max = 0, ttl, ttlResolution = 1, ttlAutopurge, updateAgeOnGet, updateAgeOnHas, allowStale, dispose, disposeAfter, noDisposeOnSet, noUpdateTTL, maxSize = 0, maxEntrySize = 0, sizeCalculation, fetchMethod, memoMethod, noDeleteOnFetchRejection, noDeleteOnStaleGet, allowStaleOnFetchRejection, allowStaleOnFetchAbort, ignoreFetchAbort } = options;
    if (max !== 0 && !isPosInt(max)) {
      throw new TypeError("max option must be a nonnegative integer");
    }
    const UintArray = max ? getUintArray(max) : Array;
    if (!UintArray) {
      throw new Error("invalid max value: " + max);
    }
    __privateSet(this, _max, max);
    __privateSet(this, _maxSize, maxSize);
    this.maxEntrySize = maxEntrySize || __privateGet(this, _maxSize);
    this.sizeCalculation = sizeCalculation;
    if (this.sizeCalculation) {
      if (!__privateGet(this, _maxSize) && !this.maxEntrySize) {
        throw new TypeError("cannot set sizeCalculation without setting maxSize or maxEntrySize");
      }
      if (typeof this.sizeCalculation !== "function") {
        throw new TypeError("sizeCalculation set to non-function");
      }
    }
    if (memoMethod !== void 0 && typeof memoMethod !== "function") {
      throw new TypeError("memoMethod must be a function if defined");
    }
    __privateSet(this, _memoMethod, memoMethod);
    if (fetchMethod !== void 0 && typeof fetchMethod !== "function") {
      throw new TypeError("fetchMethod must be a function if specified");
    }
    __privateSet(this, _fetchMethod, fetchMethod);
    __privateSet(this, _hasFetchMethod, !!fetchMethod);
    __privateSet(this, _keyMap, /* @__PURE__ */ new Map());
    __privateSet(this, _keyList, new Array(max).fill(void 0));
    __privateSet(this, _valList, new Array(max).fill(void 0));
    __privateSet(this, _next, new UintArray(max));
    __privateSet(this, _prev, new UintArray(max));
    __privateSet(this, _head, 0);
    __privateSet(this, _tail, 0);
    __privateSet(this, _free, Stack.create(max));
    __privateSet(this, _size, 0);
    __privateSet(this, _calculatedSize, 0);
    if (typeof dispose === "function") {
      __privateSet(this, _dispose, dispose);
    }
    if (typeof disposeAfter === "function") {
      __privateSet(this, _disposeAfter, disposeAfter);
      __privateSet(this, _disposed, []);
    } else {
      __privateSet(this, _disposeAfter, void 0);
      __privateSet(this, _disposed, void 0);
    }
    __privateSet(this, _hasDispose, !!__privateGet(this, _dispose));
    __privateSet(this, _hasDisposeAfter, !!__privateGet(this, _disposeAfter));
    this.noDisposeOnSet = !!noDisposeOnSet;
    this.noUpdateTTL = !!noUpdateTTL;
    this.noDeleteOnFetchRejection = !!noDeleteOnFetchRejection;
    this.allowStaleOnFetchRejection = !!allowStaleOnFetchRejection;
    this.allowStaleOnFetchAbort = !!allowStaleOnFetchAbort;
    this.ignoreFetchAbort = !!ignoreFetchAbort;
    if (this.maxEntrySize !== 0) {
      if (__privateGet(this, _maxSize) !== 0) {
        if (!isPosInt(__privateGet(this, _maxSize))) {
          throw new TypeError("maxSize must be a positive integer if specified");
        }
      }
      if (!isPosInt(this.maxEntrySize)) {
        throw new TypeError("maxEntrySize must be a positive integer if specified");
      }
      __privateMethod(this, _LRUCache_instances, initializeSizeTracking_fn).call(this);
    }
    this.allowStale = !!allowStale;
    this.noDeleteOnStaleGet = !!noDeleteOnStaleGet;
    this.updateAgeOnGet = !!updateAgeOnGet;
    this.updateAgeOnHas = !!updateAgeOnHas;
    this.ttlResolution = isPosInt(ttlResolution) || ttlResolution === 0 ? ttlResolution : 1;
    this.ttlAutopurge = !!ttlAutopurge;
    this.ttl = ttl || 0;
    if (this.ttl) {
      if (!isPosInt(this.ttl)) {
        throw new TypeError("ttl must be a positive integer if specified");
      }
      __privateMethod(this, _LRUCache_instances, initializeTTLTracking_fn).call(this);
    }
    if (__privateGet(this, _max) === 0 && this.ttl === 0 && __privateGet(this, _maxSize) === 0) {
      throw new TypeError("At least one of max, maxSize, or ttl is required");
    }
    if (!this.ttlAutopurge && !__privateGet(this, _max) && !__privateGet(this, _maxSize)) {
      const code = "LRU_CACHE_UNBOUNDED";
      if (shouldWarn(code)) {
        warned.add(code);
        const msg = "TTL caching without ttlAutopurge, max, or maxSize can result in unbounded memory consumption.";
        emitWarning(msg, "UnboundedCacheWarning", code, _LRUCache);
      }
    }
  }
  /**
   * Do not call this method unless you need to inspect the
   * inner workings of the cache.  If anything returned by this
   * object is modified in any way, strange breakage may occur.
   *
   * These fields are private for a reason!
   *
   * @internal
   */
  static unsafeExposeInternals(c) {
    return {
      // properties
      starts: __privateGet(c, _starts),
      ttls: __privateGet(c, _ttls),
      sizes: __privateGet(c, _sizes),
      keyMap: __privateGet(c, _keyMap),
      keyList: __privateGet(c, _keyList),
      valList: __privateGet(c, _valList),
      next: __privateGet(c, _next),
      prev: __privateGet(c, _prev),
      get head() {
        return __privateGet(c, _head);
      },
      get tail() {
        return __privateGet(c, _tail);
      },
      free: __privateGet(c, _free),
      // methods
      isBackgroundFetch: (p) => {
        var _a5;
        return __privateMethod(_a5 = c, _LRUCache_instances, isBackgroundFetch_fn).call(_a5, p);
      },
      backgroundFetch: (k, index, options, context) => {
        var _a5;
        return __privateMethod(_a5 = c, _LRUCache_instances, backgroundFetch_fn).call(_a5, k, index, options, context);
      },
      moveToTail: (index) => {
        var _a5;
        return __privateMethod(_a5 = c, _LRUCache_instances, moveToTail_fn).call(_a5, index);
      },
      indexes: (options) => {
        var _a5;
        return __privateMethod(_a5 = c, _LRUCache_instances, indexes_fn).call(_a5, options);
      },
      rindexes: (options) => {
        var _a5;
        return __privateMethod(_a5 = c, _LRUCache_instances, rindexes_fn).call(_a5, options);
      },
      isStale: (index) => {
        var _a5;
        return __privateGet(_a5 = c, _isStale).call(_a5, index);
      }
    };
  }
  // Protected read-only members
  /**
   * {@link LRUCache.OptionsBase.max} (read-only)
   */
  get max() {
    return __privateGet(this, _max);
  }
  /**
   * {@link LRUCache.OptionsBase.maxSize} (read-only)
   */
  get maxSize() {
    return __privateGet(this, _maxSize);
  }
  /**
   * The total computed size of items in the cache (read-only)
   */
  get calculatedSize() {
    return __privateGet(this, _calculatedSize);
  }
  /**
   * The number of items stored in the cache (read-only)
   */
  get size() {
    return __privateGet(this, _size);
  }
  /**
   * {@link LRUCache.OptionsBase.fetchMethod} (read-only)
   */
  get fetchMethod() {
    return __privateGet(this, _fetchMethod);
  }
  get memoMethod() {
    return __privateGet(this, _memoMethod);
  }
  /**
   * {@link LRUCache.OptionsBase.dispose} (read-only)
   */
  get dispose() {
    return __privateGet(this, _dispose);
  }
  /**
   * {@link LRUCache.OptionsBase.disposeAfter} (read-only)
   */
  get disposeAfter() {
    return __privateGet(this, _disposeAfter);
  }
  /**
   * Return the number of ms left in the item's TTL. If item is not in cache,
   * returns `0`. Returns `Infinity` if item is in cache without a defined TTL.
   */
  getRemainingTTL(key) {
    return __privateGet(this, _keyMap).has(key) ? Infinity : 0;
  }
  /**
   * Return a generator yielding `[key, value]` pairs,
   * in order from most recently used to least recently used.
   */
  *entries() {
    for (const i of __privateMethod(this, _LRUCache_instances, indexes_fn).call(this)) {
      if (__privateGet(this, _valList)[i] !== void 0 && __privateGet(this, _keyList)[i] !== void 0 && !__privateMethod(this, _LRUCache_instances, isBackgroundFetch_fn).call(this, __privateGet(this, _valList)[i])) {
        yield [__privateGet(this, _keyList)[i], __privateGet(this, _valList)[i]];
      }
    }
  }
  /**
   * Inverse order version of {@link LRUCache.entries}
   *
   * Return a generator yielding `[key, value]` pairs,
   * in order from least recently used to most recently used.
   */
  *rentries() {
    for (const i of __privateMethod(this, _LRUCache_instances, rindexes_fn).call(this)) {
      if (__privateGet(this, _valList)[i] !== void 0 && __privateGet(this, _keyList)[i] !== void 0 && !__privateMethod(this, _LRUCache_instances, isBackgroundFetch_fn).call(this, __privateGet(this, _valList)[i])) {
        yield [__privateGet(this, _keyList)[i], __privateGet(this, _valList)[i]];
      }
    }
  }
  /**
   * Return a generator yielding the keys in the cache,
   * in order from most recently used to least recently used.
   */
  *keys() {
    for (const i of __privateMethod(this, _LRUCache_instances, indexes_fn).call(this)) {
      const k = __privateGet(this, _keyList)[i];
      if (k !== void 0 && !__privateMethod(this, _LRUCache_instances, isBackgroundFetch_fn).call(this, __privateGet(this, _valList)[i])) {
        yield k;
      }
    }
  }
  /**
   * Inverse order version of {@link LRUCache.keys}
   *
   * Return a generator yielding the keys in the cache,
   * in order from least recently used to most recently used.
   */
  *rkeys() {
    for (const i of __privateMethod(this, _LRUCache_instances, rindexes_fn).call(this)) {
      const k = __privateGet(this, _keyList)[i];
      if (k !== void 0 && !__privateMethod(this, _LRUCache_instances, isBackgroundFetch_fn).call(this, __privateGet(this, _valList)[i])) {
        yield k;
      }
    }
  }
  /**
   * Return a generator yielding the values in the cache,
   * in order from most recently used to least recently used.
   */
  *values() {
    for (const i of __privateMethod(this, _LRUCache_instances, indexes_fn).call(this)) {
      const v = __privateGet(this, _valList)[i];
      if (v !== void 0 && !__privateMethod(this, _LRUCache_instances, isBackgroundFetch_fn).call(this, __privateGet(this, _valList)[i])) {
        yield __privateGet(this, _valList)[i];
      }
    }
  }
  /**
   * Inverse order version of {@link LRUCache.values}
   *
   * Return a generator yielding the values in the cache,
   * in order from least recently used to most recently used.
   */
  *rvalues() {
    for (const i of __privateMethod(this, _LRUCache_instances, rindexes_fn).call(this)) {
      const v = __privateGet(this, _valList)[i];
      if (v !== void 0 && !__privateMethod(this, _LRUCache_instances, isBackgroundFetch_fn).call(this, __privateGet(this, _valList)[i])) {
        yield __privateGet(this, _valList)[i];
      }
    }
  }
  /**
   * Iterating over the cache itself yields the same results as
   * {@link LRUCache.entries}
   */
  [(_b = Symbol.iterator, _a2 = Symbol.toStringTag, _b)]() {
    return this.entries();
  }
  /**
   * Find a value for which the supplied fn method returns a truthy value,
   * similar to `Array.find()`. fn is called as `fn(value, key, cache)`.
   */
  find(fn, getOptions = {}) {
    for (const i of __privateMethod(this, _LRUCache_instances, indexes_fn).call(this)) {
      const v = __privateGet(this, _valList)[i];
      const value = __privateMethod(this, _LRUCache_instances, isBackgroundFetch_fn).call(this, v) ? v.__staleWhileFetching : v;
      if (value === void 0)
        continue;
      if (fn(value, __privateGet(this, _keyList)[i], this)) {
        return this.get(__privateGet(this, _keyList)[i], getOptions);
      }
    }
  }
  /**
   * Call the supplied function on each item in the cache, in order from most
   * recently used to least recently used.
   *
   * `fn` is called as `fn(value, key, cache)`.
   *
   * If `thisp` is provided, function will be called in the `this`-context of
   * the provided object, or the cache if no `thisp` object is provided.
   *
   * Does not update age or recenty of use, or iterate over stale values.
   */
  forEach(fn, thisp = this) {
    for (const i of __privateMethod(this, _LRUCache_instances, indexes_fn).call(this)) {
      const v = __privateGet(this, _valList)[i];
      const value = __privateMethod(this, _LRUCache_instances, isBackgroundFetch_fn).call(this, v) ? v.__staleWhileFetching : v;
      if (value === void 0)
        continue;
      fn.call(thisp, value, __privateGet(this, _keyList)[i], this);
    }
  }
  /**
   * The same as {@link LRUCache.forEach} but items are iterated over in
   * reverse order.  (ie, less recently used items are iterated over first.)
   */
  rforEach(fn, thisp = this) {
    for (const i of __privateMethod(this, _LRUCache_instances, rindexes_fn).call(this)) {
      const v = __privateGet(this, _valList)[i];
      const value = __privateMethod(this, _LRUCache_instances, isBackgroundFetch_fn).call(this, v) ? v.__staleWhileFetching : v;
      if (value === void 0)
        continue;
      fn.call(thisp, value, __privateGet(this, _keyList)[i], this);
    }
  }
  /**
   * Delete any stale entries. Returns true if anything was removed,
   * false otherwise.
   */
  purgeStale() {
    let deleted = false;
    for (const i of __privateMethod(this, _LRUCache_instances, rindexes_fn).call(this, { allowStale: true })) {
      if (__privateGet(this, _isStale).call(this, i)) {
        __privateMethod(this, _LRUCache_instances, delete_fn).call(this, __privateGet(this, _keyList)[i], "expire");
        deleted = true;
      }
    }
    return deleted;
  }
  /**
   * Get the extended info about a given entry, to get its value, size, and
   * TTL info simultaneously. Returns `undefined` if the key is not present.
   *
   * Unlike {@link LRUCache#dump}, which is designed to be portable and survive
   * serialization, the `start` value is always the current timestamp, and the
   * `ttl` is a calculated remaining time to live (negative if expired).
   *
   * Always returns stale values, if their info is found in the cache, so be
   * sure to check for expirations (ie, a negative {@link LRUCache.Entry#ttl})
   * if relevant.
   */
  info(key) {
    const i = __privateGet(this, _keyMap).get(key);
    if (i === void 0)
      return void 0;
    const v = __privateGet(this, _valList)[i];
    const value = __privateMethod(this, _LRUCache_instances, isBackgroundFetch_fn).call(this, v) ? v.__staleWhileFetching : v;
    if (value === void 0)
      return void 0;
    const entry = { value };
    if (__privateGet(this, _ttls) && __privateGet(this, _starts)) {
      const ttl = __privateGet(this, _ttls)[i];
      const start = __privateGet(this, _starts)[i];
      if (ttl && start) {
        const remain = ttl - (perf.now() - start);
        entry.ttl = remain;
        entry.start = Date.now();
      }
    }
    if (__privateGet(this, _sizes)) {
      entry.size = __privateGet(this, _sizes)[i];
    }
    return entry;
  }
  /**
   * Return an array of [key, {@link LRUCache.Entry}] tuples which can be
   * passed to {@link LRLUCache#load}.
   *
   * The `start` fields are calculated relative to a portable `Date.now()`
   * timestamp, even if `performance.now()` is available.
   *
   * Stale entries are always included in the `dump`, even if
   * {@link LRUCache.OptionsBase.allowStale} is false.
   *
   * Note: this returns an actual array, not a generator, so it can be more
   * easily passed around.
   */
  dump() {
    const arr = [];
    for (const i of __privateMethod(this, _LRUCache_instances, indexes_fn).call(this, { allowStale: true })) {
      const key = __privateGet(this, _keyList)[i];
      const v = __privateGet(this, _valList)[i];
      const value = __privateMethod(this, _LRUCache_instances, isBackgroundFetch_fn).call(this, v) ? v.__staleWhileFetching : v;
      if (value === void 0 || key === void 0)
        continue;
      const entry = { value };
      if (__privateGet(this, _ttls) && __privateGet(this, _starts)) {
        entry.ttl = __privateGet(this, _ttls)[i];
        const age = perf.now() - __privateGet(this, _starts)[i];
        entry.start = Math.floor(Date.now() - age);
      }
      if (__privateGet(this, _sizes)) {
        entry.size = __privateGet(this, _sizes)[i];
      }
      arr.unshift([key, entry]);
    }
    return arr;
  }
  /**
   * Reset the cache and load in the items in entries in the order listed.
   *
   * The shape of the resulting cache may be different if the same options are
   * not used in both caches.
   *
   * The `start` fields are assumed to be calculated relative to a portable
   * `Date.now()` timestamp, even if `performance.now()` is available.
   */
  load(arr) {
    this.clear();
    for (const [key, entry] of arr) {
      if (entry.start) {
        const age = Date.now() - entry.start;
        entry.start = perf.now() - age;
      }
      this.set(key, entry.value, entry);
    }
  }
  /**
   * Add a value to the cache.
   *
   * Note: if `undefined` is specified as a value, this is an alias for
   * {@link LRUCache#delete}
   *
   * Fields on the {@link LRUCache.SetOptions} options param will override
   * their corresponding values in the constructor options for the scope
   * of this single `set()` operation.
   *
   * If `start` is provided, then that will set the effective start
   * time for the TTL calculation. Note that this must be a previous
   * value of `performance.now()` if supported, or a previous value of
   * `Date.now()` if not.
   *
   * Options object may also include `size`, which will prevent
   * calling the `sizeCalculation` function and just use the specified
   * number if it is a positive integer, and `noDisposeOnSet` which
   * will prevent calling a `dispose` function in the case of
   * overwrites.
   *
   * If the `size` (or return value of `sizeCalculation`) for a given
   * entry is greater than `maxEntrySize`, then the item will not be
   * added to the cache.
   *
   * Will update the recency of the entry.
   *
   * If the value is `undefined`, then this is an alias for
   * `cache.delete(key)`. `undefined` is never stored in the cache.
   */
  set(k, v, setOptions = {}) {
    var _a5, _b4, _c, _d, _e;
    if (v === void 0) {
      this.delete(k);
      return this;
    }
    const { ttl = this.ttl, start, noDisposeOnSet = this.noDisposeOnSet, sizeCalculation = this.sizeCalculation, status } = setOptions;
    let { noUpdateTTL = this.noUpdateTTL } = setOptions;
    const size = __privateGet(this, _requireSize).call(this, k, v, setOptions.size || 0, sizeCalculation);
    if (this.maxEntrySize && size > this.maxEntrySize) {
      if (status) {
        status.set = "miss";
        status.maxEntrySizeExceeded = true;
      }
      __privateMethod(this, _LRUCache_instances, delete_fn).call(this, k, "set");
      return this;
    }
    let index = __privateGet(this, _size) === 0 ? void 0 : __privateGet(this, _keyMap).get(k);
    if (index === void 0) {
      index = __privateGet(this, _size) === 0 ? __privateGet(this, _tail) : __privateGet(this, _free).length !== 0 ? __privateGet(this, _free).pop() : __privateGet(this, _size) === __privateGet(this, _max) ? __privateMethod(this, _LRUCache_instances, evict_fn).call(this, false) : __privateGet(this, _size);
      __privateGet(this, _keyList)[index] = k;
      __privateGet(this, _valList)[index] = v;
      __privateGet(this, _keyMap).set(k, index);
      __privateGet(this, _next)[__privateGet(this, _tail)] = index;
      __privateGet(this, _prev)[index] = __privateGet(this, _tail);
      __privateSet(this, _tail, index);
      __privateWrapper(this, _size)._++;
      __privateGet(this, _addItemSize).call(this, index, size, status);
      if (status)
        status.set = "add";
      noUpdateTTL = false;
    } else {
      __privateMethod(this, _LRUCache_instances, moveToTail_fn).call(this, index);
      const oldVal = __privateGet(this, _valList)[index];
      if (v !== oldVal) {
        if (__privateGet(this, _hasFetchMethod) && __privateMethod(this, _LRUCache_instances, isBackgroundFetch_fn).call(this, oldVal)) {
          oldVal.__abortController.abort(new Error("replaced"));
          const { __staleWhileFetching: s } = oldVal;
          if (s !== void 0 && !noDisposeOnSet) {
            if (__privateGet(this, _hasDispose)) {
              (_a5 = __privateGet(this, _dispose)) == null ? void 0 : _a5.call(this, s, k, "set");
            }
            if (__privateGet(this, _hasDisposeAfter)) {
              (_b4 = __privateGet(this, _disposed)) == null ? void 0 : _b4.push([s, k, "set"]);
            }
          }
        } else if (!noDisposeOnSet) {
          if (__privateGet(this, _hasDispose)) {
            (_c = __privateGet(this, _dispose)) == null ? void 0 : _c.call(this, oldVal, k, "set");
          }
          if (__privateGet(this, _hasDisposeAfter)) {
            (_d = __privateGet(this, _disposed)) == null ? void 0 : _d.push([oldVal, k, "set"]);
          }
        }
        __privateGet(this, _removeItemSize).call(this, index);
        __privateGet(this, _addItemSize).call(this, index, size, status);
        __privateGet(this, _valList)[index] = v;
        if (status) {
          status.set = "replace";
          const oldValue = oldVal && __privateMethod(this, _LRUCache_instances, isBackgroundFetch_fn).call(this, oldVal) ? oldVal.__staleWhileFetching : oldVal;
          if (oldValue !== void 0)
            status.oldValue = oldValue;
        }
      } else if (status) {
        status.set = "update";
      }
    }
    if (ttl !== 0 && !__privateGet(this, _ttls)) {
      __privateMethod(this, _LRUCache_instances, initializeTTLTracking_fn).call(this);
    }
    if (__privateGet(this, _ttls)) {
      if (!noUpdateTTL) {
        __privateGet(this, _setItemTTL).call(this, index, ttl, start);
      }
      if (status)
        __privateGet(this, _statusTTL).call(this, status, index);
    }
    if (!noDisposeOnSet && __privateGet(this, _hasDisposeAfter) && __privateGet(this, _disposed)) {
      const dt = __privateGet(this, _disposed);
      let task;
      while (task = dt == null ? void 0 : dt.shift()) {
        (_e = __privateGet(this, _disposeAfter)) == null ? void 0 : _e.call(this, ...task);
      }
    }
    return this;
  }
  /**
   * Evict the least recently used item, returning its value or
   * `undefined` if cache is empty.
   */
  pop() {
    var _a5;
    try {
      while (__privateGet(this, _size)) {
        const val = __privateGet(this, _valList)[__privateGet(this, _head)];
        __privateMethod(this, _LRUCache_instances, evict_fn).call(this, true);
        if (__privateMethod(this, _LRUCache_instances, isBackgroundFetch_fn).call(this, val)) {
          if (val.__staleWhileFetching) {
            return val.__staleWhileFetching;
          }
        } else if (val !== void 0) {
          return val;
        }
      }
    } finally {
      if (__privateGet(this, _hasDisposeAfter) && __privateGet(this, _disposed)) {
        const dt = __privateGet(this, _disposed);
        let task;
        while (task = dt == null ? void 0 : dt.shift()) {
          (_a5 = __privateGet(this, _disposeAfter)) == null ? void 0 : _a5.call(this, ...task);
        }
      }
    }
  }
  /**
   * Check if a key is in the cache, without updating the recency of use.
   * Will return false if the item is stale, even though it is technically
   * in the cache.
   *
   * Check if a key is in the cache, without updating the recency of
   * use. Age is updated if {@link LRUCache.OptionsBase.updateAgeOnHas} is set
   * to `true` in either the options or the constructor.
   *
   * Will return `false` if the item is stale, even though it is technically in
   * the cache. The difference can be determined (if it matters) by using a
   * `status` argument, and inspecting the `has` field.
   *
   * Will not update item age unless
   * {@link LRUCache.OptionsBase.updateAgeOnHas} is set.
   */
  has(k, hasOptions = {}) {
    const { updateAgeOnHas = this.updateAgeOnHas, status } = hasOptions;
    const index = __privateGet(this, _keyMap).get(k);
    if (index !== void 0) {
      const v = __privateGet(this, _valList)[index];
      if (__privateMethod(this, _LRUCache_instances, isBackgroundFetch_fn).call(this, v) && v.__staleWhileFetching === void 0) {
        return false;
      }
      if (!__privateGet(this, _isStale).call(this, index)) {
        if (updateAgeOnHas) {
          __privateGet(this, _updateItemAge).call(this, index);
        }
        if (status) {
          status.has = "hit";
          __privateGet(this, _statusTTL).call(this, status, index);
        }
        return true;
      } else if (status) {
        status.has = "stale";
        __privateGet(this, _statusTTL).call(this, status, index);
      }
    } else if (status) {
      status.has = "miss";
    }
    return false;
  }
  /**
   * Like {@link LRUCache#get} but doesn't update recency or delete stale
   * items.
   *
   * Returns `undefined` if the item is stale, unless
   * {@link LRUCache.OptionsBase.allowStale} is set.
   */
  peek(k, peekOptions = {}) {
    const { allowStale = this.allowStale } = peekOptions;
    const index = __privateGet(this, _keyMap).get(k);
    if (index === void 0 || !allowStale && __privateGet(this, _isStale).call(this, index)) {
      return;
    }
    const v = __privateGet(this, _valList)[index];
    return __privateMethod(this, _LRUCache_instances, isBackgroundFetch_fn).call(this, v) ? v.__staleWhileFetching : v;
  }
  async fetch(k, fetchOptions = {}) {
    const {
      // get options
      allowStale = this.allowStale,
      updateAgeOnGet = this.updateAgeOnGet,
      noDeleteOnStaleGet = this.noDeleteOnStaleGet,
      // set options
      ttl = this.ttl,
      noDisposeOnSet = this.noDisposeOnSet,
      size = 0,
      sizeCalculation = this.sizeCalculation,
      noUpdateTTL = this.noUpdateTTL,
      // fetch exclusive options
      noDeleteOnFetchRejection = this.noDeleteOnFetchRejection,
      allowStaleOnFetchRejection = this.allowStaleOnFetchRejection,
      ignoreFetchAbort = this.ignoreFetchAbort,
      allowStaleOnFetchAbort = this.allowStaleOnFetchAbort,
      context,
      forceRefresh = false,
      status,
      signal
    } = fetchOptions;
    if (!__privateGet(this, _hasFetchMethod)) {
      if (status)
        status.fetch = "get";
      return this.get(k, {
        allowStale,
        updateAgeOnGet,
        noDeleteOnStaleGet,
        status
      });
    }
    const options = {
      allowStale,
      updateAgeOnGet,
      noDeleteOnStaleGet,
      ttl,
      noDisposeOnSet,
      size,
      sizeCalculation,
      noUpdateTTL,
      noDeleteOnFetchRejection,
      allowStaleOnFetchRejection,
      allowStaleOnFetchAbort,
      ignoreFetchAbort,
      status,
      signal
    };
    let index = __privateGet(this, _keyMap).get(k);
    if (index === void 0) {
      if (status)
        status.fetch = "miss";
      const p = __privateMethod(this, _LRUCache_instances, backgroundFetch_fn).call(this, k, index, options, context);
      return p.__returned = p;
    } else {
      const v = __privateGet(this, _valList)[index];
      if (__privateMethod(this, _LRUCache_instances, isBackgroundFetch_fn).call(this, v)) {
        const stale = allowStale && v.__staleWhileFetching !== void 0;
        if (status) {
          status.fetch = "inflight";
          if (stale)
            status.returnedStale = true;
        }
        return stale ? v.__staleWhileFetching : v.__returned = v;
      }
      const isStale = __privateGet(this, _isStale).call(this, index);
      if (!forceRefresh && !isStale) {
        if (status)
          status.fetch = "hit";
        __privateMethod(this, _LRUCache_instances, moveToTail_fn).call(this, index);
        if (updateAgeOnGet) {
          __privateGet(this, _updateItemAge).call(this, index);
        }
        if (status)
          __privateGet(this, _statusTTL).call(this, status, index);
        return v;
      }
      const p = __privateMethod(this, _LRUCache_instances, backgroundFetch_fn).call(this, k, index, options, context);
      const hasStale = p.__staleWhileFetching !== void 0;
      const staleVal = hasStale && allowStale;
      if (status) {
        status.fetch = isStale ? "stale" : "refresh";
        if (staleVal && isStale)
          status.returnedStale = true;
      }
      return staleVal ? p.__staleWhileFetching : p.__returned = p;
    }
  }
  async forceFetch(k, fetchOptions = {}) {
    const v = await this.fetch(k, fetchOptions);
    if (v === void 0)
      throw new Error("fetch() returned undefined");
    return v;
  }
  memo(k, memoOptions = {}) {
    const memoMethod = __privateGet(this, _memoMethod);
    if (!memoMethod) {
      throw new Error("no memoMethod provided to constructor");
    }
    const { context, forceRefresh, ...options } = memoOptions;
    const v = this.get(k, options);
    if (!forceRefresh && v !== void 0)
      return v;
    const vv = memoMethod(k, v, {
      options,
      context
    });
    this.set(k, vv, options);
    return vv;
  }
  /**
   * Return a value from the cache. Will update the recency of the cache
   * entry found.
   *
   * If the key is not found, get() will return `undefined`.
   */
  get(k, getOptions = {}) {
    const { allowStale = this.allowStale, updateAgeOnGet = this.updateAgeOnGet, noDeleteOnStaleGet = this.noDeleteOnStaleGet, status } = getOptions;
    const index = __privateGet(this, _keyMap).get(k);
    if (index !== void 0) {
      const value = __privateGet(this, _valList)[index];
      const fetching = __privateMethod(this, _LRUCache_instances, isBackgroundFetch_fn).call(this, value);
      if (status)
        __privateGet(this, _statusTTL).call(this, status, index);
      if (__privateGet(this, _isStale).call(this, index)) {
        if (status)
          status.get = "stale";
        if (!fetching) {
          if (!noDeleteOnStaleGet) {
            __privateMethod(this, _LRUCache_instances, delete_fn).call(this, k, "expire");
          }
          if (status && allowStale)
            status.returnedStale = true;
          return allowStale ? value : void 0;
        } else {
          if (status && allowStale && value.__staleWhileFetching !== void 0) {
            status.returnedStale = true;
          }
          return allowStale ? value.__staleWhileFetching : void 0;
        }
      } else {
        if (status)
          status.get = "hit";
        if (fetching) {
          return value.__staleWhileFetching;
        }
        __privateMethod(this, _LRUCache_instances, moveToTail_fn).call(this, index);
        if (updateAgeOnGet) {
          __privateGet(this, _updateItemAge).call(this, index);
        }
        return value;
      }
    } else if (status) {
      status.get = "miss";
    }
  }
  /**
   * Deletes a key out of the cache.
   *
   * Returns true if the key was deleted, false otherwise.
   */
  delete(k) {
    return __privateMethod(this, _LRUCache_instances, delete_fn).call(this, k, "delete");
  }
  /**
   * Clear the cache entirely, throwing away all values.
   */
  clear() {
    return __privateMethod(this, _LRUCache_instances, clear_fn).call(this, "delete");
  }
};
_max = new WeakMap();
_maxSize = new WeakMap();
_dispose = new WeakMap();
_disposeAfter = new WeakMap();
_fetchMethod = new WeakMap();
_memoMethod = new WeakMap();
_size = new WeakMap();
_calculatedSize = new WeakMap();
_keyMap = new WeakMap();
_keyList = new WeakMap();
_valList = new WeakMap();
_next = new WeakMap();
_prev = new WeakMap();
_head = new WeakMap();
_tail = new WeakMap();
_free = new WeakMap();
_disposed = new WeakMap();
_sizes = new WeakMap();
_starts = new WeakMap();
_ttls = new WeakMap();
_hasDispose = new WeakMap();
_hasFetchMethod = new WeakMap();
_hasDisposeAfter = new WeakMap();
_LRUCache_instances = new WeakSet();
initializeTTLTracking_fn = function() {
  const ttls = new ZeroArray(__privateGet(this, _max));
  const starts = new ZeroArray(__privateGet(this, _max));
  __privateSet(this, _ttls, ttls);
  __privateSet(this, _starts, starts);
  __privateSet(this, _setItemTTL, (index, ttl, start = perf.now()) => {
    starts[index] = ttl !== 0 ? start : 0;
    ttls[index] = ttl;
    if (ttl !== 0 && this.ttlAutopurge) {
      const t = setTimeout(() => {
        if (__privateGet(this, _isStale).call(this, index)) {
          __privateMethod(this, _LRUCache_instances, delete_fn).call(this, __privateGet(this, _keyList)[index], "expire");
        }
      }, ttl + 1);
      if (t.unref) {
        t.unref();
      }
    }
  });
  __privateSet(this, _updateItemAge, (index) => {
    starts[index] = ttls[index] !== 0 ? perf.now() : 0;
  });
  __privateSet(this, _statusTTL, (status, index) => {
    if (ttls[index]) {
      const ttl = ttls[index];
      const start = starts[index];
      if (!ttl || !start)
        return;
      status.ttl = ttl;
      status.start = start;
      status.now = cachedNow || getNow();
      const age = status.now - start;
      status.remainingTTL = ttl - age;
    }
  });
  let cachedNow = 0;
  const getNow = () => {
    const n = perf.now();
    if (this.ttlResolution > 0) {
      cachedNow = n;
      const t = setTimeout(() => cachedNow = 0, this.ttlResolution);
      if (t.unref) {
        t.unref();
      }
    }
    return n;
  };
  this.getRemainingTTL = (key) => {
    const index = __privateGet(this, _keyMap).get(key);
    if (index === void 0) {
      return 0;
    }
    const ttl = ttls[index];
    const start = starts[index];
    if (!ttl || !start) {
      return Infinity;
    }
    const age = (cachedNow || getNow()) - start;
    return ttl - age;
  };
  __privateSet(this, _isStale, (index) => {
    const s = starts[index];
    const t = ttls[index];
    return !!t && !!s && (cachedNow || getNow()) - s > t;
  });
};
_updateItemAge = new WeakMap();
_statusTTL = new WeakMap();
_setItemTTL = new WeakMap();
_isStale = new WeakMap();
initializeSizeTracking_fn = function() {
  const sizes = new ZeroArray(__privateGet(this, _max));
  __privateSet(this, _calculatedSize, 0);
  __privateSet(this, _sizes, sizes);
  __privateSet(this, _removeItemSize, (index) => {
    __privateSet(this, _calculatedSize, __privateGet(this, _calculatedSize) - sizes[index]);
    sizes[index] = 0;
  });
  __privateSet(this, _requireSize, (k, v, size, sizeCalculation) => {
    if (__privateMethod(this, _LRUCache_instances, isBackgroundFetch_fn).call(this, v)) {
      return 0;
    }
    if (!isPosInt(size)) {
      if (sizeCalculation) {
        if (typeof sizeCalculation !== "function") {
          throw new TypeError("sizeCalculation must be a function");
        }
        size = sizeCalculation(v, k);
        if (!isPosInt(size)) {
          throw new TypeError("sizeCalculation return invalid (expect positive integer)");
        }
      } else {
        throw new TypeError("invalid size value (must be positive integer). When maxSize or maxEntrySize is used, sizeCalculation or size must be set.");
      }
    }
    return size;
  });
  __privateSet(this, _addItemSize, (index, size, status) => {
    sizes[index] = size;
    if (__privateGet(this, _maxSize)) {
      const maxSize = __privateGet(this, _maxSize) - sizes[index];
      while (__privateGet(this, _calculatedSize) > maxSize) {
        __privateMethod(this, _LRUCache_instances, evict_fn).call(this, true);
      }
    }
    __privateSet(this, _calculatedSize, __privateGet(this, _calculatedSize) + sizes[index]);
    if (status) {
      status.entrySize = size;
      status.totalCalculatedSize = __privateGet(this, _calculatedSize);
    }
  });
};
_removeItemSize = new WeakMap();
_addItemSize = new WeakMap();
_requireSize = new WeakMap();
indexes_fn = function* ({ allowStale = this.allowStale } = {}) {
  if (__privateGet(this, _size)) {
    for (let i = __privateGet(this, _tail); true; ) {
      if (!__privateMethod(this, _LRUCache_instances, isValidIndex_fn).call(this, i)) {
        break;
      }
      if (allowStale || !__privateGet(this, _isStale).call(this, i)) {
        yield i;
      }
      if (i === __privateGet(this, _head)) {
        break;
      } else {
        i = __privateGet(this, _prev)[i];
      }
    }
  }
};
rindexes_fn = function* ({ allowStale = this.allowStale } = {}) {
  if (__privateGet(this, _size)) {
    for (let i = __privateGet(this, _head); true; ) {
      if (!__privateMethod(this, _LRUCache_instances, isValidIndex_fn).call(this, i)) {
        break;
      }
      if (allowStale || !__privateGet(this, _isStale).call(this, i)) {
        yield i;
      }
      if (i === __privateGet(this, _tail)) {
        break;
      } else {
        i = __privateGet(this, _next)[i];
      }
    }
  }
};
isValidIndex_fn = function(index) {
  return index !== void 0 && __privateGet(this, _keyMap).get(__privateGet(this, _keyList)[index]) === index;
};
evict_fn = function(free) {
  var _a5, _b4;
  const head = __privateGet(this, _head);
  const k = __privateGet(this, _keyList)[head];
  const v = __privateGet(this, _valList)[head];
  if (__privateGet(this, _hasFetchMethod) && __privateMethod(this, _LRUCache_instances, isBackgroundFetch_fn).call(this, v)) {
    v.__abortController.abort(new Error("evicted"));
  } else if (__privateGet(this, _hasDispose) || __privateGet(this, _hasDisposeAfter)) {
    if (__privateGet(this, _hasDispose)) {
      (_a5 = __privateGet(this, _dispose)) == null ? void 0 : _a5.call(this, v, k, "evict");
    }
    if (__privateGet(this, _hasDisposeAfter)) {
      (_b4 = __privateGet(this, _disposed)) == null ? void 0 : _b4.push([v, k, "evict"]);
    }
  }
  __privateGet(this, _removeItemSize).call(this, head);
  if (free) {
    __privateGet(this, _keyList)[head] = void 0;
    __privateGet(this, _valList)[head] = void 0;
    __privateGet(this, _free).push(head);
  }
  if (__privateGet(this, _size) === 1) {
    __privateSet(this, _head, __privateSet(this, _tail, 0));
    __privateGet(this, _free).length = 0;
  } else {
    __privateSet(this, _head, __privateGet(this, _next)[head]);
  }
  __privateGet(this, _keyMap).delete(k);
  __privateWrapper(this, _size)._--;
  return head;
};
backgroundFetch_fn = function(k, index, options, context) {
  const v = index === void 0 ? void 0 : __privateGet(this, _valList)[index];
  if (__privateMethod(this, _LRUCache_instances, isBackgroundFetch_fn).call(this, v)) {
    return v;
  }
  const ac = new AC();
  const { signal } = options;
  signal == null ? void 0 : signal.addEventListener("abort", () => ac.abort(signal.reason), {
    signal: ac.signal
  });
  const fetchOpts = {
    signal: ac.signal,
    options,
    context
  };
  const cb = (v2, updateCache = false) => {
    const { aborted } = ac.signal;
    const ignoreAbort = options.ignoreFetchAbort && v2 !== void 0;
    if (options.status) {
      if (aborted && !updateCache) {
        options.status.fetchAborted = true;
        options.status.fetchError = ac.signal.reason;
        if (ignoreAbort)
          options.status.fetchAbortIgnored = true;
      } else {
        options.status.fetchResolved = true;
      }
    }
    if (aborted && !ignoreAbort && !updateCache) {
      return fetchFail(ac.signal.reason);
    }
    const bf2 = p;
    if (__privateGet(this, _valList)[index] === p) {
      if (v2 === void 0) {
        if (bf2.__staleWhileFetching) {
          __privateGet(this, _valList)[index] = bf2.__staleWhileFetching;
        } else {
          __privateMethod(this, _LRUCache_instances, delete_fn).call(this, k, "fetch");
        }
      } else {
        if (options.status)
          options.status.fetchUpdated = true;
        this.set(k, v2, fetchOpts.options);
      }
    }
    return v2;
  };
  const eb = (er) => {
    if (options.status) {
      options.status.fetchRejected = true;
      options.status.fetchError = er;
    }
    return fetchFail(er);
  };
  const fetchFail = (er) => {
    const { aborted } = ac.signal;
    const allowStaleAborted = aborted && options.allowStaleOnFetchAbort;
    const allowStale = allowStaleAborted || options.allowStaleOnFetchRejection;
    const noDelete = allowStale || options.noDeleteOnFetchRejection;
    const bf2 = p;
    if (__privateGet(this, _valList)[index] === p) {
      const del = !noDelete || bf2.__staleWhileFetching === void 0;
      if (del) {
        __privateMethod(this, _LRUCache_instances, delete_fn).call(this, k, "fetch");
      } else if (!allowStaleAborted) {
        __privateGet(this, _valList)[index] = bf2.__staleWhileFetching;
      }
    }
    if (allowStale) {
      if (options.status && bf2.__staleWhileFetching !== void 0) {
        options.status.returnedStale = true;
      }
      return bf2.__staleWhileFetching;
    } else if (bf2.__returned === bf2) {
      throw er;
    }
  };
  const pcall = (res, rej) => {
    var _a5;
    const fmp = (_a5 = __privateGet(this, _fetchMethod)) == null ? void 0 : _a5.call(this, k, v, fetchOpts);
    if (fmp && fmp instanceof Promise) {
      fmp.then((v2) => res(v2 === void 0 ? void 0 : v2), rej);
    }
    ac.signal.addEventListener("abort", () => {
      if (!options.ignoreFetchAbort || options.allowStaleOnFetchAbort) {
        res(void 0);
        if (options.allowStaleOnFetchAbort) {
          res = (v2) => cb(v2, true);
        }
      }
    });
  };
  if (options.status)
    options.status.fetchDispatched = true;
  const p = new Promise(pcall).then(cb, eb);
  const bf = Object.assign(p, {
    __abortController: ac,
    __staleWhileFetching: v,
    __returned: void 0
  });
  if (index === void 0) {
    this.set(k, bf, { ...fetchOpts.options, status: void 0 });
    index = __privateGet(this, _keyMap).get(k);
  } else {
    __privateGet(this, _valList)[index] = bf;
  }
  return bf;
};
isBackgroundFetch_fn = function(p) {
  if (!__privateGet(this, _hasFetchMethod))
    return false;
  const b = p;
  return !!b && b instanceof Promise && b.hasOwnProperty("__staleWhileFetching") && b.__abortController instanceof AC;
};
connect_fn = function(p, n) {
  __privateGet(this, _prev)[n] = p;
  __privateGet(this, _next)[p] = n;
};
moveToTail_fn = function(index) {
  if (index !== __privateGet(this, _tail)) {
    if (index === __privateGet(this, _head)) {
      __privateSet(this, _head, __privateGet(this, _next)[index]);
    } else {
      __privateMethod(this, _LRUCache_instances, connect_fn).call(this, __privateGet(this, _prev)[index], __privateGet(this, _next)[index]);
    }
    __privateMethod(this, _LRUCache_instances, connect_fn).call(this, __privateGet(this, _tail), index);
    __privateSet(this, _tail, index);
  }
};
delete_fn = function(k, reason) {
  var _a5, _b4, _c, _d;
  let deleted = false;
  if (__privateGet(this, _size) !== 0) {
    const index = __privateGet(this, _keyMap).get(k);
    if (index !== void 0) {
      deleted = true;
      if (__privateGet(this, _size) === 1) {
        __privateMethod(this, _LRUCache_instances, clear_fn).call(this, reason);
      } else {
        __privateGet(this, _removeItemSize).call(this, index);
        const v = __privateGet(this, _valList)[index];
        if (__privateMethod(this, _LRUCache_instances, isBackgroundFetch_fn).call(this, v)) {
          v.__abortController.abort(new Error("deleted"));
        } else if (__privateGet(this, _hasDispose) || __privateGet(this, _hasDisposeAfter)) {
          if (__privateGet(this, _hasDispose)) {
            (_a5 = __privateGet(this, _dispose)) == null ? void 0 : _a5.call(this, v, k, reason);
          }
          if (__privateGet(this, _hasDisposeAfter)) {
            (_b4 = __privateGet(this, _disposed)) == null ? void 0 : _b4.push([v, k, reason]);
          }
        }
        __privateGet(this, _keyMap).delete(k);
        __privateGet(this, _keyList)[index] = void 0;
        __privateGet(this, _valList)[index] = void 0;
        if (index === __privateGet(this, _tail)) {
          __privateSet(this, _tail, __privateGet(this, _prev)[index]);
        } else if (index === __privateGet(this, _head)) {
          __privateSet(this, _head, __privateGet(this, _next)[index]);
        } else {
          const pi = __privateGet(this, _prev)[index];
          __privateGet(this, _next)[pi] = __privateGet(this, _next)[index];
          const ni = __privateGet(this, _next)[index];
          __privateGet(this, _prev)[ni] = __privateGet(this, _prev)[index];
        }
        __privateWrapper(this, _size)._--;
        __privateGet(this, _free).push(index);
      }
    }
  }
  if (__privateGet(this, _hasDisposeAfter) && ((_c = __privateGet(this, _disposed)) == null ? void 0 : _c.length)) {
    const dt = __privateGet(this, _disposed);
    let task;
    while (task = dt == null ? void 0 : dt.shift()) {
      (_d = __privateGet(this, _disposeAfter)) == null ? void 0 : _d.call(this, ...task);
    }
  }
  return deleted;
};
clear_fn = function(reason) {
  var _a5, _b4, _c;
  for (const index of __privateMethod(this, _LRUCache_instances, rindexes_fn).call(this, { allowStale: true })) {
    const v = __privateGet(this, _valList)[index];
    if (__privateMethod(this, _LRUCache_instances, isBackgroundFetch_fn).call(this, v)) {
      v.__abortController.abort(new Error("deleted"));
    } else {
      const k = __privateGet(this, _keyList)[index];
      if (__privateGet(this, _hasDispose)) {
        (_a5 = __privateGet(this, _dispose)) == null ? void 0 : _a5.call(this, v, k, reason);
      }
      if (__privateGet(this, _hasDisposeAfter)) {
        (_b4 = __privateGet(this, _disposed)) == null ? void 0 : _b4.push([v, k, reason]);
      }
    }
  }
  __privateGet(this, _keyMap).clear();
  __privateGet(this, _valList).fill(void 0);
  __privateGet(this, _keyList).fill(void 0);
  if (__privateGet(this, _ttls) && __privateGet(this, _starts)) {
    __privateGet(this, _ttls).fill(0);
    __privateGet(this, _starts).fill(0);
  }
  if (__privateGet(this, _sizes)) {
    __privateGet(this, _sizes).fill(0);
  }
  __privateSet(this, _head, 0);
  __privateSet(this, _tail, 0);
  __privateGet(this, _free).length = 0;
  __privateSet(this, _calculatedSize, 0);
  __privateSet(this, _size, 0);
  if (__privateGet(this, _hasDisposeAfter) && __privateGet(this, _disposed)) {
    const dt = __privateGet(this, _disposed);
    let task;
    while (task = dt == null ? void 0 : dt.shift()) {
      (_c = __privateGet(this, _disposeAfter)) == null ? void 0 : _c.call(this, ...task);
    }
  }
};
var LRUCache = _LRUCache;

// node_modules/@jsr/nostrify__nostrify/NSet.js
var _computedKey;
var _computedKey1;
_computedKey = Symbol.iterator, _computedKey1 = Symbol.toStringTag;
var _a3, _b2, _NSet_instances, processDeletions_fn;
var _NSet = class _NSet {
  constructor(map) {
    __privateAdd(this, _NSet_instances);
    __publicField(this, "cache");
    __publicField(this, _a3, "NSet");
    this.cache = map ?? /* @__PURE__ */ new Map();
  }
  get size() {
    return this.cache.size;
  }
  add(event) {
    __privateMethod(this, _NSet_instances, processDeletions_fn).call(this, event);
    for (const e of this) {
      if (_NSet.deletes(e, event) || _NSet.replaces(e, event)) {
        return this;
      } else if (_NSet.replaces(event, e)) {
        this.delete(e);
      }
    }
    this.cache.set(event.id, event);
    return this;
  }
  clear() {
    this.cache.clear();
  }
  delete(event) {
    return this.cache.delete(event.id);
  }
  forEach(callbackfn, thisArg) {
    return this.cache.forEach((event, _id) => callbackfn(event, event, this), thisArg);
  }
  has(event) {
    return this.cache.has(event.id);
  }
  *entries() {
    for (const event of this.values()) {
      yield [
        event,
        event
      ];
    }
  }
  keys() {
    return this.values();
  }
  *values() {
    for (const event of _NSet.sortEvents([
      ...this.cache.values()
    ])) {
      yield event;
    }
  }
  [(_b2 = _computedKey, _a3 = _computedKey1, _b2)]() {
    return this.values();
  }
  /** Event kind is **replaceable**, which means that, for each combination of `pubkey` and `kind`, only the latest event is expected to (SHOULD) be stored by relays, older versions are expected to be discarded. */
  static isReplaceable(kind) {
    return [
      0,
      3
    ].includes(kind) || 1e4 <= kind && kind < 2e4;
  }
  /** Event kind is **parameterized replaceable**, which means that, for each combination of `pubkey`, `kind` and the `d` tag, only the latest event is expected to be stored by relays, older versions are expected to be discarded. */
  static isAddressable(kind) {
    return 3e4 <= kind && kind < 4e4;
  }
  /**
   * Returns true if `event` replaces `target`.
   *
   * Both events must be replaceable, belong to the same kind and pubkey (and `d` tag, for parameterized events), and the `event` must be newer than the `target`.
   */
  static replaces(event, target) {
    var _a5, _b4;
    const { kind, pubkey } = event;
    if (_NSet.isReplaceable(kind)) {
      return kind === target.kind && pubkey === target.pubkey && _NSet.sortEvents([
        event,
        target
      ])[0] === event;
    }
    if (_NSet.isAddressable(kind)) {
      const d1 = ((_a5 = event.tags.find(([name]) => name === "d")) == null ? void 0 : _a5[1]) || "";
      const d2 = ((_b4 = target.tags.find(([name]) => name === "d")) == null ? void 0 : _b4[1]) || "";
      return kind === target.kind && pubkey === target.pubkey && _NSet.sortEvents([
        event,
        target
      ])[0] === event && d1 === d2;
    }
    return false;
  }
  /**
   * Returns true if the `event` deletes`target`.
   *
   * `event` must be a kind `5` event, and both events must share the same `pubkey`.
   */
  static deletes(event, target) {
    const { kind, pubkey, tags } = event;
    if (kind === 5 && pubkey === target.pubkey) {
      for (const [name, value] of tags) {
        if (name === "e" && value === target.id) {
          return true;
        }
      }
    }
    return false;
  }
  /**
   * Sort events in reverse-chronological order by the `created_at` timestamp,
   * and then by the event `id` (lexicographically) in case of ties.
   * This mutates the array.
   */
  static sortEvents(events) {
    return events.sort((a, b) => {
      if (a.created_at !== b.created_at) {
        return b.created_at - a.created_at;
      }
      return a.id.localeCompare(b.id);
    });
  }
  union(_other) {
    throw new Error("Method not implemented.");
  }
  intersection(_other) {
    throw new Error("Method not implemented.");
  }
  difference(_other) {
    throw new Error("Method not implemented.");
  }
  symmetricDifference(_other) {
    throw new Error("Method not implemented.");
  }
  isSubsetOf(_other) {
    throw new Error("Method not implemented.");
  }
  isSupersetOf(_other) {
    throw new Error("Method not implemented.");
  }
  isDisjointFrom(_other) {
    throw new Error("Method not implemented.");
  }
};
_NSet_instances = new WeakSet();
processDeletions_fn = function(event) {
  if (event.kind === 5) {
    for (const tag of event.tags) {
      if (tag[0] === "e") {
        const e = this.cache.get(tag[1]);
        if (e && e.pubkey === event.pubkey) {
          this.delete(e);
        }
      }
    }
  }
};
var NSet = _NSet;

// node_modules/@jsr/nostrify__nostrify/NCache.js
var _computedKey2;
_computedKey2 = Symbol.toStringTag;
var _a4, _b3;
var NCache = class extends (_b3 = NSet, _a4 = _computedKey2, _b3) {
  constructor(...args) {
    super(new LRUCache(...args));
    __publicField(this, _a4, "NCache");
  }
  async event(event) {
    this.add(event);
  }
  async query(filters) {
    const events = [];
    for (const event of this) {
      if (matchFilters(filters, event)) {
        this.cache.get(event.id);
        events.push(event);
      }
    }
    return events;
  }
  async remove(filters) {
    for (const event of this) {
      if (matchFilters(filters, event)) {
        this.delete(event);
      }
    }
  }
  async count(filters) {
    const events = await this.query(filters);
    return {
      count: events.length,
      approximate: false
    };
  }
};

// node_modules/zod/v3/index.js
var v3_exports = {};
__export(v3_exports, {
  BRAND: () => BRAND,
  DIRTY: () => DIRTY,
  EMPTY_PATH: () => EMPTY_PATH,
  INVALID: () => INVALID,
  NEVER: () => NEVER,
  OK: () => OK,
  ParseStatus: () => ParseStatus,
  Schema: () => ZodType,
  ZodAny: () => ZodAny,
  ZodArray: () => ZodArray,
  ZodBigInt: () => ZodBigInt,
  ZodBoolean: () => ZodBoolean,
  ZodBranded: () => ZodBranded,
  ZodCatch: () => ZodCatch,
  ZodDate: () => ZodDate,
  ZodDefault: () => ZodDefault,
  ZodDiscriminatedUnion: () => ZodDiscriminatedUnion,
  ZodEffects: () => ZodEffects,
  ZodEnum: () => ZodEnum,
  ZodError: () => ZodError,
  ZodFirstPartyTypeKind: () => ZodFirstPartyTypeKind,
  ZodFunction: () => ZodFunction,
  ZodIntersection: () => ZodIntersection,
  ZodIssueCode: () => ZodIssueCode,
  ZodLazy: () => ZodLazy,
  ZodLiteral: () => ZodLiteral,
  ZodMap: () => ZodMap,
  ZodNaN: () => ZodNaN,
  ZodNativeEnum: () => ZodNativeEnum,
  ZodNever: () => ZodNever,
  ZodNull: () => ZodNull,
  ZodNullable: () => ZodNullable,
  ZodNumber: () => ZodNumber,
  ZodObject: () => ZodObject,
  ZodOptional: () => ZodOptional,
  ZodParsedType: () => ZodParsedType,
  ZodPipeline: () => ZodPipeline,
  ZodPromise: () => ZodPromise,
  ZodReadonly: () => ZodReadonly,
  ZodRecord: () => ZodRecord,
  ZodSchema: () => ZodType,
  ZodSet: () => ZodSet,
  ZodString: () => ZodString,
  ZodSymbol: () => ZodSymbol,
  ZodTransformer: () => ZodEffects,
  ZodTuple: () => ZodTuple,
  ZodType: () => ZodType,
  ZodUndefined: () => ZodUndefined,
  ZodUnion: () => ZodUnion,
  ZodUnknown: () => ZodUnknown,
  ZodVoid: () => ZodVoid,
  addIssueToContext: () => addIssueToContext,
  any: () => anyType,
  array: () => arrayType,
  bigint: () => bigIntType,
  boolean: () => booleanType,
  coerce: () => coerce,
  custom: () => custom,
  date: () => dateType,
  datetimeRegex: () => datetimeRegex,
  default: () => v3_default,
  defaultErrorMap: () => en_default,
  discriminatedUnion: () => discriminatedUnionType,
  effect: () => effectsType,
  enum: () => enumType,
  function: () => functionType,
  getErrorMap: () => getErrorMap,
  getParsedType: () => getParsedType,
  instanceof: () => instanceOfType,
  intersection: () => intersectionType,
  isAborted: () => isAborted,
  isAsync: () => isAsync,
  isDirty: () => isDirty,
  isValid: () => isValid,
  late: () => late,
  lazy: () => lazyType,
  literal: () => literalType,
  makeIssue: () => makeIssue,
  map: () => mapType,
  nan: () => nanType,
  nativeEnum: () => nativeEnumType,
  never: () => neverType,
  null: () => nullType,
  nullable: () => nullableType,
  number: () => numberType,
  object: () => objectType,
  objectUtil: () => objectUtil,
  oboolean: () => oboolean,
  onumber: () => onumber,
  optional: () => optionalType,
  ostring: () => ostring,
  pipeline: () => pipelineType,
  preprocess: () => preprocessType,
  promise: () => promiseType,
  quotelessJson: () => quotelessJson,
  record: () => recordType,
  set: () => setType,
  setErrorMap: () => setErrorMap,
  strictObject: () => strictObjectType,
  string: () => stringType,
  symbol: () => symbolType,
  transformer: () => effectsType,
  tuple: () => tupleType,
  undefined: () => undefinedType,
  union: () => unionType,
  unknown: () => unknownType,
  util: () => util,
  void: () => voidType,
  z: () => external_exports
});

// node_modules/zod/v3/external.js
var external_exports = {};
__export(external_exports, {
  BRAND: () => BRAND,
  DIRTY: () => DIRTY,
  EMPTY_PATH: () => EMPTY_PATH,
  INVALID: () => INVALID,
  NEVER: () => NEVER,
  OK: () => OK,
  ParseStatus: () => ParseStatus,
  Schema: () => ZodType,
  ZodAny: () => ZodAny,
  ZodArray: () => ZodArray,
  ZodBigInt: () => ZodBigInt,
  ZodBoolean: () => ZodBoolean,
  ZodBranded: () => ZodBranded,
  ZodCatch: () => ZodCatch,
  ZodDate: () => ZodDate,
  ZodDefault: () => ZodDefault,
  ZodDiscriminatedUnion: () => ZodDiscriminatedUnion,
  ZodEffects: () => ZodEffects,
  ZodEnum: () => ZodEnum,
  ZodError: () => ZodError,
  ZodFirstPartyTypeKind: () => ZodFirstPartyTypeKind,
  ZodFunction: () => ZodFunction,
  ZodIntersection: () => ZodIntersection,
  ZodIssueCode: () => ZodIssueCode,
  ZodLazy: () => ZodLazy,
  ZodLiteral: () => ZodLiteral,
  ZodMap: () => ZodMap,
  ZodNaN: () => ZodNaN,
  ZodNativeEnum: () => ZodNativeEnum,
  ZodNever: () => ZodNever,
  ZodNull: () => ZodNull,
  ZodNullable: () => ZodNullable,
  ZodNumber: () => ZodNumber,
  ZodObject: () => ZodObject,
  ZodOptional: () => ZodOptional,
  ZodParsedType: () => ZodParsedType,
  ZodPipeline: () => ZodPipeline,
  ZodPromise: () => ZodPromise,
  ZodReadonly: () => ZodReadonly,
  ZodRecord: () => ZodRecord,
  ZodSchema: () => ZodType,
  ZodSet: () => ZodSet,
  ZodString: () => ZodString,
  ZodSymbol: () => ZodSymbol,
  ZodTransformer: () => ZodEffects,
  ZodTuple: () => ZodTuple,
  ZodType: () => ZodType,
  ZodUndefined: () => ZodUndefined,
  ZodUnion: () => ZodUnion,
  ZodUnknown: () => ZodUnknown,
  ZodVoid: () => ZodVoid,
  addIssueToContext: () => addIssueToContext,
  any: () => anyType,
  array: () => arrayType,
  bigint: () => bigIntType,
  boolean: () => booleanType,
  coerce: () => coerce,
  custom: () => custom,
  date: () => dateType,
  datetimeRegex: () => datetimeRegex,
  defaultErrorMap: () => en_default,
  discriminatedUnion: () => discriminatedUnionType,
  effect: () => effectsType,
  enum: () => enumType,
  function: () => functionType,
  getErrorMap: () => getErrorMap,
  getParsedType: () => getParsedType,
  instanceof: () => instanceOfType,
  intersection: () => intersectionType,
  isAborted: () => isAborted,
  isAsync: () => isAsync,
  isDirty: () => isDirty,
  isValid: () => isValid,
  late: () => late,
  lazy: () => lazyType,
  literal: () => literalType,
  makeIssue: () => makeIssue,
  map: () => mapType,
  nan: () => nanType,
  nativeEnum: () => nativeEnumType,
  never: () => neverType,
  null: () => nullType,
  nullable: () => nullableType,
  number: () => numberType,
  object: () => objectType,
  objectUtil: () => objectUtil,
  oboolean: () => oboolean,
  onumber: () => onumber,
  optional: () => optionalType,
  ostring: () => ostring,
  pipeline: () => pipelineType,
  preprocess: () => preprocessType,
  promise: () => promiseType,
  quotelessJson: () => quotelessJson,
  record: () => recordType,
  set: () => setType,
  setErrorMap: () => setErrorMap,
  strictObject: () => strictObjectType,
  string: () => stringType,
  symbol: () => symbolType,
  transformer: () => effectsType,
  tuple: () => tupleType,
  undefined: () => undefinedType,
  union: () => unionType,
  unknown: () => unknownType,
  util: () => util,
  void: () => voidType
});

// node_modules/zod/v3/helpers/util.js
var util;
(function(util2) {
  util2.assertEqual = (_) => {
  };
  function assertIs(_arg) {
  }
  util2.assertIs = assertIs;
  function assertNever(_x) {
    throw new Error();
  }
  util2.assertNever = assertNever;
  util2.arrayToEnum = (items) => {
    const obj = {};
    for (const item of items) {
      obj[item] = item;
    }
    return obj;
  };
  util2.getValidEnumValues = (obj) => {
    const validKeys = util2.objectKeys(obj).filter((k) => typeof obj[obj[k]] !== "number");
    const filtered = {};
    for (const k of validKeys) {
      filtered[k] = obj[k];
    }
    return util2.objectValues(filtered);
  };
  util2.objectValues = (obj) => {
    return util2.objectKeys(obj).map(function(e) {
      return obj[e];
    });
  };
  util2.objectKeys = typeof Object.keys === "function" ? (obj) => Object.keys(obj) : (object) => {
    const keys = [];
    for (const key in object) {
      if (Object.prototype.hasOwnProperty.call(object, key)) {
        keys.push(key);
      }
    }
    return keys;
  };
  util2.find = (arr, checker) => {
    for (const item of arr) {
      if (checker(item))
        return item;
    }
    return void 0;
  };
  util2.isInteger = typeof Number.isInteger === "function" ? (val) => Number.isInteger(val) : (val) => typeof val === "number" && Number.isFinite(val) && Math.floor(val) === val;
  function joinValues(array, separator = " | ") {
    return array.map((val) => typeof val === "string" ? `'${val}'` : val).join(separator);
  }
  util2.joinValues = joinValues;
  util2.jsonStringifyReplacer = (_, value) => {
    if (typeof value === "bigint") {
      return value.toString();
    }
    return value;
  };
})(util || (util = {}));
var objectUtil;
(function(objectUtil2) {
  objectUtil2.mergeShapes = (first, second) => {
    return {
      ...first,
      ...second
      // second overwrites first
    };
  };
})(objectUtil || (objectUtil = {}));
var ZodParsedType = util.arrayToEnum([
  "string",
  "nan",
  "number",
  "integer",
  "float",
  "boolean",
  "date",
  "bigint",
  "symbol",
  "function",
  "undefined",
  "null",
  "array",
  "object",
  "unknown",
  "promise",
  "void",
  "never",
  "map",
  "set"
]);
var getParsedType = (data) => {
  const t = typeof data;
  switch (t) {
    case "undefined":
      return ZodParsedType.undefined;
    case "string":
      return ZodParsedType.string;
    case "number":
      return Number.isNaN(data) ? ZodParsedType.nan : ZodParsedType.number;
    case "boolean":
      return ZodParsedType.boolean;
    case "function":
      return ZodParsedType.function;
    case "bigint":
      return ZodParsedType.bigint;
    case "symbol":
      return ZodParsedType.symbol;
    case "object":
      if (Array.isArray(data)) {
        return ZodParsedType.array;
      }
      if (data === null) {
        return ZodParsedType.null;
      }
      if (data.then && typeof data.then === "function" && data.catch && typeof data.catch === "function") {
        return ZodParsedType.promise;
      }
      if (typeof Map !== "undefined" && data instanceof Map) {
        return ZodParsedType.map;
      }
      if (typeof Set !== "undefined" && data instanceof Set) {
        return ZodParsedType.set;
      }
      if (typeof Date !== "undefined" && data instanceof Date) {
        return ZodParsedType.date;
      }
      return ZodParsedType.object;
    default:
      return ZodParsedType.unknown;
  }
};

// node_modules/zod/v3/ZodError.js
var ZodIssueCode = util.arrayToEnum([
  "invalid_type",
  "invalid_literal",
  "custom",
  "invalid_union",
  "invalid_union_discriminator",
  "invalid_enum_value",
  "unrecognized_keys",
  "invalid_arguments",
  "invalid_return_type",
  "invalid_date",
  "invalid_string",
  "too_small",
  "too_big",
  "invalid_intersection_types",
  "not_multiple_of",
  "not_finite"
]);
var quotelessJson = (obj) => {
  const json = JSON.stringify(obj, null, 2);
  return json.replace(/"([^"]+)":/g, "$1:");
};
var ZodError = class _ZodError extends Error {
  get errors() {
    return this.issues;
  }
  constructor(issues) {
    super();
    this.issues = [];
    this.addIssue = (sub) => {
      this.issues = [...this.issues, sub];
    };
    this.addIssues = (subs = []) => {
      this.issues = [...this.issues, ...subs];
    };
    const actualProto = new.target.prototype;
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(this, actualProto);
    } else {
      this.__proto__ = actualProto;
    }
    this.name = "ZodError";
    this.issues = issues;
  }
  format(_mapper) {
    const mapper = _mapper || function(issue) {
      return issue.message;
    };
    const fieldErrors = { _errors: [] };
    const processError = (error) => {
      for (const issue of error.issues) {
        if (issue.code === "invalid_union") {
          issue.unionErrors.map(processError);
        } else if (issue.code === "invalid_return_type") {
          processError(issue.returnTypeError);
        } else if (issue.code === "invalid_arguments") {
          processError(issue.argumentsError);
        } else if (issue.path.length === 0) {
          fieldErrors._errors.push(mapper(issue));
        } else {
          let curr = fieldErrors;
          let i = 0;
          while (i < issue.path.length) {
            const el = issue.path[i];
            const terminal = i === issue.path.length - 1;
            if (!terminal) {
              curr[el] = curr[el] || { _errors: [] };
            } else {
              curr[el] = curr[el] || { _errors: [] };
              curr[el]._errors.push(mapper(issue));
            }
            curr = curr[el];
            i++;
          }
        }
      }
    };
    processError(this);
    return fieldErrors;
  }
  static assert(value) {
    if (!(value instanceof _ZodError)) {
      throw new Error(`Not a ZodError: ${value}`);
    }
  }
  toString() {
    return this.message;
  }
  get message() {
    return JSON.stringify(this.issues, util.jsonStringifyReplacer, 2);
  }
  get isEmpty() {
    return this.issues.length === 0;
  }
  flatten(mapper = (issue) => issue.message) {
    const fieldErrors = {};
    const formErrors = [];
    for (const sub of this.issues) {
      if (sub.path.length > 0) {
        const firstEl = sub.path[0];
        fieldErrors[firstEl] = fieldErrors[firstEl] || [];
        fieldErrors[firstEl].push(mapper(sub));
      } else {
        formErrors.push(mapper(sub));
      }
    }
    return { formErrors, fieldErrors };
  }
  get formErrors() {
    return this.flatten();
  }
};
ZodError.create = (issues) => {
  const error = new ZodError(issues);
  return error;
};

// node_modules/zod/v3/locales/en.js
var errorMap = (issue, _ctx) => {
  let message;
  switch (issue.code) {
    case ZodIssueCode.invalid_type:
      if (issue.received === ZodParsedType.undefined) {
        message = "Required";
      } else {
        message = `Expected ${issue.expected}, received ${issue.received}`;
      }
      break;
    case ZodIssueCode.invalid_literal:
      message = `Invalid literal value, expected ${JSON.stringify(issue.expected, util.jsonStringifyReplacer)}`;
      break;
    case ZodIssueCode.unrecognized_keys:
      message = `Unrecognized key(s) in object: ${util.joinValues(issue.keys, ", ")}`;
      break;
    case ZodIssueCode.invalid_union:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_union_discriminator:
      message = `Invalid discriminator value. Expected ${util.joinValues(issue.options)}`;
      break;
    case ZodIssueCode.invalid_enum_value:
      message = `Invalid enum value. Expected ${util.joinValues(issue.options)}, received '${issue.received}'`;
      break;
    case ZodIssueCode.invalid_arguments:
      message = `Invalid function arguments`;
      break;
    case ZodIssueCode.invalid_return_type:
      message = `Invalid function return type`;
      break;
    case ZodIssueCode.invalid_date:
      message = `Invalid date`;
      break;
    case ZodIssueCode.invalid_string:
      if (typeof issue.validation === "object") {
        if ("includes" in issue.validation) {
          message = `Invalid input: must include "${issue.validation.includes}"`;
          if (typeof issue.validation.position === "number") {
            message = `${message} at one or more positions greater than or equal to ${issue.validation.position}`;
          }
        } else if ("startsWith" in issue.validation) {
          message = `Invalid input: must start with "${issue.validation.startsWith}"`;
        } else if ("endsWith" in issue.validation) {
          message = `Invalid input: must end with "${issue.validation.endsWith}"`;
        } else {
          util.assertNever(issue.validation);
        }
      } else if (issue.validation !== "regex") {
        message = `Invalid ${issue.validation}`;
      } else {
        message = "Invalid";
      }
      break;
    case ZodIssueCode.too_small:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `more than`} ${issue.minimum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `over`} ${issue.minimum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "bigint")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${new Date(Number(issue.minimum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.too_big:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `less than`} ${issue.maximum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `under`} ${issue.maximum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "bigint")
        message = `BigInt must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly` : issue.inclusive ? `smaller than or equal to` : `smaller than`} ${new Date(Number(issue.maximum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.custom:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_intersection_types:
      message = `Intersection results could not be merged`;
      break;
    case ZodIssueCode.not_multiple_of:
      message = `Number must be a multiple of ${issue.multipleOf}`;
      break;
    case ZodIssueCode.not_finite:
      message = "Number must be finite";
      break;
    default:
      message = _ctx.defaultError;
      util.assertNever(issue);
  }
  return { message };
};
var en_default = errorMap;

// node_modules/zod/v3/errors.js
var overrideErrorMap = en_default;
function setErrorMap(map) {
  overrideErrorMap = map;
}
function getErrorMap() {
  return overrideErrorMap;
}

// node_modules/zod/v3/helpers/parseUtil.js
var makeIssue = (params) => {
  const { data, path, errorMaps, issueData } = params;
  const fullPath = [...path, ...issueData.path || []];
  const fullIssue = {
    ...issueData,
    path: fullPath
  };
  if (issueData.message !== void 0) {
    return {
      ...issueData,
      path: fullPath,
      message: issueData.message
    };
  }
  let errorMessage = "";
  const maps = errorMaps.filter((m) => !!m).slice().reverse();
  for (const map of maps) {
    errorMessage = map(fullIssue, { data, defaultError: errorMessage }).message;
  }
  return {
    ...issueData,
    path: fullPath,
    message: errorMessage
  };
};
var EMPTY_PATH = [];
function addIssueToContext(ctx, issueData) {
  const overrideMap = getErrorMap();
  const issue = makeIssue({
    issueData,
    data: ctx.data,
    path: ctx.path,
    errorMaps: [
      ctx.common.contextualErrorMap,
      // contextual error map is first priority
      ctx.schemaErrorMap,
      // then schema-bound map if available
      overrideMap,
      // then global override map
      overrideMap === en_default ? void 0 : en_default
      // then global default map
    ].filter((x) => !!x)
  });
  ctx.common.issues.push(issue);
}
var ParseStatus = class _ParseStatus {
  constructor() {
    this.value = "valid";
  }
  dirty() {
    if (this.value === "valid")
      this.value = "dirty";
  }
  abort() {
    if (this.value !== "aborted")
      this.value = "aborted";
  }
  static mergeArray(status, results) {
    const arrayValue = [];
    for (const s of results) {
      if (s.status === "aborted")
        return INVALID;
      if (s.status === "dirty")
        status.dirty();
      arrayValue.push(s.value);
    }
    return { status: status.value, value: arrayValue };
  }
  static async mergeObjectAsync(status, pairs) {
    const syncPairs = [];
    for (const pair of pairs) {
      const key = await pair.key;
      const value = await pair.value;
      syncPairs.push({
        key,
        value
      });
    }
    return _ParseStatus.mergeObjectSync(status, syncPairs);
  }
  static mergeObjectSync(status, pairs) {
    const finalObject = {};
    for (const pair of pairs) {
      const { key, value } = pair;
      if (key.status === "aborted")
        return INVALID;
      if (value.status === "aborted")
        return INVALID;
      if (key.status === "dirty")
        status.dirty();
      if (value.status === "dirty")
        status.dirty();
      if (key.value !== "__proto__" && (typeof value.value !== "undefined" || pair.alwaysSet)) {
        finalObject[key.value] = value.value;
      }
    }
    return { status: status.value, value: finalObject };
  }
};
var INVALID = Object.freeze({
  status: "aborted"
});
var DIRTY = (value) => ({ status: "dirty", value });
var OK = (value) => ({ status: "valid", value });
var isAborted = (x) => x.status === "aborted";
var isDirty = (x) => x.status === "dirty";
var isValid = (x) => x.status === "valid";
var isAsync = (x) => typeof Promise !== "undefined" && x instanceof Promise;

// node_modules/zod/v3/helpers/errorUtil.js
var errorUtil;
(function(errorUtil2) {
  errorUtil2.errToObj = (message) => typeof message === "string" ? { message } : message || {};
  errorUtil2.toString = (message) => typeof message === "string" ? message : message == null ? void 0 : message.message;
})(errorUtil || (errorUtil = {}));

// node_modules/zod/v3/types.js
var ParseInputLazyPath = class {
  constructor(parent, value, path, key) {
    this._cachedPath = [];
    this.parent = parent;
    this.data = value;
    this._path = path;
    this._key = key;
  }
  get path() {
    if (!this._cachedPath.length) {
      if (Array.isArray(this._key)) {
        this._cachedPath.push(...this._path, ...this._key);
      } else {
        this._cachedPath.push(...this._path, this._key);
      }
    }
    return this._cachedPath;
  }
};
var handleResult = (ctx, result) => {
  if (isValid(result)) {
    return { success: true, data: result.value };
  } else {
    if (!ctx.common.issues.length) {
      throw new Error("Validation failed but no issues detected.");
    }
    return {
      success: false,
      get error() {
        if (this._error)
          return this._error;
        const error = new ZodError(ctx.common.issues);
        this._error = error;
        return this._error;
      }
    };
  }
};
function processCreateParams(params) {
  if (!params)
    return {};
  const { errorMap: errorMap2, invalid_type_error, required_error, description } = params;
  if (errorMap2 && (invalid_type_error || required_error)) {
    throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
  }
  if (errorMap2)
    return { errorMap: errorMap2, description };
  const customMap = (iss, ctx) => {
    const { message } = params;
    if (iss.code === "invalid_enum_value") {
      return { message: message ?? ctx.defaultError };
    }
    if (typeof ctx.data === "undefined") {
      return { message: message ?? required_error ?? ctx.defaultError };
    }
    if (iss.code !== "invalid_type")
      return { message: ctx.defaultError };
    return { message: message ?? invalid_type_error ?? ctx.defaultError };
  };
  return { errorMap: customMap, description };
}
var ZodType = class {
  get description() {
    return this._def.description;
  }
  _getType(input) {
    return getParsedType(input.data);
  }
  _getOrReturnCtx(input, ctx) {
    return ctx || {
      common: input.parent.common,
      data: input.data,
      parsedType: getParsedType(input.data),
      schemaErrorMap: this._def.errorMap,
      path: input.path,
      parent: input.parent
    };
  }
  _processInputParams(input) {
    return {
      status: new ParseStatus(),
      ctx: {
        common: input.parent.common,
        data: input.data,
        parsedType: getParsedType(input.data),
        schemaErrorMap: this._def.errorMap,
        path: input.path,
        parent: input.parent
      }
    };
  }
  _parseSync(input) {
    const result = this._parse(input);
    if (isAsync(result)) {
      throw new Error("Synchronous parse encountered promise.");
    }
    return result;
  }
  _parseAsync(input) {
    const result = this._parse(input);
    return Promise.resolve(result);
  }
  parse(data, params) {
    const result = this.safeParse(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  safeParse(data, params) {
    const ctx = {
      common: {
        issues: [],
        async: (params == null ? void 0 : params.async) ?? false,
        contextualErrorMap: params == null ? void 0 : params.errorMap
      },
      path: (params == null ? void 0 : params.path) || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const result = this._parseSync({ data, path: ctx.path, parent: ctx });
    return handleResult(ctx, result);
  }
  "~validate"(data) {
    var _a5, _b4;
    const ctx = {
      common: {
        issues: [],
        async: !!this["~standard"].async
      },
      path: [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    if (!this["~standard"].async) {
      try {
        const result = this._parseSync({ data, path: [], parent: ctx });
        return isValid(result) ? {
          value: result.value
        } : {
          issues: ctx.common.issues
        };
      } catch (err) {
        if ((_b4 = (_a5 = err == null ? void 0 : err.message) == null ? void 0 : _a5.toLowerCase()) == null ? void 0 : _b4.includes("encountered")) {
          this["~standard"].async = true;
        }
        ctx.common = {
          issues: [],
          async: true
        };
      }
    }
    return this._parseAsync({ data, path: [], parent: ctx }).then((result) => isValid(result) ? {
      value: result.value
    } : {
      issues: ctx.common.issues
    });
  }
  async parseAsync(data, params) {
    const result = await this.safeParseAsync(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  async safeParseAsync(data, params) {
    const ctx = {
      common: {
        issues: [],
        contextualErrorMap: params == null ? void 0 : params.errorMap,
        async: true
      },
      path: (params == null ? void 0 : params.path) || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const maybeAsyncResult = this._parse({ data, path: ctx.path, parent: ctx });
    const result = await (isAsync(maybeAsyncResult) ? maybeAsyncResult : Promise.resolve(maybeAsyncResult));
    return handleResult(ctx, result);
  }
  refine(check, message) {
    const getIssueProperties = (val) => {
      if (typeof message === "string" || typeof message === "undefined") {
        return { message };
      } else if (typeof message === "function") {
        return message(val);
      } else {
        return message;
      }
    };
    return this._refinement((val, ctx) => {
      const result = check(val);
      const setError = () => ctx.addIssue({
        code: ZodIssueCode.custom,
        ...getIssueProperties(val)
      });
      if (typeof Promise !== "undefined" && result instanceof Promise) {
        return result.then((data) => {
          if (!data) {
            setError();
            return false;
          } else {
            return true;
          }
        });
      }
      if (!result) {
        setError();
        return false;
      } else {
        return true;
      }
    });
  }
  refinement(check, refinementData) {
    return this._refinement((val, ctx) => {
      if (!check(val)) {
        ctx.addIssue(typeof refinementData === "function" ? refinementData(val, ctx) : refinementData);
        return false;
      } else {
        return true;
      }
    });
  }
  _refinement(refinement) {
    return new ZodEffects({
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "refinement", refinement }
    });
  }
  superRefine(refinement) {
    return this._refinement(refinement);
  }
  constructor(def) {
    this.spa = this.safeParseAsync;
    this._def = def;
    this.parse = this.parse.bind(this);
    this.safeParse = this.safeParse.bind(this);
    this.parseAsync = this.parseAsync.bind(this);
    this.safeParseAsync = this.safeParseAsync.bind(this);
    this.spa = this.spa.bind(this);
    this.refine = this.refine.bind(this);
    this.refinement = this.refinement.bind(this);
    this.superRefine = this.superRefine.bind(this);
    this.optional = this.optional.bind(this);
    this.nullable = this.nullable.bind(this);
    this.nullish = this.nullish.bind(this);
    this.array = this.array.bind(this);
    this.promise = this.promise.bind(this);
    this.or = this.or.bind(this);
    this.and = this.and.bind(this);
    this.transform = this.transform.bind(this);
    this.brand = this.brand.bind(this);
    this.default = this.default.bind(this);
    this.catch = this.catch.bind(this);
    this.describe = this.describe.bind(this);
    this.pipe = this.pipe.bind(this);
    this.readonly = this.readonly.bind(this);
    this.isNullable = this.isNullable.bind(this);
    this.isOptional = this.isOptional.bind(this);
    this["~standard"] = {
      version: 1,
      vendor: "zod",
      validate: (data) => this["~validate"](data)
    };
  }
  optional() {
    return ZodOptional.create(this, this._def);
  }
  nullable() {
    return ZodNullable.create(this, this._def);
  }
  nullish() {
    return this.nullable().optional();
  }
  array() {
    return ZodArray.create(this);
  }
  promise() {
    return ZodPromise.create(this, this._def);
  }
  or(option) {
    return ZodUnion.create([this, option], this._def);
  }
  and(incoming) {
    return ZodIntersection.create(this, incoming, this._def);
  }
  transform(transform) {
    return new ZodEffects({
      ...processCreateParams(this._def),
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "transform", transform }
    });
  }
  default(def) {
    const defaultValueFunc = typeof def === "function" ? def : () => def;
    return new ZodDefault({
      ...processCreateParams(this._def),
      innerType: this,
      defaultValue: defaultValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodDefault
    });
  }
  brand() {
    return new ZodBranded({
      typeName: ZodFirstPartyTypeKind.ZodBranded,
      type: this,
      ...processCreateParams(this._def)
    });
  }
  catch(def) {
    const catchValueFunc = typeof def === "function" ? def : () => def;
    return new ZodCatch({
      ...processCreateParams(this._def),
      innerType: this,
      catchValue: catchValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodCatch
    });
  }
  describe(description) {
    const This = this.constructor;
    return new This({
      ...this._def,
      description
    });
  }
  pipe(target) {
    return ZodPipeline.create(this, target);
  }
  readonly() {
    return ZodReadonly.create(this);
  }
  isOptional() {
    return this.safeParse(void 0).success;
  }
  isNullable() {
    return this.safeParse(null).success;
  }
};
var cuidRegex = /^c[^\s-]{8,}$/i;
var cuid2Regex = /^[0-9a-z]+$/;
var ulidRegex = /^[0-9A-HJKMNP-TV-Z]{26}$/i;
var uuidRegex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i;
var nanoidRegex = /^[a-z0-9_-]{21}$/i;
var jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
var durationRegex = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
var emailRegex = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
var _emojiRegex = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
var emojiRegex;
var ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
var ipv4CidrRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/;
var ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
var ipv6CidrRegex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
var base64Regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
var base64urlRegex = /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/;
var dateRegexSource = `((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))`;
var dateRegex = new RegExp(`^${dateRegexSource}$`);
function timeRegexSource(args) {
  let secondsRegexSource = `[0-5]\\d`;
  if (args.precision) {
    secondsRegexSource = `${secondsRegexSource}\\.\\d{${args.precision}}`;
  } else if (args.precision == null) {
    secondsRegexSource = `${secondsRegexSource}(\\.\\d+)?`;
  }
  const secondsQuantifier = args.precision ? "+" : "?";
  return `([01]\\d|2[0-3]):[0-5]\\d(:${secondsRegexSource})${secondsQuantifier}`;
}
function timeRegex(args) {
  return new RegExp(`^${timeRegexSource(args)}$`);
}
function datetimeRegex(args) {
  let regex = `${dateRegexSource}T${timeRegexSource(args)}`;
  const opts = [];
  opts.push(args.local ? `Z?` : `Z`);
  if (args.offset)
    opts.push(`([+-]\\d{2}:?\\d{2})`);
  regex = `${regex}(${opts.join("|")})`;
  return new RegExp(`^${regex}$`);
}
function isValidIP(ip, version) {
  if ((version === "v4" || !version) && ipv4Regex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6Regex.test(ip)) {
    return true;
  }
  return false;
}
function isValidJWT(jwt, alg) {
  if (!jwtRegex.test(jwt))
    return false;
  try {
    const [header] = jwt.split(".");
    if (!header)
      return false;
    const base64 = header.replace(/-/g, "+").replace(/_/g, "/").padEnd(header.length + (4 - header.length % 4) % 4, "=");
    const decoded = JSON.parse(atob(base64));
    if (typeof decoded !== "object" || decoded === null)
      return false;
    if ("typ" in decoded && (decoded == null ? void 0 : decoded.typ) !== "JWT")
      return false;
    if (!decoded.alg)
      return false;
    if (alg && decoded.alg !== alg)
      return false;
    return true;
  } catch {
    return false;
  }
}
function isValidCidr(ip, version) {
  if ((version === "v4" || !version) && ipv4CidrRegex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6CidrRegex.test(ip)) {
    return true;
  }
  return false;
}
var ZodString = class _ZodString extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = String(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.string) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.string,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.length < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.length > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "length") {
        const tooBig = input.data.length > check.value;
        const tooSmall = input.data.length < check.value;
        if (tooBig || tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          if (tooBig) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              maximum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          } else if (tooSmall) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              minimum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          }
          status.dirty();
        }
      } else if (check.kind === "email") {
        if (!emailRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "email",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "emoji") {
        if (!emojiRegex) {
          emojiRegex = new RegExp(_emojiRegex, "u");
        }
        if (!emojiRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "emoji",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "uuid") {
        if (!uuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "uuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "nanoid") {
        if (!nanoidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "nanoid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid") {
        if (!cuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid2") {
        if (!cuid2Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid2",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ulid") {
        if (!ulidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ulid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "url") {
        try {
          new URL(input.data);
        } catch {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "regex") {
        check.regex.lastIndex = 0;
        const testResult = check.regex.test(input.data);
        if (!testResult) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "regex",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "trim") {
        input.data = input.data.trim();
      } else if (check.kind === "includes") {
        if (!input.data.includes(check.value, check.position)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { includes: check.value, position: check.position },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "toLowerCase") {
        input.data = input.data.toLowerCase();
      } else if (check.kind === "toUpperCase") {
        input.data = input.data.toUpperCase();
      } else if (check.kind === "startsWith") {
        if (!input.data.startsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { startsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "endsWith") {
        if (!input.data.endsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { endsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "datetime") {
        const regex = datetimeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "datetime",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "date") {
        const regex = dateRegex;
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "date",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "time") {
        const regex = timeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "time",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "duration") {
        if (!durationRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "duration",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ip") {
        if (!isValidIP(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ip",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "jwt") {
        if (!isValidJWT(input.data, check.alg)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "jwt",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cidr") {
        if (!isValidCidr(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cidr",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64") {
        if (!base64Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64url") {
        if (!base64urlRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _regex(regex, validation, message) {
    return this.refinement((data) => regex.test(data), {
      validation,
      code: ZodIssueCode.invalid_string,
      ...errorUtil.errToObj(message)
    });
  }
  _addCheck(check) {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  email(message) {
    return this._addCheck({ kind: "email", ...errorUtil.errToObj(message) });
  }
  url(message) {
    return this._addCheck({ kind: "url", ...errorUtil.errToObj(message) });
  }
  emoji(message) {
    return this._addCheck({ kind: "emoji", ...errorUtil.errToObj(message) });
  }
  uuid(message) {
    return this._addCheck({ kind: "uuid", ...errorUtil.errToObj(message) });
  }
  nanoid(message) {
    return this._addCheck({ kind: "nanoid", ...errorUtil.errToObj(message) });
  }
  cuid(message) {
    return this._addCheck({ kind: "cuid", ...errorUtil.errToObj(message) });
  }
  cuid2(message) {
    return this._addCheck({ kind: "cuid2", ...errorUtil.errToObj(message) });
  }
  ulid(message) {
    return this._addCheck({ kind: "ulid", ...errorUtil.errToObj(message) });
  }
  base64(message) {
    return this._addCheck({ kind: "base64", ...errorUtil.errToObj(message) });
  }
  base64url(message) {
    return this._addCheck({
      kind: "base64url",
      ...errorUtil.errToObj(message)
    });
  }
  jwt(options) {
    return this._addCheck({ kind: "jwt", ...errorUtil.errToObj(options) });
  }
  ip(options) {
    return this._addCheck({ kind: "ip", ...errorUtil.errToObj(options) });
  }
  cidr(options) {
    return this._addCheck({ kind: "cidr", ...errorUtil.errToObj(options) });
  }
  datetime(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "datetime",
        precision: null,
        offset: false,
        local: false,
        message: options
      });
    }
    return this._addCheck({
      kind: "datetime",
      precision: typeof (options == null ? void 0 : options.precision) === "undefined" ? null : options == null ? void 0 : options.precision,
      offset: (options == null ? void 0 : options.offset) ?? false,
      local: (options == null ? void 0 : options.local) ?? false,
      ...errorUtil.errToObj(options == null ? void 0 : options.message)
    });
  }
  date(message) {
    return this._addCheck({ kind: "date", message });
  }
  time(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "time",
        precision: null,
        message: options
      });
    }
    return this._addCheck({
      kind: "time",
      precision: typeof (options == null ? void 0 : options.precision) === "undefined" ? null : options == null ? void 0 : options.precision,
      ...errorUtil.errToObj(options == null ? void 0 : options.message)
    });
  }
  duration(message) {
    return this._addCheck({ kind: "duration", ...errorUtil.errToObj(message) });
  }
  regex(regex, message) {
    return this._addCheck({
      kind: "regex",
      regex,
      ...errorUtil.errToObj(message)
    });
  }
  includes(value, options) {
    return this._addCheck({
      kind: "includes",
      value,
      position: options == null ? void 0 : options.position,
      ...errorUtil.errToObj(options == null ? void 0 : options.message)
    });
  }
  startsWith(value, message) {
    return this._addCheck({
      kind: "startsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  endsWith(value, message) {
    return this._addCheck({
      kind: "endsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  min(minLength, message) {
    return this._addCheck({
      kind: "min",
      value: minLength,
      ...errorUtil.errToObj(message)
    });
  }
  max(maxLength, message) {
    return this._addCheck({
      kind: "max",
      value: maxLength,
      ...errorUtil.errToObj(message)
    });
  }
  length(len, message) {
    return this._addCheck({
      kind: "length",
      value: len,
      ...errorUtil.errToObj(message)
    });
  }
  /**
   * Equivalent to `.min(1)`
   */
  nonempty(message) {
    return this.min(1, errorUtil.errToObj(message));
  }
  trim() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "trim" }]
    });
  }
  toLowerCase() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toLowerCase" }]
    });
  }
  toUpperCase() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toUpperCase" }]
    });
  }
  get isDatetime() {
    return !!this._def.checks.find((ch) => ch.kind === "datetime");
  }
  get isDate() {
    return !!this._def.checks.find((ch) => ch.kind === "date");
  }
  get isTime() {
    return !!this._def.checks.find((ch) => ch.kind === "time");
  }
  get isDuration() {
    return !!this._def.checks.find((ch) => ch.kind === "duration");
  }
  get isEmail() {
    return !!this._def.checks.find((ch) => ch.kind === "email");
  }
  get isURL() {
    return !!this._def.checks.find((ch) => ch.kind === "url");
  }
  get isEmoji() {
    return !!this._def.checks.find((ch) => ch.kind === "emoji");
  }
  get isUUID() {
    return !!this._def.checks.find((ch) => ch.kind === "uuid");
  }
  get isNANOID() {
    return !!this._def.checks.find((ch) => ch.kind === "nanoid");
  }
  get isCUID() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid");
  }
  get isCUID2() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid2");
  }
  get isULID() {
    return !!this._def.checks.find((ch) => ch.kind === "ulid");
  }
  get isIP() {
    return !!this._def.checks.find((ch) => ch.kind === "ip");
  }
  get isCIDR() {
    return !!this._def.checks.find((ch) => ch.kind === "cidr");
  }
  get isBase64() {
    return !!this._def.checks.find((ch) => ch.kind === "base64");
  }
  get isBase64url() {
    return !!this._def.checks.find((ch) => ch.kind === "base64url");
  }
  get minLength() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxLength() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
};
ZodString.create = (params) => {
  return new ZodString({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodString,
    coerce: (params == null ? void 0 : params.coerce) ?? false,
    ...processCreateParams(params)
  });
};
function floatSafeRemainder(val, step) {
  const valDecCount = (val.toString().split(".")[1] || "").length;
  const stepDecCount = (step.toString().split(".")[1] || "").length;
  const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
  const valInt = Number.parseInt(val.toFixed(decCount).replace(".", ""));
  const stepInt = Number.parseInt(step.toFixed(decCount).replace(".", ""));
  return valInt % stepInt / 10 ** decCount;
}
var ZodNumber = class _ZodNumber extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
    this.step = this.multipleOf;
  }
  _parse(input) {
    if (this._def.coerce) {
      input.data = Number(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.number) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.number,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "int") {
        if (!util.isInteger(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: "integer",
            received: "float",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (floatSafeRemainder(input.data, check.value) !== 0) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "finite") {
        if (!Number.isFinite(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_finite,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new _ZodNumber({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new _ZodNumber({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  int(message) {
    return this._addCheck({
      kind: "int",
      message: errorUtil.toString(message)
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  finite(message) {
    return this._addCheck({
      kind: "finite",
      message: errorUtil.toString(message)
    });
  }
  safe(message) {
    return this._addCheck({
      kind: "min",
      inclusive: true,
      value: Number.MIN_SAFE_INTEGER,
      message: errorUtil.toString(message)
    })._addCheck({
      kind: "max",
      inclusive: true,
      value: Number.MAX_SAFE_INTEGER,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
  get isInt() {
    return !!this._def.checks.find((ch) => ch.kind === "int" || ch.kind === "multipleOf" && util.isInteger(ch.value));
  }
  get isFinite() {
    let max = null;
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "finite" || ch.kind === "int" || ch.kind === "multipleOf") {
        return true;
      } else if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      } else if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return Number.isFinite(min) && Number.isFinite(max);
  }
};
ZodNumber.create = (params) => {
  return new ZodNumber({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodNumber,
    coerce: (params == null ? void 0 : params.coerce) || false,
    ...processCreateParams(params)
  });
};
var ZodBigInt = class _ZodBigInt extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
  }
  _parse(input) {
    if (this._def.coerce) {
      try {
        input.data = BigInt(input.data);
      } catch {
        return this._getInvalidInput(input);
      }
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.bigint) {
      return this._getInvalidInput(input);
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            type: "bigint",
            minimum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            type: "bigint",
            maximum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (input.data % check.value !== BigInt(0)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _getInvalidInput(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.bigint,
      received: ctx.parsedType
    });
    return INVALID;
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new _ZodBigInt({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new _ZodBigInt({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
};
ZodBigInt.create = (params) => {
  return new ZodBigInt({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodBigInt,
    coerce: (params == null ? void 0 : params.coerce) ?? false,
    ...processCreateParams(params)
  });
};
var ZodBoolean = class extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = Boolean(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.boolean) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.boolean,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodBoolean.create = (params) => {
  return new ZodBoolean({
    typeName: ZodFirstPartyTypeKind.ZodBoolean,
    coerce: (params == null ? void 0 : params.coerce) || false,
    ...processCreateParams(params)
  });
};
var ZodDate = class _ZodDate extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = new Date(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.date) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.date,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    if (Number.isNaN(input.data.getTime())) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_date
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.getTime() < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            message: check.message,
            inclusive: true,
            exact: false,
            minimum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.getTime() > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            message: check.message,
            inclusive: true,
            exact: false,
            maximum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return {
      status: status.value,
      value: new Date(input.data.getTime())
    };
  }
  _addCheck(check) {
    return new _ZodDate({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  min(minDate, message) {
    return this._addCheck({
      kind: "min",
      value: minDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  max(maxDate, message) {
    return this._addCheck({
      kind: "max",
      value: maxDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  get minDate() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min != null ? new Date(min) : null;
  }
  get maxDate() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max != null ? new Date(max) : null;
  }
};
ZodDate.create = (params) => {
  return new ZodDate({
    checks: [],
    coerce: (params == null ? void 0 : params.coerce) || false,
    typeName: ZodFirstPartyTypeKind.ZodDate,
    ...processCreateParams(params)
  });
};
var ZodSymbol = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.symbol) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.symbol,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodSymbol.create = (params) => {
  return new ZodSymbol({
    typeName: ZodFirstPartyTypeKind.ZodSymbol,
    ...processCreateParams(params)
  });
};
var ZodUndefined = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.undefined,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodUndefined.create = (params) => {
  return new ZodUndefined({
    typeName: ZodFirstPartyTypeKind.ZodUndefined,
    ...processCreateParams(params)
  });
};
var ZodNull = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.null) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.null,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodNull.create = (params) => {
  return new ZodNull({
    typeName: ZodFirstPartyTypeKind.ZodNull,
    ...processCreateParams(params)
  });
};
var ZodAny = class extends ZodType {
  constructor() {
    super(...arguments);
    this._any = true;
  }
  _parse(input) {
    return OK(input.data);
  }
};
ZodAny.create = (params) => {
  return new ZodAny({
    typeName: ZodFirstPartyTypeKind.ZodAny,
    ...processCreateParams(params)
  });
};
var ZodUnknown = class extends ZodType {
  constructor() {
    super(...arguments);
    this._unknown = true;
  }
  _parse(input) {
    return OK(input.data);
  }
};
ZodUnknown.create = (params) => {
  return new ZodUnknown({
    typeName: ZodFirstPartyTypeKind.ZodUnknown,
    ...processCreateParams(params)
  });
};
var ZodNever = class extends ZodType {
  _parse(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.never,
      received: ctx.parsedType
    });
    return INVALID;
  }
};
ZodNever.create = (params) => {
  return new ZodNever({
    typeName: ZodFirstPartyTypeKind.ZodNever,
    ...processCreateParams(params)
  });
};
var ZodVoid = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.void,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodVoid.create = (params) => {
  return new ZodVoid({
    typeName: ZodFirstPartyTypeKind.ZodVoid,
    ...processCreateParams(params)
  });
};
var ZodArray = class _ZodArray extends ZodType {
  _parse(input) {
    const { ctx, status } = this._processInputParams(input);
    const def = this._def;
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (def.exactLength !== null) {
      const tooBig = ctx.data.length > def.exactLength.value;
      const tooSmall = ctx.data.length < def.exactLength.value;
      if (tooBig || tooSmall) {
        addIssueToContext(ctx, {
          code: tooBig ? ZodIssueCode.too_big : ZodIssueCode.too_small,
          minimum: tooSmall ? def.exactLength.value : void 0,
          maximum: tooBig ? def.exactLength.value : void 0,
          type: "array",
          inclusive: true,
          exact: true,
          message: def.exactLength.message
        });
        status.dirty();
      }
    }
    if (def.minLength !== null) {
      if (ctx.data.length < def.minLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.minLength.message
        });
        status.dirty();
      }
    }
    if (def.maxLength !== null) {
      if (ctx.data.length > def.maxLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.maxLength.message
        });
        status.dirty();
      }
    }
    if (ctx.common.async) {
      return Promise.all([...ctx.data].map((item, i) => {
        return def.type._parseAsync(new ParseInputLazyPath(ctx, item, ctx.path, i));
      })).then((result2) => {
        return ParseStatus.mergeArray(status, result2);
      });
    }
    const result = [...ctx.data].map((item, i) => {
      return def.type._parseSync(new ParseInputLazyPath(ctx, item, ctx.path, i));
    });
    return ParseStatus.mergeArray(status, result);
  }
  get element() {
    return this._def.type;
  }
  min(minLength, message) {
    return new _ZodArray({
      ...this._def,
      minLength: { value: minLength, message: errorUtil.toString(message) }
    });
  }
  max(maxLength, message) {
    return new _ZodArray({
      ...this._def,
      maxLength: { value: maxLength, message: errorUtil.toString(message) }
    });
  }
  length(len, message) {
    return new _ZodArray({
      ...this._def,
      exactLength: { value: len, message: errorUtil.toString(message) }
    });
  }
  nonempty(message) {
    return this.min(1, message);
  }
};
ZodArray.create = (schema, params) => {
  return new ZodArray({
    type: schema,
    minLength: null,
    maxLength: null,
    exactLength: null,
    typeName: ZodFirstPartyTypeKind.ZodArray,
    ...processCreateParams(params)
  });
};
function deepPartialify(schema) {
  if (schema instanceof ZodObject) {
    const newShape = {};
    for (const key in schema.shape) {
      const fieldSchema = schema.shape[key];
      newShape[key] = ZodOptional.create(deepPartialify(fieldSchema));
    }
    return new ZodObject({
      ...schema._def,
      shape: () => newShape
    });
  } else if (schema instanceof ZodArray) {
    return new ZodArray({
      ...schema._def,
      type: deepPartialify(schema.element)
    });
  } else if (schema instanceof ZodOptional) {
    return ZodOptional.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodNullable) {
    return ZodNullable.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodTuple) {
    return ZodTuple.create(schema.items.map((item) => deepPartialify(item)));
  } else {
    return schema;
  }
}
var ZodObject = class _ZodObject extends ZodType {
  constructor() {
    super(...arguments);
    this._cached = null;
    this.nonstrict = this.passthrough;
    this.augment = this.extend;
  }
  _getCached() {
    if (this._cached !== null)
      return this._cached;
    const shape = this._def.shape();
    const keys = util.objectKeys(shape);
    this._cached = { shape, keys };
    return this._cached;
  }
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.object) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const { status, ctx } = this._processInputParams(input);
    const { shape, keys: shapeKeys } = this._getCached();
    const extraKeys = [];
    if (!(this._def.catchall instanceof ZodNever && this._def.unknownKeys === "strip")) {
      for (const key in ctx.data) {
        if (!shapeKeys.includes(key)) {
          extraKeys.push(key);
        }
      }
    }
    const pairs = [];
    for (const key of shapeKeys) {
      const keyValidator = shape[key];
      const value = ctx.data[key];
      pairs.push({
        key: { status: "valid", value: key },
        value: keyValidator._parse(new ParseInputLazyPath(ctx, value, ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (this._def.catchall instanceof ZodNever) {
      const unknownKeys = this._def.unknownKeys;
      if (unknownKeys === "passthrough") {
        for (const key of extraKeys) {
          pairs.push({
            key: { status: "valid", value: key },
            value: { status: "valid", value: ctx.data[key] }
          });
        }
      } else if (unknownKeys === "strict") {
        if (extraKeys.length > 0) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.unrecognized_keys,
            keys: extraKeys
          });
          status.dirty();
        }
      } else if (unknownKeys === "strip") {
      } else {
        throw new Error(`Internal ZodObject error: invalid unknownKeys value.`);
      }
    } else {
      const catchall = this._def.catchall;
      for (const key of extraKeys) {
        const value = ctx.data[key];
        pairs.push({
          key: { status: "valid", value: key },
          value: catchall._parse(
            new ParseInputLazyPath(ctx, value, ctx.path, key)
            //, ctx.child(key), value, getParsedType(value)
          ),
          alwaysSet: key in ctx.data
        });
      }
    }
    if (ctx.common.async) {
      return Promise.resolve().then(async () => {
        const syncPairs = [];
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          syncPairs.push({
            key,
            value,
            alwaysSet: pair.alwaysSet
          });
        }
        return syncPairs;
      }).then((syncPairs) => {
        return ParseStatus.mergeObjectSync(status, syncPairs);
      });
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get shape() {
    return this._def.shape();
  }
  strict(message) {
    errorUtil.errToObj;
    return new _ZodObject({
      ...this._def,
      unknownKeys: "strict",
      ...message !== void 0 ? {
        errorMap: (issue, ctx) => {
          var _a5, _b4;
          const defaultError = ((_b4 = (_a5 = this._def).errorMap) == null ? void 0 : _b4.call(_a5, issue, ctx).message) ?? ctx.defaultError;
          if (issue.code === "unrecognized_keys")
            return {
              message: errorUtil.errToObj(message).message ?? defaultError
            };
          return {
            message: defaultError
          };
        }
      } : {}
    });
  }
  strip() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "strip"
    });
  }
  passthrough() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "passthrough"
    });
  }
  // const AugmentFactory =
  //   <Def extends ZodObjectDef>(def: Def) =>
  //   <Augmentation extends ZodRawShape>(
  //     augmentation: Augmentation
  //   ): ZodObject<
  //     extendShape<ReturnType<Def["shape"]>, Augmentation>,
  //     Def["unknownKeys"],
  //     Def["catchall"]
  //   > => {
  //     return new ZodObject({
  //       ...def,
  //       shape: () => ({
  //         ...def.shape(),
  //         ...augmentation,
  //       }),
  //     }) as any;
  //   };
  extend(augmentation) {
    return new _ZodObject({
      ...this._def,
      shape: () => ({
        ...this._def.shape(),
        ...augmentation
      })
    });
  }
  /**
   * Prior to zod@1.0.12 there was a bug in the
   * inferred type of merged objects. Please
   * upgrade if you are experiencing issues.
   */
  merge(merging) {
    const merged = new _ZodObject({
      unknownKeys: merging._def.unknownKeys,
      catchall: merging._def.catchall,
      shape: () => ({
        ...this._def.shape(),
        ...merging._def.shape()
      }),
      typeName: ZodFirstPartyTypeKind.ZodObject
    });
    return merged;
  }
  // merge<
  //   Incoming extends AnyZodObject,
  //   Augmentation extends Incoming["shape"],
  //   NewOutput extends {
  //     [k in keyof Augmentation | keyof Output]: k extends keyof Augmentation
  //       ? Augmentation[k]["_output"]
  //       : k extends keyof Output
  //       ? Output[k]
  //       : never;
  //   },
  //   NewInput extends {
  //     [k in keyof Augmentation | keyof Input]: k extends keyof Augmentation
  //       ? Augmentation[k]["_input"]
  //       : k extends keyof Input
  //       ? Input[k]
  //       : never;
  //   }
  // >(
  //   merging: Incoming
  // ): ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"],
  //   NewOutput,
  //   NewInput
  // > {
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  setKey(key, schema) {
    return this.augment({ [key]: schema });
  }
  // merge<Incoming extends AnyZodObject>(
  //   merging: Incoming
  // ): //ZodObject<T & Incoming["_shape"], UnknownKeys, Catchall> = (merging) => {
  // ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"]
  // > {
  //   // const mergedShape = objectUtil.mergeShapes(
  //   //   this._def.shape(),
  //   //   merging._def.shape()
  //   // );
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  catchall(index) {
    return new _ZodObject({
      ...this._def,
      catchall: index
    });
  }
  pick(mask) {
    const shape = {};
    for (const key of util.objectKeys(mask)) {
      if (mask[key] && this.shape[key]) {
        shape[key] = this.shape[key];
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  omit(mask) {
    const shape = {};
    for (const key of util.objectKeys(this.shape)) {
      if (!mask[key]) {
        shape[key] = this.shape[key];
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  /**
   * @deprecated
   */
  deepPartial() {
    return deepPartialify(this);
  }
  partial(mask) {
    const newShape = {};
    for (const key of util.objectKeys(this.shape)) {
      const fieldSchema = this.shape[key];
      if (mask && !mask[key]) {
        newShape[key] = fieldSchema;
      } else {
        newShape[key] = fieldSchema.optional();
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  required(mask) {
    const newShape = {};
    for (const key of util.objectKeys(this.shape)) {
      if (mask && !mask[key]) {
        newShape[key] = this.shape[key];
      } else {
        const fieldSchema = this.shape[key];
        let newField = fieldSchema;
        while (newField instanceof ZodOptional) {
          newField = newField._def.innerType;
        }
        newShape[key] = newField;
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  keyof() {
    return createZodEnum(util.objectKeys(this.shape));
  }
};
ZodObject.create = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.strictCreate = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strict",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.lazycreate = (shape, params) => {
  return new ZodObject({
    shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
var ZodUnion = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const options = this._def.options;
    function handleResults(results) {
      for (const result of results) {
        if (result.result.status === "valid") {
          return result.result;
        }
      }
      for (const result of results) {
        if (result.result.status === "dirty") {
          ctx.common.issues.push(...result.ctx.common.issues);
          return result.result;
        }
      }
      const unionErrors = results.map((result) => new ZodError(result.ctx.common.issues));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return Promise.all(options.map(async (option) => {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        return {
          result: await option._parseAsync({
            data: ctx.data,
            path: ctx.path,
            parent: childCtx
          }),
          ctx: childCtx
        };
      })).then(handleResults);
    } else {
      let dirty = void 0;
      const issues = [];
      for (const option of options) {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        const result = option._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: childCtx
        });
        if (result.status === "valid") {
          return result;
        } else if (result.status === "dirty" && !dirty) {
          dirty = { result, ctx: childCtx };
        }
        if (childCtx.common.issues.length) {
          issues.push(childCtx.common.issues);
        }
      }
      if (dirty) {
        ctx.common.issues.push(...dirty.ctx.common.issues);
        return dirty.result;
      }
      const unionErrors = issues.map((issues2) => new ZodError(issues2));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
  }
  get options() {
    return this._def.options;
  }
};
ZodUnion.create = (types, params) => {
  return new ZodUnion({
    options: types,
    typeName: ZodFirstPartyTypeKind.ZodUnion,
    ...processCreateParams(params)
  });
};
var getDiscriminator = (type) => {
  if (type instanceof ZodLazy) {
    return getDiscriminator(type.schema);
  } else if (type instanceof ZodEffects) {
    return getDiscriminator(type.innerType());
  } else if (type instanceof ZodLiteral) {
    return [type.value];
  } else if (type instanceof ZodEnum) {
    return type.options;
  } else if (type instanceof ZodNativeEnum) {
    return util.objectValues(type.enum);
  } else if (type instanceof ZodDefault) {
    return getDiscriminator(type._def.innerType);
  } else if (type instanceof ZodUndefined) {
    return [void 0];
  } else if (type instanceof ZodNull) {
    return [null];
  } else if (type instanceof ZodOptional) {
    return [void 0, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodNullable) {
    return [null, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodBranded) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodReadonly) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodCatch) {
    return getDiscriminator(type._def.innerType);
  } else {
    return [];
  }
};
var ZodDiscriminatedUnion = class _ZodDiscriminatedUnion extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const discriminator = this.discriminator;
    const discriminatorValue = ctx.data[discriminator];
    const option = this.optionsMap.get(discriminatorValue);
    if (!option) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union_discriminator,
        options: Array.from(this.optionsMap.keys()),
        path: [discriminator]
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return option._parseAsync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    } else {
      return option._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    }
  }
  get discriminator() {
    return this._def.discriminator;
  }
  get options() {
    return this._def.options;
  }
  get optionsMap() {
    return this._def.optionsMap;
  }
  /**
   * The constructor of the discriminated union schema. Its behaviour is very similar to that of the normal z.union() constructor.
   * However, it only allows a union of objects, all of which need to share a discriminator property. This property must
   * have a different value for each object in the union.
   * @param discriminator the name of the discriminator property
   * @param types an array of object schemas
   * @param params
   */
  static create(discriminator, options, params) {
    const optionsMap = /* @__PURE__ */ new Map();
    for (const type of options) {
      const discriminatorValues = getDiscriminator(type.shape[discriminator]);
      if (!discriminatorValues.length) {
        throw new Error(`A discriminator value for key \`${discriminator}\` could not be extracted from all schema options`);
      }
      for (const value of discriminatorValues) {
        if (optionsMap.has(value)) {
          throw new Error(`Discriminator property ${String(discriminator)} has duplicate value ${String(value)}`);
        }
        optionsMap.set(value, type);
      }
    }
    return new _ZodDiscriminatedUnion({
      typeName: ZodFirstPartyTypeKind.ZodDiscriminatedUnion,
      discriminator,
      options,
      optionsMap,
      ...processCreateParams(params)
    });
  }
};
function mergeValues(a, b) {
  const aType = getParsedType(a);
  const bType = getParsedType(b);
  if (a === b) {
    return { valid: true, data: a };
  } else if (aType === ZodParsedType.object && bType === ZodParsedType.object) {
    const bKeys = util.objectKeys(b);
    const sharedKeys = util.objectKeys(a).filter((key) => bKeys.indexOf(key) !== -1);
    const newObj = { ...a, ...b };
    for (const key of sharedKeys) {
      const sharedValue = mergeValues(a[key], b[key]);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newObj[key] = sharedValue.data;
    }
    return { valid: true, data: newObj };
  } else if (aType === ZodParsedType.array && bType === ZodParsedType.array) {
    if (a.length !== b.length) {
      return { valid: false };
    }
    const newArray = [];
    for (let index = 0; index < a.length; index++) {
      const itemA = a[index];
      const itemB = b[index];
      const sharedValue = mergeValues(itemA, itemB);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newArray.push(sharedValue.data);
    }
    return { valid: true, data: newArray };
  } else if (aType === ZodParsedType.date && bType === ZodParsedType.date && +a === +b) {
    return { valid: true, data: a };
  } else {
    return { valid: false };
  }
}
var ZodIntersection = class extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const handleParsed = (parsedLeft, parsedRight) => {
      if (isAborted(parsedLeft) || isAborted(parsedRight)) {
        return INVALID;
      }
      const merged = mergeValues(parsedLeft.value, parsedRight.value);
      if (!merged.valid) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_intersection_types
        });
        return INVALID;
      }
      if (isDirty(parsedLeft) || isDirty(parsedRight)) {
        status.dirty();
      }
      return { status: status.value, value: merged.data };
    };
    if (ctx.common.async) {
      return Promise.all([
        this._def.left._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        }),
        this._def.right._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        })
      ]).then(([left, right]) => handleParsed(left, right));
    } else {
      return handleParsed(this._def.left._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }), this._def.right._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }));
    }
  }
};
ZodIntersection.create = (left, right, params) => {
  return new ZodIntersection({
    left,
    right,
    typeName: ZodFirstPartyTypeKind.ZodIntersection,
    ...processCreateParams(params)
  });
};
var ZodTuple = class _ZodTuple extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (ctx.data.length < this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_small,
        minimum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      return INVALID;
    }
    const rest = this._def.rest;
    if (!rest && ctx.data.length > this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_big,
        maximum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      status.dirty();
    }
    const items = [...ctx.data].map((item, itemIndex) => {
      const schema = this._def.items[itemIndex] || this._def.rest;
      if (!schema)
        return null;
      return schema._parse(new ParseInputLazyPath(ctx, item, ctx.path, itemIndex));
    }).filter((x) => !!x);
    if (ctx.common.async) {
      return Promise.all(items).then((results) => {
        return ParseStatus.mergeArray(status, results);
      });
    } else {
      return ParseStatus.mergeArray(status, items);
    }
  }
  get items() {
    return this._def.items;
  }
  rest(rest) {
    return new _ZodTuple({
      ...this._def,
      rest
    });
  }
};
ZodTuple.create = (schemas, params) => {
  if (!Array.isArray(schemas)) {
    throw new Error("You must pass an array of schemas to z.tuple([ ... ])");
  }
  return new ZodTuple({
    items: schemas,
    typeName: ZodFirstPartyTypeKind.ZodTuple,
    rest: null,
    ...processCreateParams(params)
  });
};
var ZodRecord = class _ZodRecord extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const pairs = [];
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    for (const key in ctx.data) {
      pairs.push({
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, key)),
        value: valueType._parse(new ParseInputLazyPath(ctx, ctx.data[key], ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (ctx.common.async) {
      return ParseStatus.mergeObjectAsync(status, pairs);
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get element() {
    return this._def.valueType;
  }
  static create(first, second, third) {
    if (second instanceof ZodType) {
      return new _ZodRecord({
        keyType: first,
        valueType: second,
        typeName: ZodFirstPartyTypeKind.ZodRecord,
        ...processCreateParams(third)
      });
    }
    return new _ZodRecord({
      keyType: ZodString.create(),
      valueType: first,
      typeName: ZodFirstPartyTypeKind.ZodRecord,
      ...processCreateParams(second)
    });
  }
};
var ZodMap = class extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.map) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.map,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    const pairs = [...ctx.data.entries()].map(([key, value], index) => {
      return {
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, [index, "key"])),
        value: valueType._parse(new ParseInputLazyPath(ctx, value, ctx.path, [index, "value"]))
      };
    });
    if (ctx.common.async) {
      const finalMap = /* @__PURE__ */ new Map();
      return Promise.resolve().then(async () => {
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          if (key.status === "aborted" || value.status === "aborted") {
            return INVALID;
          }
          if (key.status === "dirty" || value.status === "dirty") {
            status.dirty();
          }
          finalMap.set(key.value, value.value);
        }
        return { status: status.value, value: finalMap };
      });
    } else {
      const finalMap = /* @__PURE__ */ new Map();
      for (const pair of pairs) {
        const key = pair.key;
        const value = pair.value;
        if (key.status === "aborted" || value.status === "aborted") {
          return INVALID;
        }
        if (key.status === "dirty" || value.status === "dirty") {
          status.dirty();
        }
        finalMap.set(key.value, value.value);
      }
      return { status: status.value, value: finalMap };
    }
  }
};
ZodMap.create = (keyType, valueType, params) => {
  return new ZodMap({
    valueType,
    keyType,
    typeName: ZodFirstPartyTypeKind.ZodMap,
    ...processCreateParams(params)
  });
};
var ZodSet = class _ZodSet extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.set) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.set,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const def = this._def;
    if (def.minSize !== null) {
      if (ctx.data.size < def.minSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.minSize.message
        });
        status.dirty();
      }
    }
    if (def.maxSize !== null) {
      if (ctx.data.size > def.maxSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.maxSize.message
        });
        status.dirty();
      }
    }
    const valueType = this._def.valueType;
    function finalizeSet(elements2) {
      const parsedSet = /* @__PURE__ */ new Set();
      for (const element of elements2) {
        if (element.status === "aborted")
          return INVALID;
        if (element.status === "dirty")
          status.dirty();
        parsedSet.add(element.value);
      }
      return { status: status.value, value: parsedSet };
    }
    const elements = [...ctx.data.values()].map((item, i) => valueType._parse(new ParseInputLazyPath(ctx, item, ctx.path, i)));
    if (ctx.common.async) {
      return Promise.all(elements).then((elements2) => finalizeSet(elements2));
    } else {
      return finalizeSet(elements);
    }
  }
  min(minSize, message) {
    return new _ZodSet({
      ...this._def,
      minSize: { value: minSize, message: errorUtil.toString(message) }
    });
  }
  max(maxSize, message) {
    return new _ZodSet({
      ...this._def,
      maxSize: { value: maxSize, message: errorUtil.toString(message) }
    });
  }
  size(size, message) {
    return this.min(size, message).max(size, message);
  }
  nonempty(message) {
    return this.min(1, message);
  }
};
ZodSet.create = (valueType, params) => {
  return new ZodSet({
    valueType,
    minSize: null,
    maxSize: null,
    typeName: ZodFirstPartyTypeKind.ZodSet,
    ...processCreateParams(params)
  });
};
var ZodFunction = class _ZodFunction extends ZodType {
  constructor() {
    super(...arguments);
    this.validate = this.implement;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.function) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.function,
        received: ctx.parsedType
      });
      return INVALID;
    }
    function makeArgsIssue(args, error) {
      return makeIssue({
        data: args,
        path: ctx.path,
        errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_arguments,
          argumentsError: error
        }
      });
    }
    function makeReturnsIssue(returns, error) {
      return makeIssue({
        data: returns,
        path: ctx.path,
        errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_return_type,
          returnTypeError: error
        }
      });
    }
    const params = { errorMap: ctx.common.contextualErrorMap };
    const fn = ctx.data;
    if (this._def.returns instanceof ZodPromise) {
      const me = this;
      return OK(async function(...args) {
        const error = new ZodError([]);
        const parsedArgs = await me._def.args.parseAsync(args, params).catch((e) => {
          error.addIssue(makeArgsIssue(args, e));
          throw error;
        });
        const result = await Reflect.apply(fn, this, parsedArgs);
        const parsedReturns = await me._def.returns._def.type.parseAsync(result, params).catch((e) => {
          error.addIssue(makeReturnsIssue(result, e));
          throw error;
        });
        return parsedReturns;
      });
    } else {
      const me = this;
      return OK(function(...args) {
        const parsedArgs = me._def.args.safeParse(args, params);
        if (!parsedArgs.success) {
          throw new ZodError([makeArgsIssue(args, parsedArgs.error)]);
        }
        const result = Reflect.apply(fn, this, parsedArgs.data);
        const parsedReturns = me._def.returns.safeParse(result, params);
        if (!parsedReturns.success) {
          throw new ZodError([makeReturnsIssue(result, parsedReturns.error)]);
        }
        return parsedReturns.data;
      });
    }
  }
  parameters() {
    return this._def.args;
  }
  returnType() {
    return this._def.returns;
  }
  args(...items) {
    return new _ZodFunction({
      ...this._def,
      args: ZodTuple.create(items).rest(ZodUnknown.create())
    });
  }
  returns(returnType) {
    return new _ZodFunction({
      ...this._def,
      returns: returnType
    });
  }
  implement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  strictImplement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  static create(args, returns, params) {
    return new _ZodFunction({
      args: args ? args : ZodTuple.create([]).rest(ZodUnknown.create()),
      returns: returns || ZodUnknown.create(),
      typeName: ZodFirstPartyTypeKind.ZodFunction,
      ...processCreateParams(params)
    });
  }
};
var ZodLazy = class extends ZodType {
  get schema() {
    return this._def.getter();
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const lazySchema = this._def.getter();
    return lazySchema._parse({ data: ctx.data, path: ctx.path, parent: ctx });
  }
};
ZodLazy.create = (getter, params) => {
  return new ZodLazy({
    getter,
    typeName: ZodFirstPartyTypeKind.ZodLazy,
    ...processCreateParams(params)
  });
};
var ZodLiteral = class extends ZodType {
  _parse(input) {
    if (input.data !== this._def.value) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_literal,
        expected: this._def.value
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
  get value() {
    return this._def.value;
  }
};
ZodLiteral.create = (value, params) => {
  return new ZodLiteral({
    value,
    typeName: ZodFirstPartyTypeKind.ZodLiteral,
    ...processCreateParams(params)
  });
};
function createZodEnum(values, params) {
  return new ZodEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodEnum,
    ...processCreateParams(params)
  });
}
var ZodEnum = class _ZodEnum extends ZodType {
  _parse(input) {
    if (typeof input.data !== "string") {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!this._cache) {
      this._cache = new Set(this._def.values);
    }
    if (!this._cache.has(input.data)) {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get options() {
    return this._def.values;
  }
  get enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Values() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  extract(values, newDef = this._def) {
    return _ZodEnum.create(values, {
      ...this._def,
      ...newDef
    });
  }
  exclude(values, newDef = this._def) {
    return _ZodEnum.create(this.options.filter((opt) => !values.includes(opt)), {
      ...this._def,
      ...newDef
    });
  }
};
ZodEnum.create = createZodEnum;
var ZodNativeEnum = class extends ZodType {
  _parse(input) {
    const nativeEnumValues = util.getValidEnumValues(this._def.values);
    const ctx = this._getOrReturnCtx(input);
    if (ctx.parsedType !== ZodParsedType.string && ctx.parsedType !== ZodParsedType.number) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!this._cache) {
      this._cache = new Set(util.getValidEnumValues(this._def.values));
    }
    if (!this._cache.has(input.data)) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get enum() {
    return this._def.values;
  }
};
ZodNativeEnum.create = (values, params) => {
  return new ZodNativeEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodNativeEnum,
    ...processCreateParams(params)
  });
};
var ZodPromise = class extends ZodType {
  unwrap() {
    return this._def.type;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.promise && ctx.common.async === false) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.promise,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const promisified = ctx.parsedType === ZodParsedType.promise ? ctx.data : Promise.resolve(ctx.data);
    return OK(promisified.then((data) => {
      return this._def.type.parseAsync(data, {
        path: ctx.path,
        errorMap: ctx.common.contextualErrorMap
      });
    }));
  }
};
ZodPromise.create = (schema, params) => {
  return new ZodPromise({
    type: schema,
    typeName: ZodFirstPartyTypeKind.ZodPromise,
    ...processCreateParams(params)
  });
};
var ZodEffects = class extends ZodType {
  innerType() {
    return this._def.schema;
  }
  sourceType() {
    return this._def.schema._def.typeName === ZodFirstPartyTypeKind.ZodEffects ? this._def.schema.sourceType() : this._def.schema;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const effect = this._def.effect || null;
    const checkCtx = {
      addIssue: (arg) => {
        addIssueToContext(ctx, arg);
        if (arg.fatal) {
          status.abort();
        } else {
          status.dirty();
        }
      },
      get path() {
        return ctx.path;
      }
    };
    checkCtx.addIssue = checkCtx.addIssue.bind(checkCtx);
    if (effect.type === "preprocess") {
      const processed = effect.transform(ctx.data, checkCtx);
      if (ctx.common.async) {
        return Promise.resolve(processed).then(async (processed2) => {
          if (status.value === "aborted")
            return INVALID;
          const result = await this._def.schema._parseAsync({
            data: processed2,
            path: ctx.path,
            parent: ctx
          });
          if (result.status === "aborted")
            return INVALID;
          if (result.status === "dirty")
            return DIRTY(result.value);
          if (status.value === "dirty")
            return DIRTY(result.value);
          return result;
        });
      } else {
        if (status.value === "aborted")
          return INVALID;
        const result = this._def.schema._parseSync({
          data: processed,
          path: ctx.path,
          parent: ctx
        });
        if (result.status === "aborted")
          return INVALID;
        if (result.status === "dirty")
          return DIRTY(result.value);
        if (status.value === "dirty")
          return DIRTY(result.value);
        return result;
      }
    }
    if (effect.type === "refinement") {
      const executeRefinement = (acc) => {
        const result = effect.refinement(acc, checkCtx);
        if (ctx.common.async) {
          return Promise.resolve(result);
        }
        if (result instanceof Promise) {
          throw new Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");
        }
        return acc;
      };
      if (ctx.common.async === false) {
        const inner = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inner.status === "aborted")
          return INVALID;
        if (inner.status === "dirty")
          status.dirty();
        executeRefinement(inner.value);
        return { status: status.value, value: inner.value };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((inner) => {
          if (inner.status === "aborted")
            return INVALID;
          if (inner.status === "dirty")
            status.dirty();
          return executeRefinement(inner.value).then(() => {
            return { status: status.value, value: inner.value };
          });
        });
      }
    }
    if (effect.type === "transform") {
      if (ctx.common.async === false) {
        const base = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (!isValid(base))
          return INVALID;
        const result = effect.transform(base.value, checkCtx);
        if (result instanceof Promise) {
          throw new Error(`Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.`);
        }
        return { status: status.value, value: result };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((base) => {
          if (!isValid(base))
            return INVALID;
          return Promise.resolve(effect.transform(base.value, checkCtx)).then((result) => ({
            status: status.value,
            value: result
          }));
        });
      }
    }
    util.assertNever(effect);
  }
};
ZodEffects.create = (schema, effect, params) => {
  return new ZodEffects({
    schema,
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    effect,
    ...processCreateParams(params)
  });
};
ZodEffects.createWithPreprocess = (preprocess, schema, params) => {
  return new ZodEffects({
    schema,
    effect: { type: "preprocess", transform: preprocess },
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    ...processCreateParams(params)
  });
};
var ZodOptional = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.undefined) {
      return OK(void 0);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodOptional.create = (type, params) => {
  return new ZodOptional({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodOptional,
    ...processCreateParams(params)
  });
};
var ZodNullable = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.null) {
      return OK(null);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodNullable.create = (type, params) => {
  return new ZodNullable({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodNullable,
    ...processCreateParams(params)
  });
};
var ZodDefault = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    let data = ctx.data;
    if (ctx.parsedType === ZodParsedType.undefined) {
      data = this._def.defaultValue();
    }
    return this._def.innerType._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  removeDefault() {
    return this._def.innerType;
  }
};
ZodDefault.create = (type, params) => {
  return new ZodDefault({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodDefault,
    defaultValue: typeof params.default === "function" ? params.default : () => params.default,
    ...processCreateParams(params)
  });
};
var ZodCatch = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const newCtx = {
      ...ctx,
      common: {
        ...ctx.common,
        issues: []
      }
    };
    const result = this._def.innerType._parse({
      data: newCtx.data,
      path: newCtx.path,
      parent: {
        ...newCtx
      }
    });
    if (isAsync(result)) {
      return result.then((result2) => {
        return {
          status: "valid",
          value: result2.status === "valid" ? result2.value : this._def.catchValue({
            get error() {
              return new ZodError(newCtx.common.issues);
            },
            input: newCtx.data
          })
        };
      });
    } else {
      return {
        status: "valid",
        value: result.status === "valid" ? result.value : this._def.catchValue({
          get error() {
            return new ZodError(newCtx.common.issues);
          },
          input: newCtx.data
        })
      };
    }
  }
  removeCatch() {
    return this._def.innerType;
  }
};
ZodCatch.create = (type, params) => {
  return new ZodCatch({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodCatch,
    catchValue: typeof params.catch === "function" ? params.catch : () => params.catch,
    ...processCreateParams(params)
  });
};
var ZodNaN = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.nan) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.nan,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
};
ZodNaN.create = (params) => {
  return new ZodNaN({
    typeName: ZodFirstPartyTypeKind.ZodNaN,
    ...processCreateParams(params)
  });
};
var BRAND = Symbol("zod_brand");
var ZodBranded = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const data = ctx.data;
    return this._def.type._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  unwrap() {
    return this._def.type;
  }
};
var ZodPipeline = class _ZodPipeline extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.common.async) {
      const handleAsync = async () => {
        const inResult = await this._def.in._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inResult.status === "aborted")
          return INVALID;
        if (inResult.status === "dirty") {
          status.dirty();
          return DIRTY(inResult.value);
        } else {
          return this._def.out._parseAsync({
            data: inResult.value,
            path: ctx.path,
            parent: ctx
          });
        }
      };
      return handleAsync();
    } else {
      const inResult = this._def.in._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
      if (inResult.status === "aborted")
        return INVALID;
      if (inResult.status === "dirty") {
        status.dirty();
        return {
          status: "dirty",
          value: inResult.value
        };
      } else {
        return this._def.out._parseSync({
          data: inResult.value,
          path: ctx.path,
          parent: ctx
        });
      }
    }
  }
  static create(a, b) {
    return new _ZodPipeline({
      in: a,
      out: b,
      typeName: ZodFirstPartyTypeKind.ZodPipeline
    });
  }
};
var ZodReadonly = class extends ZodType {
  _parse(input) {
    const result = this._def.innerType._parse(input);
    const freeze = (data) => {
      if (isValid(data)) {
        data.value = Object.freeze(data.value);
      }
      return data;
    };
    return isAsync(result) ? result.then((data) => freeze(data)) : freeze(result);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodReadonly.create = (type, params) => {
  return new ZodReadonly({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodReadonly,
    ...processCreateParams(params)
  });
};
function cleanParams(params, data) {
  const p = typeof params === "function" ? params(data) : typeof params === "string" ? { message: params } : params;
  const p2 = typeof p === "string" ? { message: p } : p;
  return p2;
}
function custom(check, _params = {}, fatal) {
  if (check)
    return ZodAny.create().superRefine((data, ctx) => {
      const r = check(data);
      if (r instanceof Promise) {
        return r.then((r2) => {
          if (!r2) {
            const params = cleanParams(_params, data);
            const _fatal = params.fatal ?? fatal ?? true;
            ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
          }
        });
      }
      if (!r) {
        const params = cleanParams(_params, data);
        const _fatal = params.fatal ?? fatal ?? true;
        ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
      }
      return;
    });
  return ZodAny.create();
}
var late = {
  object: ZodObject.lazycreate
};
var ZodFirstPartyTypeKind;
(function(ZodFirstPartyTypeKind2) {
  ZodFirstPartyTypeKind2["ZodString"] = "ZodString";
  ZodFirstPartyTypeKind2["ZodNumber"] = "ZodNumber";
  ZodFirstPartyTypeKind2["ZodNaN"] = "ZodNaN";
  ZodFirstPartyTypeKind2["ZodBigInt"] = "ZodBigInt";
  ZodFirstPartyTypeKind2["ZodBoolean"] = "ZodBoolean";
  ZodFirstPartyTypeKind2["ZodDate"] = "ZodDate";
  ZodFirstPartyTypeKind2["ZodSymbol"] = "ZodSymbol";
  ZodFirstPartyTypeKind2["ZodUndefined"] = "ZodUndefined";
  ZodFirstPartyTypeKind2["ZodNull"] = "ZodNull";
  ZodFirstPartyTypeKind2["ZodAny"] = "ZodAny";
  ZodFirstPartyTypeKind2["ZodUnknown"] = "ZodUnknown";
  ZodFirstPartyTypeKind2["ZodNever"] = "ZodNever";
  ZodFirstPartyTypeKind2["ZodVoid"] = "ZodVoid";
  ZodFirstPartyTypeKind2["ZodArray"] = "ZodArray";
  ZodFirstPartyTypeKind2["ZodObject"] = "ZodObject";
  ZodFirstPartyTypeKind2["ZodUnion"] = "ZodUnion";
  ZodFirstPartyTypeKind2["ZodDiscriminatedUnion"] = "ZodDiscriminatedUnion";
  ZodFirstPartyTypeKind2["ZodIntersection"] = "ZodIntersection";
  ZodFirstPartyTypeKind2["ZodTuple"] = "ZodTuple";
  ZodFirstPartyTypeKind2["ZodRecord"] = "ZodRecord";
  ZodFirstPartyTypeKind2["ZodMap"] = "ZodMap";
  ZodFirstPartyTypeKind2["ZodSet"] = "ZodSet";
  ZodFirstPartyTypeKind2["ZodFunction"] = "ZodFunction";
  ZodFirstPartyTypeKind2["ZodLazy"] = "ZodLazy";
  ZodFirstPartyTypeKind2["ZodLiteral"] = "ZodLiteral";
  ZodFirstPartyTypeKind2["ZodEnum"] = "ZodEnum";
  ZodFirstPartyTypeKind2["ZodEffects"] = "ZodEffects";
  ZodFirstPartyTypeKind2["ZodNativeEnum"] = "ZodNativeEnum";
  ZodFirstPartyTypeKind2["ZodOptional"] = "ZodOptional";
  ZodFirstPartyTypeKind2["ZodNullable"] = "ZodNullable";
  ZodFirstPartyTypeKind2["ZodDefault"] = "ZodDefault";
  ZodFirstPartyTypeKind2["ZodCatch"] = "ZodCatch";
  ZodFirstPartyTypeKind2["ZodPromise"] = "ZodPromise";
  ZodFirstPartyTypeKind2["ZodBranded"] = "ZodBranded";
  ZodFirstPartyTypeKind2["ZodPipeline"] = "ZodPipeline";
  ZodFirstPartyTypeKind2["ZodReadonly"] = "ZodReadonly";
})(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}));
var instanceOfType = (cls, params = {
  message: `Input not instance of ${cls.name}`
}) => custom((data) => data instanceof cls, params);
var stringType = ZodString.create;
var numberType = ZodNumber.create;
var nanType = ZodNaN.create;
var bigIntType = ZodBigInt.create;
var booleanType = ZodBoolean.create;
var dateType = ZodDate.create;
var symbolType = ZodSymbol.create;
var undefinedType = ZodUndefined.create;
var nullType = ZodNull.create;
var anyType = ZodAny.create;
var unknownType = ZodUnknown.create;
var neverType = ZodNever.create;
var voidType = ZodVoid.create;
var arrayType = ZodArray.create;
var objectType = ZodObject.create;
var strictObjectType = ZodObject.strictCreate;
var unionType = ZodUnion.create;
var discriminatedUnionType = ZodDiscriminatedUnion.create;
var intersectionType = ZodIntersection.create;
var tupleType = ZodTuple.create;
var recordType = ZodRecord.create;
var mapType = ZodMap.create;
var setType = ZodSet.create;
var functionType = ZodFunction.create;
var lazyType = ZodLazy.create;
var literalType = ZodLiteral.create;
var enumType = ZodEnum.create;
var nativeEnumType = ZodNativeEnum.create;
var promiseType = ZodPromise.create;
var effectsType = ZodEffects.create;
var optionalType = ZodOptional.create;
var nullableType = ZodNullable.create;
var preprocessType = ZodEffects.createWithPreprocess;
var pipelineType = ZodPipeline.create;
var ostring = () => stringType().optional();
var onumber = () => numberType().optional();
var oboolean = () => booleanType().optional();
var coerce = {
  string: (arg) => ZodString.create({ ...arg, coerce: true }),
  number: (arg) => ZodNumber.create({ ...arg, coerce: true }),
  boolean: (arg) => ZodBoolean.create({
    ...arg,
    coerce: true
  }),
  bigint: (arg) => ZodBigInt.create({ ...arg, coerce: true }),
  date: (arg) => ZodDate.create({ ...arg, coerce: true })
};
var NEVER = INVALID;

// node_modules/zod/v3/index.js
var v3_default = external_exports;

// node_modules/@jsr/nostrify__nostrify/NSchema.js
var NSchema = class _NSchema {
  /** Schema to validate Nostr hex IDs such as event IDs and pubkeys. */
  static id() {
    return v3_exports.string().regex(/^[0-9a-f]{64}$/);
  }
  /** Nostr event schema. */
  static event() {
    return v3_exports.object({
      id: _NSchema.id(),
      kind: v3_exports.number().int().nonnegative(),
      pubkey: _NSchema.id(),
      tags: v3_exports.string().array().array(),
      content: v3_exports.string(),
      created_at: v3_exports.number().int().nonnegative(),
      sig: v3_exports.string()
    });
  }
  /** Nostr filter schema. */
  static filter() {
    return v3_exports.object({
      kinds: v3_exports.number().int().nonnegative().array().optional(),
      ids: _NSchema.id().array().optional(),
      authors: _NSchema.id().array().optional(),
      since: v3_exports.number().int().nonnegative().optional(),
      until: v3_exports.number().int().nonnegative().optional(),
      limit: v3_exports.number().int().nonnegative().optional(),
      search: v3_exports.string().optional()
    }).passthrough().transform((value) => {
      const keys = [
        "kinds",
        "ids",
        "authors",
        "since",
        "until",
        "limit",
        "search"
      ];
      return Object.entries(value).reduce((acc, [key, val]) => {
        if (keys.includes(key) || key.startsWith("#")) {
          acc[key] = val;
        }
        return acc;
      }, {});
    });
  }
  /**
   * Bech32 string.
   * @see https://github.com/bitcoin/bips/blob/master/bip-0173.mediawiki#bech32
   */
  static bech32(prefix) {
    return v3_exports.string().regex(/^[\x21-\x7E]{1,83}1[023456789acdefghjklmnpqrstuvwxyz]{6,}$/).refine((value) => prefix ? value.startsWith(`${prefix}1`) : true);
  }
  /** WebSocket URL starting with `ws://` or `wss://`. */
  static relayUrl() {
    return v3_exports.string().url().regex(/^wss?:\/\//);
  }
  /** NIP-01 `EVENT` message from client to relay. */
  static clientEVENT() {
    return v3_exports.tuple([
      v3_exports.literal("EVENT"),
      _NSchema.event()
    ]);
  }
  /** NIP-01 `REQ` message from client to relay. */
  static clientREQ() {
    return v3_exports.tuple([
      v3_exports.literal("REQ"),
      v3_exports.string()
    ]).rest(_NSchema.filter());
  }
  /** NIP-45 `COUNT` message from client to relay. */
  static clientCOUNT() {
    return v3_exports.tuple([
      v3_exports.literal("COUNT"),
      v3_exports.string()
    ]).rest(_NSchema.filter());
  }
  /** NIP-01 `CLOSE` message from client to relay. */
  static clientCLOSE() {
    return v3_exports.tuple([
      v3_exports.literal("CLOSE"),
      v3_exports.string()
    ]);
  }
  /** NIP-42 `AUTH` message from client to relay. */
  static clientAUTH() {
    return v3_exports.tuple([
      v3_exports.literal("AUTH"),
      _NSchema.event()
    ]);
  }
  /** NIP-01 message from client to relay. */
  static clientMsg() {
    return v3_exports.union([
      _NSchema.clientEVENT(),
      _NSchema.clientREQ(),
      _NSchema.clientCOUNT(),
      _NSchema.clientCLOSE(),
      _NSchema.clientAUTH()
    ]);
  }
  /** NIP-01 `EVENT` message from relay to client. */
  static relayEVENT() {
    return v3_exports.tuple([
      v3_exports.literal("EVENT"),
      v3_exports.string(),
      _NSchema.event()
    ]);
  }
  /** NIP-01 `OK` message from relay to client. */
  static relayOK() {
    return v3_exports.tuple([
      v3_exports.literal("OK"),
      _NSchema.id(),
      v3_exports.boolean(),
      v3_exports.string()
    ]);
  }
  /** NIP-01 `EOSE` message from relay to client. */
  static relayEOSE() {
    return v3_exports.tuple([
      v3_exports.literal("EOSE"),
      v3_exports.string()
    ]);
  }
  /** NIP-01 `NOTICE` message from relay to client. */
  static relayNOTICE() {
    return v3_exports.tuple([
      v3_exports.literal("NOTICE"),
      v3_exports.string()
    ]);
  }
  /** NIP-01 `CLOSED` message from relay to client. */
  static relayCLOSED() {
    return v3_exports.tuple([
      v3_exports.literal("CLOSED"),
      v3_exports.string(),
      v3_exports.string()
    ]);
  }
  /** NIP-42 `AUTH` message from relay to client. */
  static relayAUTH() {
    return v3_exports.tuple([
      v3_exports.literal("AUTH"),
      v3_exports.string()
    ]);
  }
  /** NIP-45 `COUNT` message from relay to client. */
  static relayCOUNT() {
    return v3_exports.tuple([
      v3_exports.literal("COUNT"),
      v3_exports.string(),
      v3_exports.object({
        count: v3_exports.number().int().nonnegative(),
        approximate: v3_exports.boolean().optional()
      })
    ]);
  }
  /** NIP-01 message from relay to client. */
  static relayMsg() {
    return v3_exports.union([
      _NSchema.relayEVENT(),
      _NSchema.relayOK(),
      _NSchema.relayEOSE(),
      _NSchema.relayNOTICE(),
      _NSchema.relayCLOSED(),
      _NSchema.relayAUTH(),
      _NSchema.relayCOUNT()
    ]);
  }
  /** Kind 0 content schema. */
  static metadata() {
    return v3_exports.object({
      about: v3_exports.string().optional().catch(void 0),
      banner: v3_exports.string().url().optional().catch(void 0),
      bot: v3_exports.boolean().optional().catch(void 0),
      display_name: v3_exports.string().optional().catch(void 0),
      lud06: _NSchema.bech32("lnurl").optional().catch(void 0),
      lud16: v3_exports.string().email().optional().catch(void 0),
      name: v3_exports.string().optional().catch(void 0),
      nip05: v3_exports.string().email().optional().catch(void 0),
      picture: v3_exports.string().url().optional().catch(void 0),
      website: v3_exports.string().url().optional().catch(void 0)
    }).passthrough();
  }
  /** NIP-46 request content schema. */
  static connectRequest() {
    return v3_exports.object({
      id: v3_exports.string(),
      method: v3_exports.string(),
      params: v3_exports.string().array()
    });
  }
  /** NIP-46 response content schema. */
  static connectResponse() {
    return v3_exports.object({
      id: v3_exports.string(),
      result: v3_exports.string(),
      error: v3_exports.string().optional()
    });
  }
  /**
   * Helper schema to parse a JSON string. It should then be piped into another schema. For example:
   *
   * ```ts
   * const event = NSchema.json().pipe(NSchema.event()).parse(data);
   * ```
   */
  static json() {
    return v3_exports.string().transform((value, ctx) => {
      try {
        return JSON.parse(value);
      } catch (_e) {
        ctx.addIssue({
          code: v3_exports.ZodIssueCode.custom,
          message: "Invalid JSON"
        });
        return v3_exports.NEVER;
      }
    });
  }
};

// node_modules/@jsr/nostrify__nostrify/NConnectSigner.js
var NConnectSigner = class {
  constructor({ relay, pubkey, signer, timeout, encryption = "nip44" }) {
    __publicField(this, "relay");
    __publicField(this, "pubkey");
    __publicField(this, "signer");
    __publicField(this, "timeout");
    __publicField(this, "encryption");
    __publicField(this, "nip04", {
      encrypt: async (pubkey, plaintext) => {
        return this.cmd("nip04_encrypt", [
          pubkey,
          plaintext
        ]);
      },
      decrypt: async (pubkey, ciphertext) => {
        return this.cmd("nip04_decrypt", [
          pubkey,
          ciphertext
        ]);
      }
    });
    __publicField(this, "nip44", {
      encrypt: async (pubkey, plaintext) => {
        return this.cmd("nip44_encrypt", [
          pubkey,
          plaintext
        ]);
      },
      decrypt: async (pubkey, ciphertext) => {
        return this.cmd("nip44_decrypt", [
          pubkey,
          ciphertext
        ]);
      }
    });
    this.relay = relay;
    this.pubkey = pubkey;
    this.signer = signer;
    this.timeout = timeout;
    this.encryption = encryption;
  }
  async getPublicKey() {
    return this.cmd("get_public_key", []);
  }
  async signEvent(event) {
    const result = await this.cmd("sign_event", [
      JSON.stringify(event)
    ]);
    return NSchema.json().pipe(NSchema.event()).parse(result);
  }
  async getRelays() {
    const result = await this.cmd("get_relays", []);
    return NSchema.json().pipe(v3_exports.record(v3_exports.string(), v3_exports.object({
      read: v3_exports.boolean(),
      write: v3_exports.boolean()
    }))).parse(result);
  }
  /** Send a `connect` command to the relay. It should respond with `ack`. */
  async connect(secret) {
    const params = [
      this.pubkey
    ];
    if (secret) {
      params.push(secret);
    }
    return this.cmd("connect", params);
  }
  /** Send a `ping` command to the signer. It should respond with `pong`. */
  async ping() {
    return this.cmd("ping", []);
  }
  /** High-level RPC method. Returns the string result, or throws on error. */
  async cmd(method, params) {
    const signal = typeof this.timeout === "number" ? AbortSignal.timeout(this.timeout) : void 0;
    const { result, error } = await this.send({
      id: crypto.randomUUID(),
      method,
      params
    }, {
      signal
    });
    if (error) {
      throw new Error(error);
    }
    return result;
  }
  /** Low-level send method. Deals directly with connect request/response. */
  async send(request, opts = {}) {
    const { signal } = opts;
    const event = await this.signer.signEvent({
      kind: 24133,
      content: await this.encrypt(this.pubkey, JSON.stringify(request)),
      created_at: Math.floor(Date.now() / 1e3),
      tags: [
        [
          "p",
          this.pubkey
        ]
      ]
    });
    const local = await this.signer.getPublicKey();
    const req = this.relay.req([
      {
        kinds: [
          24133
        ],
        authors: [
          this.pubkey
        ],
        "#p": [
          local
        ]
      }
    ], {
      signal
    });
    const promise = new Promise((resolve, reject) => {
      (async () => {
        try {
          for await (const msg of req) {
            if (msg[0] === "CLOSED") throw new Error("Subscription closed");
            if (msg[0] === "EVENT") {
              const event2 = msg[2];
              const decrypted = await this.decrypt(this.pubkey, event2.content);
              const response = NSchema.json().pipe(NSchema.connectResponse()).parse(decrypted);
              if (response.id === request.id) {
                resolve(response);
                return;
              }
            }
          }
        } catch (error) {
          reject(error);
        }
      })();
    });
    await this.relay.event(event, {
      signal
    });
    return promise;
  }
  /** Local encrypt depending on settings. */
  async encrypt(pubkey, plaintext) {
    switch (this.encryption) {
      case "nip04":
        return this.signer.nip04.encrypt(pubkey, plaintext);
      case "nip44":
        return this.signer.nip44.encrypt(pubkey, plaintext);
    }
  }
  /** Local decrypt depending on settings. */
  async decrypt(pubkey, ciphertext) {
    switch (this.encryption) {
      case "nip04":
        return this.signer.nip04.decrypt(pubkey, ciphertext);
      case "nip44":
        return this.signer.nip44.decrypt(pubkey, ciphertext);
    }
  }
};

// node_modules/@jsr/std__encoding/_validate_binary_like.js
var encoder = new TextEncoder();

// node_modules/@jsr/std__encoding/hex.js
var hexTable = new TextEncoder().encode("0123456789abcdef");
var textEncoder = new TextEncoder();
var textDecoder = new TextDecoder();

// node_modules/@jsr/nostrify__nostrify/utils/CircularSet.js
var _computedKey3;
_computedKey3 = Symbol.iterator;
var CircularSet = class {
  constructor(capacity) {
    __publicField(this, "capacity");
    __publicField(this, "set");
    this.capacity = capacity;
    this.set = /* @__PURE__ */ new Set();
  }
  add(item) {
    if (this.set.has(item)) {
      return;
    }
    if (this.set.size >= this.capacity) {
      const oldest = this.set.values().next().value;
      if (oldest) {
        this.set.delete(oldest);
      }
    }
    this.set.add(item);
  }
  has(item) {
    return this.set.has(item);
  }
  [_computedKey3]() {
    return this.set.values();
  }
};

// node_modules/@jsr/nostrify__nostrify/utils/Machina.js
var _computedKey4;
_computedKey4 = Symbol.asyncIterator;
var _queue, _resolve, _aborted;
var Machina = class {
  constructor(signal) {
    __privateAdd(this, _queue, []);
    __privateAdd(this, _resolve);
    __privateAdd(this, _aborted, false);
    if (signal == null ? void 0 : signal.aborted) {
      this.abort();
    } else {
      signal == null ? void 0 : signal.addEventListener("abort", () => this.abort(), {
        once: true
      });
    }
  }
  /** Get messages as an AsyncIterable. */
  async *[_computedKey4]() {
    while (!__privateGet(this, _aborted)) {
      if (__privateGet(this, _queue).length) {
        yield __privateGet(this, _queue).shift();
        continue;
      }
      await new Promise((_resolve2) => {
        __privateSet(this, _resolve, _resolve2);
      });
    }
    throw new DOMException("The signal has been aborted", "AbortError");
  }
  /** Push a message into the Machina instance, making it available to the consumer of `stream()`. */
  push(data) {
    var _a5;
    __privateGet(this, _queue).push(data);
    (_a5 = __privateGet(this, _resolve)) == null ? void 0 : _a5.call(this);
  }
  /** Stops streaming and throws an error to the consumer. */
  abort() {
    var _a5;
    __privateSet(this, _aborted, true);
    (_a5 = __privateGet(this, _resolve)) == null ? void 0 : _a5.call(this);
  }
};
_queue = new WeakMap();
_resolve = new WeakMap();
_aborted = new WeakMap();

// node_modules/@jsr/nostrify__nostrify/NPool.js
var _computedKey5;
_computedKey5 = Symbol.asyncDispose;
var NPool = class _NPool {
  constructor(opts) {
    __publicField(this, "opts");
    __publicField(this, "_relays");
    this.opts = opts;
    this._relays = /* @__PURE__ */ new Map();
  }
  /** Get or create a relay instance for the given URL. */
  relay(url) {
    const relay = this._relays.get(url);
    if (relay) {
      return relay;
    } else {
      const relay2 = this.opts.open(url);
      this._relays.set(url, relay2);
      return relay2;
    }
  }
  /** Returns a new pool instance that uses the given relays. Connections are shared with the original pool. */
  group(urls) {
    return new _NPool({
      open: (url) => this.relay(url),
      reqRouter: (filters) => new Map(urls.map((url) => [
        url,
        filters
      ])),
      eventRouter: () => urls
    });
  }
  get relays() {
    return this._relays;
  }
  /**
   * Sends a `REQ` to relays based on the configured `reqRouter`.
   *
   * `EVENT` messages from the selected relays are yielded.
   * `EOSE` and `CLOSE` messages are only yielded when all relays have emitted them.
   *
   * Deduplication of `EVENT` messages is attempted, so that each event is only yielded once.
   * A circular set of 1000 is used to track seen event IDs, so it's possible that very
   * long-running subscriptions (with over 1000 results) may yield duplicate events.
   */
  async *req(filters, opts) {
    const controller = new AbortController();
    const signal = (opts == null ? void 0 : opts.signal) ? AbortSignal.any([
      opts.signal,
      controller.signal
    ]) : controller.signal;
    const routes = (opts == null ? void 0 : opts.relays) ? new Map(opts.relays.map((url) => [
      url,
      filters
    ])) : await this.opts.reqRouter(filters);
    if (routes.size < 1) {
      return;
    }
    const machina = new Machina(signal);
    const eoses = /* @__PURE__ */ new Set();
    const closes = /* @__PURE__ */ new Set();
    const events = new CircularSet(1e3);
    for (const [url, filters2] of routes.entries()) {
      const relay = this.relay(url);
      (async () => {
        for await (const msg of relay.req(filters2, {
          signal
        })) {
          if (msg[0] === "EOSE") {
            eoses.add(url);
            if (eoses.size === routes.size) {
              machina.push(msg);
            }
          }
          if (msg[0] === "CLOSED") {
            closes.add(url);
            if (closes.size === routes.size) {
              machina.push(msg);
            }
          }
          if (msg[0] === "EVENT") {
            const [, , event] = msg;
            if (!events.has(event.id)) {
              events.add(event.id);
              machina.push(msg);
            }
          }
        }
      })().catch(() => {
      });
    }
    try {
      for await (const msg of machina) {
        yield msg;
      }
    } finally {
      controller.abort();
    }
  }
  /**
   * Events are sent to relays according to the `eventRouter`.
   * Returns a fulfilled promise if ANY relay accepted the event,
   * or a rejected promise if ALL relays rejected or failed to publish the event.
   */
  async event(event, opts) {
    const relayUrls = (opts == null ? void 0 : opts.relays) ?? await this.opts.eventRouter(event);
    if (!relayUrls.length) {
      return;
    }
    await Promise.any(relayUrls.map((url) => this.relay(url).event(event, opts)));
  }
  /**
   * This method calls `.req` internally and then post-processes the results.
   * Please read the definition of `.req`.
   *
   * - The strategy is to seek regular events quickly, and to wait to find the latest versions of replaceable events.
   * - Filters for replaceable events will wait for all relays to `EOSE` (or `CLOSE`, or for the signal to be aborted) to ensure the latest event versions are retrieved.
   * - Filters for regular events will stop as soon as the filters are fulfilled.
   * - Events are deduplicated, sorted, and only the latest version of replaceable events is kept.
   * - If the signal is aborted, this method will return partial results instead of throwing.
   *
   * To implement a custom strategy, call `.req` directly.
   */
  async query(filters, opts) {
    const map = /* @__PURE__ */ new Map();
    const events = new NSet(map);
    const limit = filters.reduce((result, filter) => result + getFilterLimit(filter), 0);
    if (limit === 0) return [];
    try {
      for await (const msg of this.req(filters, opts)) {
        if (msg[0] === "EOSE") break;
        if (msg[0] === "EVENT") events.add(msg[2]);
        if (msg[0] === "CLOSED") break;
      }
    } catch {
    }
    if (filters.some((filter) => typeof filter.search === "string")) {
      return [
        ...map.values()
      ];
    } else {
      return [
        ...events
      ];
    }
  }
  /** Close all the relays in the pool. */
  async close() {
    await Promise.all([
      ...this._relays.values()
    ].map((relay) => relay.close()));
  }
  async [_computedKey5]() {
    await this.close();
  }
};

// node_modules/websocket-ts/dist/esm/src/backoff/exponentialbackoff.js
var ExponentialBackoff = class {
  /**
   * Creates a new ExponentialBackoff.
   * @param base the base of the exponentiation
   * @param expMax the maximum exponent, no bound if undefined
   */
  constructor(base, expMax) {
    this._retries = 0;
    if (!Number.isInteger(base) || base < 0) {
      throw new Error("Base must be a positive integer or zero");
    }
    if (expMax !== void 0 && (!Number.isInteger(expMax) || expMax < 0)) {
      throw new Error("ExpMax must be a undefined, a positive integer or zero");
    }
    this.base = base;
    this.expMax = expMax;
    this.i = 0;
  }
  get retries() {
    return this._retries;
  }
  get current() {
    return this.base * Math.pow(2, this.i);
  }
  next() {
    this._retries++;
    this.i = this.expMax === void 0 ? this.i + 1 : Math.min(this.i + 1, this.expMax);
    return this.current;
  }
  reset() {
    this._retries = 0;
    this.i = 0;
  }
};

// node_modules/websocket-ts/dist/esm/src/queue/array_queue.js
var ArrayQueue = class {
  constructor() {
    this.elements = [];
  }
  add(element) {
    this.elements.push(element);
  }
  clear() {
    this.elements.length = 0;
  }
  forEach(fn) {
    this.elements.forEach(fn);
  }
  length() {
    return this.elements.length;
  }
  isEmpty() {
    return this.elements.length === 0;
  }
  peek() {
    return this.elements[0];
  }
  read() {
    return this.elements.shift();
  }
};

// node_modules/websocket-ts/dist/esm/src/websocket_event.js
var WebsocketEvent;
(function(WebsocketEvent2) {
  WebsocketEvent2["open"] = "open";
  WebsocketEvent2["close"] = "close";
  WebsocketEvent2["error"] = "error";
  WebsocketEvent2["message"] = "message";
  WebsocketEvent2["retry"] = "retry";
  WebsocketEvent2["reconnect"] = "reconnect";
})(WebsocketEvent || (WebsocketEvent = {}));

// node_modules/websocket-ts/dist/esm/src/websocket.js
var Websocket = class {
  /**
   * Creates a new websocket.
   *
   * @param url to connect to.
   * @param protocols optional protocols to use.
   * @param options optional options to use.
   */
  constructor(url, protocols, options) {
    var _a5, _b4, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
    this._closedByUser = false;
    this.handleOpenEvent = (event) => this.handleEvent(WebsocketEvent.open, event);
    this.handleErrorEvent = (event) => this.handleEvent(WebsocketEvent.error, event);
    this.handleCloseEvent = (event) => this.handleEvent(WebsocketEvent.close, event);
    this.handleMessageEvent = (event) => this.handleEvent(WebsocketEvent.message, event);
    this._url = url;
    this._protocols = protocols;
    this._options = {
      buffer: options === null || options === void 0 ? void 0 : options.buffer,
      retry: {
        maxRetries: (_a5 = options === null || options === void 0 ? void 0 : options.retry) === null || _a5 === void 0 ? void 0 : _a5.maxRetries,
        instantReconnect: (_b4 = options === null || options === void 0 ? void 0 : options.retry) === null || _b4 === void 0 ? void 0 : _b4.instantReconnect,
        backoff: (_c = options === null || options === void 0 ? void 0 : options.retry) === null || _c === void 0 ? void 0 : _c.backoff
      },
      listeners: {
        open: [...(_e = (_d = options === null || options === void 0 ? void 0 : options.listeners) === null || _d === void 0 ? void 0 : _d.open) !== null && _e !== void 0 ? _e : []],
        close: [...(_g = (_f = options === null || options === void 0 ? void 0 : options.listeners) === null || _f === void 0 ? void 0 : _f.close) !== null && _g !== void 0 ? _g : []],
        error: [...(_j = (_h = options === null || options === void 0 ? void 0 : options.listeners) === null || _h === void 0 ? void 0 : _h.error) !== null && _j !== void 0 ? _j : []],
        message: [...(_l = (_k = options === null || options === void 0 ? void 0 : options.listeners) === null || _k === void 0 ? void 0 : _k.message) !== null && _l !== void 0 ? _l : []],
        retry: [...(_o = (_m = options === null || options === void 0 ? void 0 : options.listeners) === null || _m === void 0 ? void 0 : _m.retry) !== null && _o !== void 0 ? _o : []],
        reconnect: [...(_q = (_p = options === null || options === void 0 ? void 0 : options.listeners) === null || _p === void 0 ? void 0 : _p.reconnect) !== null && _q !== void 0 ? _q : []]
      }
    };
    this._underlyingWebsocket = this.tryConnect();
  }
  /**
   * Getter for the url.
   *
   * @return the url.
   */
  get url() {
    return this._url;
  }
  /**
   * Getter for the protocols.
   *
   * @return the protocols, or undefined if none were provided.
   */
  get protocols() {
    return this._protocols;
  }
  /**
   * Getter for the buffer.
   *
   * @return the buffer, or undefined if none was provided.
   */
  get buffer() {
    return this._options.buffer;
  }
  /**
   * Getter for the maxRetries.
   *
   * @return the maxRetries, or undefined if none was provided (no limit).
   */
  get maxRetries() {
    return this._options.retry.maxRetries;
  }
  /**
   * Getter for the instantReconnect.
   *
   * @return the instantReconnect, or undefined if none was provided.
   */
  get instantReconnect() {
    return this._options.retry.instantReconnect;
  }
  /**
   * Getter for the backoff.
   *
   * @return the backoff, or undefined if none was provided.
   */
  get backoff() {
    return this._options.retry.backoff;
  }
  /**
   * Whether the websocket was closed by the user. A websocket is closed by the user by calling close().
   *
   * @return true if the websocket was closed by the user, false otherwise.
   */
  get closedByUser() {
    return this._closedByUser;
  }
  /**
   * Getter for the last 'open' event, e.g. the last time the websocket was connected.
   *
   * @return the last 'open' event, or undefined if the websocket was never connected.
   */
  get lastConnection() {
    return this._lastConnection;
  }
  /**
   * Getter for the underlying websocket. This can be used to access the browser's native websocket directly.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/WebSocket
   * @return the underlying websocket.
   */
  get underlyingWebsocket() {
    return this._underlyingWebsocket;
  }
  /**
   * Getter for the readyState of the underlying websocket.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/readyState
   * @return the readyState of the underlying websocket.
   */
  get readyState() {
    return this._underlyingWebsocket.readyState;
  }
  /**
   * Getter for the bufferedAmount of the underlying websocket.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/bufferedAmount
   * @return the bufferedAmount of the underlying websocket.
   */
  get bufferedAmount() {
    return this._underlyingWebsocket.bufferedAmount;
  }
  /**
   * Getter for the extensions of the underlying websocket.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/extensions
   * @return the extensions of the underlying websocket.
   */
  get extensions() {
    return this._underlyingWebsocket.extensions;
  }
  /**
   * Getter for the binaryType of the underlying websocket.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/binaryType
   * @return the binaryType of the underlying websocket.
   */
  get binaryType() {
    return this._underlyingWebsocket.binaryType;
  }
  /**
   * Setter for the binaryType of the underlying websocket.
   *
   * @param value to set, 'blob' or 'arraybuffer'.
   */
  set binaryType(value) {
    this._underlyingWebsocket.binaryType = value;
  }
  /**
   * Sends data over the websocket.
   *
   * If the websocket is not connected and a buffer was provided on creation, the data will be added to the buffer.
   * If no buffer was provided or the websocket was closed by the user, the data will be dropped.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/send
   * @param data to send.
   */
  send(data) {
    if (this.closedByUser)
      return;
    if (this._underlyingWebsocket.readyState === this._underlyingWebsocket.OPEN) {
      this._underlyingWebsocket.send(data);
    } else if (this.buffer !== void 0) {
      this.buffer.add(data);
    }
  }
  /**
   * Close the websocket. No connection-retry will be attempted after this.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/close
   * @param code optional close code.
   * @param reason optional close reason.
   */
  close(code, reason) {
    this.cancelScheduledConnectionRetry();
    this._closedByUser = true;
    this._underlyingWebsocket.close(code, reason);
  }
  /**
   * Adds an event listener for the given event-type.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener
   * @param type of the event to add the listener for.
   * @param listener to add.
   * @param options to use when adding the listener.
   */
  addEventListener(type, listener, options) {
    this._options.listeners[type].push({ listener, options });
  }
  /**
   * Removes one or more event listener for the given event-type that match the given listener and options.
   *
   * @param type of the event to remove the listener for.
   * @param listener to remove.
   * @param options that were used when the listener was added.
   */
  removeEventListener(type, listener, options) {
    const isListenerNotToBeRemoved = (l) => l.listener !== listener || l.options !== options;
    this._options.listeners[type] = this._options.listeners[type].filter(isListenerNotToBeRemoved);
  }
  /**
   * Creates a new browser-native websocket and connects it to the given URL with the given protocols
   * and adds all event listeners to the browser-native websocket.
   *
   * @return the created browser-native websocket which is also stored in the '_underlyingWebsocket' property.
   */
  tryConnect() {
    this._underlyingWebsocket = new WebSocket(this.url, this.protocols);
    this._underlyingWebsocket.addEventListener(WebsocketEvent.open, this.handleOpenEvent);
    this._underlyingWebsocket.addEventListener(WebsocketEvent.close, this.handleCloseEvent);
    this._underlyingWebsocket.addEventListener(WebsocketEvent.error, this.handleErrorEvent);
    this._underlyingWebsocket.addEventListener(WebsocketEvent.message, this.handleMessageEvent);
    return this._underlyingWebsocket;
  }
  /**
   * Removes all event listeners from the browser-native websocket and closes it.
   */
  clearWebsocket() {
    this._underlyingWebsocket.removeEventListener(WebsocketEvent.open, this.handleOpenEvent);
    this._underlyingWebsocket.removeEventListener(WebsocketEvent.close, this.handleCloseEvent);
    this._underlyingWebsocket.removeEventListener(WebsocketEvent.error, this.handleErrorEvent);
    this._underlyingWebsocket.removeEventListener(WebsocketEvent.message, this.handleMessageEvent);
    this._underlyingWebsocket.close();
  }
  /**
   * Dispatch an event to all listeners of the given event-type.
   *
   * @param type of the event to dispatch.
   * @param event to dispatch.
   */
  dispatchEvent(type, event) {
    const eventListeners = this._options.listeners[type];
    const newEventListeners = [];
    eventListeners.forEach(({ listener, options }) => {
      listener(this, event);
      if (options === void 0 || options.once === void 0 || !options.once) {
        newEventListeners.push({ listener, options });
      }
    });
    this._options.listeners[type] = newEventListeners;
  }
  /**
   * Handles the given event by dispatching it to all listeners of the given event-type.
   *
   * @param type of the event to handle.
   * @param event to handle.
   */
  handleEvent(type, event) {
    switch (type) {
      case WebsocketEvent.close:
        this.dispatchEvent(type, event);
        this.scheduleConnectionRetryIfNeeded();
        break;
      case WebsocketEvent.open:
        if (this.backoff !== void 0 && this._lastConnection !== void 0) {
          const detail = {
            retries: this.backoff.retries,
            lastConnection: new Date(this._lastConnection)
          };
          const event2 = new CustomEvent(WebsocketEvent.reconnect, {
            detail
          });
          this.dispatchEvent(WebsocketEvent.reconnect, event2);
          this.backoff.reset();
        }
        this._lastConnection = /* @__PURE__ */ new Date();
        this.dispatchEvent(type, event);
        this.sendBufferedData();
        break;
      case WebsocketEvent.retry:
        this.dispatchEvent(type, event);
        this.clearWebsocket();
        this.tryConnect();
        break;
      default:
        this.dispatchEvent(type, event);
        break;
    }
  }
  /**
   * Sends buffered data if there is a buffer defined.
   */
  sendBufferedData() {
    if (this.buffer === void 0) {
      return;
    }
    for (let ele = this.buffer.read(); ele !== void 0; ele = this.buffer.read()) {
      this.send(ele);
    }
  }
  /**
   * Schedules a connection-retry if there is a backoff defined and the websocket was not closed by the user.
   */
  scheduleConnectionRetryIfNeeded() {
    if (this.closedByUser) {
      return;
    }
    if (this.backoff === void 0) {
      return;
    }
    const handleRetryEvent = (detail) => {
      const event = new CustomEvent(WebsocketEvent.retry, { detail });
      this.handleEvent(WebsocketEvent.retry, event);
    };
    const retryEventDetail = {
      backoff: this._options.retry.instantReconnect === true ? 0 : this.backoff.next(),
      retries: this._options.retry.instantReconnect === true ? 0 : this.backoff.retries,
      lastConnection: this._lastConnection
    };
    if (this._options.retry.maxRetries === void 0 || retryEventDetail.retries <= this._options.retry.maxRetries) {
      this.retryTimeout = globalThis.setTimeout(() => handleRetryEvent(retryEventDetail), retryEventDetail.backoff);
    }
  }
  /**
   * Cancels the scheduled connection-retry, if there is one.
   */
  cancelScheduledConnectionRetry() {
    globalThis.clearTimeout(this.retryTimeout);
  }
};

// node_modules/websocket-ts/dist/esm/src/websocket_builder.js
var WebsocketBuilder = class {
  /**
   * Creates a new WebsocketBuilder.
   *
   * @param url the url to connect to
   */
  constructor(url) {
    this._url = url;
  }
  /**
   * Getter for the url.
   *
   * @returns the url
   */
  get url() {
    return this._url;
  }
  /**
   * Adds protocols to the websocket. Subsequent calls to this method will override the previously set protocols.
   *
   * @param protocols the protocols to add
   */
  withProtocols(protocols) {
    this._protocols = protocols;
    return this;
  }
  /**
   * Getter for the protocols.
   *
   * @returns the protocols, undefined if no protocols have been set
   */
  get protocols() {
    return this._protocols;
  }
  /**
   * Sets the maximum number of retries before giving up. No limit if undefined.
   *
   * @param maxRetries the maximum number of retries before giving up
   */
  withMaxRetries(maxRetries) {
    var _a5;
    this._options = Object.assign(Object.assign({}, this._options), { retry: Object.assign(Object.assign({}, (_a5 = this._options) === null || _a5 === void 0 ? void 0 : _a5.retry), { maxRetries }) });
    return this;
  }
  /**
   * Getter for the maximum number of retries before giving up.
   *
   * @returns the maximum number of retries before giving up, undefined if no maximum has been set
   */
  get maxRetries() {
    var _a5, _b4;
    return (_b4 = (_a5 = this._options) === null || _a5 === void 0 ? void 0 : _a5.retry) === null || _b4 === void 0 ? void 0 : _b4.maxRetries;
  }
  /**
   * Sets wether to reconnect immediately after a connection has been lost, ignoring the backoff strategy for the first retry.
   *
   * @param instantReconnect wether to reconnect immediately after a connection has been lost
   */
  withInstantReconnect(instantReconnect) {
    var _a5;
    this._options = Object.assign(Object.assign({}, this._options), { retry: Object.assign(Object.assign({}, (_a5 = this._options) === null || _a5 === void 0 ? void 0 : _a5.retry), { instantReconnect }) });
    return this;
  }
  /**
   * Getter for wether to reconnect immediately after a connection has been lost, ignoring the backoff strategy for the first retry.
   *
   * @returns wether to reconnect immediately after a connection has been lost, undefined if no value has been set
   */
  get instantReconnect() {
    var _a5, _b4;
    return (_b4 = (_a5 = this._options) === null || _a5 === void 0 ? void 0 : _a5.retry) === null || _b4 === void 0 ? void 0 : _b4.instantReconnect;
  }
  /**
   * Adds a backoff to the websocket. Subsequent calls to this method will override the previously set backoff.
   *
   * @param backoff the backoff to add
   */
  withBackoff(backoff) {
    var _a5;
    this._options = Object.assign(Object.assign({}, this._options), { retry: Object.assign(Object.assign({}, (_a5 = this._options) === null || _a5 === void 0 ? void 0 : _a5.retry), { backoff }) });
    return this;
  }
  /**
   * Getter for the backoff.
   *
   * @returns the backoff, undefined if no backoff has been set
   */
  get backoff() {
    var _a5, _b4;
    return (_b4 = (_a5 = this._options) === null || _a5 === void 0 ? void 0 : _a5.retry) === null || _b4 === void 0 ? void 0 : _b4.backoff;
  }
  /**
   * Adds a buffer to the websocket. Subsequent calls to this method will override the previously set buffer.
   *
   * @param buffer the buffer to add
   */
  withBuffer(buffer) {
    this._options = Object.assign(Object.assign({}, this._options), { buffer });
    return this;
  }
  /**
   * Getter for the buffer.
   *
   * @returns the buffer, undefined if no buffer has been set
   */
  get buffer() {
    var _a5;
    return (_a5 = this._options) === null || _a5 === void 0 ? void 0 : _a5.buffer;
  }
  /**
   * Adds an 'open' event listener to the websocket. Subsequent calls to this method will add additional listeners that will be
   * called in the order they were added.
   *
   * @param listener the listener to add
   * @param options the listener options
   */
  onOpen(listener, options) {
    this.addListener(WebsocketEvent.open, listener, options);
    return this;
  }
  /**
   * Adds an 'close' event listener to the websocket. Subsequent calls to this method will add additional listeners that will be
   * called in the order they were added.
   *
   * @param listener the listener to add
   * @param options the listener options
   */
  onClose(listener, options) {
    this.addListener(WebsocketEvent.close, listener, options);
    return this;
  }
  /**
   * Adds an 'error' event listener to the websocket. Subsequent calls to this method will add additional listeners that will be
   * called in the order they were added.
   *
   * @param listener the listener to add
   * @param options the listener options
   */
  onError(listener, options) {
    this.addListener(WebsocketEvent.error, listener, options);
    return this;
  }
  /**
   * Adds an 'message' event listener to the websocket. Subsequent calls to this method will add additional listeners that will be
   * called in the order they were added.
   *
   * @param listener the listener to add
   * @param options the listener options
   */
  onMessage(listener, options) {
    this.addListener(WebsocketEvent.message, listener, options);
    return this;
  }
  /**
   * Adds an 'retry' event listener to the websocket. Subsequent calls to this method will add additional listeners that will be
   * called in the order they were added.
   *
   * @param listener the listener to add
   * @param options the listener options
   */
  onRetry(listener, options) {
    this.addListener(WebsocketEvent.retry, listener, options);
    return this;
  }
  /**
   * Adds an 'reconnect' event listener to the websocket. Subsequent calls to this method will add additional listeners that will be
   * called in the order they were added.
   *
   * @param listener the listener to add
   * @param options the listener options
   */
  onReconnect(listener, options) {
    this.addListener(WebsocketEvent.reconnect, listener, options);
    return this;
  }
  /**
   * Builds the websocket.
   *
   * @return a new websocket, with the set options
   */
  build() {
    return new Websocket(this._url, this._protocols, this._options);
  }
  /**
   * Adds an event listener to the options.
   *
   * @param event the event to add the listener to
   * @param listener the listener to add
   * @param options the listener options
   */
  addListener(event, listener, options) {
    var _a5, _b4, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w;
    this._options = Object.assign(Object.assign({}, this._options), { listeners: {
      open: (_c = (_b4 = (_a5 = this._options) === null || _a5 === void 0 ? void 0 : _a5.listeners) === null || _b4 === void 0 ? void 0 : _b4.open) !== null && _c !== void 0 ? _c : [],
      close: (_f = (_e = (_d = this._options) === null || _d === void 0 ? void 0 : _d.listeners) === null || _e === void 0 ? void 0 : _e.close) !== null && _f !== void 0 ? _f : [],
      error: (_j = (_h = (_g = this._options) === null || _g === void 0 ? void 0 : _g.listeners) === null || _h === void 0 ? void 0 : _h.error) !== null && _j !== void 0 ? _j : [],
      message: (_m = (_l = (_k = this._options) === null || _k === void 0 ? void 0 : _k.listeners) === null || _l === void 0 ? void 0 : _l.message) !== null && _m !== void 0 ? _m : [],
      retry: (_q = (_p = (_o = this._options) === null || _o === void 0 ? void 0 : _o.listeners) === null || _p === void 0 ? void 0 : _p.retry) !== null && _q !== void 0 ? _q : [],
      reconnect: (_t = (_s = (_r = this._options) === null || _r === void 0 ? void 0 : _r.listeners) === null || _s === void 0 ? void 0 : _s.reconnect) !== null && _t !== void 0 ? _t : [],
      [event]: [
        ...(_w = (_v = (_u = this._options) === null || _u === void 0 ? void 0 : _u.listeners) === null || _v === void 0 ? void 0 : _v[event]) !== null && _w !== void 0 ? _w : [],
        { listener, options }
      ]
    } });
    return this;
  }
};

// node_modules/@jsr/nostrify__nostrify/NRelay1.js
var _computedKey6;
_computedKey6 = Symbol.asyncDispose;
var NRelay1 = class {
  constructor(url, opts = {}) {
    __publicField(this, "url");
    __publicField(this, "opts");
    __publicField(this, "socket");
    __publicField(this, "subs");
    __publicField(this, "closedByUser");
    __publicField(this, "idleTimer");
    __publicField(this, "controller");
    __publicField(this, "ee");
    this.url = url;
    this.opts = opts;
    this.subs = /* @__PURE__ */ new Map();
    this.closedByUser = false;
    this.controller = new AbortController();
    this.ee = new EventTarget();
    this.socket = this.createSocket();
    this.maybeStartIdleTimer();
  }
  get subscriptions() {
    return [
      ...this.subs.values()
    ];
  }
  log(log) {
    var _a5, _b4;
    (_b4 = (_a5 = this.opts).log) == null ? void 0 : _b4.call(_a5, {
      ...log,
      url: this.url
    });
  }
  /** Create (and open) a WebSocket connection with automatic reconnect. */
  createSocket() {
    const { backoff = new ExponentialBackoff(1e3) } = this.opts;
    return new WebsocketBuilder(this.url).withBuffer(new ArrayQueue()).withBackoff(backoff === false ? void 0 : backoff).onOpen((socket) => {
      this.log({
        level: "debug",
        ns: "relay.ws.state",
        state: "open",
        readyState: socket.readyState
      });
      for (const req of this.subs.values()) {
        this.send(req);
      }
    }).onClose((socket) => {
      this.log({
        level: "debug",
        ns: "relay.ws.state",
        state: "close",
        readyState: socket.readyState
      });
      if (!this.subs.size) {
        this.socket.close();
      }
    }).onReconnect((socket) => {
      this.log({
        level: "debug",
        ns: "relay.ws.state",
        state: "reconnect",
        readyState: socket.readyState
      });
    }).onRetry((socket, e) => {
      this.log({
        level: "warn",
        ns: "relay.ws.retry",
        readyState: socket.readyState,
        backoff: e.detail.backoff
      });
    }).onError((socket) => {
      this.log({
        level: "error",
        ns: "relay.ws.error",
        readyState: socket.readyState
      });
    }).onMessage((_socket, e) => {
      if (typeof e.data !== "string") {
        this.close();
        return;
      }
      const result = NSchema.json().pipe(NSchema.relayMsg()).safeParse(e.data);
      if (result.success) {
        this.log({
          level: "trace",
          ns: "relay.ws.message",
          data: result.data
        });
        this.receive(result.data);
      } else {
        this.log({
          level: "warn",
          ns: "relay.ws.message",
          error: result.error
        });
      }
    }).build();
  }
  /** Handle a NIP-01 relay message. */
  receive(msg) {
    const { auth, verifyEvent: verifyEvent2 = verifyEvent } = this.opts;
    switch (msg[0]) {
      case "EVENT":
        if (!verifyEvent2(msg[2])) break;
        this.ee.dispatchEvent(new CustomEvent(`sub:${msg[1]}`, {
          detail: msg
        }));
        break;
      case "EOSE":
        this.ee.dispatchEvent(new CustomEvent(`sub:${msg[1]}`, {
          detail: msg
        }));
        break;
      case "CLOSED":
        this.subs.delete(msg[1]);
        this.maybeStartIdleTimer();
        this.ee.dispatchEvent(new CustomEvent(`sub:${msg[1]}`, {
          detail: msg
        }));
        this.ee.dispatchEvent(new CustomEvent(`count:${msg[1]}`, {
          detail: msg
        }));
        break;
      case "OK":
        this.ee.dispatchEvent(new CustomEvent(`ok:${msg[1]}`, {
          detail: msg
        }));
        break;
      case "NOTICE":
        this.ee.dispatchEvent(new CustomEvent("notice", {
          detail: msg
        }));
        break;
      case "COUNT":
        this.ee.dispatchEvent(new CustomEvent(`count:${msg[1]}`, {
          detail: msg
        }));
        break;
      case "AUTH":
        auth == null ? void 0 : auth(msg[1]).then((event) => this.send([
          "AUTH",
          event
        ])).catch(() => {
        });
    }
  }
  /** Send a NIP-01 client message to the relay. */
  send(msg) {
    this.log({
      level: "trace",
      ns: "relay.ws.send",
      data: msg
    });
    this.wake();
    switch (msg[0]) {
      case "REQ":
        this.subs.set(msg[1], msg);
        break;
      case "CLOSE":
        this.subs.delete(msg[1]);
        this.maybeStartIdleTimer();
        break;
      case "EVENT":
      case "COUNT":
        return this.socket.send(JSON.stringify(msg));
    }
    if (this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(msg));
    }
  }
  async *req(filters, opts = {}) {
    const { signal } = opts;
    const subscriptionId = crypto.randomUUID();
    const msgs = this.on(`sub:${subscriptionId}`, signal);
    const req = [
      "REQ",
      subscriptionId,
      ...filters
    ];
    this.send(req);
    try {
      for await (const msg of msgs) {
        if (msg[0] === "EOSE") yield msg;
        if (msg[0] === "CLOSED") break;
        if (msg[0] === "EVENT") {
          if (matchFilters(filters, msg[2])) {
            yield msg;
          } else {
            continue;
          }
        }
      }
    } finally {
      this.send([
        "CLOSE",
        subscriptionId
      ]);
    }
  }
  async query(filters, opts) {
    const events = new NSet();
    const limit = filters.reduce((result, filter) => result + getFilterLimit(filter), 0);
    if (limit === 0) return [];
    for await (const msg of this.req(filters, opts)) {
      if (msg[0] === "EOSE") break;
      if (msg[0] === "EVENT") events.add(msg[2]);
      if (msg[0] === "CLOSED") throw new Error("Subscription closed");
      if (events.size >= limit) {
        break;
      }
    }
    return [
      ...events
    ];
  }
  async event(event, opts) {
    const result = this.once(`ok:${event.id}`, opts == null ? void 0 : opts.signal);
    try {
      this.send([
        "EVENT",
        event
      ]);
    } catch (e) {
      result.catch(() => {
      });
      throw e;
    }
    const [, , ok, reason] = await result;
    if (!ok) {
      throw new Error(reason);
    }
  }
  async count(filters, opts) {
    const subscriptionId = crypto.randomUUID();
    const result = this.once(`count:${subscriptionId}`, opts == null ? void 0 : opts.signal);
    try {
      this.send([
        "COUNT",
        subscriptionId,
        ...filters
      ]);
    } catch (e) {
      result.catch(() => {
      });
      throw e;
    }
    const msg = await result;
    switch (msg[0]) {
      case "CLOSED":
        throw new Error("Subscription closed");
      case "COUNT": {
        const [, , count] = msg;
        return count;
      }
    }
  }
  /** Get a stream of EE events. */
  async *on(key, signal) {
    const _signal = signal ? AbortSignal.any([
      this.controller.signal,
      signal
    ]) : this.controller.signal;
    if (_signal.aborted) throw this.abortError();
    const machina = new Machina(_signal);
    const onMsg = (e) => machina.push(e.detail);
    this.ee.addEventListener(key, onMsg);
    try {
      for await (const msg of machina) {
        yield msg;
      }
    } finally {
      this.ee.removeEventListener(key, onMsg);
    }
  }
  /** Wait for a single EE event. */
  async once(key, signal) {
    for await (const msg of this.on(key, signal)) {
      return msg;
    }
    throw new Error("Unreachable");
  }
  abortError() {
    return new DOMException("The signal has been aborted", "AbortError");
  }
  /** Start the idle time if applicable. */
  maybeStartIdleTimer() {
    const { idleTimeout = 3e4 } = this.opts;
    if (idleTimeout === false) return;
    if (this.idleTimer) return;
    if (this.subs.size) return;
    if (this.closedByUser) return;
    this.log({
      level: "debug",
      ns: "relay.idletimer",
      state: "running",
      timeout: idleTimeout
    });
    this.idleTimer = setTimeout(() => {
      this.log({
        level: "debug",
        ns: "relay.idletimer",
        state: "aborted",
        timeout: idleTimeout
      });
      this.socket.close();
    }, idleTimeout);
  }
  /** Stop the idle timer. */
  stopIdleTimer() {
    this.log({
      level: "debug",
      ns: "relay.idletimer",
      state: "stopped"
    });
    clearTimeout(this.idleTimer);
    this.idleTimer = void 0;
  }
  /** Make a new WebSocket, but only if it was closed by an idle timeout. */
  wake() {
    this.stopIdleTimer();
    if (!this.closedByUser && this.socket.closedByUser) {
      this.log({
        level: "debug",
        ns: "relay.wake",
        state: "awoken"
      });
      this.socket = this.createSocket();
    } else if (this.closedByUser || this.socket.closedByUser) {
      this.log({
        level: "debug",
        ns: "relay.wake",
        state: "closed"
      });
    } else {
      this.log({
        level: "debug",
        ns: "relay.wake",
        state: "awake"
      });
    }
  }
  /**
   * Close the relay connection and prevent it from reconnecting.
   * After this you should dispose of the `NRelay1` instance and create a new one to connect again.
   */
  async close() {
    this.closedByUser = true;
    this.socket.close();
    this.stopIdleTimer();
    this.controller.abort();
    if (this.socket.readyState !== WebSocket.CLOSED) {
      await new Promise((resolve) => {
        this.socket.addEventListener(WebsocketEvent.close, resolve, {
          once: true
        });
      });
    }
  }
  async [_computedKey6]() {
    await this.close();
  }
};

// node_modules/@jsr/nostrify__nostrify/NSecSigner.js
var _secretKey, _NSecSigner_instances, getConversationKey_fn;
var NSecSigner = class {
  constructor(secretKey) {
    __privateAdd(this, _NSecSigner_instances);
    __privateAdd(this, _secretKey);
    __publicField(this, "pubkey");
    __publicField(this, "nip04", {
      encrypt: async (pubkey, plaintext) => {
        return nip04_exports.encrypt(__privateGet(this, _secretKey), pubkey, plaintext);
      },
      decrypt: async (pubkey, ciphertext) => {
        return nip04_exports.decrypt(__privateGet(this, _secretKey), pubkey, ciphertext);
      }
    });
    __publicField(this, "nip44", {
      encrypt: async (pubkey, plaintext) => {
        const conversationKey = __privateMethod(this, _NSecSigner_instances, getConversationKey_fn).call(this, pubkey);
        return nip44_exports.v2.encrypt(plaintext, conversationKey);
      },
      decrypt: async (pubkey, ciphertext) => {
        const conversationKey = __privateMethod(this, _NSecSigner_instances, getConversationKey_fn).call(this, pubkey);
        return nip44_exports.v2.decrypt(ciphertext, conversationKey);
      }
    });
    __privateSet(this, _secretKey, secretKey);
  }
  async getPublicKey() {
    return this.pubkey ?? (this.pubkey = getPublicKey(__privateGet(this, _secretKey)));
  }
  async signEvent(event) {
    return finalizeEvent(event, __privateGet(this, _secretKey));
  }
};
_secretKey = new WeakMap();
_NSecSigner_instances = new WeakSet();
getConversationKey_fn = function(pubkey) {
  return nip44_exports.v2.utils.getConversationKey(__privateGet(this, _secretKey), pubkey);
};

// node_modules/@nostrify/react/login/NLogin.js
var NLogin = class _NLogin {
  constructor(type, pubkey, data) {
    __publicField(this, "id");
    __publicField(this, "type");
    __publicField(this, "pubkey");
    __publicField(this, "createdAt");
    __publicField(this, "data");
    this.id = `${type}:${pubkey}`;
    this.type = type;
    this.pubkey = pubkey;
    this.createdAt = (/* @__PURE__ */ new Date()).toISOString();
    this.data = data;
  }
  /** Create a login object from an nsec. */
  static fromNsec(nsec) {
    const decoded = nip19_exports.decode(nsec);
    if (decoded.type !== "nsec") {
      throw new Error("Invalid nsec");
    }
    const sk = decoded.data;
    const pubkey = getPublicKey(sk);
    return new _NLogin("nsec", pubkey, {
      nsec: nip19_exports.nsecEncode(sk)
    });
  }
  /** Create a login object from a bunker URI. */
  static async fromBunker(uri, pool) {
    const { pubkey: bunkerPubkey, secret, relays } = new BunkerURI(uri);
    if (!relays.length) {
      throw new Error("No relay provided");
    }
    const sk = generateSecretKey();
    const nsec = nip19_exports.nsecEncode(sk);
    const clientSigner = new NSecSigner(sk);
    const signer = new NConnectSigner({
      relay: pool.group(relays),
      pubkey: bunkerPubkey,
      signer: clientSigner,
      timeout: 6e4
    });
    await signer.connect(secret);
    const pubkey = await signer.getPublicKey();
    return new _NLogin("bunker", pubkey, {
      bunkerPubkey,
      clientNsec: nsec,
      relays
    });
  }
  /** Create a login object from a browser extension. */
  static async fromExtension() {
    const windowSigner = globalThis.nostr;
    if (!windowSigner) {
      throw new Error("Nostr extension is not available");
    }
    const pubkey = await windowSigner.getPublicKey();
    return new _NLogin("extension", pubkey, null);
  }
  /** Convert to a JSON-serializable object. */
  toJSON() {
    return {
      id: this.id,
      type: this.type,
      pubkey: this.pubkey,
      createdAt: this.createdAt,
      data: this.data
    };
  }
};

// node_modules/@nostrify/react/login/NostrLoginProvider.js
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);

// node_modules/@nostrify/react/login/NostrLoginContext.js
var import_react = __toESM(require_react(), 1);
var NostrLoginContext = (0, import_react.createContext)(void 0);

// node_modules/@nostrify/react/login/useNostrLoginReducer.js
var import_react2 = __toESM(require_react(), 1);

// node_modules/@nostrify/react/login/nostrLoginReducer.js
function nostrLoginReducer(state, action) {
  switch (action.type) {
    case "login.add": {
      const filtered = state.filter((login) => login.id !== action.login.id);
      return action.set ? [
        action.login,
        ...filtered
      ] : [
        ...filtered,
        action.login
      ];
    }
    case "login.remove": {
      return state.filter((login) => login.id !== action.id);
    }
    case "login.set": {
      const login = state.find((login2) => login2.id === action.id);
      if (!login) {
        return state;
      }
      const filtered = state.filter((login2) => login2.id !== action.id);
      return [
        login,
        ...filtered
      ];
    }
    case "login.clear": {
      return [];
    }
    default: {
      return state;
    }
  }
}

// node_modules/@nostrify/react/login/useNostrLoginReducer.js
function useNostrLoginReducer(storageKey) {
  const [state, dispatch] = (0, import_react2.useReducer)(nostrLoginReducer, [], () => {
    const stored = localStorage.getItem(storageKey);
    return stored ? JSON.parse(stored) : [];
  });
  (0, import_react2.useEffect)(() => {
    localStorage.setItem(storageKey, JSON.stringify(state));
  }, [
    state
  ]);
  return [
    state,
    dispatch
  ];
}

// node_modules/@nostrify/react/login/NostrLoginProvider.js
var NostrLoginProvider = ({ children, storageKey }) => {
  const [logins, dispatch] = useNostrLoginReducer(storageKey);
  const value = {
    logins,
    addLogin: (login) => dispatch({
      type: "login.add",
      login
    }),
    removeLogin: (id) => dispatch({
      type: "login.remove",
      id
    }),
    setLogin: (id) => dispatch({
      type: "login.set",
      id
    }),
    clearLogins: () => dispatch({
      type: "login.clear"
    })
  };
  return (0, import_jsx_runtime.jsx)(NostrLoginContext.Provider, {
    value,
    children
  });
};

// node_modules/@nostrify/react/login/NUser.js
var NUser = class _NUser {
  constructor(method, pubkey, signer) {
    __publicField(this, "method");
    __publicField(this, "pubkey");
    __publicField(this, "signer");
    this.method = method;
    this.pubkey = pubkey;
    this.signer = signer;
  }
  static fromNsecLogin(login) {
    const sk = nip19_exports.decode(login.data.nsec);
    return new _NUser(login.type, login.pubkey, new NSecSigner(sk.data));
  }
  static fromBunkerLogin(login, pool) {
    const clientSk = nip19_exports.decode(login.data.clientNsec);
    const clientSigner = new NSecSigner(clientSk.data);
    return new _NUser(login.type, login.pubkey, new NConnectSigner({
      relay: pool.group(login.data.relays),
      pubkey: login.pubkey,
      signer: clientSigner,
      timeout: 6e4
    }));
  }
  static fromExtensionLogin(login) {
    return new _NUser(login.type, login.pubkey, new NBrowserSigner());
  }
};

// node_modules/@nostrify/react/login/useNostrLogin.js
var import_react3 = __toESM(require_react(), 1);
function useNostrLogin() {
  const context = (0, import_react3.useContext)(NostrLoginContext);
  if (!context) {
    throw new Error("useNostrLogin must be used within a NostrLoginProvider");
  }
  return context;
}
export {
  NLogin,
  NUser,
  NostrLoginProvider,
  useNostrLogin
};
//# sourceMappingURL=@nostrify_react_login.js.map
