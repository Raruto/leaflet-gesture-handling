import defaultLocale from "./locales/en.js";

// Prevent CORS issues for relative locations (dynamic import)
const baseURL = ((document.currentScript && document.currentScript.src) || (import.meta && import.meta.url)).split("/").slice(0,-1).join("/") + '/';

const [leafletMajor, leafletMinor] = L.version.split(".").map(Number);
const usesDomEventTouchHandlers = leafletMajor > 1 || (leafletMajor === 1 && leafletMinor >= 8);

let draggingMap = false;
const gestureHandlingOptions = {
	text: {},
	duration: 1700
};

export const GestureHandling = L.Handler.extend({

	_isScrolling: false,
	_isTouching: false,
	_isFading: false,

	addHooks() {
		this._handleTouch = this._handleTouch.bind(this);

		this._setGestureHandlingOptions();
		this._disableInteractions();

		// Prevent touch events
		if (usesDomEventTouchHandlers) {
			L.DomEvent.on(this._map._container, "touchstart", this._handleTouch, this);
			L.DomEvent.on(this._map._container, "touchmove", this._handleTouch, this);
			L.DomEvent.on(this._map._container, "touchend", this._handleTouch, this);
			L.DomEvent.on(this._map._container, "touchcancel", this._handleTouch, this);
			L.DomEvent.on(this._map._container, "click", this._handleTouch, this);
		} else {
			//Uses native event listeners instead of L.DomEvent due to issues with Android touch events turning into pointer events
			this._map._container.addEventListener("touchstart", this._handleTouch);
			this._map._container.addEventListener("touchmove", this._handleTouch);
			this._map._container.addEventListener("touchend", this._handleTouch);
			this._map._container.addEventListener("touchcancel", this._handleTouch);
			this._map._container.addEventListener("click", this._handleTouch);
		}

		L.DomEvent.on(this._map._container, "wheel", this._handleScroll, this);
		L.DomEvent.on(this._map._container, "mouseenter", this._handleMouseOver, this);
		L.DomEvent.on(this._map._container, "mouseleave", this._handleMouseOut, this);

		// Listen to these events so will not disable dragging if the user moves the mouse out the boundary of the map container whilst actively dragging the map.
		this._map.on("movestart move moveend", this._handleDragging, this);

		// Prevent page scroll on "leaflet-popup-content"
		this._map.on("popupopen", this._handleScrollOnPopup, this);
		this._map.on("popupclose", this._handleScrollOnPopup, this);

		// Reset any previously added fullscreen events
		this._map.off("enterFullscreen", this._onEnterFullscreen, this);
		this._map.off("exitFullscreen", this._onExitFullscreen, this);
		this._map.on("enterFullscreen", this._onEnterFullscreen, this);
		this._map.on("exitFullscreen", this._onExitFullscreen, this);

		this._map._container.classList.add("leaflet-gesture-handling");
	},

	removeHooks() {
		this._enableInteractions();

		if (usesDomEventTouchHandlers) {
			L.DomEvent.off(this._map._container, "touchstart", this._handleTouch, this);
			L.DomEvent.off(this._map._container, "touchmove", this._handleTouch, this);
			L.DomEvent.off(this._map._container, "touchend", this._handleTouch, this);
			L.DomEvent.off(this._map._container, "touchcancel", this._handleTouch, this);
			L.DomEvent.off(this._map._container, "click", this._handleTouch, this);
		} else {
			this._map._container.removeEventListener("touchstart", this._handleTouch);
			this._map._container.removeEventListener("touchmove", this._handleTouch);
			this._map._container.removeEventListener("touchend", this._handleTouch);
			this._map._container.removeEventListener("touchcancel", this._handleTouch);
			this._map._container.removeEventListener("click", this._handleTouch);
		}

		L.DomEvent.off(this._map._container, "wheel", this._handleScroll, this);
		L.DomEvent.off(this._map._container, "mouseenter", this._handleMouseOver, this);
		L.DomEvent.off(this._map._container, "mouseleave", this._handleMouseOut, this);

		this._map.off("movestart move moveend", this._handleDragging, this);

		this._map.off("popupopen", this._handleScrollOnPopup, this);
		this._map.off("popupclose", this._handleScrollOnPopup, this);

		this._map._container.classList.remove("leaflet-gesture-handling");
	},

	_handleDragging(e) {
		if (e.type == "movestart" || e.type == "move") {
			draggingMap = true;
		} else if (e.type == "moveend") {
			draggingMap = false;
		}
	},

	_disableInteraction(name) {
		// disable the handler only if related option is true
		if (this._map.options[name] && this._map[name]) {
			this._map[name].disable();
		}
	},

	_enableInteraction(name) {
		// enable the handler only if related option is true
		if (this._map.options[name] && this._map[name]) {
			this._map[name].enable();
		}
	},

	_disableInteractions() {
		this._disableInteraction('dragging');
		this._disableInteraction('scrollWheelZoom');
		this._disableInteraction('tap');
	},

	_enableInteractions() {
		this._enableInteraction('dragging');
		this._enableInteraction('scrollWheelZoom');
		this._enableInteraction('tap');
	},

	_enableWarning(gesture) {
		clearTimeout(this._isFading);
		this._map._container.classList.add("leaflet-gesture-handling-" + gesture);
		this._map._container.classList.add("leaflet-gesture-handling-warning");
	},

	_disableWarning(gesture, delay) {
		clearTimeout(this._isFading);
		this._isFading = setTimeout(
			() => this._map._container.classList.remove("leaflet-gesture-handling-" + gesture),
			delay || this._map.options.gestureHandlingOptions.duration
		);
		this._map._container.classList.remove("leaflet-gesture-handling-warning");
	},

	_isLanguageContent(text) {
		return text && text.touch && text.scroll && text.scrollMac;
	},

	_isMacUser() {
		return navigator.platform.toUpperCase().indexOf("MAC") >= 0;
	},

	_parseGestureHandlingOptions() {
		const text = this._map.options.gestureHandlingOptions.text || this._map.options.gestureHandlingText || gestureHandlingOptions.text;
		const duration = this._map.options.gestureHandlingOptions.duration || this._map.options.gestureHandlingDuration || gestureHandlingOptions.duration;
		const options = Object.assign(this._map.options.gestureHandlingOptions, gestureHandlingOptions);
		// Merge default gestureHandlingOptions into the new options object
		options.text = text;
		options.duration = duration;
		return options;
	},

	_setGestureHandlingOptions() {
		const opts = this._parseGestureHandlingOptions();

		//If user has supplied custom language, use that, otherwise auto set it from the language files
		(this._isLanguageContent(opts.text) ? Promise.resolve(opts.text) : this._getLanguageContent(opts.locale)).then((content) => {
			this._map._container.setAttribute("data-gesture-handling-touch-content", content.touch);
			this._map._container.setAttribute("data-gesture-handling-scroll-content", content.scroll);
			this._touchWarning = content.touch;
			this._scrollWarning = content.scroll;
		});

	},

	_getUserLanguage() {
		return navigator.languages ? navigator.languages[0] : navigator.language || navigator.userLanguage;
	},

	_getLanguageContent(lang) {
		//Determine user language (eg. fr or en-US)
		lang = (lang || this._getUserLanguage() || "en").replace("_", "-");
		let resolve;
		const promise = new Promise(_resolve => { resolve = _resolve });
		const consume = (m) => {
			const content = m.default || {};
			//Check if they're on a mac for displaying appropriate command control (⌘ instead of Ctrl)
			content.scroll = this._isMacUser() ? content.scrollMac : content.scroll
			resolve(content);
		};

		//Lookup the appropriate language content
		import(baseURL + './locales/' + lang + '.js').then(consume)
			.catch(() => import(baseURL + './locales/' + lang.split("-")[0] + '.js').then(consume)
				.catch(() => consume({default: defaultLocale})));

		return promise;
	},

	_handleTouch(e) {
		//Disregard touch events on the controls and popups if present
		const ignore = e.target.classList.contains("leaflet-interactive") || e.target.closest('.leaflet-control-container') || e.target.closest('.leaflet-popup-pane');

		if (ignore) {
			if (e.target.classList.contains("leaflet-interactive") && e.type === "touchmove" && e.touches.length === 1) {
				this._enableTouchWarning();
			} else {
				this._disableTouchWarning();
			}
		} else if (e.type !== "touchmove" && e.type !== "touchstart") {
			this._disableTouchWarning();
		} else if (e.touches.length === 1) {
			this._enableTouchWarning();
		} else {
			e.preventDefault();
			this._disableTouchWarning();
			this._enableInteractions();
		}
	},

	_enableTouchWarning() {
		this._enableWarning('touch');
		this._disableInteractions();
	},

	_disableTouchWarning(delay) {
		clearTimeout(this._isTouching);
		// Set a timeout to run after touching ends
		this._isTouching = setTimeout(
				() => {
					this._disableWarning('touch');
					// this._enableInteractions();
				},
			delay || 0
		);
	},

	_enableScrollWarning() {
		this._enableWarning('scroll');
		this._disableInteraction('scrollWheelZoom');
	},

	_disableScrollWarning(delay) {
		clearTimeout(this._isScrolling);
		// Set a timeout to run after scrolling ends
		this._isScrolling = setTimeout(
				() => {
					this._disableWarning('scroll');
					this._enableInteraction('scrollWheelZoom');
				},
			delay || 0
		);
	},

	_handleScroll(e) {
		if (this._map.scrollWheelZoom && this._map.scrollWheelZoom.enabled()) {
			if (e.metaKey || e.ctrlKey || (e.shiftKey && this._map._rotate)) {
				e.preventDefault();
				this._disableScrollWarning();
			} else {
				this._enableScrollWarning();
				this._disableScrollWarning(this._map.options.gestureHandlingOptions.duration);
			}
		}
	},

	_handleScrollOnPopup(e) {
		L.DomEvent[e.type == 'popupopen' ? 'on' : 'off']
		(e.popup._contentNode, "wheel", this._handleScroll, this);
	},

	_handleMouseOver(e) {
		this._enableInteractions();
	},

	_handleMouseOut(e) {
		if (!draggingMap) this._disableInteractions();
	},

	_onExitFullscreen() {
		if (this._map.options.gestureHandling)
			this._map.gestureHandling.enable();
	},

	_onEnterFullscreen() {
		if (this._map.options.gestureHandling)
			this._map.gestureHandling.disable();
	},

});

L.Map.mergeOptions({
	gestureHandlingOptions: gestureHandlingOptions
});

L.Map.addInitHook("addHandler", "gestureHandling", GestureHandling);