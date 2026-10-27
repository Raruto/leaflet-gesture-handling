var leafletGestureHandling = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/index.js
  var index_exports = {};
  __export(index_exports, {
    GestureHandling: () => GestureHandling
  });

  // src/locales/en.js
  var en_default = {
    touch: "Use two fingers to move the map",
    scroll: "Use ctrl + scroll to zoom the map",
    scrollMac: "Use \u2318 + scroll to zoom the map"
  };

  // src/index.js
  var baseURL = (document.currentScript && document.currentScript.src || null).split("/").slice(0, -1).join("/") + "/";
  var [leafletMajor, leafletMinor] = L.version.split(".").map(Number);
  var usesDomEventTouchHandlers = leafletMajor > 1 || leafletMajor === 1 && leafletMinor >= 8;
  var draggingMap = false;
  var gestureHandlingOptions = {
    text: {},
    duration: 1700
  };
  var GestureHandling = L.Handler.extend({
    _isScrolling: false,
    _isTouching: false,
    _isFading: false,
    addHooks() {
      this._handleTouch = this._handleTouch.bind(this);
      this._setGestureHandlingOptions();
      this._disableInteractions();
      if (usesDomEventTouchHandlers) {
        L.DomEvent.on(this._map._container, "touchstart", this._handleTouch, this);
        L.DomEvent.on(this._map._container, "touchmove", this._handleTouch, this);
        L.DomEvent.on(this._map._container, "touchend", this._handleTouch, this);
        L.DomEvent.on(this._map._container, "touchcancel", this._handleTouch, this);
        L.DomEvent.on(this._map._container, "click", this._handleTouch, this);
      } else {
        this._map._container.addEventListener("touchstart", this._handleTouch);
        this._map._container.addEventListener("touchmove", this._handleTouch);
        this._map._container.addEventListener("touchend", this._handleTouch);
        this._map._container.addEventListener("touchcancel", this._handleTouch);
        this._map._container.addEventListener("click", this._handleTouch);
      }
      L.DomEvent.on(this._map._container, "wheel", this._handleScroll, this);
      L.DomEvent.on(this._map._container, "mouseenter", this._handleMouseOver, this);
      L.DomEvent.on(this._map._container, "mouseleave", this._handleMouseOut, this);
      this._map.on("movestart move moveend", this._handleDragging, this);
      this._map.on("popupopen", this._handleScrollOnPopup, this);
      this._map.on("popupclose", this._handleScrollOnPopup, this);
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
      if (this._map.options[name] && this._map[name]) {
        this._map[name].disable();
      }
    },
    _enableInteraction(name) {
      if (this._map.options[name] && this._map[name]) {
        this._map[name].enable();
      }
    },
    _disableInteractions() {
      this._disableInteraction("dragging");
      this._disableInteraction("scrollWheelZoom");
      this._disableInteraction("tap");
    },
    _enableInteractions() {
      this._enableInteraction("dragging");
      this._enableInteraction("scrollWheelZoom");
      this._enableInteraction("tap");
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
      options.text = text;
      options.duration = duration;
      return options;
    },
    _setGestureHandlingOptions() {
      const opts = this._parseGestureHandlingOptions();
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
      lang = (lang || this._getUserLanguage() || "en").replace("_", "-");
      let resolve;
      const promise = new Promise((_resolve) => {
        resolve = _resolve;
      });
      const consume = (m) => {
        const content = m.default || {};
        content.scroll = this._isMacUser() ? content.scrollMac : content.scroll;
        resolve(content);
      };
      import(baseURL + "./locales/" + lang + ".js").then(consume).catch(() => import(baseURL + "./locales/" + lang.split("-")[0] + ".js").then(consume).catch(() => consume({ default: en_default })));
      return promise;
    },
    _handleTouch(e) {
      const ignore = e.target.classList.contains("leaflet-interactive") || e.target.closest(".leaflet-control-container") || e.target.closest(".leaflet-popup-pane");
      if (ignore) {
        if (e.target.classList.contains("leaflet-interactive") && e.type === "touchmove" && e.touches.length === 1) {
          this._enableTouchWarning();
        } else {
          this._disableTouchWarning();
          if ((e.type === "touchend" || e.type === "touchcancel") && e.touches.length === 0) {
            this._enableInteractions();
          }
        }
      } else if (e.type !== "touchmove" && e.type !== "touchstart") {
        this._disableTouchWarning();
        this._enableInteractions();
      } else if (e.touches.length === 1) {
        this._enableTouchWarning();
      } else {
        e.preventDefault();
        this._disableTouchWarning();
        this._enableInteractions();
      }
    },
    _enableTouchWarning() {
      this._enableWarning("touch");
      this._disableInteractions();
    },
    _disableTouchWarning(delay) {
      clearTimeout(this._isTouching);
      this._isTouching = setTimeout(
        () => {
          this._disableWarning("touch");
        },
        delay || 0
      );
    },
    _enableScrollWarning() {
      this._enableWarning("scroll");
      this._disableInteraction("scrollWheelZoom");
    },
    _disableScrollWarning(delay) {
      clearTimeout(this._isScrolling);
      this._isScrolling = setTimeout(
        () => {
          this._disableWarning("scroll");
          this._enableInteraction("scrollWheelZoom");
        },
        delay || 0
      );
    },
    _handleScroll(e) {
      const scrollZoom = this._map.scrollWheelZoom;
      const scrollWarning = this._map._container.classList.contains("leaflet-gesture-handling-scroll");
      if (e.metaKey || e.ctrlKey || e.shiftKey && this._map._rotate) {
        if (scrollZoom && (scrollZoom.enabled() || scrollWarning)) {
          e.preventDefault();
          if (scrollWarning && !scrollZoom.enabled()) {
            this._enableInteraction("scrollWheelZoom");
            scrollZoom._onWheelScroll(e);
          }
          this._disableScrollWarning();
        }
      } else if (scrollZoom && scrollZoom.enabled()) {
        this._enableScrollWarning();
        this._disableScrollWarning(this._map.options.gestureHandlingOptions.duration);
      }
    },
    _handleScrollOnPopup(e) {
      L.DomEvent[e.type == "popupopen" ? "on" : "off"](e.popup._contentNode, "wheel", this._handleScroll, this);
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
    }
  });
  L.Map.mergeOptions({
    gestureHandlingOptions
  });
  L.Map.addInitHook("addHandler", "gestureHandling", GestureHandling);
  return __toCommonJS(index_exports);
})();
globalThis["leaflet-gesture-handling"] = leafletGestureHandling;
//# sourceMappingURL=leaflet-gesture-handling.js.map
