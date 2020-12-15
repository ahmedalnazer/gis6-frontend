import React from "react";
import {BrowserRouter as Router, Route} from 'react-router-dom';

import OrderAndCyclesTable from './toolbox/tables/order/OrdersAndCycles';
import Landing from './toolbox/Landing';
import lineChart6 from './toolbox/diagrams/lineChart/lineChart6';
import OrderSetup from './order/setup';
import OrderManagement from './order/management';
import timeValue from './toolbox/diagrams/lineChart/timeValue';
import PressureTimeChart from './toolbox/diagrams/lineChart/pressureTimeChart';
import CycleData from './cycleData';
import BaseLayout from './toolbox/layout/base';
import Content from './toolbox/layout/content';

function get_links() {
	return (
		<ol>
			<li><a href="/">Home</a></li>
			<li><a href="/landing/">Landing</a></li>
			<li><a href="/layout/">Layout</a></li>
			<li><a href="/linechart6/">LineChart6(echarts)</a></li>
			<li><a href="/timevalue/">Time Value</a></li>
			<li><a href="/order/list/">Orders</a></li>
			<li><a href="/order/list2/">Orders2</a></li>
			<li><a href="/pchart/">Pressure Time Value</a></li>
			<li><a href="/cycledata/1">Cycle Data</a></li>
		</ol>
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
			<Route path="/layout/" exact><BaseLayout><Content /></BaseLayout></Route>
			<Route path="/linechart6/" exact component={lineChart6} />
			<Route path="/timevalue/" exact component={timeValue} />
			<Route path="/pchart/"><PressureTimeChart xMax={10} Series={[]} Height={200} /></Route>
			<Route path="/cycledata/:CycleId"><CycleData /></Route>
		</Router>
	);
}

export default App;
