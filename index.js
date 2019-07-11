const url = require('url');

const { initApp } = require('./server/init');
const packageInfo = require('./package.json');
const { wss } = require('./lib/websocket');

const appName = packageInfo.name;

const app = initApp();

process.on('exit', (code) => console.log(`${appName} exited with code ${code}`));

if (require.main === module) {
	const port = Number(process.env.PORT) || 8080;
	const server = app.listen(port, () => {
		console.log(`${appName} is listening on port ${server.address().port}`);
	});

	server.on('upgrade', (request, socket, head) => {
		const pathname = url.parse(request.url).pathname;
		if (!pathname === '/api/ws') {
			socket.destroy();
			return;
		}

		wss.handleUpgrade(request, socket, head, (ws) => {
			wss.emit('connection', ws, request);
		});
	});
}

module.exports = app;
