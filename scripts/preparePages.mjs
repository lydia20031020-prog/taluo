import {copyFile, readFile, writeFile} from 'node:fs/promises'

const publicPath = process.env.TARO_APP_PUBLIC_PATH || '/'
const prefix = publicPath === '/' ? '/' : `/${publicPath.replace(/^\/+|\/+$/g, '')}/`
const indexPath = 'dist/index.html'

let html = await readFile(indexPath, 'utf8')
if (prefix !== '/') {
  const alreadyPrefixed = prefix.slice(1).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  html = html.replace(new RegExp(`(\\s(?:src|href)=")\\/(?!${alreadyPrefixed})`, 'g'), `$1${prefix}`)
}

await writeFile(indexPath, html)
await copyFile(indexPath, 'dist/404.html')
console.log(`Prepared GitHub Pages artifact with public path ${prefix}`)
