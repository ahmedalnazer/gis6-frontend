import React from "react";
import "./styles.scss";

import { Card } from '@material-ui/core';

type BaseLayoutProps = Readonly<{
	children?: React.ReactNode;
}>;

export default function BaseLayout(props: BaseLayoutProps) {
	return (
		<>
			<div className="main">
				<div className="main-header">Header</div>
				<div className="main-content">
					<div className="card-group">
						<Card>Card1</Card>
						<Card>Card2</Card>
						<Card>Card3</Card>
					</div>
					<div className="card-group">
						<Card>Card10</Card>
						<Card>Card20</Card>
						<Card>Card30</Card>
					</div>

				</div>
				<div className="main-footer">Footer</div>
			</div>
			<div className="overlay">
				<div className="overlay-content">Overlay</div>
			</div>
		</>
	);
}