import React, { useState, useEffect } from 'react';
import Card from '@material-ui/core/Card';
import Typography from '@material-ui/core/Typography';
import GridList from '@material-ui/core/GridList';
import GridListTile from '@material-ui/core/GridListTile';
import useInterval from '../common/poll';

const HistoricalDataCard = () => {
    return (
        <Card style={{textTransform: "none", backgroundColor: "#dddddd", width: 320, height: 100, alignContent: 'left', padding: '20px 20px 20px 20px'}}>
            <Typography variant="h6">Historical Data</Typography>
            <p/>
            <Typography variant="subtitle1"></Typography>
            </Card>
    )
}


export default HistoricalDataCard;
