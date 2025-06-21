import { browser } from '$app/environment';
import { env } from '$env/dynamic/public';

// Web app URL configuration
export const WEB_APP_URL = browser
	? env.PUBLIC_WEB_APP_URL || 'http://localhost:5174'
	: process.env.WEB_APP_URL || 'http://localhost:5174';
