/* Orloj Public — network first, offline fallback */
var CACHE = "orloj-public-v3";
var ASSETS = ["./", "./index.html", "./manifest.webmanifest", "./orloj-icon-180.png", "./orloj-icon-512.png"];
self.addEventListener("install", function(event){
  event.waitUntil(caches.open(CACHE).then(function(cache){return cache.addAll(ASSETS);}).then(function(){return self.skipWaiting();}));
});
self.addEventListener("activate", function(event){
  event.waitUntil(caches.keys().then(function(keys){return Promise.all(keys.filter(function(key){return key!==CACHE;}).map(function(key){return caches.delete(key);}));}).then(function(){return self.clients.claim();}));
});
self.addEventListener("fetch", function(event){
  if(event.request.method!=="GET")return;
  event.respondWith(fetch(event.request).then(function(response){
    var copy=response.clone();caches.open(CACHE).then(function(cache){try{cache.put(event.request,copy);}catch(e){}});return response;
  }).catch(function(){return caches.match(event.request).then(function(hit){return hit||caches.match("./index.html");});}));
});
