/**
 * Rename per CONVENTIONS:
 * - multi-word directories → kebab-case
 * - component .tsx files (camelCase) → PascalCase
 * - skip: components/ui, hooks, *.ts non-components, route file basenames stay
 *   (route dirs still kebab); update imports across src
 */
import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'

const ROOT = path.resolve('src')

function isCamelCaseSegment(name) {
  return /^[a-z][a-zA-Z0-9]*[A-Z][a-zA-Z0-9]*$/.test(name)
}

function camelToKebab(name) {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .toLowerCase()
}

function camelToPascal(name) {
  return name.charAt(0).toUpperCase() + name.slice(1)
}

function walkDirs(dir, list = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!ent.isDirectory()) continue
    if (ent.name === 'node_modules' || ent.name === 'ui') {
      // still walk into non-ui; skip walking into ui children for renames of ui itself
    }
    const full = path.join(dir, ent.name)
    if (ent.name !== 'ui' || path.basename(dir) !== 'components') {
      walkDirs(full, list)
    }
    list.push(full)
  }
  return list
}

function walkFiles(dir, list = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name)
    if (ent.isDirectory()) {
      if (ent.name === 'ui' && path.basename(dir) === 'components') continue
      walkFiles(full, list)
      continue
    }
    list.push(full)
  }
  return list
}

function shouldPascalCaseFile(filePath) {
  const rel = path.relative(ROOT, filePath).replaceAll('\\', '/')
  const base = path.basename(filePath)
  const ext = path.extname(base)
  const stem = base.slice(0, -ext.length)

  if (ext !== '.tsx') return false
  if (stem === 'index' || stem === 'main' || stem === 'route') return false
  if (!isCamelCaseSegment(stem)) return false
  // hooks stay camelCase (useXxx)
  if (rel.startsWith('hooks/')) return false
  // route module files: keep basename to avoid URL surprises; dirs still renamed
  if (rel.startsWith('routes/')) return false
  // generated
  if (base.includes('.gen.')) return false
  return true
}

function gitMv(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true })
  // case-only rename needs two steps on case-insensitive FS
  if (from.toLowerCase() === to.toLowerCase() && from !== to) {
    const tmp = `${from}__rename_tmp__`
    execSync(`git mv "${from}" "${tmp}"`, { stdio: 'pipe' })
    execSync(`git mv "${tmp}" "${to}"`, { stdio: 'pipe' })
  } else {
    try {
      execSync(`git mv "${from}" "${to}"`, { stdio: 'pipe' })
    } catch {
      fs.renameSync(from, to)
      execSync(`git add -A -- "${from}" "${to}"`, { stdio: 'pipe' })
    }
  }
}

// --- 1) rename directories (deepest first) ---
const dirs = walkDirs(ROOT)
  .filter((d) => isCamelCaseSegment(path.basename(d)))
  .sort((a, b) => b.length - a.length)

const dirRenames = []
for (const dir of dirs) {
  const parent = path.dirname(dir)
  const next = path.join(parent, camelToKebab(path.basename(dir)))
  if (next === dir) continue
  if (fs.existsSync(next)) {
    console.error('Target dir exists, skip:', next)
    continue
  }
  console.log('DIR', path.relative(ROOT, dir), '→', path.relative(ROOT, next))
  gitMv(dir, next)
  dirRenames.push([
    path.relative(ROOT, dir).replaceAll('\\', '/'),
    path.relative(ROOT, next).replaceAll('\\', '/'),
  ])
}

// --- 2) rename component files ---
const files = walkFiles(ROOT).filter(shouldPascalCaseFile)
const fileRenames = []
for (const file of files) {
  const parent = path.dirname(file)
  const ext = path.extname(file)
  const stem = path.basename(file, ext)
  const next = path.join(parent, camelToPascal(stem) + ext)
  if (next === file) continue
  console.log('FILE', path.relative(ROOT, file), '→', path.relative(ROOT, next))
  gitMv(file, next)
  fileRenames.push([
    path.relative(ROOT, file).replaceAll('\\', '/'),
    path.relative(ROOT, next).replaceAll('\\', '/'),
  ])
}

// --- 3) rewrite imports / path strings ---
const allRenames = [...dirRenames, ...fileRenames].sort(
  (a, b) => b[0].length - a[0].length
)

function rewriteContent(content) {
  let next = content
  for (const [from, to] of allRenames) {
    // path segments and import specifiers
    next = next.split(from).join(to)
    // bare module names without folders (./hoverVideoThumb)
    const fromBase = from.split('/').pop().replace(/\.tsx?$/, '')
    const toBase = to.split('/').pop().replace(/\.tsx?$/, '')
    if (fromBase && toBase && fromBase !== toBase) {
      next = next.replaceAll(`./${fromBase}'`, `./${toBase}'`)
      next = next.replaceAll(`./${fromBase}"`, `./${toBase}"`)
      next = next.replaceAll(`../${fromBase}'`, `../${toBase}'`)
      next = next.replaceAll(`../${fromBase}"`, `../${toBase}"`)
      // deeper relative
      next = next.replaceAll(`/${fromBase}'`, `/${toBase}'`)
      next = next.replaceAll(`/${fromBase}"`, `/${toBase}"`)
    }
  }
  return next
}

const textFiles = walkFiles(ROOT).filter((f) =>
  /\.(tsx?|jsx?|md|json)$/.test(f)
)
let rewritten = 0
for (const file of textFiles) {
  const before = fs.readFileSync(file, 'utf8')
  const after = rewriteContent(before)
  if (after !== before) {
    fs.writeFileSync(file, after)
    rewritten++
  }
}

console.log(
  `\nDone. dirs=${dirRenames.length} files=${fileRenames.length} rewritten=${rewritten}`
)
