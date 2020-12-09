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
		maxTemp: 30, maxSensor: 'Zone 10',
		minTemp: 25, minSensor: 'Zone 5',
		material: 'Polypropylene', minMatTemp: 250, maxMatTemp: 270
	}
	
	componentDidMount()
	{
		console.log("componentDidMount");
		this.doFetch();
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
									<MajorTypography>{this.state.maxTemp}&deg;C</MajorTypography>
								</MyGridItem>
								<MyGridItem item xs>
									<MinorTypography>Highest: {this.state.maxSensor}</MinorTypography>
								</MyGridItem>
								<Grid item xs>&nbsp;</Grid>
								<MyGridItem item xs>
									<MajorTypography>{this.state.minTemp}&deg;C</MajorTypography>
								</MyGridItem>
								<MyGridItem item xs>
									<MinorTypography>Lowest: {this.state.minSensor}</MinorTypography>
								</MyGridItem>
								<Grid item xs>&nbsp;</Grid>
								<MyGridItem item xs>
									<MinorTypography>
										{this.state.material} | Range {this.state.minMatTemp}-{this.state.maxMatTemp}&deg;C
									</MinorTypography>
								</MyGridItem>
							</Grid>
						</MyCardContent>
					</MyCard>
				</div>
			</div>
		);
	}
	
	doFetch()
	{
		let apiUrl = new URL(window.location.href);
		apiUrl.port = "8000";
		apiUrl.pathname = "system/1/getminmax";
		console.log("fetching from " + apiUrl);
		fetch(apiUrl.href)
			.then(response => response.json())
			.then(data => this.updateState(data));
	}
	
	updateState(data: IGetMinMax)
	{
		this.setState(
		{
			minTemp: data['min'],
			maxTemp: data['max'],
			minSensor: "Zone " + data['min_zone'],
			maxSensor: "Zone " + data['max_zone'],
		});
	}
}

export default MinMaxView;
