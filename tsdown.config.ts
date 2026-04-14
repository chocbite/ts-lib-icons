import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { defineConfig } from "tsdown";

export default defineConfig({
  banner: { js: "import './style.css';" },
  sourcemap: "inline",
  plugins: [
    {
      name: "inline-woff2",
      transform(code, id) {
        if (id.endsWith(".scss") || id.endsWith(".css")) {
          const replaced = code.replace(
            /url\(["']?(\.[^"')]+\.woff2)["']?\)/g,
            (_match, relPath: string) => {
              const abs = resolve(dirname(id), relPath);
              const b64 = readFileSync(abs).toString("base64");
              return `url("data:font/woff2;base64,${b64}")`;
            },
          );
          if (replaced !== code) return replaced;
        }
      },
    },
  ],
  deps: {
    skipNodeModulesBundle: true,
  },
});
