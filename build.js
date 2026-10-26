const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const distDir = path.join(rootDir, 'dist');

console.log('Building Swan Studio static distribution for Catalyst...');

// Clean dist directory
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir, { recursive: true });

// Directories to copy to dist
const dirsToCopy = ['css', 'js', 'assets', 'admin', 'uploads', 'data'];

for (const dir of dirsToCopy) {
  const src = path.join(rootDir, dir);
  const dest = path.join(distDir, dir);
  if (fs.existsSync(src)) {
    fs.cpSync(src, dest, { recursive: true });
    console.log(`Copied directory: ${dir} -> dist/${dir}`);
  }
}

// Copy top-level static files (HTML, favicon, robots, sitemap)
const files = fs.readdirSync(rootDir);
for (const file of files) {
  if (
    file.endsWith('.html') ||
    file === 'favicon.ico' ||
    file === 'robots.txt' ||
    file === 'sitemap.xml'
  ) {
    const src = path.join(rootDir, file);
    const dest = path.join(distDir, file);
    fs.copyFileSync(src, dest);
    console.log(`Copied file: ${file} -> dist/${file}`);
  }
}

console.log('Build completed successfully: dist/ directory populated.');
