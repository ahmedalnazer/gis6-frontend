import React from 'react';
import OrderCreate from './create';
import Link from '@material-ui/core/Link';
import Paper from '@material-ui/core/Paper';
import Card from '@material-ui/core/Card';
import TopBanner from '../common/banner';
import CurrentOrder from './current_order';
import Typography from '@material-ui/core/Typography';

const  OrderManagement = () => {
    return(
        <div>
            <TopBanner name="GIS6 - Barnes Group" />
            <br/>
            <Paper  style={{width: 800, border: "none",  margin: 'auto', padding: "40px 40px 40px 40px"}}>
                <Link href="/order/create" variant="button" style={{textDecoration: 'none' }}>
                    <Card style={{textTransform: "none", backgroundColor: "#dddddd", width: 300, alignContent: 'left', padding: '20px 20px 20px 20px'}}>
                        <Typography variant="h6">Setup Production Run</Typography>
                        <p/>
                        <Typography variant="subtitle1">Last Production:</Typography>
                        <Typography variant="subtitle1">Completed:</Typography>
                    </Card>
                </Link>
                <br/>
                <CurrentOrder/>
                <br/>
                <Link href="/order/list" variant="button" style={{textDecoration: 'none' }}>
                    <Card style={{textTransform: "none", backgroundColor: "#dddddd", width: 300, alignContent: 'left', padding: '20px 20px 20px 20px'}}>
                        <Typography variant="h6">Historical Data</Typography>
                        <p/>
                        <Typography variant="subtitle1">????</Typography>
                    </Card>
                </Link>
            </Paper>
        </div>

    )
}

export default OrderManagement;
