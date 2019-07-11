const express = require('express');
const fs = require('fs');
const path = require('path');

const { getOpportunitiesRoute, getTickersRoute } = require('./routes/arbitrage');

const router = express.Router();

const asyncRouteWrapper = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.get('/', (req, res) => fs.createReadStream(path.resolve('./server/views/index.html')).pipe(res));
router.get('/api/tickers', asyncRouteWrapper(getTickersRoute));

module.exports = app => {
	app.use('/build', express.static('build'));
	app.use(router);
};
