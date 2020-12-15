import React, { useState, useEffect } from 'react';
import Card from '@material-ui/core/Card';
import Typography from '@material-ui/core/Typography';
import useInterval from '../common/poll';
import CircularProgress from '@material-ui/core/CircularProgress';
import Box from '@material-ui/core/Box';
import {BACKEND_URL} from './../restApi';

const TimeRemaining = () => {
    const [timeleft, setTimeleft] = useState(0);
    const [currentColor, setCurrentColor] = useState('#eeeeee');
    const [good, setGood] = useState(0);
    const [total, setTotal] = useState(0);

    function doFetch() {
        fetch(BACKEND_URL + '/system/')
            .then(response => response.json())
            .then(obj => {
                setTotal(obj['target']);
                setGood(obj['good_cycles']);
                setTimeleft(obj['time_remain']);
                if (timeleft > 0) {
                    setCurrentColor("#3f51b5");
                } else {
                    setCurrentColor('#eeeeee');
                }
            })
    }

    useEffect( () => doFetch() );
    useInterval( () => doFetch(), 1000);

    return (
        <Card variant="outlined" style={{textTransform: "none", backgroundColor: "#fefefe", height: 200, width: 205, padding: "15px 20px 45px 10px"}}>
            <Typography variant="h6" style={{padding: "0 0 0 10px"}}>Time Remaining</Typography>
            <p/>
            <Box position="relative" style={{padding: "0 0 0 26px"}} display="inline-flex">
                <CircularProgress value={good*100/(total + 0.01)} thickness={8} size={160} style={{padding: "0 0 0 0px", color: currentColor}} variant="determinate"/>
                <Box
                    top={0}
                    left={25}
                    bottom={0}
                    right={0}
                    position="absolute"
                    display="flex"
                    alignItems="center"
                    justifyContent="center">
                    <div>
                        <Typography style={{textAlign: "center"}} variant="h4" component="div">{timeleft}</Typography>
                        <Typography variant="caption" component="div" color="textSecondary">secs (est)</Typography>
                    </div>
                </Box>
            </Box>
        </Card>
    )
}

export default TimeRemaining;
