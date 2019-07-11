const WebSocket = require('ws');

const wss = new WebSocket.Server({ noServer: true });

function broadcast(data) {
	wss.clients.forEach(client => client.send(typeof data === 'string' ? data : JSON.stringify(data)));
}

module.exports = {
	wss,
	broadcast
};
