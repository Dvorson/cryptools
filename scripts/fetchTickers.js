const ccxt = require('ccxt');
const util = require('util');
const moment = require('moment');

const bittrex = new ccxt.bittrex();
const coss = new ccxt.coss();

(async function () {
	const tickeName = 'MORE/BTC';
	const tickersBittrex = await bittrex.fetchTickers();
	const tickersCoss = await coss.fetchTickers();
	const { datetime: tickerBittrex1 } = tickersBittrex[tickeName];
	const { datetime: tickersBittrex2 } = await bittrex.fetchTicker(tickeName);
	const { datetime: tickerCoss1 } = tickersCoss[tickeName];
	const { datetime: tickerCoss2 } = await coss.fetchTicker(tickeName);
	console.log(util.inspect({
		ticker1: moment(tickerBittrex1).fromNow(),
		ticker2: moment(tickersBittrex2).fromNow(),
		ticker3: moment(tickerCoss1).fromNow(),
		ticker4: moment(tickerCoss2).fromNow()
	}, {
		depth: 10
	}));
})();
