const fs = require('fs');
const path = require('path');

const dir = 'client/src';
const walk = (d) => {
  let results = [];
  const list = fs.readdirSync(d);
  list.forEach(file => {
    file = path.join(d, file);
    if (fs.statSync(file).isDirectory()) { 
      results = results.concat(walk(file));
    } else if (file.endsWith('.jsx')) { 
      results.push(file);
    }
  });
  return results;
}

const files = walk(dir);

const faToMaterial = {
  'arrow-left': 'arrow_back',
  'chevron-right': 'chevron_right',
  'chevron-down': 'expand_more',
  'xmark': 'close',
  'plus': 'add',
  'trash': 'delete',
  'trash-can': 'delete',
  'pen': 'edit',
  'rotate': 'autorenew',
  'spinner': 'autorenew',
  'circle-notch': 'autorenew',
  'film': 'movie',
  'envelope-circle-check': 'mark_email_read',
  'envelope-open': 'drafts',
  'bolt': 'electric_bolt',
  'face-smile': 'sentiment_satisfied',
  'feather': 'edit',
  'ellipsis': 'more_horiz',
  'check': 'check',
  'id-card': 'badge',
  'triangle-exclamation': 'warning',
  'circle-exclamation': 'error',
  'ban': 'block',
  'arrow-up': 'arrow_upward',
  'arrow-up-from-bracket': 'upload',
  'user': 'person',
  'id-card': 'badge',
  'gear': 'settings',
  'photo-film': 'photo_library',
  'comment': 'chat_bubble',
  'at': 'alternate_email',
  'heart': 'favorite',
  'envelope': 'mail',
  'house': 'home',
  'magnifying-glass': 'search',
  'bell': 'notifications',
  'camera': 'photo_camera',
  'right-from-bracket': 'logout',
  'arrow-right-arrow-left': 'swap_horiz',
  'reply': 'reply',
  'link': 'link',
  'image': 'image',
  'bolt': 'bolt'
}

let changedFiles = 0;
files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  let originalContent = content;
  
  // 1. Clean up "material-symbols-outlined -solid -[name]"
  // This regex matches the class pattern we accidentally created
  content = content.replace(/className=(["'])material-symbols-outlined\s+-(solid|regular)\s+-([a-z\-]+)(\s+([^"']*))?\1/g, (match, quote, type, faName, p4, extra) => {
    let matClass = 'material-symbols-outlined';
    if (type === 'solid') matClass += ' filled';
    if (extra) matClass += ' ' + extra.trim();
    return `className=${quote}${matClass}${quote}`;
  });

  // 2. Fix the inner text if it's one of the FA-named ones
  // We look for material-symbols-outlined spans specifically
  content = content.replace(/<span\s+([^>]*className=["'][^"']*material-symbols-outlined[^"']*["'][^>]*)>([\s\S]*?)<\/span>/g, (match, attrs, inner) => {
    // If the inner text is in our map, replace it
    const trimmedInner = inner.trim();
    if (faToMaterial[trimmedInner]) {
      return match.replace(inner, inner.replace(trimmedInner, faToMaterial[trimmedInner]));
    }
    return match;
  });
  
  // 3. Special case for -spin
  content = content.replace(/ -spin /g, ' animate-spin ');
  content = content.replace(/ -spin"/g, ' animate-spin"');
  content = content.replace(/ -spin'/g, " animate-spin'");

  if (content !== originalContent) {
    fs.writeFileSync(f, content, 'utf8');
    changedFiles++;
  }
});
console.log('Fixed artifacts in ' + changedFiles + ' files');
