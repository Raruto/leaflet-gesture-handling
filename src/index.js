import defaultLocale from "./locales/en.js";

// Prevent CORS issues for relative locations (dynamic import)
const baseURL = ((document.currentScript && document.currentScript.src) || (import.meta && import.meta.url)).split("/").slice(0,-1).join("/") + '/';

var draggingMap = false;
var gestureHandlingOptions = {
	text: {},
	duration: 1700
};

export var GestureHandling = L.Handler.extend({

	_isScrolling: false,
	_isTouching: false,
	_isFading: false,

	addHooks: function() {
		this._handleTouch = L.bind(this._handleTouch, this);

		this._setGestureHandlingOptions();
		this._disableInteractions();

		//Uses native event listeners instead of L.DomEvent due to issues with Android touch events turning into pointer events
		this._map._container.addEventListener("touchstart", this._handleTouch);
		this._map._container.addEventListener("touchmove", this._handleTouch);
		this._map._container.addEventListener("touchend", this._handleTouch);
		this._map._container.addEventListener("touchcancel", this._handleTouch);
		this._map._container.addEventListener("click", this._handleTouch);

		L.DomEvent.on(this._map._container, "wheel", this._handleScroll, this);
		L.DomEvent.on(this._map._container, "mouseenter", this._handleMouseOver, this);
		L.DomEvent.on(this._map._container, "mouseleave", this._handleMouseOut, this);

		// Listen to these events so will not disable dragging if the user moves the mouse out the boundary of the map container whilst actively dragging the map.
		L.DomEvent.on(this._map, "movestart", this._handleDragging, this);
		L.DomEvent.on(this._map, "move", this._handleDragging, this);
		L.DomEvent.on(this._map, "moveend", this._handleDragging, this);

		// Prevent page scroll on "leaflet-popup-content"
		this._map.on("popupopen", this._handleScrollOnPopup, this);
		this._map.on("popupclose", this._handleScrollOnPopup, this);

		// Reset any previously added fullscreen events
		L.DomEvent.off(this._map, "enterFullscreen", this._onEnterFullscreen, this);
		L.DomEvent.off(this._map, "exitFullscreen", this._onExitFullscreen, this);
		L.DomEvent.on(this._map, "enterFullscreen", this._onEnterFullscreen, this);
		L.DomEvent.on(this._map, "exitFullscreen", this._onExitFullscreen, this);

		L.DomUtil.addClass(this._map._container, "leaflet-gesture-handling");
	},

	removeHooks: function() {
		this._enableInteractions();

		this._map._container.removeEventListener("touchstart", this._handleTouch);
		this._map._container.removeEventListener("touchmove", this._handleTouch);
		this._map._container.removeEventListener("touchend", this._handleTouch);
		this._map._container.removeEventListener("touchcancel", this._handleTouch);
		this._map._container.removeEventListener("click", this._handleTouch);

		L.DomEvent.off(this._map._container, "wheel", this._handleScroll, this);
		L.DomEvent.off(this._map._container, "mouseenter", this._handleMouseOver, this);
		L.DomEvent.off(this._map._container, "mouseleave", this._handleMouseOut, this);

		L.DomEvent.off(this._map, "movestart", this._handleDragging, this);
		L.DomEvent.off(this._map, "move", this._handleDragging, this);
		L.DomEvent.off(this._map, "moveend", this._handleDragging, this);

		this._map.off("popupopen", this._handleScrollOnPopup, this);
		this._map.off("popupclose", this._handleScrollOnPopup, this);

		L.DomUtil.removeClass(this._map._container, "leaflet-gesture-handling");
	},

	_handleDragging: function(e) {
		if (e.type == "movestart" || e.type == "move") {
			draggingMap = true;
		} else if (e.type == "moveend") {
			draggingMap = false;
		}
	},

	_disableInteractions: function() {
		this._map.dragging.disable();
		this._map.scrollWheelZoom.disable();
		if (this._map.tap) this._map.tap.disable();
	},

	_enableInteractions: function() {
		this._map.dragging.enable();
		this._map.scrollWheelZoom.enable();
		if (this._map.tap) this._map.tap.enable();
		// deal with safari bug Leaflet version 1.7
		if (parseInt(L.version.split('.')[1], 10) < 8 ) {
			var is_chrome = navigator.userAgent.indexOf("Chrome") > -1;
			var is_safari = navigator.userAgent.indexOf("Safari") > -1;
			if ( !is_chrome && is_safari ) {
				this._map.tap.disable();
			}
		}
		// end
	},

	_enableWarning: function(gesture) {
		clearTimeout(this._isFading);
		L.DomUtil.addClass(this._map._container, "leaflet-gesture-handling-" + gesture);
		L.DomUtil.addClass(this._map._container, "leaflet-gesture-handling-warning");
	},

	_disableWarning: function(gesture, delay) {
		clearTimeout(this._isFading);
		this._isFading = setTimeout(
			L.bind(function(gesture) {
				L.DomUtil.removeClass(this._map._container, "leaflet-gesture-handling-" + gesture);
			}, this, gesture),
			delay || this._map.options.gestureHandlingOptions.duration
		);
		L.DomUtil.removeClass(this._map._container, "leaflet-gesture-handling-warning");
	},

	_isLanguageContent: function(text) {
		return text && text.touch && text.scroll && text.scrollMac;
	},

	_isMacUser: function() {
		return navigator.platform.toUpperCase().indexOf("MAC") >= 0;
	},

	_parseGestureHandlingOptions: function() {
		var text = this._map.options.gestureHandlingOptions.text || this._map.options.gestureHandlingText || gestureHandlingOptions.text;
		var duration = this._map.options.gestureHandlingOptions.duration || this._map.options.gestureHandlingDuration || gestureHandlingOptions.duration;
		var options = L.extend(this._map.options.gestureHandlingOptions, gestureHandlingOptions);
		// Merge default gestureHandlingOptions into the new options object
		options.text = text;
		options.duration = duration;
		return options;
	},

	_setGestureHandlingOptions: function() {
		var opts = this._parseGestureHandlingOptions();

		//If user has supplied custom language, use that, otherwise auto set it from the language files
		(this._isLanguageContent(opts.text) ? Promise.resolve(opts.text) : this._getLanguageContent(opts.locale)).then((content) => {
			this._map._container.setAttribute("data-gesture-handling-touch-content", content.touch);
			this._map._container.setAttribute("data-gesture-handling-scroll-content", content.scroll);
	
			this._touchWarning = content.touch;
			this._scrollWarning = content.scroll;
		});

	},

	_getUserLanguage: function() {
		return navigator.languages ? navigator.languages[0] : navigator.language || navigator.userLanguage;
	},

	_getLanguageContent: function(lang) {
		//Determine user language (eg. fr or en-US)
		lang = lang || this._getUserLanguage() || "en";
		
		var resolve, promise = new Promise(_resolve => { resolve = _resolve });
		var consume = (m) => {
			var content = m.default || {};
			//Check if they're on a mac for displaying appropriate command control (⌘ instead of Ctrl)
			content.scroll = this._isMacUser() ? content.scrollMac : content.scroll
			resolve(content);
		};

		//Lookup the appropriate language content
		import(baseURL + './locales/' + lang + '.js').then(consume)
		//If no result, try searching by the first part only (eg. en-US, just use en).
		.catch((e) => import(baseURL + './locales/' + lang.split("-")[0] + '.js').then(consume)
			// If still nothing, default to English.
			.catch((e) => Promise.resolve({default:defaultLocale}).then(consume))
		);

		return promise;
	},

	_hasClass: function(element, classList) {
		for (var i = 0; i < classList.length; i++) {
			if (L.DomUtil.hasClass(element, classList[i])) {
				return true;
			}
		}
		return false;
	},

	_handleTouch: function(e) {
		//Disregard touch events on the minimap if present
		var ignore = this._hasClass(e.target, ["leaflet-control-minimap", "leaflet-interactive", "leaflet-popup-content", "leaflet-popup-content-wrapper", "leaflet-popup-close-button", "leaflet-control-zoom-in", "leaflet-control-zoom-out"]);

		if (ignore) {
			if (L.DomUtil.hasClass(e.target, "leaflet-interactive") && e.type === "touchmove" && e.touches.length === 1) {
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

	_enableTouchWarning: function() {
		this._enableWarning('touch');
		this._disableInteractions();
	},

	_disableTouchWarning: function(delay) {
		clearTimeout(this._isTouching);
		// Set a timeout to run after touching ends
		this._isTouching = setTimeout(
			L.bind(
				function() {
					this._disableWarning('touch');
					// this._enableInteractions();
				}, this),
			delay || 0
		);
	},

	_enableScrollWarning: function() {
		this._enableWarning('scroll');
		this._map.scrollWheelZoom.disable();
	},

	_disableScrollWarning: function(delay) {
		clearTimeout(this._isScrolling);
		// Set a timeout to run after scrolling ends
		this._isScrolling = setTimeout(
			L.bind(
				function() {
					this._disableWarning('scroll');
					this._map.scrollWheelZoom.enable();
				}, this),
			delay || 0
		);
	},

	_handleScroll: function(e) {
		if (e.metaKey || e.ctrlKey || (e.shiftKey && this._map._rotate)) {
			e.preventDefault();
			this._disableScrollWarning();
		} else {
			this._enableScrollWarning();
			this._disableScrollWarning(this._map.options.gestureHandlingOptions.duration);
		}
	},

	_handleScrollOnPopup: function(e) {
		L.DomEvent[e.type == 'popupopen' ? 'on' : 'off']
		(e.popup._contentNode, "wheel", this._handleScroll, this);
	},

	_handleMouseOver: function(e) {
		this._enableInteractions();
	},

	_handleMouseOut: function(e) {
		if (!draggingMap) this._disableInteractions();
	},

	_onExitFullscreen: function() {
		if (this._map.options.gestureHandling)
			this._map.gestureHandling.enable();
	},

	_onEnterFullscreen: function() {
		if (this._map.options.gestureHandling)
			this._map.gestureHandling.disable();
	},

});

L.Map.mergeOptions({
	gestureHandlingOptions: gestureHandlingOptions
});

L.Map.addInitHook("addHandler", "gestureHandling", GestureHandling);
