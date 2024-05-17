
import { CacheableResponsePlugin } from "workbox-cacheable-response";
import { ExpirationPlugin } from "workbox-expiration";
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL, PrecacheFallbackPlugin } from "workbox-precaching";
import { registerRoute, NavigationRoute, Route } from "workbox-routing";
import { NetworkOnly, StaleWhileRevalidate, CacheFirst, NetworkFirst } from "workbox-strategies";
import { clientsClaim, setCacheNameDetails } from 'workbox-core';
import { BackgroundSyncPlugin } from "workbox-background-sync/BackgroundSyncPlugin";
import { Queue } from "workbox-background-sync/Queue";


declare const self: any;

const DAY_IN_SECONDS = 24 * 60 * 60;
const MONTH_IN_SECONDS = DAY_IN_SECONDS * 30;
const NETWORK_TIMEOUT_IN_SECONDS = 30;

clientsClaim();


// Hardcode the fallback cache name and the offline
// HTML fallback's URL for failed responses
const FALLBACK_CACHE_NAME = 'offline-fallback';
const FALLBACK_HTML = '/offline.html';

/**
 * The current version of the service worker.
 */
const SERVICE_WORKER_VERSION = "1.0.0";

setCacheNameDetails({
  prefix: 'todo-app',
  suffix: 'v1',
  precache: 'install-time',
  runtime: 'run-time',
  googleAnalytics: 'ga',
});

// ------------------------------------------------------------------------------------------
// Precaching configuration
// ------------------------------------------------------------------------------------------
cleanupOutdatedCaches();

// Precaching
// Make sure that all the assets passed in the array below are fetched and cached
// The empty array below is replaced at build time with the full list of assets to cache
// This is done by workbox-build-inject.js for the production build
let assetsToCache = self.__WB_MANIFEST;
console.log(assetsToCache);

// To customize the assets afterwards:
// assetsToCache = [...assetsToCache];

precacheAndRoute(assetsToCache);

// ------------------------------------------------------------------------------------------
// Routes
// ------------------------------------------------------------------------------------------

// Default page handler for offline usage,
// where the browser does not how to handle deep links
// it's a SPA, so each path that is a navigation should default to index.html

const defaultRouteHandler = createHandlerBoundToURL("./index.html");
  const defaultNavigationRoute = new NavigationRoute(defaultRouteHandler, {
    //allowlist: [],
    //denylist: [],
  });
  registerRoute(defaultNavigationRoute);

// The network-only callback should match navigation requests, and
// the handler for the route should use the network-only strategy, but
// fall back to a precached offline page in case the user is offline.
const networkOnlyNavigationRoute = new Route(({ request }) => {
  return request.mode === 'navigate';
}, new NetworkOnly({
  plugins: [
    new PrecacheFallbackPlugin({
      fallbackURL: FALLBACK_HTML
    })
  ]
}));

registerRoute(networkOnlyNavigationRoute);

// Only wait for three seconds before returning the last
// cached version of the requested page.
const navigationRoute = new NavigationRoute(new NetworkFirst({
  networkTimeoutSeconds: NETWORK_TIMEOUT_IN_SECONDS,
  cacheName: 'navigations'
}));

registerRoute(navigationRoute);

// Cache the fallback HTML during installation.
self.addEventListener('install', (event: any) => {
  event.waitUntil(
    caches.open(FALLBACK_CACHE_NAME).then((cache) => cache.add(FALLBACK_HTML)),
  );
});

// Apply a network-only strategy to navigation requests.
// If offline, or if more than five seconds pass before there's a
// network response, fall back to the cached offline HTML.
const networkWithFallbackStrategy = new NetworkOnly({
  networkTimeoutSeconds: NETWORK_TIMEOUT_IN_SECONDS,
  plugins: [
    {
      handlerDidError: async () => {
        return await caches.match(FALLBACK_HTML, {
          cacheName: FALLBACK_CACHE_NAME,
        });
      },
    },
  ],
});

// Register the route to handle all navigations.
registerRoute(new NavigationRoute(networkWithFallbackStrategy));


// Make JS/CSS fast by returning assets from the cache
// But make sure they're updating in the background for next use
registerRoute(/\.(?:js|css)$/, new StaleWhileRevalidate());

// Cache images
// But clean up after a while
registerRoute(
  /\.(?:png|gif|jpg|jpeg|svg)$/,
  new CacheFirst({
    cacheName: "images",
    plugins: [
      new ExpirationPlugin({
        maxEntries: 250,
        maxAgeSeconds: MONTH_IN_SECONDS,
        purgeOnQuotaError: true, // Automatically cleanup if quota is exceeded.
      }),
    ],
  }),
);

const FAILED_API_REQUEST_QUEUE = "FAILED_API_REQUEST_QUEUE";
// Retry api when user is back online
const bgSyncPlugin = new BackgroundSyncPlugin(FAILED_API_REQUEST_QUEUE, {
  maxRetentionTime: 24 * 60 // Retry for max of 24 Hours (specified in minutes)
});

// Anything authentication related MUST be performed online
registerRoute(/(https:\/\/)?([^\/\s]+\/)api\/v1\/auth\/.*/, new NetworkOnly({
  plugins: [bgSyncPlugin]
}));


// Cache api request
registerRoute(
  /^(https:\/\/dummyjson.com\/)/,
  new StaleWhileRevalidate({
    cacheName: 'api-cache',
    plugins: [
      // Only cache when response 200
      new CacheableResponsePlugin({ statuses: [200] }),
      // Customize cache expiration
      new ExpirationPlugin({
        maxEntries: 50, // Maximum number of items to cache
        maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
      })
    ]
  })
);

// ------------------------------------------------------------------------------------------
// Messages
// ------------------------------------------------------------------------------------------
self.addEventListener("message", (event: any) => {
  if (event && event.data && event.data.type) {
    // return the version of this service worker
    if ("GET_VERSION" === event.data.type) {
      event.ports[0].postMessage(SERVICE_WORKER_VERSION);
    }

    // When this message is received, we can skip waiting and become active
    // (i.e., this version of the service worker becomes active)
    // Reference about why we wait: https://stackoverflow.com/questions/51715127/what-are-the-downsides-to-using-skipwaiting-and-clientsclaim-with-workbox
    if ("SKIP_WAITING" === event.data.type) {
      self.skipWaiting();
    }

    // When this message is received, we can take control of the clients with this version
    // of the service worker
    if ("CLIENTS_CLAIM" === event.data.type) {
      self.clients.claim();
    }

    if (event.data.type === 'PING') {
      console.log('Received PING message from window:', event);
      event.ports[0].postMessage({ type: 'PONG' });
    }
  }
});

// Add to retry failed request queue when user is back online
// this only apply when intenet connection is lost while fetching these request
// Not apply for 400 or 500 error code request
const queue = new Queue(FAILED_API_REQUEST_QUEUE);
self.addEventListener('fetch', (event: any) => {
  // Add in your own criteria here to return early if this
  // isn't a request that should use background sync.
  if (event.request.method !== 'POST') {
    return;
  }

  const bgSyncLogic = async () => {
    try {
      const response = await fetch(event.request.clone());
      return response;
    } catch (error) {
      await queue.pushRequest({request: event.request});
      return error;
    }
  };

  event.respondWith(bgSyncLogic());
});