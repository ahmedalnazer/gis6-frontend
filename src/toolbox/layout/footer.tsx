import React from "react";
import { AppBar, Toolbar, Typography, IconButton } from "@material-ui/core";
import PersonIcon from '@material-ui/icons/Person';
import {makeStyles} from '@material-ui/core/styles'

const useStyles = makeStyles({
	Footer: {
		top: 'auto',
		bottom: 0,
	},
	TextFooter: {
		flex: 1,
	}
})

export default function Footer() {
	const classes = useStyles();
	return (
		<AppBar position="static" className={classes.Footer}>
			<Toolbar>
				<Typography className={classes.TextFooter}>Footer!</Typography>
				<IconButton>
					<PersonIcon />
				</IconButton>
			</Toolbar>
		</AppBar>
	);
}