/* Orloj Public v11.09 — Životní kronika */
var CACHE = "orloj-public-v11-09";
var ASSETS = ["./", "./index.html", "./day.html", "./day-profile.js", "./day-profile.css", "./timeline.html", "./timeline.js", "./timeline.css", "./life.html", "./life-chronicle.js", "./life-chronicle.css", "./vedic.html", "./vedic-astrology.js", "./vedic-astrology.css", "./astronomy-engine.min.js", "./human-design.js", "./human-design.css", "./tarot.html", "./manifest.webmanifest", "./IMG_3491.png", "./IMG_3492.png", "./assets/rws-hermit-1909.jpg"];

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
          if (event.request.mode === "navigate") {
            if (/\/day\.html$/.test(requestURL.pathname)) return caches.match("./day.html");
            if (/\/timeline\.html$/.test(requestURL.pathname)) return caches.match("./timeline.html");
            if (/\/life\.html$/.test(requestURL.pathname)) return caches.match("./life.html");
            if (/\/vedic\.html$/.test(requestURL.pathname)) return caches.match("./vedic.html");
            if (/\/tarot\.html$/.test(requestURL.pathname)) return caches.match("./tarot.html");
            return caches.match("./index.html");
          }
          return Response.error();
        });
      })
  );
});
