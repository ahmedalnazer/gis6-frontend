import React from "react";
import { AppBar, Toolbar, Typography, IconButton } from "@material-ui/core";
import PersonIcon from '@material-ui/icons/Person';
import {makeStyles} from '@material-ui/core/styles'

const useStyles = makeStyles({
	Header: {
		flex: 1,
		top: 0,
	}
})

export default function Header() {
	const classes = useStyles();
	return (
		<AppBar position="static">
			<Toolbar>
				<Typography className={classes.Header}>Header!</Typography>
				<IconButton>
					<PersonIcon />
				</IconButton>
			</Toolbar>
		</AppBar>
	);
}