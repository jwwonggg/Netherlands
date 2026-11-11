// 改了 index.html 之後把版本號 +1，手機才會抓新版
// 網頁本身（HTML）一律先上網抓最新版，離線才用快取；其他檔案先用快取再背景更新
var CACHE = "nlbe-public-v3";
var FILES = [
  "./", "./index.html", "./en.html", "./manifest.webmanifest",
  "./icon-180.png", "./icon-192.png", "./icon-512.png",
  "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css",
  "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"
];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return Promise.all(FILES.map(function (f) {
      // cache: "reload" 跳過瀏覽器的 HTTP 快取，避免把舊版存進新快取
      return c.add(new Request(f, { cache: "reload" })).catch(function () {});
    }));
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.map(function (k) {
      if (k !== CACHE) { return caches.delete(k); }
    }));
  }).then(function () { return self.clients.claim(); }));
});

function isPage(req) {
  return req.mode === "navigate" ||
    (req.headers.get("accept") || "").indexOf("text/html") !== -1;
}

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") { return; }

  if (isPage(req)) {
    e.respondWith(
      fetch(req, { cache: "no-cache" }).then(function (res) {
        if (res && res.status === 200) {
          var cl = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, cl); });
        }
        return res;
      }).catch(function () {
        return caches.match(req).then(function (hit) {
          return hit || caches.match("./index.html");
        });
      })
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(function (hit) {
      var net = fetch(req).then(function (res) {
        if (res && res.status === 200 && req.url.indexOf("http") === 0) {
          var cl = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, cl); });
        }
        return res;
      });
      if (hit) { net.catch(function () {}); return hit; }
      return net;
    })
  );
});
