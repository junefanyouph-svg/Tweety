const fs = require('fs');
let content = fs.readFileSync('client/src/components/PostCard.jsx', 'utf8');

content = content.replace(/bg-\\[#1a1d27\\]/g, "bg-surface"); // This didn't work last time
content = content.replace(/bg-\\[#0a0c14\\]/g, "bg-black/5 flex justify-center"); // For the image
content = content.replace(/bg-\\[#0f1117\\]/g, "bg-bg-dark");

// Actually, JS regex literal for `bg-[#1a1d27]` is `/bg-\\[#1a1d27\\]/` no wait, it's `/bg-\\[#1a1d27\\]/g` in string but directly it's `/bg-\\[#1a1d27\\]/` wait...
// `[` is a special character. To match `[` literally we do `\[`.
// So `/bg-\\[#1a1d27\\]/` matches `bg-\[#1a1d27\]` not `bg-[#1a1d27]`.
// To match `bg-[#1a1d27]`, the regex is `/bg-\\[#1a1d27\\]/`. Wait, in JS, `\[` in a regex literal is just `\[`.
content = content.replace(/bg-\[#1a1d27\]/g, "bg-surface");
content = content.replace(/bg-\[#0a0c14\]/g, "bg-black/5 flex justify-center");
content = content.replace(/bg-\[#0f1117\]/g, "bg-bg-dark");
content = content.replace(/bg-\[#16181c\]/g, "bg-surface");

fs.writeFileSync('client/src/components/PostCard.jsx', content);
console.log("Replaced tailwind arbitrary brackets");
