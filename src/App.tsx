import React from "react";
import {BrowserRouter as Router, Route} from 'react-router-dom';

import "./App.css";

import ViewFilter from './order/view_filter';
import Landing from './toolbox/Landing';
import lineChart6 from './toolbox/diagrams/lineChart/lineChart6';
import timeValue from './toolbox/diagrams/lineChart/timeValue';
import PressureTimeChart from './toolbox/diagrams/lineChart/pressureTimeChart';
import CycleData from './cycleData';

function App() {
	return (
		<Router>
			<a href="/">Home</a>
			<a href="/linechart6/">LineChart6(echarts)</a>
			<a href="/timevalue/">Time Value</a>
			<a href="/pchart/">Pressure Time Value</a>
			<a href="/cycledata/">Cycle Data</a>

			<Route path="/" exact component={Landing} />
			<Route path="/order/list" exact component={ViewFilter} />
			<Route path="/linechart6/" exact component={lineChart6} />
			<Route path="/timevalue/" exact component={timeValue} />
			<Route path="/pchart/" exact component={PressureTimeChart} />
			<Route path="/cycledata/" exact component={CycleData} />
		</Router>
	);
}

export default App;
