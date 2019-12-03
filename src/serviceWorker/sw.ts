const VERSION = "0.8.36.0";
const CACHE_KEY = 'pacem-js-v' + VERSION;
const OFFLINE_PAGE = '/demo/offline.html';

const PREFETCHED = [
    //'/', // do not cache root: eases refresh
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
    '/dist/js/pacem-2d.js',
    '/dist/js/less.min.js',
    '/dist/js/pacemjs.js'
];
const EXCLUDED = ['/manifest.json'];

self.addEventListener('install', (evt: ExtendableEvent) => {

    evt.waitUntil(
        caches.open(CACHE_KEY)
            .then((cache: Cache) => {
                return cache.addAll(PREFETCHED);
            })
    );
});

/**
 * Manages the cache insertion based on the above constants.
 * @param request The original request
 * @param response The obtained response
 */
async function _tryCache(request: Request, response: Response) {
    if (request.method.toUpperCase() !== 'GET') {
        return;
    }

    const url = request.url;
    // check if the requested url must not be included in the cache
    for (var excluded of EXCLUDED) {
        if (url.endsWith(excluded)) {
            return;
        }
    }
    // if caching is allowed for this request, then...
    const cache = await caches.open(CACHE_KEY);
    cache.put(request, /* responses might be allowed to be used only once, thus cloning */ response.clone());
}
const _cacheFirst = (evt: FetchEvent) => {
    // Offline first, falling back to network.
    // In order to clear the cache, then update the {VERSION} above:
    // former cache version, if any, will be cleared.
    evt.respondWith(
        caches.match(evt.request)
            .then(
                async (cachedResponse: Response) => {
                    const url = evt.request.url;
                    if (cachedResponse) {
                        console.log('cached response for ' + url);
                        return cachedResponse;
                    } else {
                        try {
                            const r = await fetch(evt.request);
                            console.log('fresh response for ' + url);
                            await _tryCache(evt.request, r);
                            return r;
                        } catch (_) {
                            console.warn(_);
                            return caches.match(OFFLINE_PAGE);
                        }
                    }
                }
            )
    );
}

/**
 * Overrides the fetch operations using a network-first approach.
 * @param evt Then original FetchEvent
 */
const _networkFirst = (evt: FetchEvent) => {
    // Network first (refreshes the cache), falling back to cache if offline.
    evt.respondWith(
        caches.match(evt.request)
            .then(
                async (cachedResponse: Response) => {
                    const url = evt.request.url;
                    try {
                        const r = await fetch(evt.request);
                        // might respond `200 ok` even if offline, depending on the browser HTTP cache.
                        console.log('fresh response for ' + url);
                        await _tryCache(evt.request, r);
                        return r;
                    } catch (_) {
                        console.warn(_);
                        if (cachedResponse) {
                            console.log('cached response for ' + url);
                            return cachedResponse;
                        } else
                            return caches.match(OFFLINE_PAGE);
                    }

                })
    );
}

self.addEventListener('fetch', _networkFirst);

self.addEventListener('activate', function (event: ExtendableEvent) {

    console.log(`Service Worker v${VERSION} activated.`);

    // Delete all caches that aren't named {CACHE_KEY}    
    event.waitUntil(
        caches.keys().then(function (cacheNames) {
            return Promise.all(
                cacheNames.map(function (cacheName) {
                    if (cacheName !== CACHE_KEY) {
                        console.info('Removing outdated cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

