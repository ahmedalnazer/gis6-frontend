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
	// eslint-disable-next-line
	const [xMax, setxMax] = React.useState(10);
	// eslint-disable-next-line
	const [Height, setxHeight] = React.useState(400);
	// eslint-disable-next-line
	const [OrderId, setOrderId] = React.useState(props.OrderId);
	// eslint-disable-next-line
	const [VgData, setVgData] = React.useState([]);
	// eslint-disable-next-line
	const [PpData, setPpData] = React.useState([]);
	// eslint-disable-next-line
	const [PsData, setPsData] = React.useState([]);

	async function loadVgData() {
		const data = await fetchJson("/sensordata/?cycleid=1&devtype=vg");

		//convert here
		//[{data:[[1,2]], name: "T1"}]

		setVgData(data);
	}

	async function loadPpData() {
		const data = await fetchJson("/sensordata/?cycleid=1&devtype=vg");

		//convert here
		//[{data:[[1,2]], name: "T1"}]

		setVgData(data);
	}

	async function loadPsData() {
		const data = await fetchJson("/sensordata/?cycleid=1&devtype=vg");

		//convert here
		//[{data:[[1,2]], name: "T1"}]

		setVgData(data);
	}

	React.useEffect(() => {
		loadVgData();
		loadPpData();
		loadPsData();
	});

	return (
		<div>
			<ZoneTempTimeChart 
				xMax={xMax}
				Series={VgData}
				Height={Height}
				/>
			<hr />
			<PinPositionTimeChart
				xMax={xMax}
				Series={PpData}
				Height={Height}
				/>
			<hr />
			<PressureTimeChart
				xMax={xMax}
				Series={PsData}
				Height={Height}
				/>
		</div>
	);
}