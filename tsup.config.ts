import { sassPlugin } from "esbuild-sass-plugin";
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  outDir: "dist",
  clean: true,
  banner: { js: "import './index.css';" },
  esbuildPlugins: [sassPlugin()],
  onSuccess: "cp src/font.scss dist/font.scss && cp -r src/font dist/",
});
