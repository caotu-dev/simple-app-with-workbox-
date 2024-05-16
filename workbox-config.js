module.exports = {
	globDirectory: 'dist/',
	globPatterns: [
		'**/*.{html,ts,js,map}'
	],
	swDest: 'dist/sw.js',
	ignoreURLParametersMatching: [
		/^utm_/,
		/^fbclid$/
	],
	// skipWaiting: true
};