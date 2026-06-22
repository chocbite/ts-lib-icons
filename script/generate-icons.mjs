#!/usr/bin/env node
/**
 * generate-icons.mjs
 *
 * Fetches Google Material Icons (rounded variant) from the official
 * google/material-design-icons repository and generates one TypeScript
 * file per category under src/material/.
 * Also rewrites src/index.ts to export every generated category file.
 *
 * Usage:
 *   node script/generate-icons.mjs
 *
 * Prerequisites:
 *   git (must be available in PATH)
 */

import { readFileSync, writeFileSync, existsSync, rmSync, readdirSync, statSync, unlinkSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import { tmpdir } from "os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");

// ---------------------------------------------------------------------------
// Clone the official Google Material Design Icons repository
// ---------------------------------------------------------------------------
const REPO_URL = "https://github.com/google/material-design-icons.git";
const VARIANT = "materialiconsround";
const SVG_FILE = "24px.svg";

const tmpCloneDir = join(tmpdir(), "material-design-icons-generate");

if (existsSync(tmpCloneDir)) {
  console.log("Removing previous temporary clone...");
  rmSync(tmpCloneDir, { recursive: true, force: true });
}

console.log("Cloning google/material-design-icons (sparse, src/ only)...");
execSync(
  `git clone --depth 1 --no-tags --filter=blob:none --sparse "${REPO_URL}" "${tmpCloneDir}"`,
  { stdio: "inherit" },
);
execSync(`git sparse-checkout set src`, { cwd: tmpCloneDir, stdio: "pipe" });

const srcDir = join(tmpCloneDir, "src");

if (!existsSync(srcDir)) {
  console.error("Error: sparse checkout of src/ failed.");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Walk directory to build a category → sorted icon names map
// ---------------------------------------------------------------------------

/** @type {Map<string, string[]>} */
const categoryIcons = new Map();

for (const category of readdirSync(srcDir).sort()) {
  const catDir = join(srcDir, category);
  if (!statSync(catDir).isDirectory()) continue;

  const iconNames = readdirSync(catDir)
    .filter((entry) => statSync(join(catDir, entry)).isDirectory())
    .sort();

  categoryIcons.set(category, iconNames);
}

// ---------------------------------------------------------------------------
// Generate one TypeScript file per category
// ---------------------------------------------------------------------------
const generatedCategories = [];
let totalIcons = 0;
let totalSkipped = 0;

for (const [category, iconNames] of [...categoryIcons.entries()].sort(
  ([a], [b]) => a.localeCompare(b),
)) {
  const lines = [`import { generate_function } from "../shared";`, ``];
  let count = 0;

  for (const iconName of iconNames) {
    const svgPath = join(srcDir, category, iconName, VARIANT, SVG_FILE);

    if (!existsSync(svgPath)) {
      console.warn(
        `  [warn] ${VARIANT}/${SVG_FILE} not found for "${iconName}" (${category}) – skipped`,
      );
      totalSkipped++;
      continue;
    }

    // The SVG files are single-line; trim just in case
    const svgContent = readFileSync(svgPath, "utf-8").trim();
    const varName = `material_${category}_${iconName}_rounded`;

    lines.push(`//Generates ${iconName} icon`);
    lines.push(`export const ${varName} = generate_function(`);
    lines.push(`  "${varName}",`);
    lines.push(`  '${svgContent}',`);
    lines.push(`);`);
    lines.push(``);
    count++;
  }

  const outputPath = join(
    rootDir,
    "src",
    "material",
    `material-${category}.ts`,
  );
  writeFileSync(outputPath, lines.join("\n"), "utf-8");
  console.log(`Generated material-${category}.ts  (${count} icons)`);
  generatedCategories.push(category);
  totalIcons += count;
}

// ---------------------------------------------------------------------------
// Remove stale category files no longer present in the official source
// ---------------------------------------------------------------------------
const materialDir = join(rootDir, "src", "material");
const activeFiles = new Set(
  generatedCategories.map((cat) => `material-${cat}.ts`),
);

for (const file of readdirSync(materialDir)) {
  if (file.startsWith("material-") && file.endsWith(".ts") && !activeFiles.has(file)) {
    unlinkSync(join(materialDir, file));
    console.log(`Removed stale file: src/material/${file}`);
  }
}

// ---------------------------------------------------------------------------
// Rewrite src/index.ts
// ---------------------------------------------------------------------------
const indexLines = generatedCategories.map(
  (cat) => `export * from "./material/material-${cat}";`,
);
indexLines.push(`import "./font.scss";`);
indexLines.push(``);

const indexPath = join(rootDir, "src", "index.ts");
writeFileSync(indexPath, indexLines.join("\n"), "utf-8");
console.log(`\nUpdated src/index.ts (${generatedCategories.length} categories)`);

// ---------------------------------------------------------------------------
// Clean up temporary clone
// ---------------------------------------------------------------------------
rmSync(tmpCloneDir, { recursive: true, force: true });
console.log("Cleaned up temporary clone.");

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log(`\nDone.`);
console.log(`  Icons generated : ${totalIcons}`);
if (totalSkipped > 0) {
  console.log(`  Icons skipped   : ${totalSkipped}`);
}
