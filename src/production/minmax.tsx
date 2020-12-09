import React from 'react';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Card from '@material-ui/core/Card';


class MinMax extends React.Component {
    state = { info: {}, isLoading: false };

    componentDidMount() {
        console.log("mounted");
        this.doFetch();
    }

    componentDidUpdate() {
        console.log("updated min/max");
    }

    doFetch() {
        console.log("fetching");
        const apiUrl = 'http://localhost:8000/system/1/getminmax';
        this.setState({isLoading: true});
        fetch(apiUrl)
            .then(response => response.json())
            .then(info => this.setState({info: info, isLoading: false}))
    }

    render() {
        console.log("current state: " + JSON.stringify(this.state));
        if (this.state.isLoading) {
            return <p>Table loading...</p>;
        }

        return (
            <Card style={{ width: 800, margin: 'auto', boxShadow: '0 1px 1px 1px rgba(51, 51, 255, .8)' }}>
                <Table style={{ width: 800, alignItems: 'center', margin: 'auto'}}>
                <TableHead>
                <TableRow>
                        <TableCell style={{textAlign: 'center', padding: '5px'}}>{this.state.info.min}</TableCell>
                        <TableCell style={{textAlign: 'center', padding: '5px'}}>{this.state.info.max}</TableCell>
                        <TableCell style={{textAlign: 'center', padding: '5px'}}>{this.state.info.min_zone}</TableCell>
                        <TableCell style={{textAlign: 'center', padding: '5px'}}>{this.state.info.max_zone}</TableCell>
                </TableRow>
                </TableHead>
                </Table>
            </Card>
        );
    }
}

export default MinMax;
