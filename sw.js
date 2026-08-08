var CACHE = 'pdf2md-pi-v2';
var SHARE_CACHE = 'pdf2md-shared';
var PRECACHE = ['/pdf-inspector/', '/pdf-inspector/worker.js', '/pdf-inspector/manifest.webmanifest', '/pdf-inspector/icon.svg'];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(PRECACHE);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE && k !== SHARE_CACHE; })
            .map(function (k) { return caches.delete(k); })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (event) {
  var url = new URL(event.request.url);

  if (event.request.method === 'POST' && url.pathname === '/pdf-inspector/') {
    event.respondWith(
      event.request.formData().then(function (formData) {
        var file = formData.get('file');
        if (!file) return Response.redirect('/pdf-inspector/?shared=error');
        return caches.open(SHARE_CACHE).then(function (cache) {
          return cache.put('/shared-file', new Response(file, { headers: { 'Content-Type': file.type || 'application/pdf' } }));
        }).then(function () {
          return Response.redirect('/pdf-inspector/?shared=1');
        });
      })
    );
    return;
  }

  if (event.request.method === 'GET' && url.pathname === '/pdf-inspector/shared-file') {
    event.respondWith(
      caches.open(SHARE_CACHE).then(function (cache) {
        return cache.match('/shared-file');
      }).then(function (match) {
        return match || new Response('no shared file', { status: 404 });
      })
    );
    return;
  }

  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request).then(function (res) {
      if (res && res.status === 200) {
        var copy = res.clone();
        caches.open(CACHE).then(function (cache) {
          cache.put(event.request, copy);
        });
      }
      return res;
    }).catch(function () {
      return caches.match(event.request);
    })
  );
});
