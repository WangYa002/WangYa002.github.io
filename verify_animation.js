const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  // Clear sessionStorage so intro animation shows
  await page.goto('http://localhost:5176');
  await page.evaluate(() => sessionStorage.removeItem('intro_shown'));
  await page.reload({ waitUntil: 'networkidle' });

  // Step 1: Capture the intro overlay state
  await page.waitForTimeout(2500); // wait for char animations to complete
  await page.screenshot({ path: 'verify_01_intro_overlay.png', fullPage: false });
  console.log('Screenshot 1: intro overlay captured');

  // Step 2: Check that key elements are visible and not clipped
  const titleChars = await page.$$('.title-char');
  const btn = await page.$('.enter-btn');
  const logo = await page.$('.intro-logo');
  const sub = await page.$('.intro-sub');

  console.log(`Title chars found: ${titleChars.length}`);
  console.log(`Button found: ${!!btn}`);
  console.log(`Logo found: ${!!logo}`);
  console.log(`Subtitle found: ${!!sub}`);

  // Check button visibility
  const btnBox = await btn.boundingBox();
  console.log(`Button bounding box: ${JSON.stringify(btnBox)}`);

  // Check title chars aren't clipped
  for (let i = 0; i < titleChars.length; i++) {
    const box = await titleChars[i].boundingBox();
    console.log(`Char ${i} box: ${JSON.stringify(box)}`);
    if (box && (box.y < 0 || box.y + box.height > 800)) {
      console.log(`WARNING: Char ${i} may be clipped!`);
    }
  }

  // Check subtitle not clipped
  const subBox = await sub.boundingBox();
  console.log(`Subtitle box: ${JSON.stringify(subBox)}`);
  if (subBox && (subBox.y < 0 || subBox.y + subBox.height > 800)) {
    console.log('WARNING: Subtitle may be clipped!');
  }

  // Step 3: Click the WELCOME button
  await btn.click();
  console.log('Clicked WELCOME button');

  // Capture mid-animation state
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'verify_02_scatter_mid.png', fullPage: false });
  console.log('Screenshot 2: mid-scatter captured');

  // Capture later animation state
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'verify_03_scatter_late.png', fullPage: false });
  console.log('Screenshot 3: late-scatter captured');

  // Step 4: Wait for animation to complete and check homepage is revealed
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'verify_04_homepage.png', fullPage: false });
  console.log('Screenshot 4: homepage captured');

  // Check that the intro overlay is gone
  const overlay = await page.$('.intro-wrapper');
  const overlayVisible = overlay ? await overlay.isVisible() : false;
  console.log(`Overlay still visible: ${overlayVisible}`);

  // Check homepage content is visible
  const heroName = await page.$('.VPHero .name');
  console.log(`Hero name found: ${!!heroName}`);

  await browser.close();
  console.log('Done');
})();
