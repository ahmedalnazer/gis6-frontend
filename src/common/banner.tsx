import React from 'react';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import HomeIcon from '@material-ui/icons/Home';
import Typography from '@material-ui/core/Typography';
import IconButton from '@material-ui/core/IconButton';

type BannerProps = {
    name: string;
}

const TopBanner = (props: BannerProps) => {
    return(
      <AppBar position="static">
        <Toolbar>
        <IconButton href="/"><HomeIcon color="action"/></IconButton>
          <Typography variant="h6" style={{marginLeft: 15}}>
            {props.name}
          </Typography>
        </Toolbar>
      </AppBar>
    );
}

export default TopBanner;
