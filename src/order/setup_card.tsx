import React from 'react';
import Card from '@material-ui/core/Card';
import Typography from '@material-ui/core/Typography';

const OrderSetupCard = () => {
    return (
        <Card style={{textTransform: "none", backgroundColor: "#dddddd", width: 300, alignContent: 'left', padding: '20px 20px 20px 20px'}}>
            <Typography variant="h6">Setup Production Run</Typography>
            <p/>
            <Typography variant="subtitle1">Last Production:</Typography>
            <Typography variant="subtitle1">Completed:</Typography>
        </Card>
    )
}

export default OrderSetupCard;
