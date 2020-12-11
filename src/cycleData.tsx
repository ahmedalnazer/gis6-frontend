import React from 'react';
import { useParams } from "react-router";
import PressureTimeChart from './toolbox/diagrams/lineChart/pressureTimeChart';
import PinPositionTimeChart from './toolbox/diagrams/lineChart/pinPositionTimeChart';
import ZoneTempTimeChart from './toolbox/diagrams/lineChart/zoneTempTimeChart';
import {fetchJson} from './restApi';
import {parseSensorData, Serie} from './toolbox/diagrams/DataConverter';

export default function CycleData() {
	const {CycleId} = useParams();

	// eslint-disable-next-line
	const [xMax, setxMax] = React.useState(10);
	// eslint-disable-next-line
	const [Height, setxHeight] = React.useState(200);
	const [TcData, setTcData] = React.useState<Serie[]>([]);
	const [VgData, setVgData] = React.useState<Serie[]>([]);
	const [PsData, setPsData] = React.useState<Serie[]>([]);

	async function loadTcData(CycleId:Number) {
		const data = await fetchJson("/sensordata/?cycleid=" + CycleId + "&devtype=tc");

		let diadata = parseSensorData(0.5, data);

		setTcData(diadata);
		
	}

	async function loadVgData(CycleId:Number) {
		const data = await fetchJson("/sensordata/?cycleid=" + CycleId + "&devtype=vg");

		let diadata = parseSensorData(0.04, data);
		setVgData(diadata);
	}

	async function loadPsData(CycleId:Number) {
		const data:any = []
		//const data = await fetchJson("/sensordata/?cycleid=" + CycleId + "&devtype=em75");

		let diadata = parseSensorData(0.004, data);
		setPsData(diadata);
	}

	React.useEffect(() => {
		loadTcData(CycleId);
		loadVgData(CycleId);
		loadPsData(CycleId);
	},
	[CycleId]);

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