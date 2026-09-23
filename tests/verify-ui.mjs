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
    const demoStrokes = await page.locator('main line.marker-stroke').count()
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
  const input = page.getByRole('textbox', { name: 'Add a word' })
  const setWords = async (words) => {
    const clear = page.getByRole('button', { name: 'Clear all' })
    if (await clear.isVisible()) await clear.click()
    // Removing down to 1 word leaves no Clear all — pluck the last pill
    const lastPill = page.getByRole('button', { name: /^Remove / })
    if (await lastPill.count()) await lastPill.first().click()
    for (const w of words) {
      await input.fill(w)
      await input.press('Enter')
    }
  }

  await setWords(['PUZZLE', 'SEARCH', 'HIDDEN', 'LETTER', 'DIAGONAL'])
  await step('grid renders', async () => {
    const cells = page.getByRole('gridcell')
    await page.waitForFunction(() => document.querySelectorAll('main [role="gridcell"]').length === 225, null, { timeout: 3000 })
    record(`${label}/grid 15x15 at Classic`, true)
    void cells
  })
  record(`${label}/word count badge`, await page.getByText('5 words').isVisible())
  await page.screenshot({ path: `${SHOTS}/${label}-02-puzzle.png`, fullPage: true })

  // 3) validation: short word rejected inline, pill removal works
  await step('validation reports rejects', async () => {
    await input.fill('ab')
    await input.press('Enter')
    await page.getByRole('alert').filter({ hasText: /at least 3 letters/i }).waitFor({ timeout: 2000 })
    record(`${label}/short word rejected`, true)
  })
  await step('pill removal', async () => {
    await page.getByRole('button', { name: 'Remove DIAGONAL' }).click()
    await page.getByText('4 words').waitFor({ timeout: 2000 })
    record(`${label}/pill removes word`, true)
  })

  // 4) answers toggle draws marker strokes
  await step('answers toggle', async () => {
    await setWords(['PUZZLE', 'SEARCH', 'HIDDEN'])
    await page.getByRole('switch', { name: /show answers/i }).click()
    await page.waitForTimeout(600)
    const strokes = await page.locator('main line.marker-stroke').count()
    if (strokes !== 3) throw new Error(`expected 3 marker strokes, got ${strokes}`)
    record(`${label}/answer strokes drawn`, true, `${strokes} strokes`)
    await page.screenshot({ path: `${SHOTS}/${label}-03-answers.png`, fullPage: true })
    await page.getByRole('switch', { name: /show answers/i }).click()
  })

  // 5) shuffle regenerates
  await step('shuffle changes grid', async () => {
    const before = await page.locator('main').getByRole('grid').textContent()
    await page.getByRole('button', { name: /shuffle/i }).click()
    await page.waitForTimeout(200)
    const after = await page.locator('main').getByRole('grid').textContent()
    if (before === after) throw new Error('grid unchanged after shuffle')
    record(`${label}/shuffle regenerates`, true)
  })

  // 5b) puzzle number is the seed — typing the same № reproduces the grid
  await step('seed round-trip', async () => {
    const seedInput = page.getByRole('textbox', { name: 'Puzzle number' })
    await seedInput.fill('4242')
    await page.waitForTimeout(200)
    const original = await page.locator('main').getByRole('grid').textContent()
    await seedInput.fill('777')
    await page.waitForTimeout(200)
    const different = await page.locator('main').getByRole('grid').textContent()
    if (different === original) throw new Error('changing № did not change the grid')
    await seedInput.fill('4242')
    await page.waitForTimeout(200)
    const restored = await page.locator('main').getByRole('grid').textContent()
    if (restored !== original) throw new Error('same № did not reproduce the grid')
    record(`${label}/№ reproduces the puzzle`, true)
  })

  // 5c) sheet style + preview dialog
  await step('theme preset + preview', async () => {
    await page.getByRole('radio', { name: 'Dragons' }).click()
    await page.getByRole('button', { name: /preview/i }).click()
    const dialog = page.getByRole('dialog')
    await dialog.waitFor({ timeout: 2000 })
    const previewCells = await dialog.locator('[role="gridcell"]').count()
    if (previewCells !== 450) throw new Error(`expected 450 preview cells, got ${previewCells}`)
    const glyphs = await dialog.getByText('🐉').count()
    if (glyphs < 1) throw new Error('theme glyphs missing from preview')
    await page.keyboard.press('Escape')
    await dialog.waitFor({ state: 'hidden', timeout: 2000 })
    record(`${label}/theme + preview dialog`, true)
  })

  // 5d) direct print: print media shows the themed sheet, hides the app
  await step('print stylesheet', async () => {
    await page.waitForTimeout(200)
    await page.emulateMedia({ media: 'print' })
    const sheetVisible = await page.locator('.print-sheet').isVisible()
    const appHidden = await page.getByRole('textbox', { name: 'Add a word' }).isHidden()
    const themed = (await page.locator('.print-sheet').textContent())?.includes('🐉')
    if (!themed) throw new Error('theme glyphs missing from print sheet')
    const printCells = await page.locator('.print-sheet [role="gridcell"]').count()
    const keyStrokes = await page.locator('.print-sheet line.marker-stroke').count()
    await page.emulateMedia({ media: 'screen' })
    if (!sheetVisible) throw new Error('print sheet not visible in print media')
    if (!appHidden) throw new Error('app UI still visible in print media')
    if (printCells !== 450) throw new Error(`expected 450 print cells (2×15×15), got ${printCells}`)
    if (keyStrokes !== 3) throw new Error(`expected 3 answer-key strokes, got ${keyStrokes}`)
    record(`${label}/print sheet + answer key`, true)
  })

  // 6) unplaceable words surface honestly
  await step('unplaceable surfaced', async () => {
    // Force tiny grid via advanced controls, then overload it
    await page.getByRole('button', { name: /advanced/i }).click()
    const size = page.getByRole('slider', { name: 'Grid size' })
    await size.waitFor({ timeout: 2000 })
    await size.focus()
    for (let i = 0; i < 18; i++) await page.keyboard.press('ArrowLeft')
    await setWords(['AAAAAAAA', 'BBBBBBBB', 'CCCCCCCC', 'DDDDDDDD', 'EEEEEEEE', 'FFFFFFFF', 'GGGGGGGG', 'HHHHHHHH', 'IIIIIIII'])
    await page.getByText(/couldn't place/i).waitFor({ timeout: 3000 })
    record(`${label}/unplaced words reported`, true)
    await page.screenshot({ path: `${SHOTS}/${label}-04-unplaced.png`, fullPage: true })
  })

  // 7) PDF export produces a download
  await step('pdf export downloads', async () => {
    await setWords(['PUZZLE', 'SEARCH', 'HIDDEN'])
    await page.waitForTimeout(200)
    const downloadPromise = page.waitForEvent('download', { timeout: 15000 })
    await page.getByRole('button', { name: /^pdf$/i }).click()
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
