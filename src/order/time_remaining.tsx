import React, { useState, useEffect } from 'react';
import Card from '@material-ui/core/Card';
import Typography from '@material-ui/core/Typography';
import useInterval from '../common/poll';
import CircularProgress from '@material-ui/core/CircularProgress';
import Box from '@material-ui/core/Box';


const TimeRemaining = () => {
    const [timeleft, setTimeleft] = useState(0);
    const [currentColor, setCurrentColor] = useState('#eeeeee');
    const [good, setGood] = useState(0);
    const [total, setTotal] = useState(0);

    function doFetch() {
        fetch('http://localhost:8000/system/')
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
        <Card style={{borderColor: "#0000bb", textTransform: "none", backgroundColor: "#fefefe", width: 220, padding: "20px 20px 48px 0px"}}>
            <Typography variant="h6" style={{padding: "0 0 0 10px"}}>Time Remaining</Typography>
            <p/>
            <Box position="relative" style={{padding: "0 0 0 40px"}} display="inline-flex">
                <CircularProgress value={good*100/(total + 0.01)} thickness={9} size={160} style={{padding: "0 0 0 0px", color: currentColor}} variant="determinate"/>
                <Box
                    top={0}
                    left={40}
                    bottom={0}
                    right={0}
                    position="absolute"
                    display="flex"
                    alignItems="center"
                    justifyContent="center">
                    <Typography variant="h6" component="div" color="textSecondary">{timeleft} s</Typography>
                </Box>
            </Box>
        </Card>
    )
}

export default TimeRemaining;
