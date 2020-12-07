import React from 'react';
import {Serie, LineChart} from './lineChart';

type PinPosChartProps = Readonly<{
	xMax: number;
	Series: Array<Serie>;
	Height: number;
}>;

export default function PinPositionTimeChart(props: PinPosChartProps) {
	// eslint-disable-next-line
	const [xMax, setxMax] = React.useState(props.xMax);
	// eslint-disable-next-line
	const [Series, setSeries] = React.useState(props.Series);
	// eslint-disable-next-line
	const [Height, setHeight] = React.useState(props.Height);

	function formatSubTitle() {
		return " (" + Series.length + " pins)"
	}

	return (
		<LineChart
			xAxisLabel="Time [sec]"
			yAxiss={[{Label: "Position [mm]", Max: 10}]}
			xMax={xMax}
			Series={Series}
			Height={Height}
			Title="Pin Positions"
			SubTitle={formatSubTitle()}
			/>
	);
}