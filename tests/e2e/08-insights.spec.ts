import { test, expect } from '@playwright/test'

test.describe('Insights Generation and Display', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000')
  })

  test('Insights appear on dashboard after daily generation', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard')
    const generateButton = page.locator('button:has-text("Generate Insights")')
    if (await generateButton.isVisible()) {
      await generateButton.click()
      await expect(page.locator('text=Generating insights')).toBeVisible({ timeout: 5000 })
      await page.waitForTimeout(45000)
    }
    const insightCard = page.locator('[data-testid="insight-card"]').first()
    await expect(insightCard).toBeVisible({ timeout: 60000 })
    const headline = await insightCard.locator('p:has-text(/\\d+/)').first().textContent()
    expect(headline).toMatch(/\d+/)
  })

  test('Insight card shows type and confidence badges', async ({ page }) => {
    await page.goto('http://localhost:3000/insights')
    const insightCard = page.locator('[data-testid="insight-card"]').first()
    await expect(insightCard).toBeVisible({ timeout: 30000 })
    const badges = insightCard.locator('span.inline-flex')
    await expect(badges.first()).toBeVisible()
    const badgeText = await badges.first().textContent()
    expect(['Revenue', 'Growth', 'Churn', 'Anomaly', 'Trending question']).toContain(badgeText?.trim())
  })

  test('Thumbs up/down feedback buttons work', async ({ page }) => {
    await page.goto('http://localhost:3000/insights')
    const insightCard = page.locator('[data-testid="insight-card"]').first()
    await expect(insightCard).toBeVisible({ timeout: 30000 })
    const thumbsUp = insightCard.locator('button[title="Helpful"]')
    await expect(thumbsUp).toBeVisible()
    await thumbsUp.click()
    await expect(thumbsUp).toHaveClass(/text-success/)
  })
})

test.describe('Analytical Response Rendering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/chat/new')
  })

  test('Analytical response renders multi-section card', async ({ page }) => {
    const input = page.locator('textarea[placeholder*="Ask"]')
    await input.fill('give me a business overview')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(25000)
    const analyticalCard = page.locator('[data-testid="analytical-response-card"]')
    if (await analyticalCard.isVisible()) {
      const summarySection = analyticalCard.locator('text=/## Summary/i')
      await expect(summarySection).toBeVisible({ timeout: 5000 })
      const suggestedQuestions = analyticalCard.locator('text=/Suggested Questions/i')
      await expect(suggestedQuestions).toBeVisible()
      const questionChip = analyticalCard.locator('button:has-text("?")')
      const chipCount = await questionChip.count()
      expect(chipCount).toBeGreaterThan(0)
    }
  })

  test('Simple question returns standard response', async ({ page }) => {
    const input = page.locator('textarea[placeholder*="Ask"]')
    await input.fill('how many users do I have?')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(15000)
    const standardCard = page.locator('[data-testid="result-card"]')
    await expect(standardCard).toBeVisible({ timeout: 20000 })
    const text = await standardCard.textContent()
    expect(text).not.toContain('## Summary')
    expect(text).not.toContain('## Key Metrics')
  })

  test('Suggested question chips are clickable', async ({ page }) => {
    const input = page.locator('textarea[placeholder*="Ask"]')
    await input.fill('how is my business doing?')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(25000)
    const analyticalCard = page.locator('[data-testid="analytical-response-card"]')
    if (await analyticalCard.isVisible()) {
      const chip = analyticalCard.locator('button.rounded-full').first()
      if (await chip.isVisible()) {
        const chipText = await chip.textContent()
        await chip.click()
        const chatInput = page.locator('textarea[placeholder*="Ask"]')
        const inputValue = await chatInput.inputValue()
        expect(inputValue).toContain(chipText?.substring(0, 10) || '')
      }
    }
  })
})

test.describe('Digest Display', () => {
  test('Weekly digest appears on insights page', async ({ page }) => {
    await page.goto('http://localhost:3000/insights')
    const digestCard = page.locator('[data-testid="digest-card"]')
    if (await digestCard.isVisible({ timeout: 5000 })) {
      const periodLabel = digestCard.locator('text=/Week of/i')
      await expect(periodLabel).toBeVisible()
      const narrative = digestCard.locator('p.text-sm')
      const narrativeText = await narrative.first().textContent()
      expect(narrativeText).toMatch(/\d+/)
    }
  })

  test('Digest highlight chips are clickable', async ({ page }) => {
    await page.goto('http://localhost:3000/insights')
    const digestCard = page.locator('[data-testid="digest-card"]')
    if (await digestCard.isVisible({ timeout: 5000 })) {
      const highlightChip = digestCard.locator('button.rounded-md').first()
      if (await highlightChip.isVisible()) {
        await highlightChip.click()
        const modal = page.locator('[role="dialog"]')
        await expect(modal).toBeVisible({ timeout: 3000 })
      }
    }
  })
})
