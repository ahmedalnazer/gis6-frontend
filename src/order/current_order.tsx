import React, { useState, useEffect, useRef } from 'react';
import Card from '@material-ui/core/Card';
import Button from '@material-ui/core/Button';
import Typography from '@material-ui/core/Typography';

// Temporary code to simulate interval-based polling
type IntervalFunction = () => ( unknown | void )

function useInterval(callback: any, delay: number) {
    const cb = useRef<IntervalFunction| null>();

    // Remember the latest callback.
    useEffect(() => {
        cb.current = callback;
    }, [callback]);

    // Set up the interval.
    useEffect(() => {
        function tick() {
            if ( cb.current != null ) {
                cb.current();
            }
        }
        if (delay !== null) {
            let id = setInterval(tick, delay);
            return () => clearInterval(id);
        }
    }, [delay]);
}

const CurrentOrder = () => {
    const [good, setGood] = useState(0);
    const [total, setTotal] = useState(0);
    const [status, setStatus] = useState('Cancelled');
    const [orderid, setOrderid] = useState(-1);

    function doFetch() {
       fetch('http://localhost:8000/system/')
        .then(response => response.json())
           .then(obj => {
               setTotal(obj['target']);
               setGood(obj['good_cycles']);
               switch(obj['status']) {
                   case 'c':
                       setStatus('Completed');
                       break;
                   case 'r':
                       setStatus('Running');
                       break;
                   case 's':
                       setStatus('Suspended');
                       break;
                   case 'x':
                       setStatus('Cancelled');
                       break;
               }
           })
    }

    useEffect( () => doFetch() );

    useInterval( () => doFetch(), 2000);
    
    return (
        <Card style={{textTransform: "none", backgroundColor: "#fefefe", width: 300, alignContent: 'left', padding: '20px 20px 20px 20px'}}>
            <Typography variant="h6">Good Parts</Typography>
            <p/>
            <Typography variant="h4">{good}</Typography>
            <Typography variant="subtitle2">of {total}</Typography>
            <Typography variant="subtitle1">{status}</Typography>
            <div style={{padding: "20px 0 10px 80px"}}>
            <Button style={{padding: "10px 20px 10px 20px"}} variant="contained" size="medium" color="secondary">Stop Order</Button>
            </div>
        </Card>
    )
}

export default CurrentOrder;
