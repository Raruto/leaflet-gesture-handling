# leaflet-gesture-handling.js

[![NPM version](https://img.shields.io/npm/v/@raruto/leaflet-gesture-handling.svg?color=red)](https://www.npmjs.com/package/@raruto/leaflet-gesture-handling)
[![License](https://img.shields.io/badge/license-GPL%203-blue.svg?style=flat)](LICENSE)

A Leaflet plugin that allows to prevent default map scroll/touch behaviours.


_For a working example see [demo](https://raruto.github.io/leaflet-gesture-handling/examples/leaflet-gesture-handling.html)_


<p align="center">
    <a href="https://raruto.github.io/leaflet-gesture-handling/examples/leaflet-gesture-handling.html"><img src="https://raruto.github.io/img/leaflet-gesture-handling.png" alt="Ctrl + scroll to zoom the map" /></a>
</p>


---

<blockquote>
    <p align="center">
        <em>Initially based on the <a href="https://github.com/elmarquis/Leaflet.GestureHandling">work</a> of <strong>elmarquis</strong></em>
    </p>
</blockquote>

---

## How to use

1. **include CSS & JavaScript**
    ```html
    <head>
    ...
    <style> html, body, #map { height: 100%; width: 100%; padding: 0; margin: 0; } </style>
    <!-- Leaflet (JS/CSS) -->
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <!-- leaflet-gesture-handling -->
    <link rel="stylesheet" href="https://unpkg.com/@raruto/leaflet-gesture-handling@1.6.0/dist/leaflet-gesture-handling.min.css" type="text/css">
    <script src="https://unpkg.com/@raruto/leaflet-gesture-handling@1.6.0/dist/leaflet-gesture-handling.min.js"></script>
    ...
    </head>
    ```
2. **choose the div container used for the slippy map**
    ```html
    <body>
    ...
    <div id="map"></div>
    ...
    </body>
    ```
3. **create your first simple “leaflet-gesture-handling” slippy map**
    ```html
    <script>
      ...
      const map = new L.Map('map', {
        center: [41.4583, 12.7059],
        zoom: 5,
        gestureHandling: true,
        gestureHandlingOptions: { // OPTIONAL
          // text: {
          //   touch: "Hey bro, use two fingers to move the map",
          //   scroll: "Hey bro, use ctrl + scroll to zoom the map",
          //   scrollMac: "Hey bro, use \u2318 + scroll to zoom the map"
          // },
          // locale: 'en', // set language of the warning message.
          // duration: 5000 // set time in ms before the message should disappear.
        }
      });
      ...
    </script>
    ```
_Related: [Leaflet-UI presets](https://github.com/raruto/leaflet-ui)_

---

**Compatible with:**
[![Leaflet 1.9.4](https://img.shields.io/badge/Leaflet-1.9.4-1EB300.svg?style=flat)](https://leafletjs.com/reference.html)
[![Leaflet 2.0.0-beta.3](https://img.shields.io/badge/Leaflet-2.0.0--beta.3-1EB300.svg?style=flat)](https://leafletjs.com/reference.html)

---

**Contributors:** [Elmarquis](https://github.com/elmarquis/Leaflet.GestureHandling), [Raruto](https://github.com/Raruto/leaflet-gesture-handling)
