import ghpages from 'gh-pages';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

// Cleanup
if (fs.existsSync(DIST)) {
    fs.rmSync(DIST, { recursive: true, force: true });
}
fs.mkdirSync(DIST);

// Copy helpers
function copy(src, dest) {
    const srcPath = path.join(ROOT, src);
    const destPath = path.join(DIST, dest);

    if (fs.statSync(srcPath).isDirectory()) {
        fs.mkdirSync(destPath, { recursive: true });
        fs.readdirSync(srcPath).forEach(file => {
            copy(path.join(src, file), path.join(dest, file));
        });
    } else {
        fs.copyFileSync(srcPath, destPath);
    }
}

console.log('📦 Building for deployment...');

try {
    copy('index.html', 'index.html');
    copy('css', 'css');
    copy('js', 'js');
    // Add other assets if needed (e.g. images folder if it exists)
    // copy('assets', 'assets'); 

    console.log('🚀 Deploying to GitHub Pages...');

    ghpages.publish(DIST, (err) => {
        if (err) {
            console.error('❌ Deployment failed:', err);
            process.exit(1);
        } else {
            console.log('✅ Deployment complete!');
        }
    });

} catch (err) {
    console.error('❌ Build failed:', err);
    process.exit(1);
}
