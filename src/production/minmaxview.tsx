import React from 'react';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import CardHeader from '@material-ui/core/CardHeader';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';

import { styled } from '@material-ui/core';

interface IGetMinMax
{
	min: number,
	max: number,
	min_zone: number,
	max_zone: number
}

class MinMaxView extends React.Component
{
	state =
	{
		maxTemp: "", maxSensor: "",
		minTemp: "", minSensor: "",
		material: 'Polypropylene', minMatTemp: 250, maxMatTemp: 270,
		tempUnits: ""
	}
	
	// TODO: These variables should go into a common class. Furthermore,
	// this common class should have hooks to decide if polling is necessary,
	// the frequency of the polling, and a callback function.
	
	// TODO: Verify that declaring variables outside of 'state' works.
	// It seems that 'state' changes triggers 'render'. Changes in these
	// variables should not trigger 'render'.
	isFetching = false;
	pollingId = setInterval(() => { if (!this.isFetching) this.myFetch(); }, 1000);
	
	myFetch()
	{
		this.doFetch("system/1/getminmax", this.updateState, this.handleFailure);
	}
	
	componentDidMount()
	{
		this.myFetch();
	}
	
	componentWillUnmount()
	{
		clearInterval(this.pollingId);
	}

	render()
	{
		// need to consolidate styles between here and OrderList
		const MyCard = styled(Card)(
		{
			alignItems: 'center',
			border: 1,
			borderColor: 'coral',
			borderRadius: 3,
			boxShadow: '1 0px 0px 0px rgba(51, 51, 255, .8)',
			margin: 'auto',
			padding: '0 0px',
			width: 300,
		});
		
		const MyCardHeader = styled(CardHeader)(
		{
			backgroundColor: 'green',
			color: 'white',
		});
		
		const MyCardContent = styled(CardContent)(
		{
			color: 'black',
		});
		
		const MajorTypography = styled(Typography)(
		{
			fontSize: 24,
		});
		
		const MinorTypography = styled(Typography)(
		{
			fontSize: 16,
		});
		
		const MyGridItem = styled(Grid)(
		{
			textAlign: 'center',
		});

		return (
			<div style={{padding:30}}>
				<div style={{padding: 20}}>
					<MyCard>
						<MyCardHeader title="Temperature"/>
						<MyCardContent>
							<Grid container direction="column">
								<MyGridItem item xs>
									<MajorTypography>{this.state.maxTemp}&deg;{this.state.tempUnits}</MajorTypography>
								</MyGridItem>
								<MyGridItem item xs>
									<MinorTypography>Highest: {this.state.maxSensor}</MinorTypography>
								</MyGridItem>
								<Grid item xs>&nbsp;</Grid>
								<MyGridItem item xs>
									<MajorTypography>{this.state.minTemp}&deg;{this.state.tempUnits}</MajorTypography>
								</MyGridItem>
								<MyGridItem item xs>
									<MinorTypography>Lowest: {this.state.minSensor}</MinorTypography>
								</MyGridItem>
								<Grid item xs>&nbsp;</Grid>
								<MyGridItem item xs>
									<MinorTypography>
										{this.state.material} | Range {this.state.minMatTemp}-
										{this.state.maxMatTemp}&deg;{this.state.tempUnits}
									</MinorTypography>
								</MyGridItem>
							</Grid>
						</MyCardContent>
					</MyCard>
				</div>
			</div>
		);
	}
	
	handleFailure(self: React.Component, error: any)
	{
		console.log(error);
		self.setState(
		{
			minTemp: 25,
			maxTemp: 30,
			minSensor: "Zone 5",
			maxSensor: "Zone 10",
			tempUnits: "C",
		});
	}
	
	updateState(self: React.Component, data: IGetMinMax)
	{
		self.setState(
		{
			minTemp: data['min'],
			maxTemp: data['max'],
			minSensor: "Zone " + data['min_zone'],
			maxSensor: "Zone " + data['max_zone'],
			tempUnits: "C",
		});
	}
	
	// TODO: This should go into a common class
	doFetch(apiPath: string, onSuccess: Function, onFailure: Function = () => {}, timeout: number = 1000)
	{
		this.isFetching = true;
		
		// Set up the URL
		let apiUrl = new URL(window.location.href);
		apiUrl.port = "8000";
		apiUrl.pathname = apiPath;

		// Prepare the timeout
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), timeout);
		
		// Fetch the data
		fetch(apiUrl.href, {signal: controller.signal})
			.then(response => { console.log(response.status); return response.json(); })
			.then(data => onSuccess(this, data)
			)
			.catch((error) =>
			{
				onFailure(this, error);
			});

		// Clean up
		clearTimeout(timeoutId);
		this.isFetching = false;
	}
}

export default MinMaxView;
