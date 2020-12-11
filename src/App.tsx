import React from "react";
import {BrowserRouter as Router, Route} from 'react-router-dom';

import "./App.css";

import ViewFilter from './order/view_filter';
import OrderAndCyclesTable from './toolbox/tables/order/OrdersAndCycles';
import MinMaxView from './production/minmaxview';
import Landing from './toolbox/Landing';
import lineChart6 from './toolbox/diagrams/lineChart/lineChart6';
import OrderSetup from './order/setup';
import OrderManagement from './order/management';
import timeValue from './toolbox/diagrams/lineChart/timeValue';
import PressureTimeChart from './toolbox/diagrams/lineChart/pressureTimeChart';
import CycleData from './cycleData';
import BaseLayout from './toolbox/layout/demobase';

function get_links() {
	return (
		<>
			<a href="/landing/">Landing</a>
			<a href="/layout/">Layout</a>
			<a href="/linechart6/">LineChart6(echarts)</a>
			<a href="/timevalue/">Time Value</a>
			<a href="/order/list/">Orders</a>
			<a href="/order/list2/">Orders2</a>
			<a href="/pchart/">Pressure Time Value</a>
			<a href="/cycledata/1">Cycle Data</a>
		</>
	);
}

function App() {
	return (
		<Router>
			<Route path="/" exact component={OrderManagement} />
			<Route path="/order/list/"><OrderAndCyclesTable /></Route>
			<Route path="/order/create" exact component={OrderSetup} />
			      
			<Route path="/links/" exact component={get_links} />
			<Route path="/landing/" exact component={Landing} />
			<Route path="/layout/" exact component={BaseLayout} />
			<Route path="/minmax/" exact component={MinMaxView} />
			<Route path="/timevalue/" exact component={timeValue} />
			<Route path="/pchart/"><PressureTimeChart xMax={10} Series={[]} Height={200} /></Route>
			<Route path="/cycledata/:CycleId"><CycleData /></Route>
		</Router>
	);
}

export default App;
