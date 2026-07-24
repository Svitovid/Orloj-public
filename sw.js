/* Orloj Public v10.6 — Czech/English calendars, app shell network first */
var CACHE = "orloj-public-v10-6";
var ASSETS = ["./", "./index.html", "./manifest.webmanifest", "./IMG_3491.png", "./IMG_3492.png"];

self.addEventListener("install", function(event) {
  event.waitUntil(
    caches.open(CACHE)
      .then(function(cache) { return cache.addAll(ASSETS); })
      .then(function() { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function(event) {
  event.waitUntil(
    caches.keys()
      .then(function(keys) {
        return Promise.all(
          keys.filter(function(key) { return key !== CACHE; })
              .map(function(key) { return caches.delete(key); })
        );
      })
      .then(function() { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function(event) {
  if (event.request.method !== "GET") return;
  var requestURL = new URL(event.request.url);
  if (requestURL.origin !== self.location.origin) return;
  event.respondWith(
    fetch(event.request)
      .then(function(response) {
        if (response && response.ok) {
          var copy = response.clone();
          caches.open(CACHE).then(function(cache) {
            cache.put(event.request, copy).catch(function() {});
          });
        }
        return response;
      })
      .catch(function() {
        return caches.match(event.request).then(function(hit) {
          if (hit) return hit;
          if (event.request.mode === "navigate") return caches.match("./index.html");
          return Response.error();
        });
      })
  );
});
