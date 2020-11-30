import React from "react";
import {BrowserRouter as Router, Route} from 'react-router-dom';

import "./App.css";

import Landing from './toolbox/Landing';
import lineChart1 from './toolbox/diagrams/lineChart/lineChart1';
import lineChart2 from './toolbox/diagrams/lineChart/lineChart2';
import lineChart3 from './toolbox/diagrams/lineChart/lineChart3';
import lineChart4 from './toolbox/diagrams/lineChart/lineChart4';
import lineChart5 from './toolbox/diagrams/lineChart/lineChart5';
import lineChart6 from './toolbox/diagrams/lineChart/lineChart6';

function App() {
	return (
		<Router>
			<a href="/">Home</a>
			<a href="/linechart1/">LineChart1(recharts)</a>
			<a href="/linechart2/">LineChart2(chart.js)</a>
			<a href="/linechart3/">LineChart3(victory)</a>
			<a href="/linechart4/">LineChart4(google)</a>
			<a href="/linechart5/">LineChart5(react-vis)</a>
			<a href="/linechart6/">LineChart6(echarts)</a>

			<Route path="/" exact component={Landing} />
			<Route path="/linechart1/" exact component={lineChart1} />
			<Route path="/linechart2/" exact component={lineChart2} />
			<Route path="/linechart3/" exact component={lineChart3} />
			<Route path="/linechart4/" exact component={lineChart4} />
			<Route path="/linechart5/" exact component={lineChart5} />
			<Route path="/linechart6/" exact component={lineChart6} />
		</Router>
	);
}

export default App;
