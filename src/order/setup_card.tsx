import React, { useState, useEffect } from 'react';
import Card from '@material-ui/core/Card';
import Typography from '@material-ui/core/Typography';
import useInterval from '../common/poll';
import {BACKEND_URL} from './../restApi';

const OrderSetupCard = () => {
    const [, setOrderId] = useState(0);
    const [lastName, setLastName] = useState("-none-");
    const [lastTime, setLastTime] = useState("-none-");

    function doFetch() {
        fetch(BACKEND_URL + '/order/1/lastcompleted/')
            .then(response => response.json())
            .then(order => {
                setOrderId(order['id']);
                setLastName(order['name']);
                var d = new Date(order['endTime']);
                setLastTime(d.toLocaleString());
            })
    }

    useEffect( () => doFetch() )

    useInterval( () => doFetch(), 1000);

    return (
        <Card style={{textTransform: "none", backgroundColor: "#dddddd", width: 320, height: 100, alignContent: 'left', padding: '20px 20px 20px 20px'}}>
            <Typography variant="h6">Setup Production Run</Typography>
            <p/>
            <Typography style={{color:"#444444"}} variant="subtitle2">Last Production:&nbsp;{lastName}</Typography>
            <Typography style={{color:"#444444"}} variant="subtitle2">Completed:&nbsp;{lastTime}</Typography>
        </Card>
    )
}

export default OrderSetupCard;
