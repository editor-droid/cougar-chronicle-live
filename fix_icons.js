const fs = require('fs');
let rtf = fs.readFileSync('src/components/RichTextEditor.tsx', 'utf8');

rtf = rtf.replace(/Youtube as Video,/, 'Video, Camera,');
rtf = rtf.replace(/<Instagram size=\{20\} \/>/g, '<Camera size={20} />');
rtf = rtf.replace(/<Instagram size=\{15\} \/>/g, '<Camera size={15} />');

fs.writeFileSync('src/components/RichTextEditor.tsx', rtf);
console.log('Fixed icons');
