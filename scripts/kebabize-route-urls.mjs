/**
 * Rename camelCase route files → kebab-case URLs; update createFileRoute + app links.
 */
import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'

const ROUTES = path.resolve('src/routes')
const SRC = path.resolve('src')

function toKebab(stem) {
  return stem
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .replace(/([a-zA-Z])(\d+)/g, '$1-$2')
    .toLowerCase()
}

function isCamelStem(stem) {
  return /[a-z][A-Z]/.test(stem) || /[a-zA-Z]\d/.test(stem) && /[A-Z]/.test(stem)
}

function walkFiles(dir, list = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name)
    if (ent.isDirectory()) walkFiles(full, list)
    else list.push(full)
  }
  return list
}

function gitMv(from, to) {
  if (from === to) return
  fs.mkdirSync(path.dirname(to), { recursive: true })
  if (from.toLowerCase() === to.toLowerCase()) {
    const tmp = `${from}__tmp_route__`
    execSync(`git mv "${from}" "${tmp}"`, { stdio: 'pipe' })
    execSync(`git mv "${tmp}" "${to}"`, { stdio: 'pipe' })
  } else {
    try {
      execSync(`git mv "${from}" "${to}"`, { stdio: 'pipe' })
    } catch {
      fs.renameSync(from, to)
      execSync(`git add -A -- "${to}"`, { stdio: 'pipe' })
    }
  }
}

const files = walkFiles(ROUTES).filter((f) => /\.tsx$/.test(f))
const renames = [] // { fromRel, toRel, fromStem, toStem }

for (const file of files) {
  const base = path.basename(file)
  if (base === 'route.tsx' || base === '__root.tsx') continue
  const ext = path.extname(base)
  const stem = base.slice(0, -ext.length)
  if (stem === 'index') continue
  if (!/[A-Z]/.test(stem) && !/[a-z]\d/.test(stem)) continue
  // only rename if camelCase or has digit glued (signIn2)
  if (!/[a-z][A-Z]/.test(stem) && !/[A-Za-z]\d/.test(stem)) continue
  if (!/[a-z][A-Z]/.test(stem) && /^[a-z]+\d+$/.test(stem)) {
    // pure like foo2 - still kebab digit
  }
  if (!/[a-z][A-Z]/.test(stem) && !/[A-Z]/.test(stem)) continue

  const nextStem = toKebab(stem)
  if (nextStem === stem) continue
  const next = path.join(path.dirname(file), nextStem + ext)
  console.log('ROUTE', path.relative(ROUTES, file), '→', path.relative(ROUTES, next))
  gitMv(file, next)
  renames.push({
    fromStem: stem,
    toStem: nextStem,
  })
}

// Sort longer stems first to avoid partial replaces (signIn2 before signIn)
renames.sort((a, b) => b.fromStem.length - a.fromStem.length)

function rewriteText(text) {
  let next = text
  for (const { fromStem, toStem } of renames) {
    // createFileRoute path segments
    next = next.replaceAll(`/${fromStem}`, `/${toStem}`)
    next = next.replaceAll(`/${fromStem}'`, `/${toStem}'`)
    next = next.replaceAll(`/${fromStem}"`, `/${toStem}"`)
    next = next.replaceAll(`/${fromStem}/`, `/${toStem}/`)
    // quoted absolute urls
    next = next.replaceAll(`'/${fromStem}'`, `'/${toStem}'`)
    next = next.replaceAll(`"/${fromStem}"`, `"/${toStem}"`)
    next = next.replaceAll(`\`/${fromStem}\``, `\`/${toStem}\``)
    next = next.replaceAll(`'/${fromStem}/`, `'/${toStem}/`)
    next = next.replaceAll(`"/${fromStem}/`, `"/${toStem}/`)
    // url: '/foo'
    next = next.replaceAll(`url: '/${fromStem}'`, `url: '/${toStem}'`)
    next = next.replaceAll(`url: "/${fromStem}"`, `url: "/${toStem}"`)
  }
  return next
}

let rewritten = 0
for (const file of walkFiles(SRC)) {
  if (!/\.(tsx?|jsx?)$/.test(file)) continue
  const before = fs.readFileSync(file, 'utf8')
  const after = rewriteText(before)
  if (after !== before) {
    fs.writeFileSync(file, after)
    rewritten++
    console.log('rewrite', path.relative(SRC, file))
  }
}

console.log(`\nDone. renames=${renames.length} rewritten=${rewritten}`)
console.log(renames.map((r) => `${r.fromStem} → ${r.toStem}`).join('\n'))
