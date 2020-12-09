import React from 'react';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import CardHeader from '@material-ui/core/CardHeader';
import { styled } from '@material-ui/core';
//import { makeStyles, styled } from '@material-ui/core';
//import Typography from '@material-ui/core/Typography';

class MinMaxView extends React.Component
{
	state = { selectedAge: 0 };

	setAge(age: string)
	{
		this.setState({ selectedAge: parseInt(age) });
	}

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
		
		//const myStyles = makeStyles(
		//{
		//	major: { fontSize:24 },
		//	minor: { fontsize:12 },
		//});

		return (
			<div style={{padding:30}}>
				<div style={{padding: 20}}>
					<MyCard>
						<MyCardHeader title="Temperature" subheader="Things are heating up!"/>
						<MyCardContent>
							<p><span>30&deg;C</span><br/>Highest:&nbsp;<span>Zone 10</span></p>
							<p><span>25&deg;C</span><br/>Lowest:&nbsp;<span>Zone 5</span></p>
							<p>
								<span>Polypropylene</span>
								&nbsp;|&nbsp;
								<span>Range 250-270&deg;C</span>
							</p>
						</MyCardContent>
					</MyCard>
				</div>
			</div>
		);
	}
}

export default MinMaxView;
