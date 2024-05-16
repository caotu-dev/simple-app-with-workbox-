# Workbox build module
Generate an entire service worker or list of assets to precache for an existing service worker


## generateSW mode
Generate a service worker file

### When to use ?
Simple service worker such as precached files, runtime caching.

Apply for application with asic service worker caching behaviour with no complecated logic.

### Configuration

workbox configuration example file : `workbox-config.js`
```
// These are some common options, and not all are required.

modules.export = {
  dontCacheBustURLsMatching: [new RegExp('...')],
  globDirectory: '...',
  globPatterns: ['...', '...'],
  maximumFileSizeToCacheInBytes: ...,
  navigateFallback: '...',
  runtimeCaching: [{
    // Routing via a matchCallback function:
    urlPattern: ({request, url}) => ...,
    handler: '...',
    options: {
      cacheName: '...',
      expiration: {
        maxEntries: ...,
      },
    },
  }, {
    // Routing via a RegExp:
    urlPattern: new RegExp('...'),
    handler: '...',
    options: {
      cacheName: '...',
      plugins: [..., ...],
    },
  }],
  skipWaiting: ...,
  swDest: '...',
};
```


Inside of `build.js`
```
const {generateSW} = require('workbox-build');
const wbConfig = require('workbox-config');

// Consult the docs for more info.
generateSW(wbConfig).then(({count, size, warnings}) => {
  if (warnings.length > 0) {
    console.warn(
      'Warnings encountered while generating a service worker:',
      warnings.join('\n')
    );
  }

  console.log(`Generated a service worker, which will precache ${count} files, totaling ${size} bytes.`);
});
```

## injectManifest mode
Generate a list of URLs to precache and that precache manifest will be injected to an existing service worker.

### When to use ?
More control to SW

Precache files

Customize routing and strategies

Apply service worker with other platform features like Websocket, Push notification ...etc

### Configuration
workbox configuration file example : `workbox-config.js`
```
// These are some common options, and not all are required.

modules.export = {
  globDirectory: "dist/todo-list/",
  globPatterns: [
    "**/*.{css,eot,html,ico,jpg,js,json,png,svg,ttf,txt,webmanifest,woff,woff2,webm,xml}",
  ],
  globFollow: true, // follow symlinks
  globStrict: true, // fail the build if anything goes wrong while reading the files
  globIgnores: [
    // Ignore Angular's ES5 bundles
    // With this, we eagerly load the es2015
    // bundles and we only load/cache the es5 bundles when requested
    // i.e., on browsers that need them
    // Reference: https://github.com/angular/angular/issues/31256#issuecomment-506507021
    `**/*-es5.*.js`,
  ],
  // Look for a 20 character hex string in the file names
  // Allows to avoid using cache busting for Angular files because Angular already takes care of that!
  dontCacheBustURLsMatching: new RegExp(".+.[a-f0-9]{20}..+"),
  maximumFileSizeToCacheInBytes: 4 * 1024 * 1024, // 4Mb
  swSrc: "dist/todo-list/service-worker.js",
  swDest: "dist/todo-list/service-worker.js",
};
```

Inside of `build.js`
```
const {injectManifest} = require('workbox-build');
const wbConfig = require('workbox-config');

// These are some common options, and not all are required.
// Consult the docs for more info.
injectManifest(wbConfig).then(({count, size, warnings}) => {
  if (warnings.length > 0) {
    console.warn(
      'Warnings encountered while injecting the manifest:',
      warnings.join('\n')
    );
  }

  console.log(`Injected a manifest which will precache ${count} files, totaling ${size} bytes.`);
});
```

## generateSW or injectManifest ?
| generateSW                 | injectManifest |
| ---------------------------|:-------------:|
| new sw created             | inject to current sw     |
| simple precache files      | url customization, complicated caching behaviour     |
