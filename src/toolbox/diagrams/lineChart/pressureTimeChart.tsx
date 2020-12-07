import React from 'react';
import LineChart from './lineChart';

export default function PressureTimeChart() {
	function formatSubTitle() {
		return " (" + 1 + " cavities)"
	}

	return (
		<LineChart
			xAxisLabel="Time [sec]"
			yAxisLabels={["Pressure [bar]"]}
			xMax={10}
			Series={[{data:[[1,2], [2,10]], yAxisIndex:0, name: "p1"}]}
			Height={400}
			Title="Cavity Pressures"
			SubTitle={formatSubTitle()}
			/>
	);
}