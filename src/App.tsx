import React from "react";
import {BrowserRouter as Router, Route} from 'react-router-dom';

import "./App.css";

import ViewFilter from './order/view_filter';
import CollapsibleTable from './order/table2';
import Landing from './toolbox/Landing';
import lineChart6 from './toolbox/diagrams/lineChart/lineChart6';
import timeValue from './toolbox/diagrams/lineChart/timeValue';
import PressureTimeChart from './toolbox/diagrams/lineChart/pressureTimeChart';
import CycleData from './cycleData';
import BaseLayout from './toolbox/layout/demobase';

function get_links() {
	return (
		<>
			<a href="/landing/">Home</a>
			<a href="/layout/">Layout</a>
			<a href="/linechart6/">LineChart6(echarts)</a>
			<a href="/timevalue/">Time Value</a>
			<a href="/order/list/">Orders</a>
			<a href="/order/list2/">Orders2</a>
			<a href="/pchart/">Pressure Time Value</a>
			<a href="/cycledata/">Cycle Data</a>
		</>
	);
}

function App() {
	return (
		<Router>
			<Route path="/" exact component={get_links} />
			<Route path="/landing/" exact component={Landing} />
			<Route path="/layout/" exact component={BaseLayout} />
			<Route path="/order/list/" exact component={ViewFilter} />
			<Route path="/order/list2/" exact component={CollapsibleTable} />
			<Route path="/linechart6/" exact component={lineChart6} />
			<Route path="/timevalue/" exact component={timeValue} />
			<Route path="/pchart/" exact component={PressureTimeChart} />
			<Route path="/cycledata/:CycleId" exact component={CycleData} />
		</Router>
	);
}

export default App;
