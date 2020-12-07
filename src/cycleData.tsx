import React from 'react';
import PressureTimeChart from './toolbox/diagrams/lineChart/pressureTimeChart';
import PinPositionTimeChart from './toolbox/diagrams/lineChart/pinPositionTimeChart';
import ZoneTempTimeChart from './toolbox/diagrams/lineChart/zoneTempTimeChart';
import {fetchJson, sendJson} from './restApi';
//import {parseData} from './toolbox/diagrams/gregs-code/HistDataParser';

type CycleDataProps = Readonly<{
	OrderId: number;
	CycleId: number;
}>;

export default function CycleData(props: CycleDataProps) {
	// eslint-disable-next-line
	const [xMax, setxMax] = React.useState(10);
	// eslint-disable-next-line
	const [Height, setxHeight] = React.useState(400);
	// eslint-disable-next-line
	const [OrderId, setOrderId] = React.useState(props.OrderId);
	// eslint-disable-next-line
	const [CycleId, setCycleId] = React.useState(props.CycleId);
	const [TcData, setTcData] = React.useState([]);
	const [VgData, setVgData] = React.useState([]);
	const [PsData, setPsData] = React.useState([]);

	async function loadTcData() {
		const data = await fetchJson("/sensordata/?cycleid=" + OrderId + "&devtype=tc");

		//convert here
		//[{data:[[1,2]], name: "Z1"}]

		setTcData(data);
	}

	async function loadVgData() {
		const data = await fetchJson("/sensordata/?cycleid=" + OrderId + "&devtype=vg");

		//convert here
		//[{data:[[1,2]], name: "N1"}]

		setVgData(data);
	}

	async function loadPsData() {
		const data = await fetchJson("/sensordata/?cycleid=" + OrderId + "&devtype=em75");

		//convert here
		//[{data:[[1,2]], name: "p1"}]

		setPsData(data);
	}

	React.useEffect(() => {
		loadTcData();
		loadVgData();
		loadPsData();
	});

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