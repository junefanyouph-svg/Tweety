const fs = require('fs');
let css = fs.readFileSync('client/src/index.css', 'utf8');
if (!css.includes('html.light-mode')) {
    css += `
html.light-mode {
  --color-bg-dark: #ffffff;
  --color-surface: #f7f9fa;
  --color-border-dark: #eff3f4;
  --color-text-main: #0f1419;
  --color-text-dim: #536471;
  --color-text-reply: #536471;
  --color-thread: #cfd9de;
}
`;
    fs.writeFileSync('client/src/index.css', css);
    console.log("Success");
}
