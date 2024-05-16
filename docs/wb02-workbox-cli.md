# Workbox Cli

Provide an easy way to integrating Workbox in to command line build process, with flexible configurations.

## Installation
```
npm install workbox-cli --global
```

## CLI modes
The CLI has four different modes:

- `wizard`: A step-by-step guide to set up Workbox for your project.
- `generateSW`: Generates a complete service worker for you.
- `injectManifest`: Injects the assets to precache into your project.
- `copyLibraries`: Copy the Workbox libraries into a directory.

### wizard

generate a configuration file which can then be used when running in `generateSW` mode via command line

```
npx workbox-cli wizard
```

### generateSW

Generate sw file with Workbox's built-in precaching and runtime caching capabilitie as basic as possible

```
npx workbox-cli generateSW path/to/config.js
```


### injectManifest

Oppose to `generateSW`, this mode provides manifest injection to an existing service worker file to which files (list url) to be precached.

The rest of service worker file remain untouched.

```
npx workbox-cli injectManifest path/to/config.js
```

### copyLibraries
This mode is helpful if you would like to use injectManifest and would like to use the Workbox library files hosted on your own origin instead of using the CDN.

```
npx workbox-cli copyLibraries third_party/workbox/
```

## Setup and Configuration

```
{
  "scripts": {
    "build": "my-build-script && workbox <mode> <path/to/config.js>"
  }
}
```
