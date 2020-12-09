import React from 'react';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import CardHeader from '@material-ui/core/CardHeader';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';

import { styled } from '@material-ui/core';

class MinMaxView extends React.Component
{
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
									<MajorTypography><span id="maxTemp">30&deg;C</span></MajorTypography>
								</MyGridItem>
								<MyGridItem item xs>
									<MinorTypography>Highest:&nbsp;<span id="maxTempLocale">Zone 10</span></MinorTypography>
								</MyGridItem>
								<Grid item xs>&nbsp;</Grid>
								<MyGridItem item xs>
									<MajorTypography><span id="minTemp">25&deg;C</span></MajorTypography>
								</MyGridItem>
								<MyGridItem item xs>
									<MinorTypography>Lowest:&nbsp;<span id="minTempLocale">Zone 5</span></MinorTypography>
								</MyGridItem>
								<Grid item xs>&nbsp;</Grid>
								<MyGridItem item xs>
									<MinorTypography>
										<span id="material">Polypropylene</span>
										&nbsp;|&nbsp;
										Range&nbsp;<span id="minMaterialTemp">250</span>-<span id="maxMaterialTemp">270&deg;C</span>
									</MinorTypography>
								</MyGridItem>
							</Grid>
						</MyCardContent>
					</MyCard>
				</div>
			</div>
		);
	}
}

export default MinMaxView;
