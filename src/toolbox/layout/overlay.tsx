import React from "react";
import "./styles.scss";

type OverlayProps = Readonly<{
	children?: React.ReactNode;
}>;

export default function overlay(props: OverlayProps) {
	return (
		<div className="overlay">
			<div className="overlay-content">{props.children}</div>
		</div>
	);
}