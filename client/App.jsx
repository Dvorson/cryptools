import React from 'react';
import { throttle } from 'lodash';
import { withStyles } from '@material-ui/core/styles';
import Button from '@material-ui/core/Button';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Paper from '@material-ui/core/Paper';
import LinearProgress from '@material-ui/core/LinearProgress';
import Typography from '@material-ui/core/Typography';

const styles = theme => ({
	root: {
		width: '100%',
		overflowX: 'auto'
	},
	table: {
		minWidth: 650
	},
	status: {
		padding: theme.spacing(2)
	}
});

class App extends React.Component {

	constructor(props) {
		super(props);
		this.state = {
			tickers: {
				recent: [],
				outdated: []
			},
			status: '',
			progress: 0
		};
		this.ws = new WebSocket(`ws://${window.location.host}/api/ws`);
		this.ws.onopen = () => console.log('WebSocket connected');
		this.ws.onmessage = throttle(evt => {
			const { progress, status } = JSON.parse(evt.data);
			this.setState({ progress, status });
		}, 200);
	}

	componentDidMount() {
		fetch('/api/tickers')
			.then(resp => resp.json())
			.then(({ sortedRecent: recent, sortedOutdated: outdated }) => this.setState({ tickers: { recent, outdated } }));
	}

	renderTickerRows(tickers) {
		return tickers.map(({
			roi,
			exchangeMax,
			exchangeMin,
			maxLast,
			minLast,
			maxDate,
			minDate,
			symbol,
			linkMax,
			linkMin
		}) => {
			return (
				<TableRow key={symbol}>
					<TableCell component="th" scope="row">
						<Typography variant="h5" gutterBottom>
							{symbol}
						</Typography>
					</TableCell>
					<TableCell align="right">
						<Typography variant="h5" gutterBottom>
							{maxLast}
						</Typography>
						<Typography variant="subtitle1" gutterBottom>
							{exchangeMax}, last trade {maxDate} at {maxLast}
						</Typography>
						{linkMax && <Button variant="contained" color="primary" href={linkMax} target="_blank">Open</Button>}
					</TableCell>
					<TableCell align="right">
						<Typography variant="h5" gutterBottom>
							{minLast}
						</Typography>
						<Typography variant="subtitle1" gutterBottom>
							{exchangeMin}, last trade {minDate} at {minLast}
						</Typography>
						{linkMin && <Button variant="contained" color="primary" href={linkMin} target="_blank">Open</Button>}
					</TableCell>
					<TableCell align="right">
						<Typography variant="h5" gutterBottom>
							~{roi > 1 ? Math.round(roi) : roi}%
						</Typography>
					</TableCell>
				</TableRow>
			)
		})
	}

	render() {
		const { tickers, progress, status } = this.state;
		const { classes } = this.props;
		return (
			<Paper className={classes.root}>

				<div className={classes.status}>
					<Typography align="center" variant="h5" gutterBottom>
						{status}
					</Typography>
					{ !Boolean(tickers.recent.length) && <LinearProgress variant="determinate" value={progress} /> }
				</div>

				<Table className={classes.table}>
					<TableHead>
						<TableRow>
							<TableCell>
								<Typography variant="h4">
									Pair
								</Typography>
							</TableCell>
							<TableCell align="right">
								<Typography variant="h4">
									Max.
								</Typography>
								<Typography variant="subtitle1" gutterBottom>
									last/exchange/time
								</Typography>
							</TableCell>
							<TableCell align="right">
								<Typography variant="h4">
									Min.
								</Typography>
								<Typography variant="subtitle1" gutterBottom>
									last/exchange/time
								</Typography>
							</TableCell>
							<TableCell align="right">
								<Typography variant="h4">
									ROI
								</Typography>
								<Typography variant="subtitle1" gutterBottom>
									(lastMax - lastMin - fees / lastMax + lastMin)
								</Typography>
							</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>

						<TableRow key="recent">
							<TableCell align="center" colSpan={4}>
								<Typography variant="h6">Tickers with recent deals on both exchanges</Typography>
							</TableCell>
						</TableRow>

						{
							Boolean(tickers.recent.length) &&
								this.renderTickerRows(tickers.recent)
						}

						<TableRow key="outdated">
							<TableCell align="center" colSpan={4}>
								<Typography variant="h6">Tickers with no recent deals on at least one of exchanges</Typography>
							</TableCell>
						</TableRow>

						{
							Boolean(tickers.outdated.length) &&
								this.renderTickerRows(tickers.outdated)
						}

					</TableBody>
				</Table>
			</Paper>
		);
	}

}

export default withStyles(styles)(App);
