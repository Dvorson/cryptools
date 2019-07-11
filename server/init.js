const express = require('express');

const router = require('./router');

function initApp() {
	const app = express();

	// generic(app);
	// middleware(app);
	router(app);

	return app;
}

module.exports = {
	initApp
};
