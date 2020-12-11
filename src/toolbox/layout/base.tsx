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
				<div className="main-content">{props.children}</div>
				<div className="main-footer">Footer</div>
			</div>
		</>
	);
}