const fs = require('fs');
const path = require('path');

const traverseDir = (dir, callback) => {
    fs.readdirSync(dir).forEach(file => {
        let fullPath = path.join(dir, file);
        if (fs.lstatSync(fullPath).isDirectory()) {
            traverseDir(fullPath, callback);
        } else {
            callback(fullPath);
        }
    });
};

const replaceColors = (filePath) => {
    if (!filePath.endsWith('.js') && !filePath.endsWith('.jsx')) return;

    let content = fs.readFileSync(filePath, 'utf8');
    let newContent = content;

    // For JS JS inline styles:
    newContent = newContent.replace(/'#1a1d27'/g, "'var(--color-surface)'");
    newContent = newContent.replace(/'#0f1117'/g, "'var(--color-bg-dark)'");
    newContent = newContent.replace(/'#2a2d3a'/g, "'var(--color-border-dark)'");
    newContent = newContent.replace(/'#e8e8e8'/g, "'var(--color-text-main)'");
    newContent = newContent.replace(/'#555'/g, "'var(--color-text-dim)'");
    newContent = newContent.replace(/'#ccc'/g, "'var(--color-text-reply)'");
    newContent = newContent.replace(/'#cfd9de'/g, "'var(--color-thread)'");
    newContent = newContent.replace(/'#38444d'/g, "'var(--color-thread)'");

    // In PostCard.jsx there are tailwind classes
    newContent = newContent.replace(/bg-\\[#1a1d27\\]/g, "bg-surface"); // Using regex string backslashes properly

    if (content !== newContent) {
        fs.writeFileSync(filePath, newContent);
        console.log("Updated: " + filePath);
    }
};

traverseDir('client/src/styles', replaceColors);
traverseDir('client/src/components', replaceColors);
