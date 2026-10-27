import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import { Then, When } from '@cucumber/cucumber';

Then('gesture handlers support popups and fullscreen transitions', async function() {
	assert.deepEqual(await this.page.evaluate(() => {
		map.fire('enterFullscreen');
		const disabled = !map.gestureHandling.enabled() && map.dragging.enabled();
		map.fire('exitFullscreen');
		const enabled = map.gestureHandling.enabled() && !map.dragging.enabled();
		const pagePopup = popup;
		const popupDetails = {
			open: pagePopup.isOpen(),
			maxHeight: pagePopup.options.maxHeight,
			hasContent: pagePopup._contentNode.textContent.includes('Hello world!')
		};
		map.gestureHandling._enableInteractions();
		pagePopup._contentNode.dispatchEvent(new WheelEvent('wheel', { bubbles: true, deltaY: 100 }));
		const warned = map.getContainer().classList.contains('leaflet-gesture-handling-scroll');
		pagePopup.remove();
		return [disabled, enabled, popupDetails, warned];
	}), [true, true, { open: true, maxHeight: 150, hasContent: true }, true]);
});

Then('disabling and reenabling gesture handling cleans its listeners', async function() {
	assert.deepEqual(await this.page.evaluate(() => {
		const handler = map.gestureHandling;
		handler.disable();
		const detached = !map.getContainer().classList.contains('leaflet-gesture-handling') &&
			!(map._events.move || []).some(listener => listener.ctx === handler);
		handler.enable();
		const listeners = (map._events.move || []).filter(listener => listener.ctx === handler).length;
		const unpatched = !L.version.startsWith('2.') || (!L.DomUtil.addClass && !L.bind && !L.map);
		return [detached, listeners, unpatched];
	}), [true, 1, true]);
});

When('I scroll over the map without a modifier', async function() {
	await this.page.locator('#map').hover();
	await this.page.locator('#map').dispatchEvent('wheel', { deltaY: 100 });
	await this.page.waitForFunction(() =>
		map.getContainer().classList.contains('leaflet-gesture-handling-warning'));
});

Then('the scroll warning is shown and zoom is temporarily disabled', async function() {
	const result = await this.page.evaluate(() => ({
		warning: map.getContainer().getAttribute('data-gesture-handling-scroll-content'),
		zoomEnabled: map.scrollWheelZoom.enabled(),
		activeWarning: map.getContainer().classList.contains('leaflet-gesture-handling-scroll')
	}));
	assert.match(result.warning, /ctrl \+ scroll/i);
	assert.equal(result.zoomEnabled, false);
	assert.equal(result.activeWarning, true);
});

Then('zoom is restored after the warning expires', async function() {
	await this.page.waitForFunction(() => map.scrollWheelZoom.enabled(), { timeout: 3000 });
});

When('I move one finger and then two fingers on the map', async function() {
	this.touchResult = await this.page.evaluate(() => {
		const container = map.getContainer();
		const makeTouch = identifier => new Touch({
			identifier,
			target: container,
			clientX: 100 + identifier * 20,
			clientY: 100
		});
		const dispatch = (type, touches) => {
			const event = new TouchEvent(type, {
				bubbles: true,
				cancelable: true,
				touches,
				targetTouches: touches,
				changedTouches: touches
			});
			container.dispatchEvent(event);
			return event.defaultPrevented;
		};
		dispatch('touchstart', [makeTouch(1)]);
		const warned = container.classList.contains('leaflet-gesture-handling-warning');
		const prevented = dispatch('touchmove', [makeTouch(1), makeTouch(2)]);
		return { warned, prevented, dragging: map.dragging.enabled() };
	});
});

Then('the touch warning is shown for one finger', function() {
	assert.equal(this.touchResult.warned, true);
});

Then('the two-finger event is prevented and map interactions are enabled', function() {
	assert.equal(this.touchResult.prevented, true);
	assert.equal(this.touchResult.dragging, true);
});

When('the locale is loaded', async function() {
	await this.page.waitForFunction(() => map.gestureHandling._scrollWarning);
});

Then('the French warning is available', async function() {
	const warning = await this.page.evaluate(() =>
		map.getContainer().getAttribute('data-gesture-handling-scroll-content'));
	assert.match(warning, /CTRL \+ Molette de défilement/i);
});

Then('the Portugal-specific warning is available', async function() {
	const warning = await this.page.evaluate(() =>
		map.getContainer().getAttribute('data-gesture-handling-scroll-content'));
	assert.match(warning, /Utilizar ctrl \+ deslocar/i);
});

Then('only the Canadian French locale was requested', function() {
	assert.deepEqual(this.localeResponses, [{
		url: '/dist/locales/fr-CA.js',
		status: 200
	}]);
});

Then('only the Portugal locale was requested', function() {
	assert.deepEqual(this.localeResponses, [{
		url: '/dist/locales/pt-PT.js',
		status: 200
	}]);
});

Then('regional variants of every available language load without errors', { timeout: 30000 }, async function() {
	const directory = new URL('../../src/locales/', import.meta.url);
	const files = (await readdir(directory)).filter(file => file.endsWith('.js'));
	for (const language of files.map(file => file.slice(0, -3)).filter(locale => !locale.includes('-'))) {
		const locale = new Intl.Locale(language).maximize();
		assert.ok(files.includes(`${language}-${locale.region}.js`), language);
	}
	for (const file of ['en-US.js', 'fr-CA.js', 'es-MX.js', 'de-CH.js']) {
		assert.ok(files.includes(file), file);
	}
	const errors = [];
	const onConsole = message => {
		if (message.type() === 'error') errors.push(message.text());
	};
	this.page.on('console', onConsole);
	try {
		for (const file of files) {
			const locale = file.slice(0, -3);
			const expected = (await import(new URL(file, directory).href)).default;
			const content = await this.page.evaluate(locale =>
				map.gestureHandling._getLanguageContent(locale), locale);
			assert.equal(content.touch, expected.touch, locale);
			assert.equal(content.scrollMac, expected.scrollMac, locale);
		}
		assert.deepEqual(errors, []);
		assert.ok(this.localeResponses.length > 0);
		for (const response of this.localeResponses) {
			assert.equal(response.status, 200, response.url);
			assert.ok(files.includes(response.url.split('/').pop()), response.url);
		}
	} finally {
		this.page.off('console', onConsole);
	}
});
