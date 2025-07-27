import {
  MetaTagsArrayable
} from "./chunk-A2GBXVCZ.js";

// node_modules/unhead/dist/shared/unhead.DQc16pHI.mjs
var NAMESPACES = {
  META: /* @__PURE__ */ new Set(["twitter"]),
  OG: /* @__PURE__ */ new Set(["og", "book", "article", "profile", "fb"]),
  MEDIA: /* @__PURE__ */ new Set(["ogImage", "ogVideo", "ogAudio", "twitterImage"]),
  HTTP_EQUIV: /* @__PURE__ */ new Set(["contentType", "defaultStyle", "xUaCompatible"])
};
var META_ALIASES = {
  articleExpirationTime: "article:expiration_time",
  articleModifiedTime: "article:modified_time",
  articlePublishedTime: "article:published_time",
  bookReleaseDate: "book:release_date",
  fbAppId: "fb:app_id",
  ogAudioSecureUrl: "og:audio:secure_url",
  ogAudioUrl: "og:audio",
  ogImageSecureUrl: "og:image:secure_url",
  ogImageUrl: "og:image",
  ogSiteName: "og:site_name",
  ogVideoSecureUrl: "og:video:secure_url",
  ogVideoUrl: "og:video",
  profileFirstName: "profile:first_name",
  profileLastName: "profile:last_name",
  profileUsername: "profile:username",
  msapplicationConfig: "msapplication-Config",
  msapplicationTileColor: "msapplication-TileColor",
  msapplicationTileImage: "msapplication-TileImage"
};
var MetaPackingSchema = {
  appleItunesApp: {
    unpack: {
      entrySeparator: ", ",
      // @ts-expect-error untyped
      resolve: ({ key, value }) => `${fixKeyCase(key)}=${value}`
    }
  },
  refresh: {
    metaKey: "http-equiv",
    unpack: {
      entrySeparator: ";",
      // @ts-expect-error untyped
      resolve: ({ key, value }) => key === "seconds" ? `${value}` : void 0
    }
  },
  robots: {
    unpack: {
      entrySeparator: ", ",
      // @ts-expect-error untyped
      resolve: ({ key, value }) => typeof value === "boolean" ? fixKeyCase(key) : `${fixKeyCase(key)}:${value}`
    }
  },
  contentSecurityPolicy: {
    metaKey: "http-equiv",
    unpack: {
      entrySeparator: "; ",
      // @ts-expect-error untyped
      resolve: ({ key, value }) => `${fixKeyCase(key)} ${value}`
    }
  },
  charset: {}
};
function fixKeyCase(key) {
  const updated = key.replace(/([A-Z])/g, "-$1").toLowerCase();
  const prefixIndex = updated.indexOf("-");
  return prefixIndex === -1 ? updated : NAMESPACES.META.has(updated.slice(0, prefixIndex)) || NAMESPACES.OG.has(updated.slice(0, prefixIndex)) ? key.replace(/([A-Z])/g, ":$1").toLowerCase() : updated;
}
function sanitizeObject(input) {
  return Object.fromEntries(Object.entries(input).filter(([k, v]) => String(v) !== "false" && k));
}
function transformObject(obj) {
  return Array.isArray(obj) ? obj.map(transformObject) : !obj || typeof obj !== "object" ? obj : Object.fromEntries(Object.entries(obj).map(([k, v]) => [fixKeyCase(k), transformObject(v)]));
}
function unpackToString(value, options = {}) {
  const { entrySeparator = "", keyValueSeparator = "", wrapValue, resolve } = options;
  return Object.entries(value).map(([key, val]) => {
    if (resolve) {
      const resolved = resolve({ key, value: val });
      if (resolved !== void 0)
        return resolved;
    }
    const processedVal = typeof val === "object" ? unpackToString(val, options) : typeof val === "number" ? val.toString() : typeof val === "string" && wrapValue ? `${wrapValue}${val.replace(new RegExp(wrapValue, "g"), `\\${wrapValue}`)}${wrapValue}` : val;
    return `${key}${keyValueSeparator}${processedVal}`;
  }).join(entrySeparator);
}
function handleObjectEntry(key, value) {
  const sanitizedValue = sanitizeObject(value);
  const fixedKey = fixKeyCase(key);
  const attr = resolveMetaKeyType(fixedKey);
  if (!MetaTagsArrayable.has(fixedKey)) {
    return [{ [attr]: fixedKey, ...sanitizedValue }];
  }
  const input = Object.fromEntries(
    Object.entries(sanitizedValue).map(([k, v]) => [`${key}${k === "url" ? "" : `${k[0].toUpperCase()}${k.slice(1)}`}`, v])
  );
  return unpackMeta(input || {}).sort((a, b) => {
    var _a, _b;
    return (((_a = a[attr]) == null ? void 0 : _a.length) || 0) - (((_b = b[attr]) == null ? void 0 : _b.length) || 0);
  });
}
function resolveMetaKeyType(key) {
  var _a;
  if (((_a = MetaPackingSchema[key]) == null ? void 0 : _a.metaKey) === "http-equiv" || NAMESPACES.HTTP_EQUIV.has(key)) {
    return "http-equiv";
  }
  const fixed = fixKeyCase(key);
  const colonIndex = fixed.indexOf(":");
  return colonIndex === -1 ? "name" : NAMESPACES.OG.has(fixed.slice(0, colonIndex)) ? "property" : "name";
}
function resolveMetaKeyValue(key) {
  return META_ALIASES[key] || fixKeyCase(key);
}
function resolvePackedMetaObjectValue(value, key) {
  var _a;
  if (key === "refresh")
    return `${value.seconds};url=${value.url}`;
  return unpackToString(transformObject(value), {
    keyValueSeparator: "=",
    entrySeparator: ", ",
    resolve: ({ value: value2, key: key2 }) => value2 === null ? "" : typeof value2 === "boolean" ? key2 : void 0,
    // @ts-expect-error untyped
    ...(_a = MetaPackingSchema[key]) == null ? void 0 : _a.unpack
  });
}
function unpackMeta(input) {
  const extras = [];
  const primitives = {};
  for (const [key, value] of Object.entries(input)) {
    if (Array.isArray(value)) {
      if (key === "themeColor") {
        value.forEach((v) => {
          if (typeof v === "object" && v !== null) {
            extras.push({ name: "theme-color", ...v });
          }
        });
        continue;
      }
      for (const v of value) {
        if (typeof v === "object" && v !== null) {
          const urlProps = [];
          const otherProps = [];
          for (const [propKey, propValue] of Object.entries(v)) {
            const metaKey = `${key}${propKey === "url" ? "" : `:${propKey}`}`;
            const meta2 = unpackMeta({ [metaKey]: propValue });
            (propKey === "url" ? urlProps : otherProps).push(...meta2);
          }
          extras.push(...urlProps, ...otherProps);
        } else {
          extras.push(...typeof v === "string" ? unpackMeta({ [key]: v }) : handleObjectEntry(key, v));
        }
      }
      continue;
    }
    if (typeof value === "object" && value) {
      if (NAMESPACES.MEDIA.has(key)) {
        const prefix = key.startsWith("twitter") ? "twitter" : "og";
        const type = key.replace(/^(og|twitter)/, "").toLowerCase();
        const metaKey = prefix === "twitter" ? "name" : "property";
        if (value.url) {
          extras.push({
            [metaKey]: `${prefix}:${type}`,
            content: value.url
          });
        }
        if (value.secureUrl) {
          extras.push({
            [metaKey]: `${prefix}:${type}:secure_url`,
            content: value.secureUrl
          });
        }
        for (const [propKey, propValue] of Object.entries(value)) {
          if (propKey !== "url" && propKey !== "secureUrl") {
            extras.push({
              [metaKey]: `${prefix}:${type}:${propKey}`,
              // @ts-expect-error untyped
              content: propValue
            });
          }
        }
      } else if (MetaTagsArrayable.has(fixKeyCase(key))) {
        extras.push(...handleObjectEntry(key, value));
      } else {
        primitives[key] = sanitizeObject(value);
      }
    } else {
      primitives[key] = value;
    }
  }
  const meta = Object.entries(primitives).map(([key, value]) => {
    if (key === "charset")
      return { charset: value === null ? "_null" : value };
    const metaKey = resolveMetaKeyType(key);
    const keyValue = resolveMetaKeyValue(key);
    const processedValue = value === null ? "_null" : typeof value === "object" ? resolvePackedMetaObjectValue(value, key) : typeof value === "number" ? value.toString() : value;
    return metaKey === "http-equiv" ? { "http-equiv": keyValue, "content": processedValue } : { [metaKey]: keyValue, content: processedValue };
  });
  return [...extras, ...meta].map(
    (m) => !("content" in m) ? m : m.content === "_null" ? { ...m, content: null } : m
  );
}

// node_modules/unhead/dist/shared/unhead.CApf5sj3.mjs
function defineHeadPlugin(plugin) {
  return plugin;
}
var FlatMetaPlugin = defineHeadPlugin({
  key: "flatMeta",
  hooks: {
    "entries:normalize": (ctx) => {
      const tagsToAdd = [];
      ctx.tags = ctx.tags.map((t) => {
        if (t.tag !== "_flatMeta") {
          return t;
        }
        tagsToAdd.push(unpackMeta(t.props).map((p) => ({
          ...t,
          tag: "meta",
          props: p
        })));
        return false;
      }).filter(Boolean).concat(...tagsToAdd);
    }
  }
});
var WhitelistAttributes = {
  htmlAttrs: /* @__PURE__ */ new Set(["class", "style", "lang", "dir"]),
  bodyAttrs: /* @__PURE__ */ new Set(["class", "style"]),
  meta: /* @__PURE__ */ new Set(["name", "property", "charset", "content", "media"]),
  noscript: /* @__PURE__ */ new Set(["textContent"]),
  style: /* @__PURE__ */ new Set(["media", "textContent", "nonce", "title", "blocking"]),
  script: /* @__PURE__ */ new Set(["type", "textContent", "nonce", "blocking"]),
  link: /* @__PURE__ */ new Set(["color", "crossorigin", "fetchpriority", "href", "hreflang", "imagesrcset", "imagesizes", "integrity", "media", "referrerpolicy", "rel", "sizes", "type"])
};
function acceptDataAttrs(value) {
  return Object.fromEntries(
    Object.entries(value || {}).filter(([key]) => key === "id" || key.startsWith("data-"))
  );
}
function makeTagSafe(tag) {
  var _a;
  let next = {};
  const { tag: type, props: prev } = tag;
  switch (type) {
    // always safe
    case "title":
    case "titleTemplate":
    case "templateParams":
      next = prev;
      break;
    case "htmlAttrs":
    case "bodyAttrs":
      WhitelistAttributes[type].forEach((attr) => {
        if (prev[attr]) {
          next[attr] = prev[attr];
        }
      });
      break;
    case "style":
      next = acceptDataAttrs(prev);
      WhitelistAttributes.style.forEach((key) => {
        if (prev[key]) {
          next[key] = prev[key];
        }
      });
      break;
    // meta is safe, except for http-equiv
    case "meta":
      WhitelistAttributes.meta.forEach((key) => {
        if (prev[key]) {
          next[key] = prev[key];
        }
      });
      break;
    // link tags we don't allow stylesheets, scripts, preloading, prerendering, prefetching, etc
    case "link":
      WhitelistAttributes.link.forEach((key) => {
        const val = prev[key];
        if (!val) {
          return;
        }
        if (key === "rel" && (val === "canonical" || val === "modulepreload" || val === "prerender" || val === "preload" || val === "prefetch")) {
          return;
        }
        if (key === "href") {
          if (val.includes("javascript:") || val.includes("data:")) {
            return;
          }
          next[key] = val;
        } else if (val) {
          next[key] = val;
        }
      });
      if (!next.href && !next.imagesrcset || !next.rel) {
        return false;
      }
      break;
    case "noscript":
      WhitelistAttributes.noscript.forEach((key) => {
        if (prev[key]) {
          next[key] = prev[key];
        }
      });
      break;
    // we only allow JSON in scripts
    case "script":
      if (!tag.textContent || !((_a = prev.type) == null ? void 0 : _a.endsWith("json"))) {
        return false;
      }
      WhitelistAttributes.script.forEach((s) => {
        if (prev[s] === "textContent") {
          try {
            const jsonVal = typeof prev[s] === "string" ? JSON.parse(prev[s]) : prev[s];
            next[s] = JSON.stringify(jsonVal, null, 0);
          } catch {
          }
        } else if (prev[s]) {
          next[s] = prev[s];
        }
      });
      break;
  }
  if (!Object.keys(next).length && !tag.tag.endsWith("Attrs")) {
    return false;
  }
  tag.props = { ...acceptDataAttrs(prev), ...next };
  return tag;
}
var SafeInputPlugin = (
  /* @PURE */
  defineHeadPlugin({
    key: "safe",
    hooks: {
      "entries:normalize": (ctx) => {
        var _a;
        if ((_a = ctx.entry.options) == null ? void 0 : _a._safe) {
          ctx.tags = ctx.tags.reduce((acc, tag) => {
            const safeTag = makeTagSafe(tag);
            if (safeTag)
              acc.push(safeTag);
            return acc;
          }, []);
        }
      }
    }
  })
);

// node_modules/unhead/dist/shared/unhead.C13swrCa.mjs
var SepSub = "%separator";
var SepSubRE = new RegExp(`${SepSub}(?:\\s*${SepSub})*`, "g");
function sub(p, token, isJson = false) {
  var _a;
  let val;
  if (token === "s" || token === "pageTitle") {
    val = p.pageTitle;
  } else if (token.includes(".")) {
    const dotIndex = token.indexOf(".");
    val = (_a = p[token.substring(0, dotIndex)]) == null ? void 0 : _a[token.substring(dotIndex + 1)];
  } else {
    val = p[token];
  }
  if (val !== void 0) {
    return isJson ? (val || "").replace(/\\/g, "\\\\").replace(/</g, "\\u003C").replace(/"/g, '\\"') : val || "";
  }
  return void 0;
}
function processTemplateParams(s, p, sep, isJson = false) {
  if (typeof s !== "string" || !s.includes("%"))
    return s;
  let decoded = s;
  try {
    decoded = decodeURI(s);
  } catch {
  }
  const tokens = decoded.match(/%\w+(?:\.\w+)?/g);
  if (!tokens) {
    return s;
  }
  const hasSepSub = s.includes(SepSub);
  s = s.replace(/%\w+(?:\.\w+)?/g, (token) => {
    if (token === SepSub || !tokens.includes(token)) {
      return token;
    }
    const re = sub(p, token.slice(1), isJson);
    return re !== void 0 ? re : token;
  }).trim();
  if (hasSepSub) {
    if (s.endsWith(SepSub))
      s = s.slice(0, -SepSub.length);
    if (s.startsWith(SepSub))
      s = s.slice(SepSub.length);
    s = s.replace(SepSubRE, sep || "").trim();
  }
  return s;
}

export {
  defineHeadPlugin,
  FlatMetaPlugin,
  SafeInputPlugin,
  processTemplateParams
};
//# sourceMappingURL=chunk-ROXIBW6L.js.map
