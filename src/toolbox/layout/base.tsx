import React from "react";
import {Grid} from '@material-ui/core';
import Box from '@material-ui/core/Box';

import "./styles.scss";
import Header from './header';
import Footer from './footer';

type BaseLayoutProps = Readonly<{
	children?: React.ReactNode;
}>;

export default function BaseLayout(props: BaseLayoutProps) {
	return (
		<div className="main">
			<Header />
			<div className="main-content">{props.children}</div>
			<Footer />
		</div>
	);
}