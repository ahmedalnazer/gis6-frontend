import React from 'react';
import LineChart from './lineChart';

export default function ZoneTempTimeChart() {
	function formatSubTitle() {
		return " (" + 1 + " zones)"
	}

	return (
		<LineChart
			xAxisLabel="Time [sec]"
			yAxisLabels={["Temperature [°C]"]}
			xMax={10}
			Series={[{data:[[1,2]], yAxisIndex:0, name: "T1"}]}
			Height={400}
			Title="Heater Zones"
			SubTitle={formatSubTitle()}
			/>
	);
}