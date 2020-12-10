import React, { useState, useEffect } from 'react';
import Card from '@material-ui/core/Card';
import GridList from '@material-ui/core/GridList';
import GridListTile from '@material-ui/core/GridListTile';
import Button from '@material-ui/core/Button';
import Typography from '@material-ui/core/Typography';
import useInterval from '../common/poll';
import LinearProgress from '@material-ui/core/LinearProgress';

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
               setOrderid(obj['order_id'])
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

    function stopOrder() {
        const requestOptions = {
            method: 'PUT',
        };
        fetch('http://localhost:8000/order/' + orderid + '/stop/', requestOptions)
        .then(response => {
            if (response.status == 200) {
                setStatus('Cancelled');
            }
        });
    }

    useEffect( () => doFetch() );

    useInterval( () => doFetch(), 1000);
    
    return (
        <Card style={{textTransform: "none", backgroundColor: "#fefefe", width: 370, alignContent: 'left', padding: '20px 20px 20px 20px'}}>
            <Typography variant="h6">Good Parts</Typography>
            <p/>
            <GridList cols={2} style={{height: 80, padding: "0 0 0 0"}}>
                <GridListTile style={{width:120}}>
                    <Typography variant="h4">{good}</Typography>
                    <Typography variant="subtitle2" style={{color: "#444444"}}>of {total}</Typography>
                </GridListTile>
                <GridListTile style={{width:240, height: 80, padding: "10px 0px 0px 0px"}}>
                    <LinearProgress variant="determinate" style={{height: 30, borderRadius: 0, padding: "0 0 0 0"}} value={good*100/(total + 0.01)} />
                    <GridList cols={2} style={{height: 20, padding: "0 0 0 0"}}>
                        <GridListTile style={{padding:"0 0px 0 2px"}}>
                            <Typography style={{textAlign: "left", color: "#999999"}} variant="subtitle2">0</Typography>
                        </GridListTile>
                        <GridListTile>
                            <Typography style={{textAlign: "right", color: "#999999"}} variant="subtitle2">{total}</Typography>
                        </GridListTile>
                    </GridList>
                </GridListTile>
            </GridList>
            <hr/>
            <Typography style={{color: "#444444"}} variant="subtitle2">{status}</Typography>
            <div style={{padding: "20px 0 10px 140px"}}>
                <Button style={{padding: "10px 20px 10px 20px"}} disabled={status != "Running"} variant="contained" size="medium" color="secondary" onClick={stopOrder}>Stop Order</Button>
            </div>
        </Card>
    );
 }

export default CurrentOrder;
