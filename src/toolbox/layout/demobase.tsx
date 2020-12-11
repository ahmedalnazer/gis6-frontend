import React from "react";
import "./styles.scss";

type BaseLayoutProps = Readonly<{
	children?: React.ReactNode;
}>;

export default function BaseLayout(props: BaseLayoutProps) {
	return (
		<>
			<div className="main">
				<div className="main-header">Header</div>
				<div className="main-content">Content</div>
				<div className="main-footer">Footer</div>
			</div>
			<div className="overlay">
				<div className="overlay-content">Overlay</div>
			</div>
		</>
	);
}