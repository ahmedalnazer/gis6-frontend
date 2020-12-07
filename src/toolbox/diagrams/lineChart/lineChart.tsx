
import React from 'react';
import ReactEcharts from "echarts-for-react";
// import "./styles.css"
import "./styles.scss"

interface Serie {
	data: Array<Array<Number>>;
	yAxisIndex: Number;
	name: string;
}

type LineChartProps = Readonly<{
	xAxisLabel: string;
	yAxisLabels: Array<string>;
	xMax: number;
	Series: Array<Serie>;
	Height: number;
	Title: string;
	SubTitle: string;
}>;

export default function LineChart(props: LineChartProps) {
	// eslint-disable-next-line
	const [xAxisLabel, setxAxisLabel] = React.useState(props.xAxisLabel);
	// eslint-disable-next-line
	const [yAxisLabels, setyAxisLabels] = React.useState(props.yAxisLabels);
	// eslint-disable-next-line
	const [xMax, setxMax] = React.useState(props.xMax);
	// eslint-disable-next-line
	const [Series, setSeries] = React.useState(props.Series);
	// eslint-disable-next-line
	const [Height, setHeight] = React.useState(props.Height);
	// eslint-disable-next-line
	const [Title, setTitle] = React.useState(props.Title);
	// eslint-disable-next-line
	const [SubTitle, setSubTitle] = React.useState(props.SubTitle);
	var echartsReactRef: any = React.useRef(null);


	// //setxAxisLabel(1);
	// function appendData(seriesIndex: number, data: Array<Array<Number>>) {
	// 	echartsReactRef.appendData({ seriesIndex, data });
	// }

	// function cleanData() {
	// 	echartsReactRef.setOption(getOption());
	// }

	function getOption() {
		return {
			grid: {
				top: 10,
				left: 50,
				right: 10,
				bottom: 50
			},
			xAxis: {
				type: 'value',
				name: xAxisLabel,
				nameLocation: 'middle',
				nameGap: 30,
				min: 0,
				max: xMax,
			},
			yAxis: yAxisLabels.map(function (c, k) {
				return {
					type: 'value',
					name: c,
					nameLocation: 'middle',
					nameGap: 30,
					min: 0,
					max: 100
				}
			}),
			tooltip: {
				trigger: 'axis',
				axisPointer: {
					type: 'cross',
					animation: false,
					label: {
						backgroundColor: '#ccc',
						borderColor: '#aaa',
						borderWidth: 1,
						shadowBlur: 0,
						shadowOffsetX: 0,
						shadowOffsetY: 0,
						color: '#222'
					}
				},
			},
			textStyle: {
				fontSize: 16
			},
			dataZoom: [{
				type: 'inside',
				throttle: 50,
				zoomOnMouseWheel: false, 
			}],
			series: Series.map(function (el, elIndex) {
				return {
					data: el.data,
					yAxisname: el.yAxisIndex,
					type: 'line',
					name: el.name
				}
			}),
		};
	};

	return (
		<div>
			<h2>{Title}<small>{SubTitle}</small></h2>
			<ReactEcharts
				option={getOption()}
				style={{ height: Height + 'px', width: '100%' }}
				ref={(e) => { echartsReactRef = e; }}
				className='linechart' />
		</div>
	);
}