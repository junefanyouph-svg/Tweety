const fs = require('fs');
const path = require('path');

const dir = 'client/src';
const walk = (d) => {
  let results = [];
  const list = fs.readdirSync(d);
  list.forEach(file => {
    file = path.join(d, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else if (file.endsWith('.jsx')) { 
      results.push(file);
    }
  });
  return results;
}

const files = walk(dir);

const faToMaterial = {
  'house': 'home',
  'magnifying-glass': 'search',
  'bell': 'notifications',
  'envelope': 'mail',
  'user': 'person',
  'moon': 'dark_mode',
  'sun': 'light_mode',
  'gear': 'settings',
  'arrow-right-from-bracket': 'logout',
  'heart': 'favorite',
  'comment': 'chat_bubble',
  'user-plus': 'person_add',
  'at': 'alternate_email',
  'plus': 'add',
  'xmark': 'close',
  'image': 'image',
  'photo-film': 'photo_library',
  'camera': 'photo_camera',
  'circle-notch': 'autorenew',
  'chevron-right': 'chevron_right',
  'id-card': 'badge',
  'lock': 'lock',
  'triangle-exclamation': 'warning',
  'trash': 'delete',
  'trash-can': 'delete',
  'film': 'movie',
  'arrow-up-from-bracket': 'upload',
  'arrow-up': 'arrow_upward',
  'arrow-left': 'arrow_back',
  'face-smile': 'sentiment_satisfied',
  'ellipsis': 'more_horiz',
  'spinner': 'autorenew',
  'circle-exclamation': 'error',
  'check': 'check',
  'ban': 'block',
  'envelope-open': 'drafts',
  'envelope-circle-check': 'mark_email_read',
  'paper-plane': 'send',
  'feather': 'edit',
  'share-nodes': 'share',
  'rotate': 'autorenew',
  'retweet': 'repeat',
  'reply': 'reply',
  'globe': 'public',
  'link': 'link',
  'calendar-days': 'calendar_today',
  'cake-candles': 'cake',
  'arrow-up-right-from-square': 'open_in_new',
  'ellipsis-vertical': 'more_vert',
  'comment-dots': 'comment',
  'heart-crack': 'heart_broken',
  'chart-simple': 'bar_chart',
  'bookmark': 'bookmark'
}

let changedFiles = 0;

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  let originalContent = content;
  
  // Replace direct class mappings (icons like <i className="fa-solid fa-house"></i>)
  content = content.replace(/<i className="[^"]*fa-(solid|regular) fa-([a-z\-]+)[^"]*"(.*?)>([\s\S]*?)<\/i>/g, (match, type, iconName, extraAttrs, inner) => {
    // Check if we have a match in the map
    const matName = faToMaterial[iconName] || iconName;
    
    // We want to extract the extra classes to keep them
    // The previous regex captures ` extraAttrs` which is everything after the className end quote to the > 
    // Wait, the regex `className="...fa-icon..."` we also need to capture other classes in the className string.
    return match;
  });

  // A better regex: Parse out className string specifically.
  content = content.replace(/<(i|span)\s+([^>]*?)className=[\"']([^\"']*)[\"']([^>]*?)>([\s\S]*?)<\/(i|span)>/g, (match, tag, beforeClass, classStr, afterClass, inner, closeTag) => {
    let newClassStr = classStr;
    let isFa = false;
    let iconName = null;
    let isSolid = false;
    let isLightMode = classStr.includes('fa-moon') || classStr.includes('fa-sun'); // handle specific react fragments

    // It's possible for classStr to be a template literal if it's dynamic e.g. `\${isActive...}`
    // But since it's replacing statically, we should be careful.
    if (classStr.includes('fa-') || classStr.match(/\bfa\b/)) {
      isFa = true;
      const icons = [...classStr.matchAll(/fa-([a-z\-]+)/g)];
      icons.forEach(iMatch => {
        if (iMatch[1] === 'solid') isSolid = true;
        else if (iMatch[1] === 'regular') isSolid = false;
        else if (iMatch[1] !== 'spin' && iMatch[1] !== 'hollow' && iMatch[1] !== 'ul' && iMatch[1] !== 'li') {
          iconName = faToMaterial[iMatch[1]] || iMatch[1];
        }
      });
      
      // Remove all FA classes
      newClassStr = newClassStr.replace(/\bfa\b/g, '')
                               .replace(/\bfa-solid\b/g, '')
                               .replace(/\bfa-regular\b/g, '')
                               .replace(/\bfa-[a-z\-]+\b/g, '')
                               .replace(/\bfa-spin\b/g, 'animate-spin')
                               .trim();
                               
      // Make it material-symbols
      newClassStr = 'material-symbols-outlined ' + newClassStr;
      newClassStr = newClassStr.replace(/\s+/g, ' ').trim();
    }
    
    if (isFa && iconName) {
      // Return a span material icon
      return `<span ${beforeClass}className="${newClassStr}"${afterClass}>${inner}${iconName}</span>`;
    }
    
    return match;
  });

  if (content !== originalContent) {
    fs.writeFileSync(f, content, 'utf8');
    changedFiles++;
  }
});

console.log('Processed jsx files, changed:', changedFiles);
