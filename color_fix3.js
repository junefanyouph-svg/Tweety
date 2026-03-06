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

    newContent = newContent.replace(/#1a1d27/g, "var(--color-surface)");
    newContent = newContent.replace(/#0f1117/g, "var(--color-bg-dark)");
    newContent = newContent.replace(/#212433/g, "var(--color-border-dark)"); // For hover gradient substitute
    newContent = newContent.replace(/#2a2d3a/g, "var(--color-border-dark)");

    if (content !== newContent) {
        fs.writeFileSync(filePath, newContent);
        console.log("Updated gradients: " + filePath);
    }
};

traverseDir('client/src/styles', replaceColors);
traverseDir('client/src/components', replaceColors);
