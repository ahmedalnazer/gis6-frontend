import React from 'react';
import LineChart from './lineChart';

export default function PinPositionTimeChart() {
	function formatSubTitle() {
		return " (" + 1 + " pins)"
	}

	return (
		<LineChart
			xAxisLabel="Time [sec]"
			yAxisLabels={["Position [mm]"]}
			xMax={10}
			Series={[{data:[[1,2]], yAxisIndex:0, name: "N1"}]}
			Height={400}
			Title="Pin Positions"
			SubTitle={formatSubTitle()}
			/>
	);
}