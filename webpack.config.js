const path = require('path');

module.exports = {
	entry: './client',
	mode: process.env.NODE_ENV || 'development',
	output: {
		path: path.resolve(__dirname, 'build'),
		filename: 'bundle.js',
		publicPath: '/'
	},
	module: {
		rules: [
			{
				test: /\.jsx?$/,
				resolve: { extensions: ['.js', '.jsx'] },
				exclude: /node_modules/,
				loader: 'babel-loader'
			}
		]
	}
};
