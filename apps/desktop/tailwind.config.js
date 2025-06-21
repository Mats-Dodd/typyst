 
const sharedConfig = require('@haptic/tailwind-config/tailwind.config.js');

module.exports = {
	presets: [sharedConfig],
	content: [
		'./src/**/*.{html,js,svelte,ts}',
		'../../packages/ui/components/**/*.{html,js,svelte,ts}',
		'../../packages/ui/*.css'
	]
};
