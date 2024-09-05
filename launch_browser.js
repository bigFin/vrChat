const puppeteer = require('puppeteer');
const http = require('http');

// Function to check if the server is running
function checkServer() {
	return new Promise((resolve) => {
		const req = http.request({ method: 'HEAD', host: 'localhost', port: 8000 }, (res) => {
			if (res.statusCode === 200) {
				resolve(true);
			} else {
				resolve(false);
			}
		});
		req.on('error', () => resolve(false));
		req.end();
	});
}

// Wait for the server to be ready
async function waitForServer() {
	console.log("Waiting for the server to start...");
	let serverReady = false;
	while (!serverReady) {
		serverReady = await checkServer();
		if (!serverReady) {
			await new Promise((resolve) => setTimeout(resolve, 1000));  // Wait 1 second
		}
	}
	console.log("Server is up!");
}

(async () => {
	// Wait for the server to start
	await waitForServer();

	// Launch Chromium with Puppeteer
	const browser = await puppeteer.launch({
		headless: false,  // Show the browser window
		args: ['--window-size=1280,720', '--window-position=100,100'],
	});

	const page = await browser.newPage();
	await page.goto('http://localhost:8000');  // Open the Three.js avatar page
})();
