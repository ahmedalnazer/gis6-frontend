import React from 'react';
import { Serie, LineChart } from './lineChart';

type ZoneTempChartProps = Readonly<{
	xMax: number;
	Series: Array<Serie>;
	Height: number;
}>;

export default function ZoneTempTimeChart(props: ZoneTempChartProps) {
	// // eslint-disable-next-line
	// const [xMax, setxMax] = React.useState();
	// // eslint-disable-next-line
	// const [Series, setSeries] = React.useState();
	// // eslint-disable-next-line
	// const [Height, setHeight] = React.useState();

	function formatSubTitle() {
		return " (" + props.Series.length + " zones)"
	}

	// setxMax(props.xMax);
	// setSeries(props.Series);
	// setHeight(props.Height);

	return (
		<LineChart
			xAxisLabel="Time [sec]"
			yAxiss={[{ Label: "Temperature [°C]", Max: 500 }]}
			xMax={props.xMax}
			Series={props.Series}
			Height={props.Height}
			Title="Heater Zones"
			SubTitle={formatSubTitle()}
		/>
	);
}