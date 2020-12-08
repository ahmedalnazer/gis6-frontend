import React from 'react';
import PressureTimeChart from './toolbox/diagrams/lineChart/pressureTimeChart';
import PinPositionTimeChart from './toolbox/diagrams/lineChart/pinPositionTimeChart';
import ZoneTempTimeChart from './toolbox/diagrams/lineChart/zoneTempTimeChart';
import {fetchJson, sendJson} from './restApi';
import {parseSensorData, Serie} from './toolbox/diagrams/DataConverter';

type CycleDataProps = Readonly<{
	OrderId: number;
	CycleId: number;
}>;

export default function CycleData(props: CycleDataProps) {
	let InitData: Array<Serie> = Array(0);

	// eslint-disable-next-line
	const [xMax, setxMax] = React.useState(10);
	// eslint-disable-next-line
	const [Height, setxHeight] = React.useState(400);
	// eslint-disable-next-line
	const [OrderId, setOrderId] = React.useState(props.OrderId);
	// eslint-disable-next-line
	const [CycleId, setCycleId] = React.useState(84);//props.CycleId);
	const [TcData, setTcData] = React.useState(InitData);
	const [VgData, setVgData] = React.useState(InitData);
	const [PsData, setPsData] = React.useState(InitData);

	async function loadTcData() {
		const data = await fetchJson("/sensordata/?cycleid=" + CycleId + "&devtype=tc");

		let diadata = parseSensorData(data);
		//convert here
		//[{data:[[1,2]], name: "Z1"}]

		setTcData(diadata);
		console.log("data loaded!");
	}

	async function loadVgData() {
		//const data = await fetchJson("/sensordata/?cycleid=" + CycleId + "&devtype=vg");

		//convert here
		//[{data:[[1,2]], name: "N1"}]

		//setVgData(data);
	}

	async function loadPsData() {
		//const data = await fetchJson("/sensordata/?cycleid=" + CycleId + "&devtype=em75");

		//convert here
		//[{data:[[1,2]], name: "p1"}]

		//setPsData(data);
	}

	React.useEffect(() => {
		loadTcData();
		loadVgData();
		loadPsData();
	},
	[]);

	return (
		<div>
			<ZoneTempTimeChart 
				xMax={xMax}
				Series={TcData}
				Height={Height}
				/>
			<hr />
			<PinPositionTimeChart
				xMax={xMax}
				Series={VgData}
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