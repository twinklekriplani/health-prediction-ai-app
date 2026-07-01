const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1400, height: 900 } 
  });
  
  const filePath = `file://${path.resolve(__dirname, 'index.html')}`;
  console.log(`Loading ${filePath}`);
  
  await page.goto(filePath);
  // Wait a bit for fonts to load
  await page.waitForTimeout(1000);
  
  const screens = await page.$$('.screen');
  console.log(`Found ${screens.length} screens to capture.`);
  
  for (let i = 0; i < screens.length; i++) {
    const el = screens[i];
    const fileName = `screen_${i + 1}.png`;
    console.log(`Capturing ${fileName}...`);
    await el.screenshot({ path: fileName });
  }
  
  await browser.close();
  console.log('All screens captured successfully!');
})();
