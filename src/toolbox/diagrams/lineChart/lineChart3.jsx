import React, { Component } from 'react';
import { VictoryChart, VictoryLine, VictoryScatter, VictoryAxis } from 'victory';

export default class lineChart3 extends Component {
	render() {
		return (
			<div>
				<VictoryChart height={500} width={1000}>
					<VictoryScatter
						y={(data) => Math.sin(2 * Math.PI * data.x)}
						samples={2500}
						size={2}
						style={{ data: { fill: "tomato" } }}
					/>
					<VictoryLine
						style={{ data: { stroke: "orange" } }}
						y={(data) => Math.sin(2 * Math.PI * data.x)}
					/>
					<VictoryAxis />
					<VictoryAxis dependentAxis />
				</VictoryChart>
			</div>

		)
	}
}