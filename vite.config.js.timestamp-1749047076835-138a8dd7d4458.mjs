var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// plugins/visual-editor/vite-plugin-react-inline-editor.js
var vite_plugin_react_inline_editor_exports = {};
__export(vite_plugin_react_inline_editor_exports, {
  default: () => inlineEditPlugin
});
import path from "path";
import { fileURLToPath } from "url";
import { parse } from "file:///E:/DOWNLOADS/aniflix-uno/node_modules/@babel/parser/lib/index.js";
import traverseBabel from "file:///E:/DOWNLOADS/aniflix-uno/node_modules/@babel/traverse/lib/index.js";
import generate from "file:///E:/DOWNLOADS/aniflix-uno/node_modules/@babel/generator/lib/index.js";
import * as t from "file:///E:/DOWNLOADS/aniflix-uno/node_modules/@babel/types/lib/index.js";
import fs from "fs";
function parseEditId(editId) {
  const parts = editId.split(":");
  if (parts.length < 3) {
    return null;
  }
  const column = parseInt(parts.at(-1), 10);
  const line = parseInt(parts.at(-2), 10);
  const filePath = parts.slice(0, -2).join(":");
  if (!filePath || isNaN(line) || isNaN(column)) {
    return null;
  }
  return { filePath, line, column };
}
function checkTagNameEditable(openingElementNode, editableTagsList) {
  if (!openingElementNode || !openingElementNode.name)
    return false;
  const nameNode = openingElementNode.name;
  if (nameNode.type === "JSXIdentifier" && editableTagsList.includes(nameNode.name)) {
    return true;
  }
  if (nameNode.type === "JSXMemberExpression" && nameNode.property && nameNode.property.type === "JSXIdentifier" && editableTagsList.includes(nameNode.property.name)) {
    return true;
  }
  return false;
}
function inlineEditPlugin() {
  return {
    name: "vite-inline-edit-plugin",
    enforce: "pre",
    transform(code, id) {
      if (!/\.(jsx|tsx)$/.test(id) || !id.startsWith(VITE_PROJECT_ROOT) || id.includes("node_modules")) {
        return null;
      }
      const relativeFilePath = path.relative(VITE_PROJECT_ROOT, id);
      const webRelativeFilePath = relativeFilePath.split(path.sep).join("/");
      try {
        const babelAst = parse(code, {
          sourceType: "module",
          plugins: ["jsx", "typescript"],
          errorRecovery: true
        });
        let attributesAdded = 0;
        traverseBabel.default(babelAst, {
          enter(path3) {
            if (path3.isJSXOpeningElement()) {
              const openingNode = path3.node;
              const elementNode = path3.parentPath.node;
              if (!openingNode.loc) {
                return;
              }
              const alreadyHasId = openingNode.attributes.some(
                (attr) => t.isJSXAttribute(attr) && attr.name.name === "data-edit-id"
              );
              if (alreadyHasId) {
                return;
              }
              const isCurrentElementEditable = checkTagNameEditable(openingNode, EDITABLE_HTML_TAGS);
              if (!isCurrentElementEditable) {
                return;
              }
              let shouldBeDisabledDueToChildren = false;
              if (t.isJSXElement(elementNode) && elementNode.children) {
                const hasPropsSpread = openingNode.attributes.some(
                  (attr) => t.isJSXSpreadAttribute(attr) && attr.argument && t.isIdentifier(attr.argument) && attr.argument.name === "props"
                );
                const hasDynamicChild = elementNode.children.some(
                  (child) => t.isJSXExpressionContainer(child)
                );
                if (hasDynamicChild || hasPropsSpread) {
                  shouldBeDisabledDueToChildren = true;
                }
              }
              if (!shouldBeDisabledDueToChildren && t.isJSXElement(elementNode) && elementNode.children) {
                const hasEditableJsxChild = elementNode.children.some((child) => {
                  if (t.isJSXElement(child)) {
                    return checkTagNameEditable(child.openingElement, EDITABLE_HTML_TAGS);
                  }
                  return false;
                });
                if (hasEditableJsxChild) {
                  shouldBeDisabledDueToChildren = true;
                }
              }
              if (shouldBeDisabledDueToChildren) {
                const disabledAttribute = t.jsxAttribute(
                  t.jsxIdentifier("data-edit-disabled"),
                  t.stringLiteral("true")
                );
                openingNode.attributes.push(disabledAttribute);
                attributesAdded++;
                return;
              }
              if (t.isJSXElement(elementNode) && elementNode.children && elementNode.children.length > 0) {
                let hasNonEditableJsxChild = false;
                for (const child of elementNode.children) {
                  if (t.isJSXElement(child)) {
                    if (!checkTagNameEditable(child.openingElement, EDITABLE_HTML_TAGS)) {
                      hasNonEditableJsxChild = true;
                      break;
                    }
                  }
                }
                if (hasNonEditableJsxChild) {
                  const disabledAttribute = t.jsxAttribute(
                    t.jsxIdentifier("data-edit-disabled"),
                    t.stringLiteral("true")
                  );
                  openingNode.attributes.push(disabledAttribute);
                  attributesAdded++;
                  return;
                }
              }
              let currentAncestorCandidatePath = path3.parentPath.parentPath;
              while (currentAncestorCandidatePath) {
                const ancestorJsxElementPath = currentAncestorCandidatePath.isJSXElement() ? currentAncestorCandidatePath : currentAncestorCandidatePath.findParent((p) => p.isJSXElement());
                if (!ancestorJsxElementPath) {
                  break;
                }
                if (checkTagNameEditable(ancestorJsxElementPath.node.openingElement, EDITABLE_HTML_TAGS)) {
                  return;
                }
                currentAncestorCandidatePath = ancestorJsxElementPath.parentPath;
              }
              const line = openingNode.loc.start.line;
              const column = openingNode.loc.start.column + 1;
              const editId = `${webRelativeFilePath}:${line}:${column}`;
              const idAttribute = t.jsxAttribute(
                t.jsxIdentifier("data-edit-id"),
                t.stringLiteral(editId)
              );
              openingNode.attributes.push(idAttribute);
              attributesAdded++;
            }
          }
        });
        if (attributesAdded > 0) {
          const generateFunction = generate.default || generate;
          const output = generateFunction(babelAst, {
            sourceMaps: true,
            sourceFileName: webRelativeFilePath
          }, code);
          return { code: output.code, map: output.map };
        }
        return null;
      } catch (error) {
        console.error(`[vite][visual-editor] Error transforming ${id}:`, error);
        return null;
      }
    },
    // Updates source code based on the changes received from the client
    configureServer(server) {
      server.middlewares.use("/api/apply-edit", async (req, res, next) => {
        if (req.method !== "POST")
          return next();
        let body = "";
        req.on("data", (chunk) => {
          body += chunk.toString();
        });
        req.on("end", async () => {
          var _a;
          let absoluteFilePath = "";
          try {
            const { editId, newFullText } = JSON.parse(body);
            if (!editId || typeof newFullText === "undefined") {
              res.writeHead(400, { "Content-Type": "application/json" });
              return res.end(JSON.stringify({ error: "Missing editId or newFullText" }));
            }
            const parsedId = parseEditId(editId);
            if (!parsedId) {
              res.writeHead(400, { "Content-Type": "application/json" });
              return res.end(JSON.stringify({ error: "Invalid editId format (filePath:line:column)" }));
            }
            const { filePath, line, column } = parsedId;
            absoluteFilePath = path.resolve(VITE_PROJECT_ROOT, filePath);
            if (filePath.includes("..") || !absoluteFilePath.startsWith(VITE_PROJECT_ROOT) || absoluteFilePath.includes("node_modules")) {
              res.writeHead(400, { "Content-Type": "application/json" });
              return res.end(JSON.stringify({ error: "Invalid path" }));
            }
            const originalContent = fs.readFileSync(absoluteFilePath, "utf-8");
            const babelAst = parse(originalContent, {
              sourceType: "module",
              plugins: ["jsx", "typescript"],
              errorRecovery: true
            });
            let targetNodePath = null;
            const visitor = {
              JSXOpeningElement(path3) {
                const node = path3.node;
                if (node.loc && node.loc.start.line === line && node.loc.start.column + 1 === column) {
                  targetNodePath = path3;
                  path3.stop();
                }
              }
            };
            traverseBabel.default(babelAst, visitor);
            if (!targetNodePath) {
              res.writeHead(404, { "Content-Type": "application/json" });
              return res.end(JSON.stringify({ error: "Target node not found by line/column", editId }));
            }
            let modified = false;
            const parentElementNode = (_a = targetNodePath.parentPath) == null ? void 0 : _a.node;
            if (parentElementNode && t.isJSXElement(parentElementNode)) {
              parentElementNode.children = [];
              if (newFullText && newFullText.trim() !== "") {
                const newTextNode = t.jsxText(newFullText);
                parentElementNode.children.push(newTextNode);
              }
              modified = true;
            }
            if (!modified) {
              res.writeHead(409, { "Content-Type": "application/json" });
              return res.end(JSON.stringify({ error: "Could not apply changes to AST." }));
            }
            const generateFunction = generate.default || generate;
            const output = generateFunction(babelAst, {});
            const newContent = output.code;
            try {
              fs.writeFileSync(absoluteFilePath, newContent, "utf-8");
            } catch (writeError) {
              console.error(`[vite][visual-editor] Error during direct write for ${filePath}:`, writeError);
              throw writeError;
            }
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
              success: true,
              newFileContent: newContent
            }));
          } catch (error) {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Internal server error during edit application." }));
          }
        });
      });
    }
  };
}
var __vite_injected_original_import_meta_url, __filename, __dirname2, VITE_PROJECT_ROOT, EDITABLE_HTML_TAGS;
var init_vite_plugin_react_inline_editor = __esm({
  "plugins/visual-editor/vite-plugin-react-inline-editor.js"() {
    __vite_injected_original_import_meta_url = "file:///E:/DOWNLOADS/aniflix-uno/plugins/visual-editor/vite-plugin-react-inline-editor.js";
    __filename = fileURLToPath(__vite_injected_original_import_meta_url);
    __dirname2 = path.dirname(__filename);
    VITE_PROJECT_ROOT = path.resolve(__dirname2, "../..");
    EDITABLE_HTML_TAGS = ["a", "Button", "button", "p", "span", "h1", "h2", "h3", "h4"];
  }
});

// plugins/visual-editor/visual-editor-config.js
var EDIT_MODE_STYLES;
var init_visual_editor_config = __esm({
  "plugins/visual-editor/visual-editor-config.js"() {
    EDIT_MODE_STYLES = `
  #root[data-edit-mode-enabled="true"] [data-edit-id] {
    cursor: pointer; 
    outline: 1px dashed #357DF9; 
    outline-offset: 2px;
    min-height: 1em;
  }
  #root[data-edit-mode-enabled="true"] {
    cursor: pointer;
  }
  #root[data-edit-mode-enabled="true"] [data-edit-id]:hover {
    background-color: #357DF933;
    outline-color: #357DF9; 
  }

  @keyframes fadeInTooltip {
    from {
      opacity: 0;
      transform: translateY(5px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  #inline-editor-disabled-tooltip {
    display: none; 
    opacity: 0; 
    position: absolute;
    background-color: #1D1E20;
    color: white;
    padding: 4px 8px;
    border-radius: 8px;
    z-index: 10001;
    font-size: 14px;
    border: 1px solid #3B3D4A;
    max-width: 184px;
    text-align: center;
  }

  #inline-editor-disabled-tooltip.tooltip-active {
    display: block;
    animation: fadeInTooltip 0.2s ease-out forwards;
  }
`;
  }
});

// plugins/visual-editor/vite-plugin-edit-mode.js
var vite_plugin_edit_mode_exports = {};
__export(vite_plugin_edit_mode_exports, {
  default: () => inlineEditDevPlugin
});
import { readFileSync } from "fs";
import { resolve } from "path";
import { fileURLToPath as fileURLToPath2 } from "url";
function inlineEditDevPlugin() {
  return {
    name: "vite:inline-edit-dev",
    apply: "serve",
    transformIndexHtml() {
      const scriptPath = resolve(__dirname3, "edit-mode-script.js");
      const scriptContent = readFileSync(scriptPath, "utf-8");
      return [
        {
          tag: "script",
          attrs: { type: "module" },
          children: scriptContent,
          injectTo: "body"
        },
        {
          tag: "style",
          children: EDIT_MODE_STYLES,
          injectTo: "head"
        }
      ];
    }
  };
}
var __vite_injected_original_import_meta_url2, __filename2, __dirname3;
var init_vite_plugin_edit_mode = __esm({
  "plugins/visual-editor/vite-plugin-edit-mode.js"() {
    init_visual_editor_config();
    __vite_injected_original_import_meta_url2 = "file:///E:/DOWNLOADS/aniflix-uno/plugins/visual-editor/vite-plugin-edit-mode.js";
    __filename2 = fileURLToPath2(__vite_injected_original_import_meta_url2);
    __dirname3 = resolve(__filename2, "..");
  }
});

// vite.config.js
import path2 from "node:path";
import react from "file:///E:/DOWNLOADS/aniflix-uno/node_modules/@vitejs/plugin-react/dist/index.mjs";
import { createLogger, defineConfig } from "file:///E:/DOWNLOADS/aniflix-uno/node_modules/vite/dist/node/index.js";
var __vite_injected_original_dirname = "E:\\DOWNLOADS\\aniflix-uno";
var isDev = process.env.NODE_ENV !== "production";
var inlineEditPlugin2;
var editModeDevPlugin;
if (isDev) {
  inlineEditPlugin2 = (await Promise.resolve().then(() => (init_vite_plugin_react_inline_editor(), vite_plugin_react_inline_editor_exports))).default;
  editModeDevPlugin = (await Promise.resolve().then(() => (init_vite_plugin_edit_mode(), vite_plugin_edit_mode_exports))).default;
}
var configHorizonsViteErrorHandler = `
const observer = new MutationObserver((mutations) => {
	for (const mutation of mutations) {
		for (const addedNode of mutation.addedNodes) {
			if (
				addedNode.nodeType === Node.ELEMENT_NODE &&
				(
					addedNode.tagName?.toLowerCase() === 'vite-error-overlay' ||
					addedNode.classList?.contains('backdrop')
				)
			) {
				handleViteOverlay(addedNode);
			}
		}
	}
});

observer.observe(document.documentElement, {
	childList: true,
	subtree: true
});

function handleViteOverlay(node) {
	if (!node.shadowRoot) {
		return;
	}

	const backdrop = node.shadowRoot.querySelector('.backdrop');

	if (backdrop) {
		const overlayHtml = backdrop.outerHTML;
		const parser = new DOMParser();
		const doc = parser.parseFromString(overlayHtml, 'text/html');
		const messageBodyElement = doc.querySelector('.message-body');
		const fileElement = doc.querySelector('.file');
		const messageText = messageBodyElement ? messageBodyElement.textContent.trim() : '';
		const fileText = fileElement ? fileElement.textContent.trim() : '';
		const error = messageText + (fileText ? ' File:' + fileText : '');

		window.parent.postMessage({
			type: 'horizons-vite-error',
			error,
		}, '*');
	}
}
`;
var configHorizonsRuntimeErrorHandler = `
window.onerror = (message, source, lineno, colno, errorObj) => {
	const errorDetails = errorObj ? JSON.stringify({
		name: errorObj.name,
		message: errorObj.message,
		stack: errorObj.stack,
		source,
		lineno,
		colno,
	}) : null;

	window.parent.postMessage({
		type: 'horizons-runtime-error',
		message,
		error: errorDetails
	}, '*');
};
`;
var configHorizonsConsoleErrroHandler = `
const originalConsoleError = console.error;
console.error = function(...args) {
	originalConsoleError.apply(console, args);

	let errorString = '';

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg instanceof Error) {
			errorString = arg.stack || \`\${arg.name}: \${arg.message}\`;
			break;
		}
	}

	if (!errorString) {
		errorString = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
	}

	window.parent.postMessage({
		type: 'horizons-console-error',
		error: errorString
	}, '*');
};
`;
var configWindowFetchMonkeyPatch = `
const originalFetch = window.fetch;

window.fetch = function(...args) {
	const url = args[0] instanceof Request ? args[0].url : args[0];

	// Skip WebSocket URLs
	if (url.startsWith('ws:') || url.startsWith('wss:')) {
		return originalFetch.apply(this, args);
	}

	return originalFetch.apply(this, args)
		.then(async response => {
			const contentType = response.headers.get('Content-Type') || '';

			// Exclude HTML document responses
			const isDocumentResponse =
				contentType.includes('text/html') ||
				contentType.includes('application/xhtml+xml');

			if (!response.ok && !isDocumentResponse) {
					const responseClone = response.clone();
					const errorFromRes = await responseClone.text();
					const requestUrl = response.url;
					console.error(\`Fetch error from \${requestUrl}: \${errorFromRes}\`);
			}

			return response;
		})
		.catch(error => {
			if (!url.match(/.html?$/i)) {
				console.error(error);
			}

			throw error;
		});
};
`;
var addTransformIndexHtml = {
  name: "add-transform-index-html",
  transformIndexHtml(html) {
    return {
      html,
      tags: [
        {
          tag: "script",
          attrs: { type: "module" },
          children: configHorizonsRuntimeErrorHandler,
          injectTo: "head"
        },
        {
          tag: "script",
          attrs: { type: "module" },
          children: configHorizonsViteErrorHandler,
          injectTo: "head"
        },
        {
          tag: "script",
          attrs: { type: "module" },
          children: configHorizonsConsoleErrroHandler,
          injectTo: "head"
        },
        {
          tag: "script",
          attrs: { type: "module" },
          children: configWindowFetchMonkeyPatch,
          injectTo: "head"
        }
      ]
    };
  }
};
console.warn = () => {
};
var logger = createLogger();
var loggerError = logger.error;
logger.error = (msg, options) => {
  var _a;
  if ((_a = options == null ? void 0 : options.error) == null ? void 0 : _a.toString().includes("CssSyntaxError: [postcss]")) {
    return;
  }
  loggerError(msg, options);
};
var vite_config_default = defineConfig({
  customLogger: logger,
  plugins: [
    ...isDev ? [inlineEditPlugin2(), editModeDevPlugin()] : [],
    react(),
    addTransformIndexHtml
  ],
  server: {
    cors: true,
    headers: {
      "Cross-Origin-Embedder-Policy": "credentialless"
    },
    allowedHosts: true
  },
  resolve: {
    extensions: [".jsx", ".js", ".tsx", ".ts", ".json"],
    alias: {
      "@": path2.resolve(__vite_injected_original_dirname, "./src")
    }
  },
  build: {
    rollupOptions: {
      external: [
        "@babel/parser",
        "@babel/traverse",
        "@babel/generator",
        "@babel/types"
      ]
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsicGx1Z2lucy92aXN1YWwtZWRpdG9yL3ZpdGUtcGx1Z2luLXJlYWN0LWlubGluZS1lZGl0b3IuanMiLCAicGx1Z2lucy92aXN1YWwtZWRpdG9yL3Zpc3VhbC1lZGl0b3ItY29uZmlnLmpzIiwgInBsdWdpbnMvdmlzdWFsLWVkaXRvci92aXRlLXBsdWdpbi1lZGl0LW1vZGUuanMiLCAidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJFOlxcXFxET1dOTE9BRFNcXFxcYW5pZmxpeC11bm9cXFxccGx1Z2luc1xcXFx2aXN1YWwtZWRpdG9yXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJFOlxcXFxET1dOTE9BRFNcXFxcYW5pZmxpeC11bm9cXFxccGx1Z2luc1xcXFx2aXN1YWwtZWRpdG9yXFxcXHZpdGUtcGx1Z2luLXJlYWN0LWlubGluZS1lZGl0b3IuanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0U6L0RPV05MT0FEUy9hbmlmbGl4LXVuby9wbHVnaW5zL3Zpc3VhbC1lZGl0b3Ivdml0ZS1wbHVnaW4tcmVhY3QtaW5saW5lLWVkaXRvci5qc1wiO2ltcG9ydCBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgZmlsZVVSTFRvUGF0aCB9IGZyb20gJ3VybCc7XG5pbXBvcnQgeyBwYXJzZSB9IGZyb20gJ0BiYWJlbC9wYXJzZXInO1xuaW1wb3J0IHRyYXZlcnNlQmFiZWwgZnJvbSAnQGJhYmVsL3RyYXZlcnNlJztcbmltcG9ydCBnZW5lcmF0ZSBmcm9tICdAYmFiZWwvZ2VuZXJhdG9yJztcbmltcG9ydCAqIGFzIHQgZnJvbSAnQGJhYmVsL3R5cGVzJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5cbmNvbnN0IF9fZmlsZW5hbWUgPSBmaWxlVVJMVG9QYXRoKGltcG9ydC5tZXRhLnVybCk7XG5jb25zdCBfX2Rpcm5hbWUgPSBwYXRoLmRpcm5hbWUoX19maWxlbmFtZSk7XG5jb25zdCBWSVRFX1BST0pFQ1RfUk9PVCA9IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLicpO1xuY29uc3QgRURJVEFCTEVfSFRNTF9UQUdTID0gW1wiYVwiLCBcIkJ1dHRvblwiLCBcImJ1dHRvblwiLCBcInBcIiwgXCJzcGFuXCIsIFwiaDFcIiwgXCJoMlwiLCBcImgzXCIsIFwiaDRcIl07XG5cbmZ1bmN0aW9uIHBhcnNlRWRpdElkKGVkaXRJZCkge1xuICBjb25zdCBwYXJ0cyA9IGVkaXRJZC5zcGxpdCgnOicpO1xuXG4gIGlmIChwYXJ0cy5sZW5ndGggPCAzKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBjb25zdCBjb2x1bW4gPSBwYXJzZUludChwYXJ0cy5hdCgtMSksIDEwKTtcbiAgY29uc3QgbGluZSA9IHBhcnNlSW50KHBhcnRzLmF0KC0yKSwgMTApO1xuICBjb25zdCBmaWxlUGF0aCA9IHBhcnRzLnNsaWNlKDAsIC0yKS5qb2luKCc6Jyk7XG5cbiAgaWYgKCFmaWxlUGF0aCB8fCBpc05hTihsaW5lKSB8fCBpc05hTihjb2x1bW4pKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgXG4gIHJldHVybiB7IGZpbGVQYXRoLCBsaW5lLCBjb2x1bW4gfTtcbn1cblxuZnVuY3Rpb24gY2hlY2tUYWdOYW1lRWRpdGFibGUob3BlbmluZ0VsZW1lbnROb2RlLCBlZGl0YWJsZVRhZ3NMaXN0KSB7XG4gICAgaWYgKCFvcGVuaW5nRWxlbWVudE5vZGUgfHwgIW9wZW5pbmdFbGVtZW50Tm9kZS5uYW1lKSByZXR1cm4gZmFsc2U7XG4gICAgY29uc3QgbmFtZU5vZGUgPSBvcGVuaW5nRWxlbWVudE5vZGUubmFtZTtcblxuICAgIC8vIENoZWNrIDE6IERpcmVjdCBuYW1lIChmb3IgPHA+LCA8QnV0dG9uPilcbiAgICBpZiAobmFtZU5vZGUudHlwZSA9PT0gJ0pTWElkZW50aWZpZXInICYmIGVkaXRhYmxlVGFnc0xpc3QuaW5jbHVkZXMobmFtZU5vZGUubmFtZSkpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgLy8gQ2hlY2sgMjogUHJvcGVydHkgbmFtZSBvZiBhIG1lbWJlciBleHByZXNzaW9uIChmb3IgPG1vdGlvbi5oMT4sIGNoZWNrIGlmIFwiaDFcIiBpcyBpbiBlZGl0YWJsZVRhZ3NMaXN0KVxuICAgIGlmIChuYW1lTm9kZS50eXBlID09PSAnSlNYTWVtYmVyRXhwcmVzc2lvbicgJiYgbmFtZU5vZGUucHJvcGVydHkgJiYgbmFtZU5vZGUucHJvcGVydHkudHlwZSA9PT0gJ0pTWElkZW50aWZpZXInICYmIGVkaXRhYmxlVGFnc0xpc3QuaW5jbHVkZXMobmFtZU5vZGUucHJvcGVydHkubmFtZSkpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgcmV0dXJuIGZhbHNlO1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBpbmxpbmVFZGl0UGx1Z2luKCkgeyAgXG4gIHJldHVybiB7XG4gICAgbmFtZTogJ3ZpdGUtaW5saW5lLWVkaXQtcGx1Z2luJyxcbiAgICBlbmZvcmNlOiAncHJlJyxcblxuICAgIHRyYW5zZm9ybShjb2RlLCBpZCkge1xuICAgICAgaWYgKCEvXFwuKGpzeHx0c3gpJC8udGVzdChpZCkgfHwgIWlkLnN0YXJ0c1dpdGgoVklURV9QUk9KRUNUX1JPT1QpIHx8IGlkLmluY2x1ZGVzKCdub2RlX21vZHVsZXMnKSkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cblxuICAgICAgY29uc3QgcmVsYXRpdmVGaWxlUGF0aCA9IHBhdGgucmVsYXRpdmUoVklURV9QUk9KRUNUX1JPT1QsIGlkKTtcbiAgICAgIGNvbnN0IHdlYlJlbGF0aXZlRmlsZVBhdGggPSByZWxhdGl2ZUZpbGVQYXRoLnNwbGl0KHBhdGguc2VwKS5qb2luKCcvJyk7XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IGJhYmVsQXN0ID0gcGFyc2UoY29kZSwge1xuICAgICAgICAgIHNvdXJjZVR5cGU6ICdtb2R1bGUnLFxuICAgICAgICAgIHBsdWdpbnM6IFsnanN4JywgJ3R5cGVzY3JpcHQnXSxcbiAgICAgICAgICBlcnJvclJlY292ZXJ5OiB0cnVlXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGxldCBhdHRyaWJ1dGVzQWRkZWQgPSAwO1xuXG4gICAgICAgIHRyYXZlcnNlQmFiZWwuZGVmYXVsdChiYWJlbEFzdCwge1xuICAgICAgICAgIGVudGVyKHBhdGgpIHtcbiAgICAgICAgICAgIGlmIChwYXRoLmlzSlNYT3BlbmluZ0VsZW1lbnQoKSkge1xuICAgICAgICAgICAgICBjb25zdCBvcGVuaW5nTm9kZSA9IHBhdGgubm9kZTtcbiAgICAgICAgICAgICAgY29uc3QgZWxlbWVudE5vZGUgPSBwYXRoLnBhcmVudFBhdGgubm9kZTsgLy8gVGhlIEpTWEVsZW1lbnQgaXRzZWxmXG5cbiAgICAgICAgICAgICAgaWYgKCFvcGVuaW5nTm9kZS5sb2MpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICBjb25zdCBhbHJlYWR5SGFzSWQgPSBvcGVuaW5nTm9kZS5hdHRyaWJ1dGVzLnNvbWUoXG4gICAgICAgICAgICAgICAgKGF0dHIpID0+IHQuaXNKU1hBdHRyaWJ1dGUoYXR0cikgJiYgYXR0ci5uYW1lLm5hbWUgPT09ICdkYXRhLWVkaXQtaWQnXG4gICAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgICAgaWYgKGFscmVhZHlIYXNJZCkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIC8vIENvbmRpdGlvbiAxOiBJcyB0aGUgY3VycmVudCBlbGVtZW50IHRhZyB0eXBlIGVkaXRhYmxlP1xuICAgICAgICAgICAgICBjb25zdCBpc0N1cnJlbnRFbGVtZW50RWRpdGFibGUgPSBjaGVja1RhZ05hbWVFZGl0YWJsZShvcGVuaW5nTm9kZSwgRURJVEFCTEVfSFRNTF9UQUdTKTtcbiAgICAgICAgICAgICAgaWYgKCFpc0N1cnJlbnRFbGVtZW50RWRpdGFibGUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICBsZXQgc2hvdWxkQmVEaXNhYmxlZER1ZVRvQ2hpbGRyZW4gPSBmYWxzZTtcblxuICAgICAgICAgICAgICAvLyBDb25kaXRpb24gMjogRG9lcyB0aGUgZWxlbWVudCBoYXZlIGR5bmFtaWMgb3IgZWRpdGFibGUgY2hpbGRyZW5cbiAgICAgICAgICAgICAgaWYgKHQuaXNKU1hFbGVtZW50KGVsZW1lbnROb2RlKSAmJiBlbGVtZW50Tm9kZS5jaGlsZHJlbikge1xuICAgICAgICAgICAgICAgIC8vIENoZWNrIGlmIGVsZW1lbnQgaGFzIHsuLi5wcm9wc30gc3ByZWFkIGF0dHJpYnV0ZSAtIGRpc2FibGUgZWRpdGluZyBpZiBpdCBkb2VzXG4gICAgICAgICAgICAgICAgY29uc3QgaGFzUHJvcHNTcHJlYWQgPSBvcGVuaW5nTm9kZS5hdHRyaWJ1dGVzLnNvbWUoYXR0ciA9PiB0LmlzSlNYU3ByZWFkQXR0cmlidXRlKGF0dHIpIFxuICAgICAgICAgICAgICAgICYmIGF0dHIuYXJndW1lbnQgIFxuICAgICAgICAgICAgICAgICYmIHQuaXNJZGVudGlmaWVyKGF0dHIuYXJndW1lbnQpIFxuICAgICAgICAgICAgICAgICYmIGF0dHIuYXJndW1lbnQubmFtZSA9PT0gJ3Byb3BzJ1xuICAgICAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBoYXNEeW5hbWljQ2hpbGQgPSBlbGVtZW50Tm9kZS5jaGlsZHJlbi5zb21lKGNoaWxkID0+XG4gICAgICAgICAgICAgICAgICB0LmlzSlNYRXhwcmVzc2lvbkNvbnRhaW5lcihjaGlsZClcbiAgICAgICAgICAgICAgICApO1xuXG4gICAgICAgICAgICAgICAgaWYgKGhhc0R5bmFtaWNDaGlsZCB8fCBoYXNQcm9wc1NwcmVhZCkge1xuICAgICAgICAgICAgICAgICAgc2hvdWxkQmVEaXNhYmxlZER1ZVRvQ2hpbGRyZW4gPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIGlmICghc2hvdWxkQmVEaXNhYmxlZER1ZVRvQ2hpbGRyZW4gJiYgdC5pc0pTWEVsZW1lbnQoZWxlbWVudE5vZGUpICYmIGVsZW1lbnROb2RlLmNoaWxkcmVuKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgaGFzRWRpdGFibGVKc3hDaGlsZCA9IGVsZW1lbnROb2RlLmNoaWxkcmVuLnNvbWUoY2hpbGQgPT4ge1xuICAgICAgICAgICAgICAgICAgaWYgKHQuaXNKU1hFbGVtZW50KGNoaWxkKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2hlY2tUYWdOYW1lRWRpdGFibGUoY2hpbGQub3BlbmluZ0VsZW1lbnQsIEVESVRBQkxFX0hUTUxfVEFHUyk7XG4gICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIGlmIChoYXNFZGl0YWJsZUpzeENoaWxkKSB7XG4gICAgICAgICAgICAgICAgICBzaG91bGRCZURpc2FibGVkRHVlVG9DaGlsZHJlbiA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgaWYgKHNob3VsZEJlRGlzYWJsZWREdWVUb0NoaWxkcmVuKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZGlzYWJsZWRBdHRyaWJ1dGUgPSB0LmpzeEF0dHJpYnV0ZShcbiAgICAgICAgICAgICAgICAgIHQuanN4SWRlbnRpZmllcignZGF0YS1lZGl0LWRpc2FibGVkJyksXG4gICAgICAgICAgICAgICAgICB0LnN0cmluZ0xpdGVyYWwoJ3RydWUnKVxuICAgICAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgICAgICBvcGVuaW5nTm9kZS5hdHRyaWJ1dGVzLnB1c2goZGlzYWJsZWRBdHRyaWJ1dGUpO1xuICAgICAgICAgICAgICAgIGF0dHJpYnV0ZXNBZGRlZCsrO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIC8vIENvbmRpdGlvbiAzOiBQYXJlbnQgaXMgbm9uLWVkaXRhYmxlIGlmIEFUIExFQVNUIE9ORSBjaGlsZCBKU1hFbGVtZW50IGlzIGEgbm9uLWVkaXRhYmxlIHR5cGUuXG4gICAgICAgICAgICAgIGlmICh0LmlzSlNYRWxlbWVudChlbGVtZW50Tm9kZSkgJiYgZWxlbWVudE5vZGUuY2hpbGRyZW4gJiYgZWxlbWVudE5vZGUuY2hpbGRyZW4ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgbGV0IGhhc05vbkVkaXRhYmxlSnN4Q2hpbGQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgY2hpbGQgb2YgZWxlbWVudE5vZGUuY2hpbGRyZW4pIHtcbiAgICAgICAgICAgICAgICAgICAgICBpZiAodC5pc0pTWEVsZW1lbnQoY2hpbGQpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghY2hlY2tUYWdOYW1lRWRpdGFibGUoY2hpbGQub3BlbmluZ0VsZW1lbnQsIEVESVRBQkxFX0hUTUxfVEFHUykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhhc05vbkVkaXRhYmxlSnN4Q2hpbGQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICBpZiAoaGFzTm9uRWRpdGFibGVKc3hDaGlsZCkge1xuICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGRpc2FibGVkQXR0cmlidXRlID0gdC5qc3hBdHRyaWJ1dGUoXG4gICAgICAgICAgICAgICAgICAgICAgICB0LmpzeElkZW50aWZpZXIoJ2RhdGEtZWRpdC1kaXNhYmxlZCcpLFxuICAgICAgICAgICAgICAgICAgICAgICAgdC5zdHJpbmdMaXRlcmFsKFwidHJ1ZVwiKVxuICAgICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgICAgb3BlbmluZ05vZGUuYXR0cmlidXRlcy5wdXNoKGRpc2FibGVkQXR0cmlidXRlKTtcbiAgICAgICAgICAgICAgICAgICAgICBhdHRyaWJ1dGVzQWRkZWQrKztcbiAgICAgICAgICAgICAgICAgICAgICByZXR1cm47IFxuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgLy8gQ29uZGl0aW9uIDQ6IElzIGFueSBhbmNlc3RvciBKU1hFbGVtZW50IGFsc28gZWRpdGFibGU/XG4gICAgICAgICAgICAgIGxldCBjdXJyZW50QW5jZXN0b3JDYW5kaWRhdGVQYXRoID0gcGF0aC5wYXJlbnRQYXRoLnBhcmVudFBhdGg7XG4gICAgICAgICAgICAgIHdoaWxlIChjdXJyZW50QW5jZXN0b3JDYW5kaWRhdGVQYXRoKSB7XG4gICAgICAgICAgICAgICAgICBjb25zdCBhbmNlc3RvckpzeEVsZW1lbnRQYXRoID0gY3VycmVudEFuY2VzdG9yQ2FuZGlkYXRlUGF0aC5pc0pTWEVsZW1lbnQoKVxuICAgICAgICAgICAgICAgICAgICAgID8gY3VycmVudEFuY2VzdG9yQ2FuZGlkYXRlUGF0aFxuICAgICAgICAgICAgICAgICAgICAgIDogY3VycmVudEFuY2VzdG9yQ2FuZGlkYXRlUGF0aC5maW5kUGFyZW50KHAgPT4gcC5pc0pTWEVsZW1lbnQoKSk7XG5cbiAgICAgICAgICAgICAgICAgIGlmICghYW5jZXN0b3JKc3hFbGVtZW50UGF0aCkge1xuICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICBpZiAoY2hlY2tUYWdOYW1lRWRpdGFibGUoYW5jZXN0b3JKc3hFbGVtZW50UGF0aC5ub2RlLm9wZW5pbmdFbGVtZW50LCBFRElUQUJMRV9IVE1MX1RBR1MpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgY3VycmVudEFuY2VzdG9yQ2FuZGlkYXRlUGF0aCA9IGFuY2VzdG9ySnN4RWxlbWVudFBhdGgucGFyZW50UGF0aDtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgY29uc3QgbGluZSA9IG9wZW5pbmdOb2RlLmxvYy5zdGFydC5saW5lO1xuICAgICAgICAgICAgICBjb25zdCBjb2x1bW4gPSBvcGVuaW5nTm9kZS5sb2Muc3RhcnQuY29sdW1uICsgMTtcbiAgICAgICAgICAgICAgY29uc3QgZWRpdElkID0gYCR7d2ViUmVsYXRpdmVGaWxlUGF0aH06JHtsaW5lfToke2NvbHVtbn1gO1xuICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgY29uc3QgaWRBdHRyaWJ1dGUgPSB0LmpzeEF0dHJpYnV0ZShcbiAgICAgICAgICAgICAgICB0LmpzeElkZW50aWZpZXIoJ2RhdGEtZWRpdC1pZCcpLFxuICAgICAgICAgICAgICAgIHQuc3RyaW5nTGl0ZXJhbChlZGl0SWQpXG4gICAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgICAgb3BlbmluZ05vZGUuYXR0cmlidXRlcy5wdXNoKGlkQXR0cmlidXRlKTtcbiAgICAgICAgICAgICAgYXR0cmlidXRlc0FkZGVkKys7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBpZiAoYXR0cmlidXRlc0FkZGVkID4gMCkge1xuICAgICAgICAgIGNvbnN0IGdlbmVyYXRlRnVuY3Rpb24gPSBnZW5lcmF0ZS5kZWZhdWx0IHx8IGdlbmVyYXRlO1xuICAgICAgICAgIGNvbnN0IG91dHB1dCA9IGdlbmVyYXRlRnVuY3Rpb24oYmFiZWxBc3QsIHtcbiAgICAgICAgICAgIHNvdXJjZU1hcHM6IHRydWUsXG4gICAgICAgICAgICBzb3VyY2VGaWxlTmFtZTogd2ViUmVsYXRpdmVGaWxlUGF0aFxuICAgICAgICAgIH0sIGNvZGUpO1xuXG4gICAgICAgICAgcmV0dXJuIHsgY29kZTogb3V0cHV0LmNvZGUsIG1hcDogb3V0cHV0Lm1hcCB9O1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBjb25zb2xlLmVycm9yKGBbdml0ZV1bdmlzdWFsLWVkaXRvcl0gRXJyb3IgdHJhbnNmb3JtaW5nICR7aWR9OmAsIGVycm9yKTtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG4gICAgfSxcblxuXG4gICAgLy8gVXBkYXRlcyBzb3VyY2UgY29kZSBiYXNlZCBvbiB0aGUgY2hhbmdlcyByZWNlaXZlZCBmcm9tIHRoZSBjbGllbnRcbiAgICBjb25maWd1cmVTZXJ2ZXIoc2VydmVyKSB7XG4gICAgICBzZXJ2ZXIubWlkZGxld2FyZXMudXNlKCcvYXBpL2FwcGx5LWVkaXQnLCBhc3luYyAocmVxLCByZXMsIG5leHQpID0+IHtcbiAgICAgICAgaWYgKHJlcS5tZXRob2QgIT09ICdQT1NUJykgcmV0dXJuIG5leHQoKTtcblxuICAgICAgICBsZXQgYm9keSA9ICcnO1xuICAgICAgICByZXEub24oJ2RhdGEnLCBjaHVuayA9PiB7IGJvZHkgKz0gY2h1bmsudG9TdHJpbmcoKTsgfSk7XG5cbiAgICAgICAgcmVxLm9uKCdlbmQnLCBhc3luYyAoKSA9PiB7XG4gICAgICAgICAgbGV0IGFic29sdXRlRmlsZVBhdGggPSAnJztcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgeyBlZGl0SWQsIG5ld0Z1bGxUZXh0IH0gPSBKU09OLnBhcnNlKGJvZHkpO1xuXG4gICAgICAgICAgICBpZiAoIWVkaXRJZCB8fCB0eXBlb2YgbmV3RnVsbFRleHQgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoNDAwLCB7ICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicgfSk7XG4gICAgICAgICAgICAgIHJldHVybiByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICdNaXNzaW5nIGVkaXRJZCBvciBuZXdGdWxsVGV4dCcgfSkpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBwYXJzZWRJZCA9IHBhcnNlRWRpdElkKGVkaXRJZCk7XG4gICAgICAgICAgICBpZiAoIXBhcnNlZElkKSB7XG4gICAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoNDAwLCB7ICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicgfSk7XG4gICAgICAgICAgICAgIHJldHVybiByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICdJbnZhbGlkIGVkaXRJZCBmb3JtYXQgKGZpbGVQYXRoOmxpbmU6Y29sdW1uKScgfSkpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCB7IGZpbGVQYXRoLCBsaW5lLCBjb2x1bW4gfSA9IHBhcnNlZElkO1xuXG4gICAgICAgICAgICBhYnNvbHV0ZUZpbGVQYXRoID0gcGF0aC5yZXNvbHZlKFZJVEVfUFJPSkVDVF9ST09ULCBmaWxlUGF0aCk7XG4gICAgICAgICAgICBpZiAoZmlsZVBhdGguaW5jbHVkZXMoJy4uJykgfHwgIWFic29sdXRlRmlsZVBhdGguc3RhcnRzV2l0aChWSVRFX1BST0pFQ1RfUk9PVCkgfHwgYWJzb2x1dGVGaWxlUGF0aC5pbmNsdWRlcygnbm9kZV9tb2R1bGVzJykpIHtcbiAgICAgICAgICAgICAgcmVzLndyaXRlSGVhZCg0MDAsIHsgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyB9KTtcbiAgICAgICAgICAgICAgcmV0dXJuIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogJ0ludmFsaWQgcGF0aCcgfSkpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBvcmlnaW5hbENvbnRlbnQgPSBmcy5yZWFkRmlsZVN5bmMoYWJzb2x1dGVGaWxlUGF0aCwgJ3V0Zi04Jyk7XG5cbiAgICAgICAgICAgIGNvbnN0IGJhYmVsQXN0ID0gcGFyc2Uob3JpZ2luYWxDb250ZW50LCB7XG4gICAgICAgICAgICAgIHNvdXJjZVR5cGU6ICdtb2R1bGUnLFxuICAgICAgICAgICAgICBwbHVnaW5zOiBbJ2pzeCcsICd0eXBlc2NyaXB0J10sXG4gICAgICAgICAgICAgIGVycm9yUmVjb3Zlcnk6IHRydWVcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBsZXQgdGFyZ2V0Tm9kZVBhdGggPSBudWxsO1xuICAgICAgICAgICAgY29uc3QgdmlzaXRvciA9IHtcbiAgICAgICAgICAgICAgSlNYT3BlbmluZ0VsZW1lbnQocGF0aCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IG5vZGUgPSBwYXRoLm5vZGU7XG4gICAgICAgICAgICAgICAgaWYgKG5vZGUubG9jICYmIG5vZGUubG9jLnN0YXJ0LmxpbmUgPT09IGxpbmUgJiYgbm9kZS5sb2Muc3RhcnQuY29sdW1uICsgMSA9PT0gY29sdW1uKSB7XG4gICAgICAgICAgICAgICAgICB0YXJnZXROb2RlUGF0aCA9IHBhdGg7XG4gICAgICAgICAgICAgICAgICBwYXRoLnN0b3AoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICB0cmF2ZXJzZUJhYmVsLmRlZmF1bHQoYmFiZWxBc3QsIHZpc2l0b3IpO1xuXG4gICAgICAgICAgICBpZiAoIXRhcmdldE5vZGVQYXRoKSB7XG4gICAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoNDA0LCB7ICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicgfSk7XG4gICAgICAgICAgICAgIHJldHVybiByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICdUYXJnZXQgbm9kZSBub3QgZm91bmQgYnkgbGluZS9jb2x1bW4nLCBlZGl0SWQgfSkpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBsZXQgbW9kaWZpZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIGNvbnN0IHBhcmVudEVsZW1lbnROb2RlID0gdGFyZ2V0Tm9kZVBhdGgucGFyZW50UGF0aD8ubm9kZTtcblxuICAgICAgICAgICAgaWYgKHBhcmVudEVsZW1lbnROb2RlICYmIHQuaXNKU1hFbGVtZW50KHBhcmVudEVsZW1lbnROb2RlKSkge1xuICAgICAgICAgICAgICBwYXJlbnRFbGVtZW50Tm9kZS5jaGlsZHJlbiA9IFtdO1xuICAgICAgICAgICAgICBpZiAobmV3RnVsbFRleHQgJiYgbmV3RnVsbFRleHQudHJpbSgpICE9PSAnJykge1xuICAgICAgICAgICAgICAgIGNvbnN0IG5ld1RleHROb2RlID0gdC5qc3hUZXh0KG5ld0Z1bGxUZXh0KTtcbiAgICAgICAgICAgICAgICBwYXJlbnRFbGVtZW50Tm9kZS5jaGlsZHJlbi5wdXNoKG5ld1RleHROb2RlKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBtb2RpZmllZCA9IHRydWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICghbW9kaWZpZWQpIHtcbiAgICAgICAgICAgICAgcmVzLndyaXRlSGVhZCg0MDksIHsgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyB9KTtcblxuICAgICAgICAgICAgICByZXR1cm4gcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IGVycm9yOiAnQ291bGQgbm90IGFwcGx5IGNoYW5nZXMgdG8gQVNULicgfSkpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBnZW5lcmF0ZUZ1bmN0aW9uID0gZ2VuZXJhdGUuZGVmYXVsdCB8fCBnZW5lcmF0ZTtcbiAgICAgICAgICAgIGNvbnN0IG91dHB1dCA9IGdlbmVyYXRlRnVuY3Rpb24oYmFiZWxBc3QsIHt9KTtcbiAgICAgICAgICAgIGNvbnN0IG5ld0NvbnRlbnQgPSBvdXRwdXQuY29kZTtcblxuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgZnMud3JpdGVGaWxlU3luYyhhYnNvbHV0ZUZpbGVQYXRoLCBuZXdDb250ZW50LCAndXRmLTgnKTsgXG4gICAgICAgICAgICB9IGNhdGNoICh3cml0ZUVycm9yKSB7XG4gICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYFt2aXRlXVt2aXN1YWwtZWRpdG9yXSBFcnJvciBkdXJpbmcgZGlyZWN0IHdyaXRlIGZvciAke2ZpbGVQYXRofTpgLCB3cml0ZUVycm9yKTtcbiAgICAgICAgICAgICAgdGhyb3cgd3JpdGVFcnJvcjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmVzLndyaXRlSGVhZCgyMDAsIHsgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyB9KTtcbiAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLCBcbiAgICAgICAgICAgICAgICBuZXdGaWxlQ29udGVudDogbmV3Q29udGVudCBcbiAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICByZXMud3JpdGVIZWFkKDUwMCwgeyAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nIH0pO1xuICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IGVycm9yOiAnSW50ZXJuYWwgc2VydmVyIGVycm9yIGR1cmluZyBlZGl0IGFwcGxpY2F0aW9uLicgfSkpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9XG4gIH07XG59ICIsICJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiRTpcXFxcRE9XTkxPQURTXFxcXGFuaWZsaXgtdW5vXFxcXHBsdWdpbnNcXFxcdmlzdWFsLWVkaXRvclwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiRTpcXFxcRE9XTkxPQURTXFxcXGFuaWZsaXgtdW5vXFxcXHBsdWdpbnNcXFxcdmlzdWFsLWVkaXRvclxcXFx2aXN1YWwtZWRpdG9yLWNvbmZpZy5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vRTovRE9XTkxPQURTL2FuaWZsaXgtdW5vL3BsdWdpbnMvdmlzdWFsLWVkaXRvci92aXN1YWwtZWRpdG9yLWNvbmZpZy5qc1wiO2V4cG9ydCBjb25zdCBQT1BVUF9TVFlMRVMgPSBgXG4jaW5saW5lLWVkaXRvci1wb3B1cCB7XG4gIHdpZHRoOiAzNjBweDtcbiAgcG9zaXRpb246IGZpeGVkO1xuICB6LWluZGV4OiAxMDAwMDtcbiAgYmFja2dyb3VuZDogIzE2MTcxODtcbiAgY29sb3I6IHdoaXRlO1xuICBib3JkZXI6IDFweCBzb2xpZCAjNGE1NTY4O1xuICBib3JkZXItcmFkaXVzOiAxNnB4O1xuICBwYWRkaW5nOiA4cHg7XG4gIGJveC1zaGFkb3c6IDAgNHB4IDEycHggcmdiYSgwLDAsMCwwLjIpO1xuICBmbGV4LWRpcmVjdGlvbjogY29sdW1uO1xuICBnYXA6IDEwcHg7XG4gIGRpc3BsYXk6IG5vbmU7XG59XG5cbkBtZWRpYSAobWF4LXdpZHRoOiA3NjhweCkge1xuICAjaW5saW5lLWVkaXRvci1wb3B1cCB7XG4gICAgd2lkdGg6IGNhbGMoMTAwJSAtIDIwcHgpO1xuICB9XG59XG5cbiNpbmxpbmUtZWRpdG9yLXBvcHVwLmlzLWFjdGl2ZSB7XG4gIGRpc3BsYXk6IGZsZXg7XG4gIHRvcDogNTAlO1xuICBsZWZ0OiA1MCU7XG4gIHRyYW5zZm9ybTogdHJhbnNsYXRlKC01MCUsIC01MCUpO1xufVxuXG4jaW5saW5lLWVkaXRvci1wb3B1cC5pcy1kaXNhYmxlZC12aWV3IHtcbiAgcGFkZGluZzogMTBweCAxNXB4O1xufVxuXG4jaW5saW5lLWVkaXRvci1wb3B1cCB0ZXh0YXJlYSB7XG4gIGhlaWdodDogMTAwcHg7XG4gIHBhZGRpbmc6IDRweCA4cHg7XG4gIGJhY2tncm91bmQ6IHRyYW5zcGFyZW50O1xuICBjb2xvcjogd2hpdGU7XG4gIGZvbnQtZmFtaWx5OiBpbmhlcml0O1xuICBmb250LXNpemU6IDAuODc1cmVtO1xuICBsaW5lLWhlaWdodDogMS40MjtcbiAgcmVzaXplOiBub25lO1xuICBvdXRsaW5lOiBub25lO1xufVxuXG4jaW5saW5lLWVkaXRvci1wb3B1cCAuYnV0dG9uLWNvbnRhaW5lciB7XG4gIGRpc3BsYXk6IGZsZXg7XG4gIGp1c3RpZnktY29udGVudDogZmxleC1lbmQ7XG4gIGdhcDogMTBweDtcbn1cblxuI2lubGluZS1lZGl0b3ItcG9wdXAgLnBvcHVwLWJ1dHRvbiB7XG4gIGJvcmRlcjogbm9uZTtcbiAgcGFkZGluZzogNnB4IDE2cHg7XG4gIGJvcmRlci1yYWRpdXM6IDhweDtcbiAgY3Vyc29yOiBwb2ludGVyO1xuICBmb250LXNpemU6IDAuNzVyZW07XG4gIGZvbnQtd2VpZ2h0OiA3MDA7XG4gIGhlaWdodDogMzRweDtcbiAgb3V0bGluZTogbm9uZTtcbn1cblxuI2lubGluZS1lZGl0b3ItcG9wdXAgLnNhdmUtYnV0dG9uIHtcbiAgYmFja2dyb3VuZDogIzY3M2RlNjtcbiAgY29sb3I6IHdoaXRlO1xufVxuXG4jaW5saW5lLWVkaXRvci1wb3B1cCAuY2FuY2VsLWJ1dHRvbiB7XG4gIGJhY2tncm91bmQ6IHRyYW5zcGFyZW50O1xuICBib3JkZXI6IDFweCBzb2xpZCAjM2IzZDRhO1xuICBjb2xvcjogd2hpdGU7XG5cbiAgJjpob3ZlciB7XG4gICAgYmFja2dyb3VuZDojNDc0OTU4O1xuICB9XG59XG5gO1xuXG5leHBvcnQgZnVuY3Rpb24gZ2V0UG9wdXBIVE1MVGVtcGxhdGUoc2F2ZUxhYmVsLCBjYW5jZWxMYWJlbCkge1xuICByZXR1cm4gYFxuICAgIDx0ZXh0YXJlYT48L3RleHRhcmVhPlxuICAgIDxkaXYgY2xhc3M9XCJidXR0b24tY29udGFpbmVyXCI+XG4gICAgICA8YnV0dG9uIGNsYXNzPVwicG9wdXAtYnV0dG9uIGNhbmNlbC1idXR0b25cIj4ke2NhbmNlbExhYmVsfTwvYnV0dG9uPlxuICAgICAgPGJ1dHRvbiBjbGFzcz1cInBvcHVwLWJ1dHRvbiBzYXZlLWJ1dHRvblwiPiR7c2F2ZUxhYmVsfTwvYnV0dG9uPlxuICAgIDwvZGl2PlxuICBgO1xufTtcblxuZXhwb3J0IGNvbnN0IEVESVRfTU9ERV9TVFlMRVMgPSBgXG4gICNyb290W2RhdGEtZWRpdC1tb2RlLWVuYWJsZWQ9XCJ0cnVlXCJdIFtkYXRhLWVkaXQtaWRdIHtcbiAgICBjdXJzb3I6IHBvaW50ZXI7IFxuICAgIG91dGxpbmU6IDFweCBkYXNoZWQgIzM1N0RGOTsgXG4gICAgb3V0bGluZS1vZmZzZXQ6IDJweDtcbiAgICBtaW4taGVpZ2h0OiAxZW07XG4gIH1cbiAgI3Jvb3RbZGF0YS1lZGl0LW1vZGUtZW5hYmxlZD1cInRydWVcIl0ge1xuICAgIGN1cnNvcjogcG9pbnRlcjtcbiAgfVxuICAjcm9vdFtkYXRhLWVkaXQtbW9kZS1lbmFibGVkPVwidHJ1ZVwiXSBbZGF0YS1lZGl0LWlkXTpob3ZlciB7XG4gICAgYmFja2dyb3VuZC1jb2xvcjogIzM1N0RGOTMzO1xuICAgIG91dGxpbmUtY29sb3I6ICMzNTdERjk7IFxuICB9XG5cbiAgQGtleWZyYW1lcyBmYWRlSW5Ub29sdGlwIHtcbiAgICBmcm9tIHtcbiAgICAgIG9wYWNpdHk6IDA7XG4gICAgICB0cmFuc2Zvcm06IHRyYW5zbGF0ZVkoNXB4KTtcbiAgICB9XG4gICAgdG8ge1xuICAgICAgb3BhY2l0eTogMTtcbiAgICAgIHRyYW5zZm9ybTogdHJhbnNsYXRlWSgwKTtcbiAgICB9XG4gIH1cblxuICAjaW5saW5lLWVkaXRvci1kaXNhYmxlZC10b29sdGlwIHtcbiAgICBkaXNwbGF5OiBub25lOyBcbiAgICBvcGFjaXR5OiAwOyBcbiAgICBwb3NpdGlvbjogYWJzb2x1dGU7XG4gICAgYmFja2dyb3VuZC1jb2xvcjogIzFEMUUyMDtcbiAgICBjb2xvcjogd2hpdGU7XG4gICAgcGFkZGluZzogNHB4IDhweDtcbiAgICBib3JkZXItcmFkaXVzOiA4cHg7XG4gICAgei1pbmRleDogMTAwMDE7XG4gICAgZm9udC1zaXplOiAxNHB4O1xuICAgIGJvcmRlcjogMXB4IHNvbGlkICMzQjNENEE7XG4gICAgbWF4LXdpZHRoOiAxODRweDtcbiAgICB0ZXh0LWFsaWduOiBjZW50ZXI7XG4gIH1cblxuICAjaW5saW5lLWVkaXRvci1kaXNhYmxlZC10b29sdGlwLnRvb2x0aXAtYWN0aXZlIHtcbiAgICBkaXNwbGF5OiBibG9jaztcbiAgICBhbmltYXRpb246IGZhZGVJblRvb2x0aXAgMC4ycyBlYXNlLW91dCBmb3J3YXJkcztcbiAgfVxuYDsiLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIkU6XFxcXERPV05MT0FEU1xcXFxhbmlmbGl4LXVub1xcXFxwbHVnaW5zXFxcXHZpc3VhbC1lZGl0b3JcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkU6XFxcXERPV05MT0FEU1xcXFxhbmlmbGl4LXVub1xcXFxwbHVnaW5zXFxcXHZpc3VhbC1lZGl0b3JcXFxcdml0ZS1wbHVnaW4tZWRpdC1tb2RlLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9FOi9ET1dOTE9BRFMvYW5pZmxpeC11bm8vcGx1Z2lucy92aXN1YWwtZWRpdG9yL3ZpdGUtcGx1Z2luLWVkaXQtbW9kZS5qc1wiO2ltcG9ydCB7IHJlYWRGaWxlU3luYyB9IGZyb20gJ2ZzJztcbmltcG9ydCB7IHJlc29sdmUgfSBmcm9tICdwYXRoJztcbmltcG9ydCB7IGZpbGVVUkxUb1BhdGggfSBmcm9tICd1cmwnO1xuaW1wb3J0IHsgRURJVF9NT0RFX1NUWUxFUyB9IGZyb20gJy4vdmlzdWFsLWVkaXRvci1jb25maWcnO1xuXG5jb25zdCBfX2ZpbGVuYW1lID0gZmlsZVVSTFRvUGF0aChpbXBvcnQubWV0YS51cmwpO1xuY29uc3QgX19kaXJuYW1lID0gcmVzb2x2ZShfX2ZpbGVuYW1lLCAnLi4nKTtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gaW5saW5lRWRpdERldlBsdWdpbigpIHtcbiAgcmV0dXJuIHtcbiAgICBuYW1lOiAndml0ZTppbmxpbmUtZWRpdC1kZXYnLFxuICAgIGFwcGx5OiAnc2VydmUnLFxuICAgIHRyYW5zZm9ybUluZGV4SHRtbCgpIHtcbiAgICAgIGNvbnN0IHNjcmlwdFBhdGggPSByZXNvbHZlKF9fZGlybmFtZSwgJ2VkaXQtbW9kZS1zY3JpcHQuanMnKTtcbiAgICAgIGNvbnN0IHNjcmlwdENvbnRlbnQgPSByZWFkRmlsZVN5bmMoc2NyaXB0UGF0aCwgJ3V0Zi04Jyk7XG5cbiAgICAgIHJldHVybiBbXG4gICAgICAgIHtcbiAgICAgICAgICB0YWc6ICdzY3JpcHQnLFxuICAgICAgICAgIGF0dHJzOiB7IHR5cGU6ICdtb2R1bGUnIH0sXG4gICAgICAgICAgY2hpbGRyZW46IHNjcmlwdENvbnRlbnQsXG4gICAgICAgICAgaW5qZWN0VG86ICdib2R5J1xuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgdGFnOiAnc3R5bGUnLFxuICAgICAgICAgIGNoaWxkcmVuOiBFRElUX01PREVfU1RZTEVTLFxuICAgICAgICAgIGluamVjdFRvOiAnaGVhZCdcbiAgICAgICAgfVxuICAgICAgXTtcbiAgICB9XG4gIH07XG59XG4iLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIkU6XFxcXERPV05MT0FEU1xcXFxhbmlmbGl4LXVub1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiRTpcXFxcRE9XTkxPQURTXFxcXGFuaWZsaXgtdW5vXFxcXHZpdGUuY29uZmlnLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9FOi9ET1dOTE9BRFMvYW5pZmxpeC11bm8vdml0ZS5jb25maWcuanNcIjtpbXBvcnQgcGF0aCBmcm9tICdub2RlOnBhdGgnO1xuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0JztcbmltcG9ydCB7IGNyZWF0ZUxvZ2dlciwgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XG5cbmNvbnN0IGlzRGV2ID0gcHJvY2Vzcy5lbnYuTk9ERV9FTlYgIT09ICdwcm9kdWN0aW9uJztcbmxldCBpbmxpbmVFZGl0UGx1Z2luLCBlZGl0TW9kZURldlBsdWdpbjtcblxuaWYgKGlzRGV2KSB7XG5cdGlubGluZUVkaXRQbHVnaW4gPSAoYXdhaXQgaW1wb3J0KCcuL3BsdWdpbnMvdmlzdWFsLWVkaXRvci92aXRlLXBsdWdpbi1yZWFjdC1pbmxpbmUtZWRpdG9yLmpzJykpLmRlZmF1bHQ7XG5cdGVkaXRNb2RlRGV2UGx1Z2luID0gKGF3YWl0IGltcG9ydCgnLi9wbHVnaW5zL3Zpc3VhbC1lZGl0b3Ivdml0ZS1wbHVnaW4tZWRpdC1tb2RlLmpzJykpLmRlZmF1bHQ7XG59XG5cbmNvbnN0IGNvbmZpZ0hvcml6b25zVml0ZUVycm9ySGFuZGxlciA9IGBcbmNvbnN0IG9ic2VydmVyID0gbmV3IE11dGF0aW9uT2JzZXJ2ZXIoKG11dGF0aW9ucykgPT4ge1xuXHRmb3IgKGNvbnN0IG11dGF0aW9uIG9mIG11dGF0aW9ucykge1xuXHRcdGZvciAoY29uc3QgYWRkZWROb2RlIG9mIG11dGF0aW9uLmFkZGVkTm9kZXMpIHtcblx0XHRcdGlmIChcblx0XHRcdFx0YWRkZWROb2RlLm5vZGVUeXBlID09PSBOb2RlLkVMRU1FTlRfTk9ERSAmJlxuXHRcdFx0XHQoXG5cdFx0XHRcdFx0YWRkZWROb2RlLnRhZ05hbWU/LnRvTG93ZXJDYXNlKCkgPT09ICd2aXRlLWVycm9yLW92ZXJsYXknIHx8XG5cdFx0XHRcdFx0YWRkZWROb2RlLmNsYXNzTGlzdD8uY29udGFpbnMoJ2JhY2tkcm9wJylcblx0XHRcdFx0KVxuXHRcdFx0KSB7XG5cdFx0XHRcdGhhbmRsZVZpdGVPdmVybGF5KGFkZGVkTm9kZSk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG59KTtcblxub2JzZXJ2ZXIub2JzZXJ2ZShkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQsIHtcblx0Y2hpbGRMaXN0OiB0cnVlLFxuXHRzdWJ0cmVlOiB0cnVlXG59KTtcblxuZnVuY3Rpb24gaGFuZGxlVml0ZU92ZXJsYXkobm9kZSkge1xuXHRpZiAoIW5vZGUuc2hhZG93Um9vdCkge1xuXHRcdHJldHVybjtcblx0fVxuXG5cdGNvbnN0IGJhY2tkcm9wID0gbm9kZS5zaGFkb3dSb290LnF1ZXJ5U2VsZWN0b3IoJy5iYWNrZHJvcCcpO1xuXG5cdGlmIChiYWNrZHJvcCkge1xuXHRcdGNvbnN0IG92ZXJsYXlIdG1sID0gYmFja2Ryb3Aub3V0ZXJIVE1MO1xuXHRcdGNvbnN0IHBhcnNlciA9IG5ldyBET01QYXJzZXIoKTtcblx0XHRjb25zdCBkb2MgPSBwYXJzZXIucGFyc2VGcm9tU3RyaW5nKG92ZXJsYXlIdG1sLCAndGV4dC9odG1sJyk7XG5cdFx0Y29uc3QgbWVzc2FnZUJvZHlFbGVtZW50ID0gZG9jLnF1ZXJ5U2VsZWN0b3IoJy5tZXNzYWdlLWJvZHknKTtcblx0XHRjb25zdCBmaWxlRWxlbWVudCA9IGRvYy5xdWVyeVNlbGVjdG9yKCcuZmlsZScpO1xuXHRcdGNvbnN0IG1lc3NhZ2VUZXh0ID0gbWVzc2FnZUJvZHlFbGVtZW50ID8gbWVzc2FnZUJvZHlFbGVtZW50LnRleHRDb250ZW50LnRyaW0oKSA6ICcnO1xuXHRcdGNvbnN0IGZpbGVUZXh0ID0gZmlsZUVsZW1lbnQgPyBmaWxlRWxlbWVudC50ZXh0Q29udGVudC50cmltKCkgOiAnJztcblx0XHRjb25zdCBlcnJvciA9IG1lc3NhZ2VUZXh0ICsgKGZpbGVUZXh0ID8gJyBGaWxlOicgKyBmaWxlVGV4dCA6ICcnKTtcblxuXHRcdHdpbmRvdy5wYXJlbnQucG9zdE1lc3NhZ2Uoe1xuXHRcdFx0dHlwZTogJ2hvcml6b25zLXZpdGUtZXJyb3InLFxuXHRcdFx0ZXJyb3IsXG5cdFx0fSwgJyonKTtcblx0fVxufVxuYDtcblxuY29uc3QgY29uZmlnSG9yaXpvbnNSdW50aW1lRXJyb3JIYW5kbGVyID0gYFxud2luZG93Lm9uZXJyb3IgPSAobWVzc2FnZSwgc291cmNlLCBsaW5lbm8sIGNvbG5vLCBlcnJvck9iaikgPT4ge1xuXHRjb25zdCBlcnJvckRldGFpbHMgPSBlcnJvck9iaiA/IEpTT04uc3RyaW5naWZ5KHtcblx0XHRuYW1lOiBlcnJvck9iai5uYW1lLFxuXHRcdG1lc3NhZ2U6IGVycm9yT2JqLm1lc3NhZ2UsXG5cdFx0c3RhY2s6IGVycm9yT2JqLnN0YWNrLFxuXHRcdHNvdXJjZSxcblx0XHRsaW5lbm8sXG5cdFx0Y29sbm8sXG5cdH0pIDogbnVsbDtcblxuXHR3aW5kb3cucGFyZW50LnBvc3RNZXNzYWdlKHtcblx0XHR0eXBlOiAnaG9yaXpvbnMtcnVudGltZS1lcnJvcicsXG5cdFx0bWVzc2FnZSxcblx0XHRlcnJvcjogZXJyb3JEZXRhaWxzXG5cdH0sICcqJyk7XG59O1xuYDtcblxuY29uc3QgY29uZmlnSG9yaXpvbnNDb25zb2xlRXJycm9IYW5kbGVyID0gYFxuY29uc3Qgb3JpZ2luYWxDb25zb2xlRXJyb3IgPSBjb25zb2xlLmVycm9yO1xuY29uc29sZS5lcnJvciA9IGZ1bmN0aW9uKC4uLmFyZ3MpIHtcblx0b3JpZ2luYWxDb25zb2xlRXJyb3IuYXBwbHkoY29uc29sZSwgYXJncyk7XG5cblx0bGV0IGVycm9yU3RyaW5nID0gJyc7XG5cblx0Zm9yIChsZXQgaSA9IDA7IGkgPCBhcmdzLmxlbmd0aDsgaSsrKSB7XG5cdFx0Y29uc3QgYXJnID0gYXJnc1tpXTtcblx0XHRpZiAoYXJnIGluc3RhbmNlb2YgRXJyb3IpIHtcblx0XHRcdGVycm9yU3RyaW5nID0gYXJnLnN0YWNrIHx8IFxcYFxcJHthcmcubmFtZX06IFxcJHthcmcubWVzc2FnZX1cXGA7XG5cdFx0XHRicmVhaztcblx0XHR9XG5cdH1cblxuXHRpZiAoIWVycm9yU3RyaW5nKSB7XG5cdFx0ZXJyb3JTdHJpbmcgPSBhcmdzLm1hcChhcmcgPT4gdHlwZW9mIGFyZyA9PT0gJ29iamVjdCcgPyBKU09OLnN0cmluZ2lmeShhcmcpIDogU3RyaW5nKGFyZykpLmpvaW4oJyAnKTtcblx0fVxuXG5cdHdpbmRvdy5wYXJlbnQucG9zdE1lc3NhZ2Uoe1xuXHRcdHR5cGU6ICdob3Jpem9ucy1jb25zb2xlLWVycm9yJyxcblx0XHRlcnJvcjogZXJyb3JTdHJpbmdcblx0fSwgJyonKTtcbn07XG5gO1xuXG5jb25zdCBjb25maWdXaW5kb3dGZXRjaE1vbmtleVBhdGNoID0gYFxuY29uc3Qgb3JpZ2luYWxGZXRjaCA9IHdpbmRvdy5mZXRjaDtcblxud2luZG93LmZldGNoID0gZnVuY3Rpb24oLi4uYXJncykge1xuXHRjb25zdCB1cmwgPSBhcmdzWzBdIGluc3RhbmNlb2YgUmVxdWVzdCA/IGFyZ3NbMF0udXJsIDogYXJnc1swXTtcblxuXHQvLyBTa2lwIFdlYlNvY2tldCBVUkxzXG5cdGlmICh1cmwuc3RhcnRzV2l0aCgnd3M6JykgfHwgdXJsLnN0YXJ0c1dpdGgoJ3dzczonKSkge1xuXHRcdHJldHVybiBvcmlnaW5hbEZldGNoLmFwcGx5KHRoaXMsIGFyZ3MpO1xuXHR9XG5cblx0cmV0dXJuIG9yaWdpbmFsRmV0Y2guYXBwbHkodGhpcywgYXJncylcblx0XHQudGhlbihhc3luYyByZXNwb25zZSA9PiB7XG5cdFx0XHRjb25zdCBjb250ZW50VHlwZSA9IHJlc3BvbnNlLmhlYWRlcnMuZ2V0KCdDb250ZW50LVR5cGUnKSB8fCAnJztcblxuXHRcdFx0Ly8gRXhjbHVkZSBIVE1MIGRvY3VtZW50IHJlc3BvbnNlc1xuXHRcdFx0Y29uc3QgaXNEb2N1bWVudFJlc3BvbnNlID1cblx0XHRcdFx0Y29udGVudFR5cGUuaW5jbHVkZXMoJ3RleHQvaHRtbCcpIHx8XG5cdFx0XHRcdGNvbnRlbnRUeXBlLmluY2x1ZGVzKCdhcHBsaWNhdGlvbi94aHRtbCt4bWwnKTtcblxuXHRcdFx0aWYgKCFyZXNwb25zZS5vayAmJiAhaXNEb2N1bWVudFJlc3BvbnNlKSB7XG5cdFx0XHRcdFx0Y29uc3QgcmVzcG9uc2VDbG9uZSA9IHJlc3BvbnNlLmNsb25lKCk7XG5cdFx0XHRcdFx0Y29uc3QgZXJyb3JGcm9tUmVzID0gYXdhaXQgcmVzcG9uc2VDbG9uZS50ZXh0KCk7XG5cdFx0XHRcdFx0Y29uc3QgcmVxdWVzdFVybCA9IHJlc3BvbnNlLnVybDtcblx0XHRcdFx0XHRjb25zb2xlLmVycm9yKFxcYEZldGNoIGVycm9yIGZyb20gXFwke3JlcXVlc3RVcmx9OiBcXCR7ZXJyb3JGcm9tUmVzfVxcYCk7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiByZXNwb25zZTtcblx0XHR9KVxuXHRcdC5jYXRjaChlcnJvciA9PiB7XG5cdFx0XHRpZiAoIXVybC5tYXRjaCgvXFwuaHRtbD8kL2kpKSB7XG5cdFx0XHRcdGNvbnNvbGUuZXJyb3IoZXJyb3IpO1xuXHRcdFx0fVxuXG5cdFx0XHR0aHJvdyBlcnJvcjtcblx0XHR9KTtcbn07XG5gO1xuXG5jb25zdCBhZGRUcmFuc2Zvcm1JbmRleEh0bWwgPSB7XG5cdG5hbWU6ICdhZGQtdHJhbnNmb3JtLWluZGV4LWh0bWwnLFxuXHR0cmFuc2Zvcm1JbmRleEh0bWwoaHRtbCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRodG1sLFxuXHRcdFx0dGFnczogW1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dGFnOiAnc2NyaXB0Jyxcblx0XHRcdFx0XHRhdHRyczogeyB0eXBlOiAnbW9kdWxlJyB9LFxuXHRcdFx0XHRcdGNoaWxkcmVuOiBjb25maWdIb3Jpem9uc1J1bnRpbWVFcnJvckhhbmRsZXIsXG5cdFx0XHRcdFx0aW5qZWN0VG86ICdoZWFkJyxcblx0XHRcdFx0fSxcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHRhZzogJ3NjcmlwdCcsXG5cdFx0XHRcdFx0YXR0cnM6IHsgdHlwZTogJ21vZHVsZScgfSxcblx0XHRcdFx0XHRjaGlsZHJlbjogY29uZmlnSG9yaXpvbnNWaXRlRXJyb3JIYW5kbGVyLFxuXHRcdFx0XHRcdGluamVjdFRvOiAnaGVhZCcsXG5cdFx0XHRcdH0sXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0YWc6ICdzY3JpcHQnLFxuXHRcdFx0XHRcdGF0dHJzOiB7dHlwZTogJ21vZHVsZSd9LFxuXHRcdFx0XHRcdGNoaWxkcmVuOiBjb25maWdIb3Jpem9uc0NvbnNvbGVFcnJyb0hhbmRsZXIsXG5cdFx0XHRcdFx0aW5qZWN0VG86ICdoZWFkJyxcblx0XHRcdFx0fSxcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHRhZzogJ3NjcmlwdCcsXG5cdFx0XHRcdFx0YXR0cnM6IHsgdHlwZTogJ21vZHVsZScgfSxcblx0XHRcdFx0XHRjaGlsZHJlbjogY29uZmlnV2luZG93RmV0Y2hNb25rZXlQYXRjaCxcblx0XHRcdFx0XHRpbmplY3RUbzogJ2hlYWQnLFxuXHRcdFx0XHR9LFxuXHRcdFx0XSxcblx0XHR9O1xuXHR9LFxufTtcblxuY29uc29sZS53YXJuID0gKCkgPT4ge307XG5cbmNvbnN0IGxvZ2dlciA9IGNyZWF0ZUxvZ2dlcigpXG5jb25zdCBsb2dnZXJFcnJvciA9IGxvZ2dlci5lcnJvclxuXG5sb2dnZXIuZXJyb3IgPSAobXNnLCBvcHRpb25zKSA9PiB7XG5cdGlmIChvcHRpb25zPy5lcnJvcj8udG9TdHJpbmcoKS5pbmNsdWRlcygnQ3NzU3ludGF4RXJyb3I6IFtwb3N0Y3NzXScpKSB7XG5cdFx0cmV0dXJuO1xuXHR9XG5cblx0bG9nZ2VyRXJyb3IobXNnLCBvcHRpb25zKTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcblx0Y3VzdG9tTG9nZ2VyOiBsb2dnZXIsXG5cdHBsdWdpbnM6IFtcblx0XHQuLi4oaXNEZXYgPyBbaW5saW5lRWRpdFBsdWdpbigpLCBlZGl0TW9kZURldlBsdWdpbigpXSA6IFtdKSxcblx0XHRyZWFjdCgpLFxuXHRcdGFkZFRyYW5zZm9ybUluZGV4SHRtbFxuXHRdLFxuXHRzZXJ2ZXI6IHtcblx0XHRjb3JzOiB0cnVlLFxuXHRcdGhlYWRlcnM6IHtcblx0XHRcdCdDcm9zcy1PcmlnaW4tRW1iZWRkZXItUG9saWN5JzogJ2NyZWRlbnRpYWxsZXNzJyxcblx0XHR9LFxuXHRcdGFsbG93ZWRIb3N0czogdHJ1ZSxcblx0fSxcblx0cmVzb2x2ZToge1xuXHRcdGV4dGVuc2lvbnM6IFsnLmpzeCcsICcuanMnLCAnLnRzeCcsICcudHMnLCAnLmpzb24nLCBdLFxuXHRcdGFsaWFzOiB7XG5cdFx0XHQnQCc6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuL3NyYycpLFxuXHRcdH0sXG5cdH0sXG5cdGJ1aWxkOiB7XG5cdFx0cm9sbHVwT3B0aW9uczoge1xuXHRcdFx0ZXh0ZXJuYWw6IFtcblx0XHRcdFx0J0BiYWJlbC9wYXJzZXInLFxuXHRcdFx0XHQnQGJhYmVsL3RyYXZlcnNlJyxcblx0XHRcdFx0J0BiYWJlbC9nZW5lcmF0b3InLFxuXHRcdFx0XHQnQGJhYmVsL3R5cGVzJ1xuXHRcdFx0XVxuXHRcdH1cblx0fVxufSk7XG4iXSwKICAibWFwcGluZ3MiOiAiOzs7Ozs7Ozs7OztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQThXLE9BQU8sVUFBVTtBQUMvWCxTQUFTLHFCQUFxQjtBQUM5QixTQUFTLGFBQWE7QUFDdEIsT0FBTyxtQkFBbUI7QUFDMUIsT0FBTyxjQUFjO0FBQ3JCLFlBQVksT0FBTztBQUNuQixPQUFPLFFBQVE7QUFPZixTQUFTLFlBQVksUUFBUTtBQUMzQixRQUFNLFFBQVEsT0FBTyxNQUFNLEdBQUc7QUFFOUIsTUFBSSxNQUFNLFNBQVMsR0FBRztBQUNwQixXQUFPO0FBQUEsRUFDVDtBQUVBLFFBQU0sU0FBUyxTQUFTLE1BQU0sR0FBRyxFQUFFLEdBQUcsRUFBRTtBQUN4QyxRQUFNLE9BQU8sU0FBUyxNQUFNLEdBQUcsRUFBRSxHQUFHLEVBQUU7QUFDdEMsUUFBTSxXQUFXLE1BQU0sTUFBTSxHQUFHLEVBQUUsRUFBRSxLQUFLLEdBQUc7QUFFNUMsTUFBSSxDQUFDLFlBQVksTUFBTSxJQUFJ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LEVBQ2QsU0FBUztBQUFBLElBQ1IsR0FBSSxRQUFRLENBQUNBLGtCQUFpQixHQUFHLGtCQUFrQixDQUFDLElBQUksQ0FBQztBQUFBLElBQ3pELE1BQU07QUFBQSxJQUNOO0FBQUEsRUFDRDtBQUFBLEVBQ0EsUUFBUTtBQUFBLElBQ1AsTUFBTTtBQUFBLElBQ04sU0FBUztBQUFBLE1BQ1IsZ0NBQWdDO0FBQUEsSUFDakM7QUFBQSxJQUNBLGNBQWM7QUFBQSxFQUNmO0FBQUEsRUFDQSxTQUFTO0FBQUEsSUFDUixZQUFZLENBQUMsUUFBUSxPQUFPLFFBQVEsT0FBTyxPQUFTO0FBQUEsSUFDcEQsT0FBTztBQUFBLE1BQ04sS0FBS0MsTUFBSyxRQUFRLGtDQUFXLE9BQU87QUFBQSxJQUNyQztBQUFBLEVBQ0Q7QUFBQSxFQUNBLE9BQU87QUFBQSxJQUNOLGVBQWU7QUFBQSxNQUNkLFVBQVU7QUFBQSxRQUNUO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsTUFDRDtBQUFBLElBQ0Q7QUFBQSxFQUNEO0FBQ0QsQ0FBQzsiLAogICJuYW1lcyI6IFsicGF0aCIsICJfX2Rpcm5hbWUiLCAiZmlsZVVSTFRvUGF0aCIsICJfX2Rpcm5hbWUiLCAiX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCIsICJfX2ZpbGVuYW1lIiwgInBhdGgiLCAiaW5saW5lRWRpdFBsdWdpbiIsICJwYXRoIl0KfQo=
