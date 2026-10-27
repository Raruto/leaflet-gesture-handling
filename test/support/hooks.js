import assert from 'node:assert/strict';
import { After, AfterAll, Before, BeforeAll, Given, setDefaultTimeout } from '@cucumber/cucumber';
import { chromium } from 'playwright';
import { startServer } from '../../build/server.js';

setDefaultTimeout(10000);

let server;
let browser;
let baseUrl;
const version = process.env.LEAFLET_VERSION || '1';

BeforeAll(async () => {
	server = await startServer(0);
	baseUrl = `http://127.0.0.1:${server.address().port}`;
	browser = await chromium.launch();
});

AfterAll({ timeout: 30000 }, async () => {
	await browser.close();
	await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
});

Before(async function() {
	this.context = await browser.newContext({ hasTouch: true, locale: 'en-US' });
	this.page = await this.context.newPage();
	this.errors = [];
	this.page.on('pageerror', error => this.errors.push(error.message));
	await this.context.route('**/*', route =>
		route.request().url().startsWith(`${baseUrl}/`) || route.request().url().startsWith('https://unpkg.com/')
			? route.continue()
			: route.abort());
	this.localeResponses = [];
	this.page.on('response', response => {
		if (response.url().includes('/dist/locales/')) {
			this.localeResponses.push({
				url: new URL(response.url()).pathname,
				status: response.status()
			});
		}
	});
});

After(async function() {
	try { assert.deepEqual(this.errors, []); }
	finally { await this.context.close(); }
});

Given('the map is open', async function() {
	await this.page.goto(`${baseUrl}/test/?leaflet=${version}`);
	await this.page.waitForFunction(() => window.map && map.gestureHandling._touchWarning);
	assert.equal(await this.page.evaluate(() => L.version.split('.')[0]), version);
	assert.equal(await this.page.evaluate(() => Boolean(window['leaflet-gesture-handling'].GestureHandling)), true);
});

Given('the {string} map bundle is open', async function(bundle) {
	await this.page.goto(`${baseUrl}/test/?leaflet=${version}${bundle === 'minified' ? '&min' : ''}`);
	await this.page.waitForFunction(() => window.map && map.gestureHandling._touchWarning);
	assert.equal(await this.page.evaluate(() => L.version.split('.')[0]), version);
});

Given('the map is open with locale {string}', async function(locale) {
	await this.page.goto(`${baseUrl}/test/?locale=${encodeURIComponent(locale)}&leaflet=${version}`);
	await this.page.waitForFunction(() => window.map && map.gestureHandling._touchWarning);
	assert.equal(await this.page.evaluate(() => L.version.split('.')[0]), version);
	assert.equal(await this.page.evaluate(() => Boolean(window['leaflet-gesture-handling'].GestureHandling)), true);
});
