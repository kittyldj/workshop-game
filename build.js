/* 把 template.html + three.min.js + game.js 拼成一个可双击运行的单文件
   用法：node build.js   ->  生成 index.html（同时就是 GitHub Pages 的入口） */
const fs = require('fs');
const path = require('path');
const root = __dirname;

const tpl = fs.readFileSync(path.join(root, 'src', 'template.html'), 'utf8');
const three = fs.readFileSync(path.join(root, 'src', 'three.min.js'), 'utf8');
const game = fs.readFileSync(path.join(root, 'src', 'game.js'), 'utf8');

let out = tpl.replace('<script>/*__THREE__*/</script>', () => '<script>\n' + three + '\n</script>');
out = out.replace('<script>/*__GAME__*/</script>', () => '<script>\n' + game + '\n</script>');

const dest = path.join(root, 'index.html');
fs.writeFileSync(dest, out, 'utf8');
console.log('已生成', dest);
console.log('体积', (Buffer.byteLength(out, 'utf8') / 1024).toFixed(0) + ' KB');
