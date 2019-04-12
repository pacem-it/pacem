var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const VERSION = "0.8.9.3";
const CACHE_KEY = 'pacem-js-v' + VERSION;
const OFFLINE_PAGE = '/demo/offline.html';
const PREFETCHED = [
    '/menu.json',
    '/intro/welcome',
    OFFLINE_PAGE,
    '/dist/css/pacem-docs-dark.min.css',
    '/dist/css/pacem-docs-light.min.css',
    '/dist/css/pacem-docs-phousys.min.css',
    '/dist/css/pacem-dark-shell.min.css',
    '/dist/css/pacem-light-shell.min.css',
    '/dist/css/pacem-phousys-shell.min.css',
    '/dist/css/pacem-dark-content.min.css',
    '/dist/css/pacem-light-content.min.css',
    '/dist/css/pacem-phousys-content.min.css',
    '/polyfills/documentfragment.edge.js',
    '/polyfills/custom-elements.min.js',
    '/dist/js/pacem-core.js',
    '/dist/js/pacem-ui.js',
    '/dist/js/pacem-scaffoldings.js',
    '/dist/js/pacem-logging.js',
    '/dist/js/pacem-plus.js',
    '/dist/js/pacem-fx.js',
    '/dist/js/pacem-maps.js',
    '/dist/js/pacem-charts.js',
    '/dist/js/less.min.js',
    '/dist/js/pacemjs.js'
];
const EXCLUDED = ['/manifest.json'];
self.addEventListener('install', (evt) => {
    evt.waitUntil(caches.open(CACHE_KEY)
        .then((cache) => {
        return cache.addAll(PREFETCHED);
    }));
});
function _tryCache(request, response) {
    return __awaiter(this, void 0, void 0, function* () {
        if (request.method.toUpperCase() !== 'GET') {
            return;
        }
        const url = request.url;
        for (var excluded of EXCLUDED) {
            if (url.endsWith(excluded)) {
                return;
            }
        }
        const cache = yield caches.open(CACHE_KEY);
        cache.put(request, response.clone());
    });
}
const _cacheFirst = (evt) => {
    evt.respondWith(caches.match(evt.request)
        .then((cachedResponse) => __awaiter(this, void 0, void 0, function* () {
        const url = evt.request.url;
        if (cachedResponse) {
            console.log('cached response for ' + url);
            return cachedResponse;
        }
        else {
            try {
                const r = yield fetch(evt.request);
                console.log('fresh response for ' + url);
                yield _tryCache(evt.request, r);
                return r;
            }
            catch (_) {
                console.warn(_);
                return caches.match(OFFLINE_PAGE);
            }
        }
    })));
};
const _networkFirst = (evt) => {
    evt.respondWith(caches.match(evt.request)
        .then((cachedResponse) => __awaiter(this, void 0, void 0, function* () {
        const url = evt.request.url;
        try {
            const r = yield fetch(evt.request);
            console.log('fresh response for ' + url);
            yield _tryCache(evt.request, r);
            return r;
        }
        catch (_) {
            console.warn(_);
            if (cachedResponse) {
                console.log('cached response for ' + url);
                return cachedResponse;
            }
            else
                return caches.match(OFFLINE_PAGE);
        }
    })));
};
self.addEventListener('fetch', _networkFirst);
self.addEventListener('activate', function (event) {
    console.log(`Service Worker v${VERSION} activated.`);
    event.waitUntil(caches.keys().then(function (cacheNames) {
        return Promise.all(cacheNames.map(function (cacheName) {
            if (cacheName !== CACHE_KEY) {
                console.info('Removing outdated cache:', cacheName);
                return caches.delete(cacheName);
            }
        }));
    }));
});
