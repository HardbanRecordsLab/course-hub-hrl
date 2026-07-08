// Postbuild: copy index.html to 404.html so Vercel serves SPA on unknown routes
const fs = require("fs");
const path = require("path");

const distDir = path.join(__dirname, "..", "dist");
const indexPath = path.join(distDir, "index.html");
const notFoundPath = path.join(distDir, "404.html");

if (fs.existsSync(indexPath)) {
  fs.copyFileSync(indexPath, notFoundPath);
  console.log("Copied index.html -> 404.html (SPA fallback)");
} else {
  console.warn("dist/index.html not found, skipping 404.html copy");
}
