import React, { PureComponent } from 'react';
import {
	LineChart, Line, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts';

var data = [];
for (var i=0; i<3000; i+=4) {
	var row={name:i/1000};
	for (var ch=0; ch<10; ch++) {
		row[ch]=i+ch;
	} 
	data.push(row)
}


export default class lineChart1 extends PureComponent {
	static jsfiddleUrl = 'https://jsfiddle.net/alidingling/xqjtetw0/';

	render() {
		return (
			<LineChart
				width={1700}
				height={1000}
				data={data}
				margin={{
					top: 5, right: 30, left: 20, bottom: 5,
				}}
			>
				<CartesianGrid strokeDasharray="3 3" />
				<XAxis dataKey="name" />
				<YAxis />
				{/* <Tooltip /> */}
				<Legend />
				<Line type="monotone" dataKey="0" stroke="#8884d8" activeDot={{ r: 8 }} />
				<Line type="monotone" dataKey="1" stroke="#82ca9d" />
				<Line type="monotone" dataKey="2" stroke="#82ca9d" />
				<Line type="monotone" dataKey="3" stroke="#82ca9d" />
				<Line type="monotone" dataKey="4" stroke="#82ca9d" />
				<Line type="monotone" dataKey="5" stroke="#82ca9d" />

			</LineChart>
		);
	}
}
