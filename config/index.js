const secrets = require('../.secret');

module.exports = {
    exchanges: {
        binance: {
            config: {
                ...secrets.binance
            },
            feePercentage: 0.1
        },
        bittrex: {
            config: {
                ...secrets.bittrex
            },
            feePercentage: 0.25
        },
        bitfinex: {
            config: {
                ...secrets.bitfinex
            },
            feePercentage: 0.2
        },
        kraken: {
            feePercentage: 0.26
        },
        kucoin: {
            feePercentage: 0.1
        },
        poloniex: {
            feePercentage: 0.25
        }
    }
}
