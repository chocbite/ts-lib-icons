#!/usr/bin/env node
/**
 * generate-icons.mjs
 *
 * Fetches Google Material Symbols (rounded variant) from the official
 * google/material-design-icons repository and generates one TypeScript
 * file under src/material/ containing the default 24px symbols only
 * (fill 0, grade 0, weight 400).
 * Also rewrites src/index.ts.
 *
 * Usage:
 *   node script/generate-icons.mjs
 *
 * Prerequisites:
 *   git (must be available in PATH)
 */

import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "fs";
import { execFileSync } from "child_process";
import { dirname, join } from "path";
import { tmpdir } from "os";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const materialDir = join(rootDir, "src", "material");
const outputFileName = "material-symbols-rounded.ts";
const outputPath = join(materialDir, outputFileName);
const indexPath = join(rootDir, "src", "index.ts");
const trialsPath = join(rootDir, "src", "trials.ts");

const REPO_URL = "https://github.com/google/material-design-icons.git";
const SYMBOLS_TREE = "symbols/web";
const VARIANT = "materialsymbolsrounded";
const SIZE = "24px";
const DEFAULT_SYMBOL_REGEX = new RegExp(
  String.raw`^symbols/web/([^/]+)/${VARIANT}/\1_${SIZE}\.svg$`,
);

const tmpCloneDir = mkdtempSync(join(tmpdir(), "material-design-icons-"));

try {
  console.log("Cloning google/material-design-icons...");
  execFileSync(
    "git",
    [
      "clone",
      "--depth",
      "1",
      "--no-tags",
      "--filter=blob:none",
      "--no-checkout",
      REPO_URL,
      tmpCloneDir,
    ],
    { stdio: "inherit" },
  );

  const trackedFilesOutput = execFileSync(
    "git",
    ["-C", tmpCloneDir, "ls-tree", "-r", "--name-only", "HEAD", "--", SYMBOLS_TREE],
    { encoding: "utf8" },
  );

  const symbols = trackedFilesOutput
    .split("\n")
    .map((path) => path.trim())
    .filter(Boolean)
    .map((path) => {
      const match = path.match(DEFAULT_SYMBOL_REGEX);
      if (!match) return null;
      return {
        path,
        iconName: match[1],
      };
    })
    .filter((entry) => entry !== null)
    .sort((a, b) => a.iconName.localeCompare(b.iconName));

  if (symbols.length === 0) {
    throw new Error("No default rounded 24px Material Symbols were found.");
  }

  console.log(`Checking out ${symbols.length} matching symbol SVGs...`);
  execFileSync(
    "git",
    ["-C", tmpCloneDir, "checkout-index", "--force", "--stdin"],
    {
      input: symbols.map(({ path }) => path).join("\n"),
      encoding: "utf8",
      stdio: ["pipe", "inherit", "inherit"],
    },
  );

  const lines = [`import { generate_function } from "../shared";`, ``];

  for (const { path, iconName } of symbols) {
    const svgPath = join(tmpCloneDir, path);
    const svgContent = readFileSync(svgPath, "utf-8").trim();
    const varName = `material_${iconName}_rounded`;

    lines.push(`//Generates ${iconName} icon`);
    lines.push(`export const ${varName} = generate_function(`);
    lines.push(`  ${JSON.stringify(varName)},`);
    lines.push(`  ${JSON.stringify(svgContent)},`);
    lines.push(`);`);
    lines.push("");
  }

  writeFileSync(outputPath, lines.join("\n"), "utf-8");
  console.log(`Generated src/material/${outputFileName} (${symbols.length} icons)`);

  for (const file of readdirSync(materialDir)) {
    if (file.endsWith(".ts") && file !== outputFileName) {
      unlinkSync(join(materialDir, file));
      console.log(`Removed stale file: src/material/${file}`);
    }
  }

  writeFileSync(
    indexPath,
    [
      `export * from "./material/${outputFileName.replace(/\.ts$/, "")}";`,
      `import "./font.scss";`,
      "",
    ].join("\n"),
    "utf-8",
  );
  console.log("Updated src/index.ts");

  writeFileSync(
    trialsPath,
    [
      `import * as materialSymbolsRounded from "./material/${outputFileName.replace(/\.ts$/, "")}";`,
      "",
      "const icons = {",
      `  "Material Symbols Rounded": materialSymbolsRounded,`,
      `} as { [key: string]: { [key: string]: () => SVGSVGElement } };`,
      "",
      "for (const category in icons) {",
      "  document.body.appendChild(document.createElement(\"h1\")).textContent =",
      "    category;",
      "  const button = document.body.appendChild(document.createElement(\"button\"));",
      '  button.textContent = "Generate";',
      "  const icons_div = document.body.appendChild(document.createElement(\"div\"));",
      "  button.addEventListener(\"click\", () => {",
      "    for (const icon in icons[category]) {",
      "      icons_div.appendChild(icons[category][icon]());",
      "    }",
      "  });",
      "}",
      "",
    ].join("\n"),
    "utf-8",
  );
  console.log("Updated src/trials.ts");

  console.log("\nDone.");
  console.log(`  Icons generated : ${symbols.length}`);
} finally {
  if (existsSync(tmpCloneDir)) {
    rmSync(tmpCloneDir, { recursive: true, force: true });
  }
}
