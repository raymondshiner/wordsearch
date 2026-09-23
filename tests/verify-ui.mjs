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

  // 1) header + empty state (demo puzzle with marker strokes)
  record(
    `${label}/header`,
    await page.getByRole('heading', { name: /word search generator/i }).isVisible(),
  )
  record(`${label}/empty state`, await page.getByText(/add a few words/i).isVisible())
  await step('empty-state demo puzzle', async () => {
    const demoStrokes = await page.locator('line.marker-stroke').count()
    if (demoStrokes !== 3) throw new Error(`expected 3 demo marker strokes, got ${demoStrokes}`)
    record(`${label}/demo puzzle marked`, true)
  })
  await page.screenshot({ path: `${SHOTS}/${label}-01-empty.png`, fullPage: true })

  // 1b) dark mode toggles a class on <html> and persists
  await step('dark mode toggle', async () => {
    const toggle = page.getByRole('button', { name: 'Toggle theme' })
    const wasDark = await page.evaluate(() => document.documentElement.classList.contains('dark'))
    await toggle.click()
    const nowDark = await page.evaluate(() => document.documentElement.classList.contains('dark'))
    if (nowDark === wasDark) throw new Error('theme class did not change')
    await page.screenshot({ path: `${SHOTS}/${label}-05-theme.png`, fullPage: true })
    await page.reload({ waitUntil: 'networkidle' })
    const persisted = await page.evaluate(() => document.documentElement.classList.contains('dark'))
    if (persisted !== nowDark) throw new Error('theme did not persist across reload')
    await toggle.click() // back to default for the rest of the run
    record(`${label}/dark mode toggles + persists`, true)
  })

  // 2) enter words → grid appears with word bank
  const input = page.getByRole('textbox', { name: 'Word list' })
  await input.fill('PUZZLE\nSEARCH\nHIDDEN\nLETTER\nDIAGONAL')
  await step('grid renders', async () => {
    const cells = page.getByRole('gridcell')
    await page.waitForFunction(() => document.querySelectorAll('[role="gridcell"]').length === 225, null, { timeout: 3000 })
    record(`${label}/grid 15x15 at Classic`, true)
    void cells
  })
  record(`${label}/word count badge`, await page.getByText('5 words').isVisible())
  await page.screenshot({ path: `${SHOTS}/${label}-02-puzzle.png`, fullPage: true })

  // 3) validation surfaces rejects
  await step('validation reports rejects', async () => {
    await input.fill('PUZZLE\nab\nSEARCH')
    await page.getByText(/some entries were skipped/i).waitFor({ timeout: 2000 })
    record(`${label}/short word rejected`, true)
  })

  // 4) answers toggle draws marker strokes
  await step('answers toggle', async () => {
    await input.fill('PUZZLE\nSEARCH\nHIDDEN')
    await page.getByRole('switch', { name: /show answers/i }).click()
    await page.waitForTimeout(600)
    const strokes = await page.locator('line.marker-stroke').count()
    if (strokes !== 3) throw new Error(`expected 3 marker strokes, got ${strokes}`)
    record(`${label}/answer strokes drawn`, true, `${strokes} strokes`)
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
