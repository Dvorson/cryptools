const ccxt = require('ccxt');
const Promise = require('bluebird');
const moment = require('moment');
const { groupBy, flatten, maxBy, minBy, sortBy, without } = require('lodash');

const { exchanges: exchangesConfig } = require('../config');
const { broadcast } = require('./websocket');

const exchangeInstancesCache = {};
let exchangesConsidered = 0;
let pairsCalculated = 0;

const hrTimeSeconds = hrtime => hrtime[0] + hrtime[1] / 1e9;

async function fetchTickers(exchangeInstance) {
	if (!exchangeInstance.fetchTickers) return [];
	const tickers = await exchangeInstance.fetchTickers();
	Object.keys(tickers).map(async tckName => {
		const { datetime } = tickers[tckName];
		if (moment(datetime).isBefore(moment().subtract(1, 'minute'))) {
			tickers[tckName] = await exchangeInstance.fetchTicker(tckName);
		}
	});
}

function instantiateExchanges(exchangeNames) {
	const count = exchangeNames.length;
	let fetched = 0;
	let errors = 0;
	return Promise.map(exchangeNames, async name => {
		if (exchangeInstancesCache[name]) {
			const { instance, feePercentage } = exchangeInstancesCache[name];
			exchangesConsidered++;
			return { name, instance, tickers: await instance.fetchTickers(), feePercentage };
		}
		try {
			const { config = {}, feePercentage = 0.25 } = exchangesConfig[name] || {};
			const instance = new ccxt[name]({ ...config, enableRateLimit: true });
			if (!instance.has['fetchTickers']) {
				fetched++;
				return Promise.resolve();
			}
			await instance.loadMarkets();
			fetched++;
			broadcast({
				status: `Fetching tickers for ${name}, ${count - fetched} exchanges left`,
				progress: (fetched / count) * 50
			});
			console.log(`Fetching tickers for ${name}, ${count - fetched} exchanges left`);
			const tickers = await instance.fetchTickers();
			exchangesConsidered++;
			exchangeInstancesCache[name] = { name, instance, tickers, feePercentage };
			return { name, instance, tickers, feePercentage };
		} catch (e) {
			console.log(e);
			fetched++;
			errors++;
			return Promise.resolve();
		}
	}, { concurrency: 100 })
		.filter(Boolean)
		.tap(() => {
			broadcast({
				status: 'Calculating common tickers, grouping',
				progress: 50
			});
			console.log(`exchange fetching errors: ${errors}`);
		});
}

function getAllTickers(exchangesWithTickers) {
	return flatten(exchangesWithTickers.map(({ tickers = {}, name }) =>
		Object.values(tickers).map(tck => tck.last && tck.symbol && { exchange: name, ...tck }).filter(Boolean)
	));
}

async function getAllCommonTickers() {
	exchangesConsidered = 0;
	pairsCalculated = 0;
	const startTime = process.hrtime();
	const exchangeInstances = await instantiateExchanges(without(ccxt.exchanges, 'yobit', 'xbtce', 'tidex', 'okcoincny', 'liqui', 'ice3x', 'dsx', 'cointiger', 'coingi', 'chbtc', 'btcexchange', 'bibox', 'allcoin')); // Object.keys(exchangesConfig)); //['bittrex', 'bitfinex', 'binance']);
	const tickers = getAllTickers(exchangeInstances); // Object.keys(exchangesConfig)));
	const groups = groupBy(tickers, 'symbol');
	let count = Object.keys(groups).length;
	let calculated = 0;
	const roiByGroup = Object.keys(groups).reduce((acc, groupName) => {
		const groupedTickers = groups[groupName];
		if (groupedTickers.length < 2) {
			count--;
			return acc;
		}
		calculated++;
		const progress = Math.round((calculated / count) * 50) + 50;
		broadcast({
			status: `Calculating ROI for ${groupName}, ${count - calculated} pairs left`,
			progress
		});
		console.log(`Calculating ROI for ${groupName}, ${count - calculated} pairs left`);
		pairsCalculated++;
		const { bid: maxBid, ask: maxAsk, exchange: exchangeMax, last: maxLast, datetime: maxDateTime } = maxBy(groupedTickers, 'last');
		const { bid: minBid, ask: minAsk, exchange: exchangeMin, last: minLast, datetime: minDateTime } = minBy(groupedTickers, 'last');
		const { feePercentage: feeMax } = exchangeInstances.find(({ name }) => name === exchangeMax);
		const { feePercentage: feeMin } = exchangeInstances.find(({ name }) => name === exchangeMin);
		const roi = ((maxLast * (1 - feeMax) - minLast * (1 + feeMin)) / (maxLast + minLast)) * 100;
		const maxDate = moment(maxDateTime);
		const minDate = moment(minDateTime);
		return {
			...acc,
			[groupName]: {
				roi,
				exchangeMax,
				exchangeMin,
				maxBid,
				maxAsk,
				maxLast,
				minBid,
				minAsk,
				minLast,
				maxDate,
				minDate,
				symbol: groupName,
				linkMax: exchangesConfig[exchangeMax] && exchangesConfig[exchangeMax].getPairLink(groupName),
				linkMin: exchangesConfig[exchangeMin] && exchangesConfig[exchangeMin].getPairLink(groupName)
			}
		};
	}, {});
	const groupsWithPositiveRoi = Object.values(roiByGroup).filter(({ roi }) => roi > 0);
	const groupedByLastQuoteTime = groupBy(groupsWithPositiveRoi, ({ maxDate, minDate }) => maxDate.isAfter(moment().subtract(15, 'minutes')) && minDate.isAfter(moment().subtract(15, 'minutes')) ? 'recent' : 'outdated');
	const recentWithHumanReadableTime = groupedByLastQuoteTime.recent.map(tck => ({ ...tck, minDate: tck.minDate.fromNow(), maxDate: tck.maxDate.fromNow() }));
	const outdatedWithHumanReadableTime = groupedByLastQuoteTime.outdated.map(tck => ({ ...tck, minDate: tck.minDate.fromNow(), maxDate: tck.maxDate.fromNow() }));
	const sortedRecent = sortBy(recentWithHumanReadableTime, ({ roi }) => -roi);
	const sortedOutdated = sortBy(outdatedWithHumanReadableTime, ({ roi }) => -roi);
	console.log(`getAllCommonTickers took ${hrTimeSeconds(process.hrtime(startTime))}s`);
	broadcast({
		status: `Calculation done. ${exchangesConsidered} exchanges considered, ${pairsCalculated} pairs calculated`,
		progress: 100
	});
	return { sortedRecent, sortedOutdated };
}

module.exports = {
	getAllCommonTickers
};
