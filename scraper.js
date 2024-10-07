const { Actor } = require('apify');
const { PlaywrightCrawler, Dataset } = require('crawlee');

const PRICE_KEY = 'LAST_PRICE';
const SCRAPE_INTERVAL = 7200; // 2 hours
const URL = '';

async function savePrice(price) {
    const data = {
        price: price,
        time: new Date().toISOString()
    };
    await Actor.setValue(PRICE_KEY, data);
}

async function loadPrice() {
    const data = await Actor.getValue(PRICE_KEY);
    if (data) {
        return [data.price, new Date(data.time)];
    }
    return [null, null];
}

Actor.main(async () => {
    const crawler = new PlaywrightCrawler({
        async requestHandler({ page }) {
            await page.goto(URL, { timeout: 120000, waitUntil: 'networkidle' });

            const modal = await page.waitForSelector("div.ant-modal-content");
            await modal.click();
             // Scroll to the bottom of the page
             await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

        // Wait for the pagination button to be visible
        await page.waitForSelector('.pagination-item.pagination-item-2', { visible: true });

        // Click the pagination button for the second page
        await page.click('.pagination-item.pagination-item-2');

            await page.waitForSelector("span.price-amount", { timeout: 120000 });

            const priceElements = await page.$$("span.price-amount");
            const prices = await Promise.all(
                priceElements.slice(2, 10).map(async (element) => {
                    const text = await element.innerText();
                    return parseFloat(text.split()[0].replace(',', ''));
                })
            );

            const averagePrice = prices.reduce((a, b) => a + b, 0) / prices.length;

            await savePrice(averagePrice);

            const scrapedData = {
                price: averagePrice,
                time: new Date().toISOString()
            };

            await Dataset.pushData(scrapedData);

            console.log('Scraped Data:', JSON.stringify(scrapedData, null, 2));

            const [savedPrice, savedTime] = await loadPrice();
            console.log(`Last saved price: ${savedPrice} at ${savedTime}`);
        },
    });

    await crawler.run([URL]);

    const dataset = await Dataset.open();
    const { items } = await dataset.getData();
    console.log('All scraped items:', JSON.stringify(items, null, 2));
});
