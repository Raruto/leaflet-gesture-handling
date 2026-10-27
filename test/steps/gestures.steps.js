import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import { Given, Then, When } from '@cucumber/cucumber';

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

When('I use Ctrl+scroll over the map', async function() {
	this.ctrlScrollResult = await this.page.evaluate(() => {
		const event = new WheelEvent('wheel', {
			bubbles: true,
			cancelable: true,
			ctrlKey: true,
			deltaY: -120
		});
		map.getContainer().dispatchEvent(event);
		return { prevented: event.defaultPrevented };
	});
	await this.page.waitForFunction(() => map.getZoom() > 5);
	this.ctrlScrollResult.zoom = await this.page.evaluate(() => map.getZoom());
	this.ctrlScrollResult.zoomEnabled = await this.page.evaluate(() => map.scrollWheelZoom.enabled());
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

Then('page zoom is prevented and the map zooms', function() {
	if (this.ctrlScrollResult.warned !== undefined) assert.equal(this.ctrlScrollResult.warned, true);
	assert.equal(this.ctrlScrollResult.prevented, true);
	assert.ok(this.ctrlScrollResult.zoom > 5);
	assert.equal(this.ctrlScrollResult.zoomEnabled, true);
});

When('I use Ctrl+scroll over a {string} while the warning is active', async function(layerType) {
	await this.page.evaluate(layerType => {
		const layer = layerType === 'marker'
			? new L.Marker(map.getCenter())
			: new L.CircleMarker(map.getCenter());
		layer.addTo(map);
		map.gestureHandling._enableInteractions();
		window.issueLayer = layer;
	}, layerType);
	await this.page.waitForFunction(() => window.issueLayer.getElement()?.isConnected);
	this.ctrlScrollResult = await this.page.evaluate(() => {
		const container = map.getContainer();
		container.dispatchEvent(new WheelEvent('wheel', { bubbles: true, deltaY: 100 }));
		const warned = container.classList.contains('leaflet-gesture-handling-warning');
		const event = new WheelEvent('wheel', {
			bubbles: true,
			cancelable: true,
			ctrlKey: true,
			deltaY: -120
		});
		window.issueLayer.getElement().dispatchEvent(event);
		return { warned, prevented: event.defaultPrevented };
	});
	await this.page.waitForFunction(() => map.getZoom() > 5);
	this.ctrlScrollResult.zoom = await this.page.evaluate(() => map.getZoom());
	this.ctrlScrollResult.zoomEnabled = await this.page.evaluate(() => map.scrollWheelZoom.enabled());
});

When('a one-finger touch ends on a {string}', async function(layerType) {
	this.ignoredTouchResult = await this.page.evaluate(layerType => {
		const layer = layerType === 'marker'
			? new L.Marker(map.getCenter())
			: new L.CircleMarker(map.getCenter());
		layer.addTo(map);
		const container = map.getContainer();
		const target = layer.getElement();
		const touch = new Touch({ identifier: 1, target: container, clientX: 100, clientY: 100 });
		const dispatch = (element, type, touches) => element.dispatchEvent(new TouchEvent(type, {
			bubbles: true,
			cancelable: true,
			touches,
			targetTouches: touches,
			changedTouches: [touch]
		}));
		dispatch(container, 'touchstart', [touch]);
		const disabledDuringTouch = !map.dragging.enabled();
		dispatch(target, 'touchend', []);
		return {
			disabledDuringTouch,
			draggingRestored: map.dragging.enabled(),
			scrollZoomRestored: map.scrollWheelZoom.enabled()
		};
	}, layerType);
});

Then('map interactions are restored after the ignored touch', function() {
	assert.deepEqual(this.ignoredTouchResult, {
		disabledDuringTouch: true,
		draggingRestored: true,
		scrollZoomRestored: true
	});
});

When('I reinitialize the map', async function() {
	await this.page.evaluate(() => {
		map.remove();
		const container = document.createElement('div');
		container.id = 'reinitialized-map';
		container.style.cssText = 'height: 400px; width: 600px';
		document.body.append(container);
		window.issueMap = new L.Map(container, {
			center: [41.4583, 12.7059],
			zoom: 5,
			scrollWheelZoom: true,
			gestureHandling: true,
			gestureHandlingOptions: { duration: 250 }
		});
	});
	await this.page.waitForFunction(() => window.issueMap.gestureHandling._touchWarning);
});

When('I scroll over the reinitialized map with Ctrl', async function() {
	this.ctrlScrollResult = await this.page.evaluate(() => {
		const issueMap = window.issueMap;
		const container = issueMap.getContainer();
		issueMap.gestureHandling._enableInteractions();
		container.dispatchEvent(new WheelEvent('wheel', { bubbles: true, deltaY: 100 }));
		const event = new WheelEvent('wheel', {
			bubbles: true,
			cancelable: true,
			ctrlKey: true,
			deltaY: -120
		});
		container.dispatchEvent(event);
		return { prevented: event.defaultPrevented };
	});
	await this.page.waitForFunction(() => window.issueMap.getZoom() > 5);
	this.ctrlScrollResult.zoom = await this.page.evaluate(() => window.issueMap.getZoom());
	this.ctrlScrollResult.zoomEnabled = await this.page.evaluate(() =>
		window.issueMap.scrollWheelZoom.enabled());
});

When('I create a map inside a shadow root', async function() {
	await this.page.evaluate(async () => {
		const host = document.createElement('div');
		const shadow = host.attachShadow({ mode: 'open' });
		const style = document.createElement('style');
		style.textContent = await (await fetch(new URL('../dist/leaflet-gesture-handling.css', location.href))).text();
		const container = document.createElement('div');
		container.id = 'shadow-map';
		container.style.cssText = 'height: 300px; width: 500px';
		shadow.append(style, container);
		document.body.append(host);
		window.issueShadowHost = host;
		window.issueShadowMap = new L.Map(container, {
			center: [41.4583, 12.7059],
			zoom: 5,
			scrollWheelZoom: true,
			gestureHandling: true,
			gestureHandlingOptions: { duration: 600 }
		});
	});
	await this.page.waitForFunction(() => window.issueShadowMap.gestureHandling._touchWarning);
});

When('I scroll over the shadow map without a modifier', async function() {
	await this.page.evaluate(() => {
		window.issueShadowMap.gestureHandling._enableInteractions();
		window.issueShadowMap.getContainer().dispatchEvent(
			new WheelEvent('wheel', { bubbles: true, deltaY: 100 })
		);
	});
});

Then('its warning appears and clears after the timeout', async function() {
	await this.page.waitForFunction(() => {
		const container = window.issueShadowMap.getContainer();
		return container.classList.contains('leaflet-gesture-handling-warning') &&
			Number(getComputedStyle(container, '::after').opacity) > 0.95;
	});
	const content = await this.page.evaluate(() =>
		getComputedStyle(window.issueShadowMap.getContainer(), '::after').content);
	assert.notEqual(content, '""');
	await this.page.waitForFunction(() => {
		const container = window.issueShadowMap.getContainer();
		return !container.classList.contains('leaflet-gesture-handling-scroll') &&
			getComputedStyle(container, '::after').opacity === '0';
	}, { timeout: 5000 });
	assert.deepEqual(await this.page.evaluate(() => {
		const container = window.issueShadowMap.getContainer();
		return {
			warning: container.classList.contains('leaflet-gesture-handling-warning'),
			scroll: container.classList.contains('leaflet-gesture-handling-scroll')
		};
	}), { warning: false, scroll: false });
});

Then('zoom is restored after the warning expires', async function() {
	await this.page.waitForFunction(() => map.scrollWheelZoom.enabled(), { timeout: 3000 });
});

When('I use repeated one-finger touches and then move two fingers on the map', async function() {
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
		const firstWarning = container.classList.contains('leaflet-gesture-handling-warning');
		const disabledAfterFirstTouch = !map.dragging.enabled();
		dispatch('touchend', []);
		const restoredAfterRelease = map.dragging.enabled();
		dispatch('touchstart', [makeTouch(1)]);
		const secondWarning = container.classList.contains('leaflet-gesture-handling-warning');
		const disabledAfterSecondTouch = !map.dragging.enabled();
		const prevented = dispatch('touchmove', [makeTouch(1), makeTouch(2)]);
		return {
			firstWarning,
			disabledAfterFirstTouch,
			restoredAfterRelease,
			secondWarning,
			disabledAfterSecondTouch,
			prevented,
			dragging: map.dragging.enabled()
		};
	});
});

Then('one-finger warnings and map interactions recover after release', function() {
	assert.equal(this.touchResult.firstWarning, true);
	assert.equal(this.touchResult.disabledAfterFirstTouch, true);
	assert.equal(this.touchResult.restoredAfterRelease, true);
	assert.equal(this.touchResult.secondWarning, true);
	assert.equal(this.touchResult.disabledAfterSecondTouch, true);
});

Then('the two-finger event is prevented and map interactions are enabled', function() {
	assert.equal(this.touchResult.prevented, true);
	assert.equal(this.touchResult.dragging, true);
});

When('I use Ctrl+scroll over the popup', async function() {
	this.popupScrollResult = await this.page.evaluate(() => {
		map.gestureHandling._enableInteractions();
		const event = new WheelEvent('wheel', {
			bubbles: true,
			cancelable: true,
			ctrlKey: true,
			deltaY: -120
		});
		popup._contentNode.dispatchEvent(event);
		return event.defaultPrevented;
	});
});

Then('page zoom is prevented over the popup', function() {
	assert.equal(this.popupScrollResult, true);
});

When('I touch a map control', async function() {
	this.controlTouchResult = await this.page.evaluate(() => {
		// a mouse resting over the map (as on CI) would already have enabled dragging
		map.gestureHandling._disableInteractions();
		const target = map.getContainer().querySelector('.leaflet-control-zoom-in');
		const touch = new Touch({ identifier: 1, target, clientX: 10, clientY: 10 });
		target.dispatchEvent(new TouchEvent('touchstart', {
			bubbles: true,
			cancelable: true,
			touches: [touch],
			targetTouches: [touch],
			changedTouches: [touch]
		}));
		return {
			warning: map.getContainer().classList.contains('leaflet-gesture-handling-warning'),
			dragging: map.dragging.enabled()
		};
	});
});

Then('the control touch does not show a gesture warning', function() {
	assert.deepEqual(this.controlTouchResult, { warning: false, dragging: false });
});

When('gesture handling processes disabled map options', async function() {
	this.handlerOptionsResult = await this.page.evaluate(() => {
		map.options.dragging = false;
		map.options.scrollWheelZoom = false;
		map.dragging.disable();
		map.scrollWheelZoom.disable();
		map.gestureHandling._enableInteractions();
		const disabledRemainDisabled = !map.dragging.enabled() && !map.scrollWheelZoom.enabled();
		map.dragging.enable();
		map.scrollWheelZoom.enable();
		map.gestureHandling._disableInteractions();
		const enabledRemainEnabled = map.dragging.enabled() && map.scrollWheelZoom.enabled();
		return { disabledRemainDisabled, enabledRemainEnabled };
	});
});

Then('it leaves the map handlers unchanged', function() {
	assert.deepEqual(this.handlerOptionsResult, {
		disabledRemainDisabled: true,
		enabledRemainEnabled: true
	});
});

Then('German scroll instructions include the keyboard shortcut', async function() {
	const content = await this.page.evaluate(() =>
		map.gestureHandling._getLanguageContent('de'));
	assert.match(content.scroll, /^Verwende (Strg|\u2318) \+ Scroll zum Zoomen der Karte$/);
	assert.equal(content.scrollMac, 'Verwende \u2318 + Scroll zum Zoomen der Karte');
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

When('I use real Ctrl+wheel twice over the map', async function() {
	const box = await this.page.locator('#map').boundingBox();
	await this.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
	this.zooms = [await this.page.evaluate(() => map.getZoom())];
	await this.page.keyboard.down('Control');
	// plain Leaflet 2.0.0-alpha.1 ignores repeated real wheel events, so only the first gesture is checked there
	const gestures = await this.page.evaluate(() => L.version.startsWith('1.') ? 2 : 1);
	for (let i = 0; i < gestures; i++) {
		await this.page.mouse.wheel(0, -120);
		await this.page.waitForTimeout(500);
		await this.page.waitForFunction(z => map.getZoom() > z, this.zooms.at(-1));
		this.zooms.push(await this.page.evaluate(() => map.getZoom()));
	}
	await this.page.keyboard.up('Control');
});

Then('the map zoomed twice and the warning is gone', async function() {
	assert.ok(this.zooms.every((z, i) => !i || z > this.zooms[i - 1]));
	assert.equal(await this.page.evaluate(() =>
		map.getContainer().classList.contains('leaflet-gesture-handling-scroll')), false);
});

When('I scroll over a remote MarkerCluster with Ctrl', async function() {
	const ok = await this.page.evaluate(async () => {
		if (!L.version.startsWith('1.')) return false;
		for (const [tag, attrs] of [
			['link', { rel: 'stylesheet', href: 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css' }],
			['script', { src: 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js' }]
		]) {
			await new Promise(resolve => {
				const el = Object.assign(document.createElement(tag), attrs, { onload: resolve, onerror: resolve });
				document.head.append(el);
			});
		}
		return !!L.markerClusterGroup;
	});
	if (!ok) return 'skipped';
	await this.page.evaluate(() => {
		const group = L.markerClusterGroup();
		const c = map.getCenter();
		for (let i = 0; i < 3; i++) group.addLayer(L.marker([c.lat, c.lng]));
		map.addLayer(group);
	});
	await this.page.locator('.marker-cluster').waitFor();
	this.ctrlScrollResult = await this.page.evaluate(() => {
		map.gestureHandling._enableInteractions();
		map.getContainer().dispatchEvent(new WheelEvent('wheel', { bubbles: true, deltaY: 100 }));
		const event = new WheelEvent('wheel', { bubbles: true, cancelable: true, ctrlKey: true, deltaY: -120 });
		document.querySelector('.marker-cluster').dispatchEvent(event);
		return { prevented: event.defaultPrevented };
	});
	await this.page.waitForFunction(() => map.getZoom() > 5);
	this.ctrlScrollResult.zoom = await this.page.evaluate(() => map.getZoom());
	this.ctrlScrollResult.zoomEnabled = await this.page.evaluate(() => map.scrollWheelZoom.enabled());
});
