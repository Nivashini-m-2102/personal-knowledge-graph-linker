const puppeteer = require('puppeteer');

async function renderPdf(html) {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  await page.setContent(html, {
    waitUntil: ['load', 'domcontentloaded', 'networkidle0']
  });

  // IMPORTANT: wait for fonts/styles
  await page.evaluateHandle('document.fonts.ready');

  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: {
      top: '20px',
      right: '20px',
      bottom: '20px',
      left: '20px'
    }
  });

  await browser.close();

  if (!pdfBuffer || pdfBuffer.length < 1000) {
    throw new Error("PDF buffer empty or corrupted");
  }

  return pdfBuffer;
}

module.exports = { renderPdf };