import React, { useState } from 'react';
import Card from '@material-ui/core/Card';
import Button from '@material-ui/core/Button';
import Typography from '@material-ui/core/Typography';

const CurrentOrder = () => {
    const [good, setGood] = useState(0);
    const [total, setTotal] = useState(1000);
    const [status, setStatus] = useState('Running');
    const [orderid, setOrderid] = useState(-1);
    
    return (
        <Card style={{textTransform: "none", backgroundColor: "#fefefe", width: 300, alignContent: 'left', padding: '20px 20px 20px 20px'}}>
            <Typography variant="h6">Good Parts</Typography>
            <p/>
            <Typography variant="h4">{good}</Typography>
            <Typography variant="subtitle2">of {total}</Typography>
            <Typography variant="subtitle1">Running</Typography>
            <div style={{padding: "20px 0 10px 80px"}}>
            <Button style={{padding: "10px 20px 10px 20px"}} variant="contained" size="medium" color="secondary">Stop Order</Button>
            </div>
        </Card>
    )
    
}

export default CurrentOrder;
