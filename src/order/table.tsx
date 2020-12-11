import React from 'react';
import Card from '@material-ui/core/Card';
import OrderAndCyclesTable from '../toolbox/tables/order/OrdersAndCycles';
import TopBanner from '../common/banner';

interface IYoProps {
    name: string;
    age: string;
}

class OrderTable extends React.Component<IYoProps> {
    render() {
        // render list of Orders
        return (
        <div>
            <TopBanner name="GIS6 - Barnes Group" />
            <br/>
            <Card style={{ width: 750, margin: 'auto' }}>
                <OrderAndCyclesTable/>
            </Card>
         </div>
        );
    }
}

export default OrderTable;
