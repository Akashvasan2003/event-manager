async function hydrate(page) {
  await page.waitForLoadState('networkidle').catch(() => {});
  for (let i = 0; i < 30; i++) {
    try {
      await page.locator('input[name="eventName"]').fill('X', { timeout: 2000 });
      await page.locator('input[name="eventName"]').fill('', { timeout: 2000 });
      return; // control accepted input — hydrated
    } catch { await page.waitForTimeout(1000); }
  }
  throw new Error('never hydrated');
}

async function clickNext(page) {
  for (let i = 0; i < 5; i++) {
    await page.locator('button[type="submit"]').click();
    try {
      await page.waitForFunction(
        () => !document.querySelector('input[name="eventName"]') ||
              document.querySelector('.card__title'),
        { timeout: 8000 }
      );
      return;
    } catch { /* retry */ }
  }
}

export default async function run(page, ui) {
  const results = { consoleErrors: [] };
  page.on('pageerror', (e) => results.consoleErrors.push(String(e)));
  await hydrate(page);

  await page.locator('input[name="eventName"]').fill('QA Smoke Event');
  await page.locator('select[name="eventType"]').selectOption('Wedding');
  await page.locator('input[name="location"]').fill('Chennai');
  await page.locator('input[name="startDate"]').fill('2026-11-01');
  await page.getByText('Event Planner', { exact: true }).click();
  await clickNext(page);
  results.step2 = (await page.locator('.card').innerText()).slice(0, 200);

  await page.locator('select[name="planningScope"]').selectOption('full');
  await page.locator('input[name="guestCount"]').fill('100');
  await page.locator('input[name="budgetMin"]').fill('50000');
  await page.locator('input[name="budgetMax"]').fill('150000');
  await page.getByText('Venue sourcing').click();
  await page.getByText('Catering arrangement').click();
  await clickNext(page);
  results.step3 = (await page.locator('.card').innerText()).slice(0, 200);

  await page.locator('select[name="planningTimeline"]').selectOption('1-3-months');
  await page.locator('input[name="coordinatorsNeeded"]').fill('2');
  await clickNext(page);
  results.step4 = (await page.locator('.card').innerText()).slice(0, 300);

  // Submit — backend unreachable from prod, expect graceful network-error banner
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(10000);
  results.afterSubmit = (await page.locator('.card').innerText()).slice(0, 200);
  return results;
}
