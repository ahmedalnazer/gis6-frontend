import React from 'react';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Card from '@material-ui/core/Card';
import Checkbox from '@material-ui/core/Checkbox';


type Order = {
    id: string,
    cycles: string,
    endTime: string,
}

interface IYoProps {
    name: string;
    age: string;
}

class OrderTable extends React.Component<IYoProps> {
    state = { orders: [], isLoading: false, age: "24" };

    componentDidMount() {
        console.log("mounted");
        this.doFetch(this.state.age);
    }

    componentDidUpdate() {
        console.log("updated order-list");
    }

    componentWillReceiveProps(props: IYoProps) {
        console.log("received props: " + props.age);
        this.setState({age: props.age, isLoading: false});
        this.doFetch(props.age);
    }

    doFetch(age: string) {
        console.log("fetching");
        const apiUrl = 'http://localhost:8000/order';
        this.setState({isLoading: true});
        fetch(apiUrl + "?age=" + age)
            .then(response => response.json())
            .then(orders => this.setState({orders: orders, isLoading: false}))
    }

    render() {
        // render list of Orders
        console.log("current state: " + JSON.stringify(this.state));
        if (this.state.isLoading) {
            return <p>Table loading...</p>;
        }

       const columns = [
            { name: 'id', title: 'Order #' },
            { name: 'cycles', title: 'Total Cycles' },
            { name: 'endTime', title: 'Completed Date' },
        ];
        var rows: Order[] = [];
        this.state.orders.forEach((order) => {
            var d = new Date(order['endTime']);
            rows.push({id: order['name'], cycles: order['cycles'], endTime: d.toLocaleString()});
          }
        )

        return (
            <Card style={{ width: 800, margin: 'auto', boxShadow: '0 1px 1px 1px rgba(51, 51, 255, .8)' }}>
                <Table style={{ width: 800, alignItems: 'center', margin: 'auto'}}>
                <TableHead>
                <TableRow>
                <TableCell>
                </TableCell>
                {columns.map(
                    row => (
                        <TableCell style={{fontSize: 14, fontWeight: 'bold', textAlign: 'left'}}>{row.title}</TableCell>
                    )
                )}
                </TableRow>
                </TableHead>
                <TableBody>
                {this.state.orders.map((order) => {
                    var d = new Date(order['endTime']);
                    return(<TableRow  style={{textAlign: 'center'}}>
                        <TableCell style={{textAlign: 'left', padding: '5px'}}><Checkbox/></TableCell>
                        <TableCell style={{textAlign: 'left', padding: '5px'}}>{order['name']}</TableCell>
                        <TableCell style={{textAlign: 'left', padding: '5px'}}>{order['cycles']}</TableCell>
                        <TableCell style={{textAlign: 'left', padding: '5px'}}>{d.toLocaleString()}</TableCell>
                        </TableRow>);
                })}
                </TableBody>
                </Table>
            </Card>
        );
    }
}

export default OrderTable;
