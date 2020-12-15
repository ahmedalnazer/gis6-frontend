import React from "react";
import { Grid } from '@material-ui/core';
import ContentCard from './card';
import Typography from '@material-ui/core/Typography';

type ContentProps = Readonly<{
	children?: React.ReactNode[];
}>;

export default function Content(props: ContentProps) {
	return (
		<Grid container direction={'column'} alignContent={'space-between'} spacing={1}>
			<Typography variant="subtitle1" gutterBottom>
				First Group:
			</Typography>
			<Grid container item alignContent={'space-between'} spacing={1}>
				<Grid item xs={12} sm={6} md={4} lg={3} ><ContentCard /></Grid>
				<Grid item xs={12} sm={6} md={4} lg={3} ><ContentCard /></Grid>
				<Grid item xs={12} sm={6} md={4} lg={3} ><ContentCard /></Grid>
				<Grid item xs={12} sm={6} md={4} lg={3} ><ContentCard /></Grid>
				<Grid item xs={12} sm={6} md={4} lg={3} ><ContentCard /></Grid>
			</Grid>
			<Typography variant="subtitle1" gutterBottom>
				Second Group:
			</Typography>
			<Grid container item alignContent={'space-between'} spacing={1}>
				<Grid item xs={12} sm={6} md={4} lg={3} ><ContentCard /></Grid>
				<Grid item xs={12} sm={6} md={4} lg={3} ><ContentCard /></Grid>
				<Grid item xs={12} sm={6} md={4} lg={3} ><ContentCard /></Grid>
				<Grid item xs={12} sm={6} md={4} lg={3} ><ContentCard /></Grid>
				<Grid item xs={12} sm={6} md={4} lg={3} ><ContentCard /></Grid>
				<Grid item xs={12} sm={6} md={4} lg={3} ><ContentCard /></Grid>
				<Grid item xs={12} sm={6} md={4} lg={3} ><ContentCard /></Grid>
				<Grid item xs={12} sm={6} md={4} lg={3} ><ContentCard /></Grid>
				<Grid item xs={12} sm={6} md={4} lg={3} ><ContentCard /></Grid>
				<Grid item xs={12} sm={6} md={4} lg={3} ><ContentCard /></Grid>
				<Grid item xs={12} sm={6} md={4} lg={3} ><ContentCard /></Grid>
				<Grid item xs={12} sm={6} md={4} lg={3} ><ContentCard /></Grid>
				<Grid item xs={12} sm={6} md={4} lg={3} ><ContentCard /></Grid>
				<Grid item xs={12} sm={6} md={4} lg={3} ><ContentCard /></Grid>
				<Grid item xs={12} sm={6} md={4} lg={3} ><ContentCard /></Grid>
				<Grid item xs={12} sm={6} md={4} lg={3} ><ContentCard /></Grid>
				<Grid item xs={12} sm={6} md={4} lg={3} ><ContentCard /></Grid>
				<Grid item xs={12} sm={6} md={4} lg={3} ><ContentCard /></Grid>
				<Grid item xs={12} sm={6} md={4} lg={3} ><ContentCard /></Grid>
				<Grid item xs={12} sm={6} md={4} lg={3} ><ContentCard /></Grid>
				<Grid item xs={12} sm={6} md={4} lg={3} ><ContentCard /></Grid>
				<Grid item xs={12} sm={6} md={4} lg={3} ><ContentCard /></Grid>
				<Grid item xs={12} sm={6} md={4} lg={3} ><ContentCard /></Grid>
				<Grid item xs={12} sm={6} md={4} lg={3} ><ContentCard /></Grid>
				<Grid item xs={12} sm={6} md={4} lg={3} ><ContentCard /></Grid>
				<Grid item xs={12} sm={6} md={4} lg={3} ><ContentCard /></Grid>
				<Grid item xs={12} sm={6} md={4} lg={3} ><ContentCard /></Grid>
				<Grid item xs={12} sm={6} md={4} lg={3} ><ContentCard /></Grid>
				<Grid item xs={12} sm={6} md={4} lg={3} ><ContentCard /></Grid>
				<Grid item xs={12} sm={6} md={4} lg={3} ><ContentCard /></Grid>
				<Grid item xs={12} sm={6} md={4} lg={3} ><ContentCard /></Grid>
				<Grid item xs={12} sm={6} md={4} lg={3} ><ContentCard /></Grid>
			</Grid>
		</Grid>
	);
}