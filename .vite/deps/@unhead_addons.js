import {
  defineHeadPlugin,
  processTemplateParams
} from "./chunk-ROXIBW6L.js";
import {
  sortTags
} from "./chunk-A2GBXVCZ.js";
import "./chunk-WOOG5QLI.js";

// node_modules/unhead/dist/shared/unhead.DeCxexjU.mjs
var formatKey = (k) => !k.includes(":key") ? k.split(":").join(":key:") : k;
var AliasSortingPlugin = defineHeadPlugin({
  key: "aliasSorting",
  hooks: {
    "tags:resolve": (ctx) => {
      let m = false;
      for (const t of ctx.tags) {
        const p = t.tagPriority;
        if (!p)
          continue;
        const s = String(p);
        if (s.startsWith("before:")) {
          const k = formatKey(s.slice(7));
          const l = ctx.tagMap.get(k);
          if (l) {
            if (typeof l.tagPriority === "number")
              t.tagPriority = l.tagPriority;
            t._p = l._p - 1;
            m = true;
          }
        } else if (s.startsWith("after:")) {
          const k = formatKey(s.slice(6));
          const l = ctx.tagMap.get(k);
          if (l) {
            if (typeof l.tagPriority === "number")
              t.tagPriority = l.tagPriority;
            t._p = l._p + 1;
            m = true;
          }
        }
      }
      if (m)
        ctx.tags = ctx.tags.sort(sortTags);
    }
  }
});
var DeprecationsPlugin = defineHeadPlugin({
  key: "deprecations",
  hooks: {
    "entries:normalize": ({ tags }) => {
      for (const tag of tags) {
        if (tag.props.children) {
          tag.innerHTML = tag.props.children;
          delete tag.props.children;
        }
        if (tag.props.hid) {
          tag.key = tag.props.hid;
          delete tag.props.hid;
        }
        if (tag.props.vmid) {
          tag.key = tag.props.vmid;
          delete tag.props.vmid;
        }
        if (tag.props.body) {
          tag.tagPosition = "bodyClose";
          delete tag.props.body;
        }
      }
    }
  }
});
async function walkPromises(v) {
  const type = typeof v;
  if (type === "function") {
    return v;
  }
  if (v instanceof Promise) {
    return await v;
  }
  if (Array.isArray(v)) {
    return await Promise.all(v.map((r) => walkPromises(r)));
  }
  if ((v == null ? void 0 : v.constructor) === Object) {
    const next = {};
    for (const key of Object.keys(v)) {
      next[key] = await walkPromises(v[key]);
    }
    return next;
  }
  return v;
}
var PromisesPlugin = defineHeadPlugin({
  key: "promises",
  hooks: {
    "entries:resolve": async (ctx) => {
      const promises = [];
      for (const k in ctx.entries) {
        if (!ctx.entries[k]._promisesProcessed) {
          promises.push(
            walkPromises(ctx.entries[k].input).then((val) => {
              ctx.entries[k].input = val;
              ctx.entries[k]._promisesProcessed = true;
            })
          );
        }
      }
      await Promise.all(promises);
    }
  }
});
var SupportedAttrs = {
  meta: "content",
  link: "href",
  htmlAttrs: "lang"
};
var contentAttrs = ["innerHTML", "textContent"];
var TemplateParamsPlugin = defineHeadPlugin((head) => {
  return {
    key: "template-params",
    hooks: {
      "entries:normalize": (ctx) => {
        var _a, _b, _c;
        const params = ((_b = (_a = ctx.tags.filter((t) => t.tag === "templateParams" && t.mode === "server")) == null ? void 0 : _a[0]) == null ? void 0 : _b.props) || {};
        if (Object.keys(params).length) {
          head._ssrPayload = {
            templateParams: {
              ...((_c = head._ssrPayload) == null ? void 0 : _c.templateParams) || {},
              ...params
            }
          };
        }
      },
      "tags:resolve": ({ tagMap, tags }) => {
        var _a;
        const params = ((_a = tagMap.get("templateParams")) == null ? void 0 : _a.props) || {};
        const sep = params.separator || "|";
        delete params.separator;
        params.pageTitle = processTemplateParams(
          // find templateParams
          params.pageTitle || head._title || "",
          params,
          sep
        );
        for (const tag of tags) {
          if (tag.processTemplateParams === false) {
            continue;
          }
          const v = SupportedAttrs[tag.tag];
          if (v && typeof tag.props[v] === "string") {
            tag.props[v] = processTemplateParams(tag.props[v], params, sep);
          } else if (tag.processTemplateParams || tag.tag === "titleTemplate" || tag.tag === "title") {
            for (const p of contentAttrs) {
              if (typeof tag[p] === "string")
                tag[p] = processTemplateParams(tag[p], params, sep, tag.tag === "script" && tag.props.type.endsWith("json"));
            }
          }
        }
        head._templateParams = params;
        head._separator = sep;
      },
      "tags:afterResolve": ({ tagMap }) => {
        const title = tagMap.get("title");
        if ((title == null ? void 0 : title.textContent) && title.processTemplateParams !== false) {
          title.textContent = processTemplateParams(title.textContent, head._templateParams, head._separator);
        }
      }
    }
  };
});

// node_modules/unhead/dist/plugins.mjs
function InferSeoMetaPlugin(options = {}) {
  return defineHeadPlugin((head) => {
    head.push({
      meta: [
        {
          name: "twitter:card",
          content: options.twitterCard || "summary_large_image",
          tagPriority: "low"
        },
        {
          "property": "og:title",
          "tagPriority": "low",
          "data-infer": ""
        },
        {
          "property": "og:description",
          "tagPriority": "low",
          "data-infer": ""
        }
      ]
    });
    return {
      key: "infer-seo-meta",
      hooks: {
        "tags:beforeResolve": ({ tagMap }) => {
          var _a, _b;
          let title = head._titleTemplate || head._title;
          const ogTitle = tagMap.get("meta:og:title");
          if (typeof (ogTitle == null ? void 0 : ogTitle.props["data-infer"]) !== "undefined") {
            if (typeof title === "function") {
              title = title(head._title);
            }
            ogTitle.props.content = options.ogTitle ? options.ogTitle(title) : title || "";
            ogTitle.processTemplateParams = true;
          }
          const description = (_b = (_a = tagMap.get("meta:description")) == null ? void 0 : _a.props) == null ? void 0 : _b.content;
          const ogDescription = tagMap.get("meta:og:description");
          if (typeof (ogDescription == null ? void 0 : ogDescription.props["data-infer"]) !== "undefined") {
            ogDescription.props.content = options.ogDescription ? options.ogDescription(description) : description || "";
            ogDescription.processTemplateParams = true;
          }
        }
      }
    };
  });
}

// node_modules/@unhead/addons/dist/index.mjs
var DefaultCriticalTags = {
  htmlAttrs: {
    lang: "en"
  },
  meta: [
    { charset: "utf-8" },
    { name: "viewport", content: "width=device-width, initial-scale=1" }
  ]
};
export {
  DefaultCriticalTags,
  InferSeoMetaPlugin
};
//# sourceMappingURL=@unhead_addons.js.map
