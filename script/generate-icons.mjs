#!/usr/bin/env node
/**
 * generate-icons.mjs
 *
 * Reads Google Material Icons (rounded variant) from the @material-icons/svg
 * package and generates one TypeScript file per category under src/material/.
 * Also rewrites src/index.ts to export every generated category file.
 *
 * Usage:
 *   node script/generate-icons.mjs
 *
 * Prerequisites:
 *   npm install   (installs @material-icons/svg devDependency)
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");

// ---------------------------------------------------------------------------
// Paths inside the @material-icons/svg package
// ---------------------------------------------------------------------------
const pkgDataPath = join(
  rootDir,
  "node_modules/@material-icons/svg/data.json",
);
const pkgSvgDir = join(rootDir, "node_modules/@material-icons/svg/svg");

if (!existsSync(pkgDataPath)) {
  console.error(
    "Error: @material-icons/svg is not installed.\n" +
      "Run `npm install` from the repository root first.",
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Load icon metadata
// ---------------------------------------------------------------------------
const data = JSON.parse(readFileSync(pkgDataPath, "utf-8"));

/** @type {{ name: string; categories: string[] }[]} */
const icons = data.icons;

// ---------------------------------------------------------------------------
// Build a category → sorted icon names map
// ---------------------------------------------------------------------------

/** @type {Map<string, string[]>} */
const categoryIcons = new Map();

for (const icon of icons) {
  for (const cat of icon.categories ?? []) {
    if (!categoryIcons.has(cat)) {
      categoryIcons.set(cat, []);
    }
    categoryIcons.get(cat).push(icon.name);
  }
}

// Sort icon names within each category for a stable, deterministic output
for (const names of categoryIcons.values()) {
  names.sort();
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
    const svgPath = join(pkgSvgDir, iconName, "round.svg");

    if (!existsSync(svgPath)) {
      console.warn(
        `  [warn] round.svg not found for "${iconName}" (${category}) – skipped`,
      );
      totalSkipped++;
      continue;
    }

    // The SVG files are already single-line; trim just in case
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
// Summary
// ---------------------------------------------------------------------------
console.log(`\nDone.`);
console.log(`  Icons generated : ${totalIcons}`);
if (totalSkipped > 0) {
  console.log(`  Icons skipped   : ${totalSkipped}`);
}
