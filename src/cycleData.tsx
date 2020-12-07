import React from 'react';
import PressureTimeChart from './toolbox/diagrams/lineChart/pressureTimeChart';
import PinPositionTimeChart from './toolbox/diagrams/lineChart/pinPositionTimeChart';
import ZoneTempTimeChart from './toolbox/diagrams/lineChart/zoneTempTimeChart';
import {fetchJson, sendJson} from './restApi';
//import {parseData} from './toolbox/diagrams/gregs-code/HistDataParser';



type CycleDataProps = Readonly<{
	OrderId: number;
}>;

export default function CycleData(props: CycleDataProps) {
	const [OrderId, setOrderId] = React.useState(props.OrderId);
	const [VgData, setVgData] = React.useState(null);

	async function loadOrders() {
		const data = await fetchJson("/sensordata/?cycleid=1&devtype=vg");

		//concert here


		setVgData(data);
	}

	return (
		<div>
			<PressureTimeChart />
			<hr />
			<PinPositionTimeChart />
			<hr />
			<ZoneTempTimeChart />
		</div>
	);
}