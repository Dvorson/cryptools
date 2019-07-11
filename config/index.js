const secrets = require('../.secret');

module.exports = {
	exchanges: {
		binance: {
			config: {
				...secrets.binance
			},
			feePercentage: 0.1,
			getPairLink: pair => `https://www.binance.com/en/trade/${pair.split('/')[0]}_${pair.split('/')[1]}`
		},
		bittrex: {
			config: {
				...secrets.bittrex
			},
			feePercentage: 0.25,
			getPairLink: pair => `https://international.bittrex.com/Market/Index?MarketName=${pair.split('/')[1]}-${pair.split('/')[0]}`
		},
		bitfinex: {
			config: {
				...secrets.bitfinex
			},
			feePercentage: 0.2,
			getPairLink: pair => `https://www.bitfinex.com/t/${pair.split('/')[0]}:${pair.split('/')[1]}`
		},
		kraken: {
			config: {
				...secrets.kraken
			},
			feePercentage: 0.26,
			getPairLink: pair => `https://www.kraken.com/redirect?url=https%3A%2F%2Fdwq4do82y8xi7.cloudfront.net%2Fwidgetembed%2F%3Fsymbol%3DKRAKEN%253A${pair.split('/')[1]}${pair.split('/')[0]}%26interval%3DD%26symboledit%3D1%26toolbarbg%3Df1f3f6%26hideideas%3D1%26studies%3D%26theme%3DWhite%26style%3D1%26timezone%3Dexchange`
		},
		kucoin: {
			feePercentage: 0.1,
			getPairLink: () => { }
		},
		poloniex: {
			feePercentage: 0.25,
			getPairLink: pair => `https://poloniex.com/exchange#${pair.split('/')[1]}_${pair.split('/')[0]}`
		},
		coss: {
			feePercentage: 0.2,
			getPairLink: pair => `https://coss.io/c/trade?s=${pair.split('/')[0]}_${pair.split('/')[1]}`
		},
		theocean: {
			feePercentage: 0.1,
			getPairLink: pair => `https://app.theocean.trade/dashboard/trading/${pair}`
		},
		upbit: {
			feePercentage: 0.15,
			getPairLink: pair => `https://sg.upbit.com/exchange?code=CRIX.UPBIT.${pair.split('/')[1]}-${pair.split('/')[0]}`
		}
	}
};
