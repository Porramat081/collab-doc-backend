#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Add .js extension to all relative imports in compiled files
function addJsExtensions(dir) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      addJsExtensions(filePath);
    } else if (file.endsWith(".js")) {
      let content = fs.readFileSync(filePath, "utf-8");

      // Add .js to relative imports: from "./path" or from './path'
      // Match both double and single quotes
      content = content.replace(
        /from\s+["'](\.[^"']*?)["']/g,
        (match, importPath) => {
          // Only add .js if not already present and not a JSON file
          if (!importPath.endsWith(".js") && !importPath.endsWith(".json")) {
            const quote = match.includes('"') ? '"' : "'";
            return `from ${quote}${importPath}.js${quote}`;
          }
          return match;
        },
      );

      fs.writeFileSync(filePath, content, "utf-8");
      console.log(`✓ Updated: ${filePath}`);
    }
  }
}

const distDir = path.join(__dirname, "dist");
console.log("Adding .js extensions to ESM imports...");
addJsExtensions(distDir);
console.log("✓ Done");
