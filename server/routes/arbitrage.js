const { getAllArbitrageOpportunities, getAllCommonTickers } = require('../../lib');

async function getOpportunitiesRoute (req, res) {
	return res.json(await getAllArbitrageOpportunities());
}

async function getTickersRoute (req, res) {
	return res.json(await getAllCommonTickers());
}

module.exports = {
	getOpportunitiesRoute,
	getTickersRoute
};
