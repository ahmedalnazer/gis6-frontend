import React from 'react';
import {Serie, LineChart} from './lineChart';

type ZoneTempChartProps = Readonly<{
	xMax: number;
	Series: Array<Serie>;
	Height: number;
}>;

export default function ZoneTempTimeChart(props: ZoneTempChartProps) {
	// eslint-disable-next-line
	const [xMax, setxMax] = React.useState(props.xMax);
	// eslint-disable-next-line
	const [Series, setSeries] = React.useState(props.Series);
	// eslint-disable-next-line
	const [Height, setHeight] = React.useState(props.Height);
	
	function formatSubTitle() {
		return " (" + Series.length + " zones)"
	}

	return (
		<LineChart
			xAxisLabel="Time [sec]"
			yAxiss={[{Label: "Temperature [°C]", Max: 500}]}
			xMax={xMax}
			Series={Series}
			Height={Height}
			Title="Heater Zones"
			SubTitle={formatSubTitle()}
			/>
	);
}