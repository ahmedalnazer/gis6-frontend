import React from 'react';
import OrderCreate from './create';
import Paper from '@material-ui/core/Paper';
import Card from '@material-ui/core/Card';
import TopBanner from '../common/banner';
import Typography from '@material-ui/core/Typography';

class OrderSetup extends React.Component {

    render() {
        return(
            <div>
                <TopBanner name="GIS6 - Barnes Group" />
                <br/>
                <Paper  style={{width: 800, border: "none",  margin: 'auto', padding: "40px 40px 40px 40px"}}>
                    <Typography variant="body1" style={{marginLeft: 50}}>
                        SET UP ORDER
                    </Typography>
                    <br/><br/>
                    <Card style={{width: 700, margin: 'auto', border: "none", boxShadow: "none"}}>
                        <Typography variant="subtitle1">Order Details</Typography>
                        <OrderCreate/>
                    </Card>
                    <br/>
                </Paper>
            </div>

        )
    }
}

export default OrderSetup;
