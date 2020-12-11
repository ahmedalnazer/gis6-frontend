import React from "react";
import {BrowserRouter as Router, Route} from 'react-router-dom';

import "./App.css";

import ViewFilter from './order/view_filter';
import OrderSetup from './order/setup';
import OrderManagement from './order/management';
import timeValue from './toolbox/diagrams/lineChart/timeValue';
import PressureTimeChart from './toolbox/diagrams/lineChart/pressureTimeChart';
import CycleData from './cycleData';

function App() {
	return (
		<Router>
			<Route path="/" exact component={OrderManagement} />
			<Route path="/order/list" exact component={ViewFilter} />
			<Route path="/order/create" exact component={OrderSetup} />
			<Route path="/timevalue/" exact component={timeValue} />
			<Route path="/pchart/" exact component={PressureTimeChart} />
			<Route path="/cycledata/" exact component={CycleData} />
		</Router>
	);
}

export default App;
