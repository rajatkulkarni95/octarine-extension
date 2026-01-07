import { Resvg } from '@resvg/resvg-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const iconsDir = path.join(rootDir, 'public', 'icons');

const sizes = [16, 32, 48, 128];

const svgPath = path.join(iconsDir, 'favicon.svg');
const svgContent = fs.readFileSync(svgPath, 'utf8');

for (const size of sizes) {
  const resvg = new Resvg(svgContent, {
    fitTo: {
      mode: 'width',
      value: size,
    },
  });
  
  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();
  
  const outputPath = path.join(iconsDir, `icon${size}.png`);
  fs.writeFileSync(outputPath, pngBuffer);
  console.log(`Generated ${outputPath}`);
}

console.log('Done!');
