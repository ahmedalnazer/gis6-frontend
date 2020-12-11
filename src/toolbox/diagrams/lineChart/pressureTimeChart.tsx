import React from 'react';
import {Serie, LineChart} from './lineChart';

type PressChartProps = Readonly<{
	xMax: number;
	Series: Array<Serie>;
	Height: number;
}>;

export default function PressureTimeChart(props: PressChartProps) {
	// // eslint-disable-next-line
	// const [xMax, setxMax] = React.useState(props.xMax);
	// // eslint-disable-next-line
	// const [Series, setSeries] = React.useState(props.Series);
	// // eslint-disable-next-line
	// const [Height, setHeight] = React.useState(props.Height);

	function formatSubTitle() {
		return " (" + props.Series.length + " cavities)"
	}

	return (
		<LineChart
			xAxisLabel="Time [sec]"
			yAxiss={[{Label: "Pressure [bar]", Max: 1000}]}
			xMax={props.xMax}
			Series={props.Series}
			Height={props.Height}
			Title="Cavity Pressures"
			SubTitle={formatSubTitle()}
			/>
	);
}