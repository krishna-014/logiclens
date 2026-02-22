import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

// Copy helpers
function copy(src, dest) {
    const srcPath = path.join(ROOT, src);
    const destPath = path.join(DIST, dest);

    if (fs.statSync(srcPath).isDirectory()) {
        if (!fs.existsSync(destPath)) fs.mkdirSync(destPath, { recursive: true });
        fs.readdirSync(srcPath).forEach(file => {
            copy(path.join(src, file), path.join(dest, file));
        });
    } else {
        fs.copyFileSync(srcPath, destPath);
    }
}

console.log('📦 Building for deployment...');

// Cleanup
if (fs.existsSync(DIST)) {
    fs.rmSync(DIST, { recursive: true, force: true });
}
fs.mkdirSync(DIST);

try {
    copy('index.html', 'index.html');
    copy('css', 'css');
    copy('js', 'js');

    // Create .nojekyll to prevent GH Pages from ignoring underscore files
    fs.writeFileSync(path.join(DIST, '.nojekyll'), '');

    console.log('🚀 Deploying to GitHub Pages (Manual Git)...');

    // Get remote URL
    const remoteUrl = execSync('git remote get-url origin', { cwd: ROOT, encoding: 'utf8' }).trim();
    console.log(`Target Remote: ${remoteUrl}`);

    const exec = (cmd) => {
        console.log(`> ${cmd}`);
        execSync(cmd, { cwd: DIST, stdio: 'inherit' });
    };

    exec('git init');
    exec('git add .');
    exec('git commit -m "Deploy to GitHub Pages"');
    exec('git branch -M main');
    exec(`git push -f ${remoteUrl} HEAD:gh-pages`); // Pushing current HEAD to remote gh-pages branch

    console.log('✅ Deployment complete!');

} catch (err) {
    console.error('❌ Deployment failed:', err);
    process.exit(1);
}
