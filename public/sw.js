/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-b1bafff1'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "index.html",
    "revision": "409144dfeab4010c9ef86658243d953a"
  }, {
    "url": "icons.svg",
    "revision": "3b4fcfcf393eca4d264dca4a4663bc37"
  }, {
    "url": "favicon.svg",
    "revision": "4ce3d6a00fbf75466e820138fdf80bad"
  }, {
    "url": "assets/vendor-sortable-B8WKgBjI.js",
    "revision": null
  }, {
    "url": "assets/vendor-react-core-CeQEEKxp.js",
    "revision": null
  }, {
    "url": "assets/vendor-icons-eKlxQtzt.js",
    "revision": null
  }, {
    "url": "assets/vendor-html2canvas-ZH4MpR-D.js",
    "revision": null
  }, {
    "url": "assets/vendor-common-DRstysBs.js",
    "revision": null
  }, {
    "url": "assets/rolldown-runtime-S-ySWqyJ.js",
    "revision": null
  }, {
    "url": "assets/index-mLQjPXrR.css",
    "revision": null
  }, {
    "url": "assets/index-DzSUGPUP.js",
    "revision": null
  }, {
    "url": "assets/cardFilter.worker-DMqEKwxU.js",
    "revision": null
  }, {
    "url": "assets/QASection-UHhIoZGm.js",
    "revision": null
  }, {
    "url": "assets/DeckBuilder-1v3SQaWb.js",
    "revision": null
  }, {
    "url": "assets/CardModal-Bfubr94h.js",
    "revision": null
  }, {
    "url": "favicon.svg",
    "revision": "4ce3d6a00fbf75466e820138fdf80bad"
  }, {
    "url": "manifest.webmanifest",
    "revision": "8aeb48488a0d7a93c8c2964c02e92965"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html"), {
    denylist: [/^\/api\//]
  }));
  workbox.registerRoute(({
    url
  }) => /\.(?:webp|avif)$/i.test(url.pathname), new workbox.CacheFirst({
    "cacheName": "accusation-webp",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 800,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');
  workbox.registerRoute(({
    url
  }) => /\.png$/i.test(url.pathname) && /\/images\//i.test(url.pathname), new workbox.CacheFirst({
    "cacheName": "accusation-png-icons",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 64,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');
  workbox.registerRoute(({
    url
  }) => /\/assets\/.*\.(?:js|mjs|css)$/i.test(url.pathname), new workbox.StaleWhileRevalidate({
    "cacheName": "accusation-bundled-assets",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 64,
      maxAgeSeconds: 604800
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');
  workbox.registerRoute(({
    url
  }) => url.pathname.endsWith("cards.json") || url.pathname.startsWith("/cards/"), new workbox.StaleWhileRevalidate({
    "cacheName": "accusation-card-data",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 4,
      maxAgeSeconds: 86400
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');

}));
