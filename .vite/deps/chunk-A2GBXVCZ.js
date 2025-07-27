// node_modules/unhead/dist/shared/unhead.yem5I2v_.mjs
var DupeableTags = /* @__PURE__ */ new Set(["link", "style", "script", "noscript"]);
var TagsWithInnerContent = /* @__PURE__ */ new Set(["title", "titleTemplate", "script", "style", "noscript"]);
var HasElementTags = /* @__PURE__ */ new Set([
  "base",
  "meta",
  "link",
  "style",
  "script",
  "noscript"
]);
var ValidHeadTags = /* @__PURE__ */ new Set([
  "title",
  "base",
  "htmlAttrs",
  "bodyAttrs",
  "meta",
  "link",
  "style",
  "script",
  "noscript"
]);
var UniqueTags = /* @__PURE__ */ new Set(["base", "title", "titleTemplate", "bodyAttrs", "htmlAttrs", "templateParams"]);
var TagConfigKeys = /* @__PURE__ */ new Set(["key", "tagPosition", "tagPriority", "tagDuplicateStrategy", "innerHTML", "textContent", "processTemplateParams"]);
var ScriptNetworkEvents = /* @__PURE__ */ new Set(["onload", "onerror"]);
var UsesMergeStrategy = /* @__PURE__ */ new Set(["templateParams", "htmlAttrs", "bodyAttrs"]);
var MetaTagsArrayable = /* @__PURE__ */ new Set([
  "theme-color",
  "google-site-verification",
  "og",
  "article",
  "book",
  "profile",
  "twitter",
  "author"
]);

// node_modules/unhead/dist/shared/unhead.DZbvapt-.mjs
var sortTags = (a, b) => a._w === b._w ? a._p - b._p : a._w - b._w;
var TAG_WEIGHTS = {
  base: -10,
  title: 10
};
var TAG_ALIASES = {
  critical: -8,
  high: -1,
  low: 2
};
var WEIGHT_MAP = {
  meta: {
    "content-security-policy": -30,
    "charset": -20,
    "viewport": -15
  },
  link: {
    "preconnect": 20,
    "stylesheet": 60,
    "preload": 70,
    "modulepreload": 70,
    "prefetch": 90,
    "dns-prefetch": 90,
    "prerender": 90
  },
  script: {
    async: 30,
    defer: 80,
    sync: 50
  },
  style: {
    imported: 40,
    sync: 60
  }
};
var ImportStyleRe = /@import/;
var isTruthy = (val) => val === "" || val === true;
function tagWeight(head, tag) {
  var _a;
  if (typeof tag.tagPriority === "number")
    return tag.tagPriority;
  let weight = 100;
  const offset = TAG_ALIASES[tag.tagPriority] || 0;
  const weightMap = head.resolvedOptions.disableCapoSorting ? {
    link: {},
    script: {},
    style: {}
  } : WEIGHT_MAP;
  if (tag.tag in TAG_WEIGHTS) {
    weight = TAG_WEIGHTS[tag.tag];
  } else if (tag.tag === "meta") {
    const metaType = tag.props["http-equiv"] === "content-security-policy" ? "content-security-policy" : tag.props.charset ? "charset" : tag.props.name === "viewport" ? "viewport" : null;
    if (metaType)
      weight = WEIGHT_MAP.meta[metaType];
  } else if (tag.tag === "link" && tag.props.rel) {
    weight = weightMap.link[tag.props.rel];
  } else if (tag.tag === "script") {
    if (isTruthy(tag.props.async)) {
      weight = weightMap.script.async;
    } else if (tag.props.src && !isTruthy(tag.props.defer) && !isTruthy(tag.props.async) && tag.props.type !== "module" && !((_a = tag.props.type) == null ? void 0 : _a.endsWith("json"))) {
      weight = weightMap.script.sync;
    } else if (isTruthy(tag.props.defer) && tag.props.src && !isTruthy(tag.props.async)) {
      weight = weightMap.script.defer;
    }
  } else if (tag.tag === "style") {
    weight = tag.innerHTML && ImportStyleRe.test(tag.innerHTML) ? weightMap.style.imported : weightMap.style.sync;
  }
  return (weight || 100) + offset;
}

export {
  DupeableTags,
  TagsWithInnerContent,
  HasElementTags,
  ValidHeadTags,
  UniqueTags,
  TagConfigKeys,
  ScriptNetworkEvents,
  UsesMergeStrategy,
  MetaTagsArrayable,
  sortTags,
  tagWeight
};
//# sourceMappingURL=chunk-A2GBXVCZ.js.map
