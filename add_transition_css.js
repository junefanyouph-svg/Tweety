const fs = require('fs');
let css = fs.readFileSync('client/src/index.css', 'utf8');

const tCss = `
::view-transition-old(root),
::view-transition-new(root) {
  animation: none;
  mix-blend-mode: normal;
}
::view-transition-image-pair(root) {
  isolation: auto;
}
::view-transition-old(root) {
  z-index: 1;
}
::view-transition-new(root) {
  z-index: 2;
}
`;

if (!css.includes('::view-transition-new(root)')) {
    css += tCss;
    fs.writeFileSync('client/src/index.css', css);
    console.log("Success");
}
