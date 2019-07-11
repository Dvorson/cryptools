const ccxt = require('ccxt');
const Promise = require('bluebird');
const { groupBy, flatten, maxBy, minBy, without } = require('lodash');

const { exchanges } = require('../config');

const exchangeNames = Object.keys(exchanges);
const exchangePairs = getAllPairs(exchangeNames);
// const exchangePairs = getAllPairs(ccxt.exchanges);
// const exchangePairs = getAllPairs(['bittrex', 'bitfinex', 'binance', 'coss', 'kraken', 'kucoin', 'poloniex', 'theocean', 'upbit']);

const exchangeInstancesCache = {};

function getCommonTickerNames (exchangesWithTickers) {
	try {
		if (exchangesWithTickers.length === 1) return Object.keys(exchangesWithTickers[0].tickers) || [];
	} catch (e) {
		console.log({ exchangesWithTickers, e });
	}
	const [currentExchange = {}, ...otherExchanges] = exchangesWithTickers;
	const { tickers = {} } = currentExchange;
	const nextCommon = getCommonTickerNames(otherExchanges);
	return Object.keys(tickers).filter(tck => nextCommon.includes(tck));
}

function instantiateExchanges (exchangeNames) {
	return Promise.map(exchangeNames, async name => {
		if (exchangeInstancesCache[name]) return exchangeInstancesCache[name];
		try {
			const { config = {} } = exchanges[name] || {};
			const instance = new ccxt[name](config);
			const tickers = await instance.fetchTickers();
			exchangeInstancesCache[name] = { name, instance, tickers };
			return { name, instance, tickers };
		} catch (e) {
			console.log(e);
			return Promise.resolve();
		}
	}, { concurrency: 1 });
}

async function fetchTickersFromExchanges (tickerNames, exchangeInstances) {
	return flatten(await Promise.map(
		tickerNames,
		tck =>
			Promise.map(
				exchangeInstances,
				async ({ name, instance }) => {
					({ name, tck: await instance.fetchTicker(tck), base: tck.split('/').pop() });
				},
				{ concurrency: 1 }
			),
		{ concurrency: 1 }
	));
}

function extractTickersFromExchanges (tickerNames, exchangesWithTickers) {
	// console.log({ exchangesWithTickers });
	return flatten(tickerNames.map(tck => {
		const base = tck.split('/').pop();
		return exchangesWithTickers.map(({ name, tickers }) => {
			// console.log(`Extracting ${tck} from ${name}`);
			if (!tickers[tck] || !tickers[tck].bid) {
				console.log(`No ticker ${tck} in exchange ${name}`);
				return;
			}
			const { symbol, bid } = tickers[tck];
			return {
				name,
				tck: tickers[tck],
				bid,
				symbol,
				base
			};
		}).filter(Boolean);
	}));
}

function getAllPairs (arr) {
	const arr2 = arr;
	return arr.reduce((acc, el1) => {
		const currentPairs = without(arr2, el1).map(el2 => [el1, el2]);
		arr2.shift();
		return [...acc, ...currentPairs];
	}, []);
}

async function getArbitrageOpportunities (tickerNames, exchangeInstances) {
	// const legitExchanges = await instantiateExchanges(exchangeNames);
	// const commonTickerNames1 = getCommonTickerNames(legitExchanges);
	// legitExchanges.map(({ name, tickers }) => console.log({ name, last: tickers['BTC/USD'] && tickers['BTC/USD'].last}));
	// console.log({ commonTickerNames1 });
	// console.log({ exchangeInstances });
	const tickers = extractTickersFromExchanges(tickerNames, exchangeInstances);
	// console.log({ tickers });
	const groupsByBase = groupBy(tickers, 'base');
	// console.log({ groupsByBase });
	let maxRoiByExchangeSet = {
		roi: 0
	};
	const baseGroups = Object.keys(groupsByBase)
		.map(base => {
			// console.log({ base, groupsByBase: groupsByBase[base] });
			const usdBases = extractTickersFromExchanges([`${base}/USD`], exchangeInstances);
			const usdBaseAverage = usdBases.reduce((acc, { bid }) => acc + bid, 0) / usdBases.length;
			let maxRoiByBase = {
				roi: 0
			};
			const groupsBySymbol = groupBy(groupsByBase[base], 'symbol');
			const symbolGroups = Object.keys(groupsBySymbol).map(symbol => {
				// console.log({ groupsBySymbol: groupsBySymbol[symbol] });
				const { bid: maxBid, name: maxName } = maxBy(groupsBySymbol[symbol], 'bid');
				const { bid: minBid, name: minName } = minBy(groupsBySymbol[symbol], 'bid');
				const diff = maxBid - minBid;
				const fee = (exchanges[maxName].feePercentage / 100) * maxBid + (exchanges[minName].feePercentage / 100) * minBid;
				const bidDiffMinusFee = diff - fee;
				const maxBidUsd = maxBid * usdBaseAverage;
				const minBidUsd = minBid * usdBaseAverage;
				const potentialProfitInUsd = bidDiffMinusFee * usdBaseAverage;
				const roi = (bidDiffMinusFee / maxBid) * 100;
				const currentSymbol = {
					symbol,
					maxName,
					minName,
					usdBaseAverage,
					maxBid,
					minBid,
					maxBidUsd,
					minBidUsd,
					bidDiffMinusFee,
					potentialProfitInUsd,
					roi
				};
				if (roi > maxRoiByBase.roi) {
					// const diffUsd = diff * usdBaseAverage;
					// const bidDiffToSumPercentage = (diff / (maxBid + minBid)) * 100;
					maxRoiByBase = currentSymbol;
				}
				if (roi > maxRoiByExchangeSet.roi) {
					// const diffUsd = diff * usdBaseAverage;
					// const bidDiffToSumPercentage = (diff / (maxBid + minBid)) * 100;
					maxRoiByExchangeSet = currentSymbol;
				}
				// console.log({ symbol, maxName, minName, diff });
				return currentSymbol;
			});
			// console.log(`----------------${base}------------------`);
			// console.log({ maxByBase });
			return { symbolGroups, maxRoiByBase };
		});
	return { baseGroups, maxRoiByExchangeSet };
}

async function getAllArbitrageOpportunities () {
	let maxRoiTotal = {
		roi: 0
	};
	const opps = await Promise.map(exchangePairs, async pair => {
		const exchangeInstances = await instantiateExchanges(pair);
		const commonTickerNames = getCommonTickerNames(exchangeInstances);
		// console.log({ exchangeInstances });
		const { baseGroups, maxRoiByExchangeSet } = await getArbitrageOpportunities(commonTickerNames, exchangeInstances);
		if (maxRoiByExchangeSet.roi > maxRoiTotal.roi) maxRoiTotal = maxRoiByExchangeSet;
		return { [`${pair[0]}-${pair[1]}`]: { baseGroups, maxRoiByExchangeSet } };
	});
	// console.log(util.inspect(opps, { depth: 10 }));
	// console.log({ maxRoiTotal });
	return { opps, maxRoiTotal };
}

module.exports = {
	getAllArbitrageOpportunities
};
