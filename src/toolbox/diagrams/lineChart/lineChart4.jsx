import React, { Component } from 'react';
import Chart from "react-google-charts";

export default class lineChart4 extends Component {
	render() {
		return (
			<Chart
				width={'1000px'}
				height={'500px'}
				chartType="LineChart"
				loader={<div>Loading Chart</div>}
				data={[
					['x', 'dogs'],
					[0, 0],
					[1, 10],
					[2, 23],
					[3, 17],
					[4, 18],
					[5, 9],
					[6, 11],
					[7, 27],
					[8, 33],
					[9, 40],
					[10, 32],
					[11, 35],
				]}
				options={{
					hAxis: {
						title: 'Time',
					},
					vAxis: {
						title: 'Popularity',
					},
				}}
				rootProps={{ 'data-testid': '1' }}
			/>

		)
	}
}