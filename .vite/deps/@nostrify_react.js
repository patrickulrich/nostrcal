import {
  require_react
} from "./chunk-2CLD7BNN.js";
import {
  __toESM
} from "./chunk-WOOG5QLI.js";

// node_modules/@nostrify/react/NostrContext.js
var import_react = __toESM(require_react(), 1);
var NostrContext = (0, import_react.createContext)(void 0);

// node_modules/@nostrify/react/useNostr.js
var import_react2 = __toESM(require_react(), 1);
function useNostr() {
  const context = (0, import_react2.useContext)(NostrContext);
  if (!context) {
    throw new Error("useNostr must be used within a NostrProvider");
  }
  return context;
}
export {
  NostrContext,
  useNostr
};
//# sourceMappingURL=@nostrify_react.js.map
