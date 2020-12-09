import React from 'react';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import CardHeader from '@material-ui/core/CardHeader';
import Typography from '@material-ui/core/Typography';

import { styled } from '@material-ui/core';

class MinMaxView extends React.Component
{
	render()
	{

		// need to consolidate styles between here and OrderList
		const MyCard = styled(Card)(
		{
			borderColor: 'coral',
			margin: 'auto',
			border: 1,
			borderRadius: 3,
			boxShadow: '1 0px 0px 0px rgba(51, 51, 255, .8)',
			width: 300,
			alignItems: 'center',
			padding: '0 0px'
		});
		
		const MyCardHeader = styled(CardHeader)(
		{
			backgroundColor: 'green',
			color: 'white',
		});
		
		const MyCardContent = styled(CardContent)(
		{
			backgroundColor: 'white',
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
		
		//const classes = useStyles();

		return (
			<div style={{padding:30}}>
				<div style={{padding: 20}}>
					<MyCard>
						<MyCardHeader title="Temperature" subheader="Things are heating up!"/>
						<MyCardContent>
							<MajorTypography><span id="maxTemp">30&deg;C</span></MajorTypography>
							<MinorTypography>Highest:&nbsp;<span id="maxTempLocale">Zone 10</span></MinorTypography>
							<br/>
							<MajorTypography><span id="minTemp">25&deg;C</span></MajorTypography>
							<MinorTypography>Lowest:&nbsp;<span id="minTempLocale">Zone 5</span></MinorTypography>
							<br/>
							<MinorTypography>
								<span id="material">Polypropylene</span>
								&nbsp;|&nbsp;
								Range&nbsp;<span id="minMaterialTemp">250</span>-<span id="maxMaterialTemp">270&deg;C</span>
							</MinorTypography>
						</MyCardContent>
					</MyCard>
				</div>
			</div>
		);
	}
}

export default MinMaxView;
