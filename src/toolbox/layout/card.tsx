import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Card from '@material-ui/core/Card';
import CardActionArea from '@material-ui/core/CardActionArea';
import CardActions from '@material-ui/core/CardActions';
import CardContent from '@material-ui/core/CardContent';
import CardMedia from '@material-ui/core/CardMedia';
import Button from '@material-ui/core/Button';
import Typography from '@material-ui/core/Typography';
import Overlay from './overlay';

const useStyles = makeStyles({
	media: {
		height: 10,
	},
});

export default function ContentCard() {
	const [OverlayActive, setOverlayActive] = React.useState(false);

	const classes = useStyles();

	function toggleOverlay() {
		if (OverlayActive) {
			
		}
		setOverlayActive(!OverlayActive)
	}

	return (
		<Card onClick={() => toggleOverlay()}>
			<CardActionArea>
				<CardMedia
					className={classes.media}
					image="/static/images/cards/contemplative-reptile.jpg"
					title="Contemplative Reptile"
				/>
				<CardContent>
					<Typography gutterBottom variant="h5" component="h2">
						Card
					</Typography>
					<Typography variant="body2" color="textSecondary" component="p">
						Some description
					</Typography>
				</CardContent>
			</CardActionArea>
			<CardActions>
				<Button size="small" color="primary">
					Share
				</Button>
				<Button size="small" color="primary">
					Learn More
				</Button>
			</CardActions>
			{OverlayActive?<Overlay />:<></>}
		</Card>
	);
}
