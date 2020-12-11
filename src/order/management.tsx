import React from 'react';
import Link from '@material-ui/core/Link';
import Paper from '@material-ui/core/Paper';
import TopBanner from '../common/banner';
import CurrentOrder from './current_order';
import Typography from '@material-ui/core/Typography';
import OrderSetupCard from './setup_card';
import HistoricalDataCard from './historical_data_card';
import TimeRemaining from './time_remaining';
import GridList from '@material-ui/core/GridList';
import GridListTile from '@material-ui/core/GridListTile';
import MinMaxView from '../production/minmaxview';

const  OrderManagement = () => {
    return (
        <div>
            <TopBanner name="GIS6 - Barnes Group" />
            <br/>
            <Paper style={{width: 750, border: "none",  margin: 'auto', padding: "40px 40px 80px 60px"}}>
                <Typography variant="subtitle2">PRODUCTION</Typography>
                <br/>
                <GridList cols={12}>
                    <GridListTile cols={6} style={{height: 160}}>
                        <Link href="/order/create" variant="button" style={{textDecoration: 'none' }}>
                            <OrderSetupCard/>
                        </Link>
                    </GridListTile>
                    <GridListTile cols={6} style={{height: 160}}>
                        <Link href="/order/list" variant="button" style={{textDecoration: 'none' }}>
                            <HistoricalDataCard/>
                        </Link>
                    </GridListTile>
                    <GridListTile rows={2} cols={7} style={{height:300}}> <CurrentOrder/> </GridListTile>
                    <GridListTile rows={2} cols={5} style={{height: 300, padding: "0 0 0 0px"}}> <TimeRemaining/> </GridListTile>
                    <GridListTile rows={2} cols={5} style={{height:300}}><MinMaxView/></GridListTile>
                </GridList>
            </Paper>
        </div>
    )
}

export default OrderManagement;
