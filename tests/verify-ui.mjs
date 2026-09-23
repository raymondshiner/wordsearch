// Headless UI verification — drives Playwright against the dev server.
// Usage: node tests/verify-ui.mjs   (BASE_URL env, defaults to :5291)
import { chromium, devices } from 'playwright'

const BASE = process.env.BASE_URL ?? 'http://localhost:5291/'
const SHOTS = '/tmp/wordsearch-shots'

const results = []
const record = (name, ok, detail = '') => {
  results.push({ name, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)
}

async function verify(label, ctx) {
  const page = await ctx.newPage()
  page.on('pageerror', (err) => record(`${label}/no-page-errors`, false, err.message))
  await page.goto(BASE, { waitUntil: 'networkidle' })
  const step = async (name, fn) => {
    try {
      await fn()
    } catch (e) {
      record(`${label}/${name}`, false, String(e?.message ?? e).split('\n')[0])
    }
  }

  // 1) header + empty state
  const heading = await page.getByRole('heading', { level: 1 }).textContent()
  record(`${label}/header`, /word search generator/i.test(heading ?? ''), heading?.trim())
  record(`${label}/empty state`, await page.getByText(/add a few words/i).isVisible())
  await page.screenshot({ path: `${SHOTS}/${label}-01-empty.png`, fullPage: true })

  // 2) enter words → grid appears with word bank
  const input = page.getByRole('textbox', { name: 'Word list' })
  await input.fill('PUZZLE\nSEARCH\nHIDDEN\nLETTER\nDIAGONAL')
  await step('grid renders', async () => {
    const grid = page.getByRole('grid')
    await grid.waitFor({ timeout: 3000 })
    const cells = await page.getByRole('gridcell').count()
    if (cells !== 15 * 15) throw new Error(`expected 225 cells at default difficulty, got ${cells}`)
    record(`${label}/grid 15x15 at Classic`, true)
  })
  record(`${label}/word count badge`, await page.getByText('5 words').isVisible())
  await page.screenshot({ path: `${SHOTS}/${label}-02-puzzle.png`, fullPage: true })

  // 3) validation surfaces rejects
  await step('validation reports rejects', async () => {
    await input.fill('PUZZLE\nab\nSEARCH')
    await page.getByText(/some entries were skipped/i).waitFor({ timeout: 2000 })
    record(`${label}/short word rejected`, true)
  })

  // 4) answers toggle highlights cells
  await step('answers toggle', async () => {
    await input.fill('PUZZLE\nSEARCH\nHIDDEN')
    await page.getByRole('switch', { name: /show answers/i }).click()
    await page.waitForTimeout(150)
    const highlighted = await page.locator('[role="gridcell"].bg-primary').count()
    if (highlighted < 16) throw new Error(`expected ≥16 highlighted cells, got ${highlighted}`)
    record(`${label}/answer cells highlighted`, true, `${highlighted} cells`)
    await page.screenshot({ path: `${SHOTS}/${label}-03-answers.png`, fullPage: true })
    await page.getByRole('switch', { name: /show answers/i }).click()
  })

  // 5) shuffle regenerates
  await step('shuffle changes grid', async () => {
    const before = await page.getByRole('grid').textContent()
    await page.getByRole('button', { name: /shuffle/i }).click()
    await page.waitForTimeout(200)
    const after = await page.getByRole('grid').textContent()
    if (before === after) throw new Error('grid unchanged after shuffle')
    record(`${label}/shuffle regenerates`, true)
  })

  // 6) unplaceable words surface honestly
  await step('unplaceable surfaced', async () => {
    // Force tiny grid via advanced controls, then overload it
    await page.getByRole('button', { name: /advanced/i }).click()
    const size = page.getByRole('slider', { name: 'Grid size' })
    await size.waitFor({ timeout: 2000 })
    await size.focus()
    for (let i = 0; i < 18; i++) await page.keyboard.press('ArrowLeft')
    await input.fill('AAAAAAAA\nBBBBBBBB\nCCCCCCCC\nDDDDDDDD\nEEEEEEEE\nFFFFFFFF\nGGGGGGGG\nHHHHHHHH\nIIIIIIII')
    await page.getByText(/couldn't place/i).waitFor({ timeout: 3000 })
    record(`${label}/unplaced words reported`, true)
    await page.screenshot({ path: `${SHOTS}/${label}-04-unplaced.png`, fullPage: true })
  })

  // 7) PDF export produces a download
  await step('pdf export downloads', async () => {
    await input.fill('PUZZLE\nSEARCH\nHIDDEN')
    await page.waitForTimeout(200)
    const downloadPromise = page.waitForEvent('download', { timeout: 15000 })
    await page.getByRole('button', { name: /export pdf/i }).click()
    const download = await downloadPromise
    const name = download.suggestedFilename()
    if (!/wordsearch-\d+\.pdf/.test(name)) throw new Error(`bad filename ${name}`)
    record(`${label}/pdf downloaded`, true, name)
  })

  await page.close()
}

const browser = await chromium.launch({ headless: true })
try {
  const desktopCtx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  await verify('desktop', desktopCtx)
  await desktopCtx.close()

  const mobileCtx = await browser.newContext({ ...devices['iPhone 13'] })
  await verify('mobile', mobileCtx)
  await mobileCtx.close()
} finally {
  await browser.close()
}

const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
if (failed.length > 0) {
  console.log('FAILURES:')
  failed.forEach((f) => console.log(`  - ${f.name}: ${f.detail}`))
}
process.exit(failed.length === 0 ? 0 : 1)
