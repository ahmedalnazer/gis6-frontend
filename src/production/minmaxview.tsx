import React from 'react';
import Select from '@material-ui/core/Select';
import Card from '@material-ui/core/Card';
import Paper from '@material-ui/core/Paper';
import InputLabel from '@material-ui/core/InputLabel';
import FormControl from '@material-ui/core/FormControl'
import MenuItem from '@material-ui/core/MenuItem';
import { styled } from '@material-ui/core';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import MinMax from './minmax';

class MinMaxView extends React.Component {

    render() {

        // need to consolidate styles between here and OrderList
        const MyCard = styled(Card)({
            borderColor: 'coral',
            margin: 'auto',
            border: 1,
            borderRadius: 3,
            boxShadow: '1 0px 0px 0px rgba(51, 51, 255, .8)',
            color: 'white',
            width: 300,
            alignItems: 'center',
            padding: '0 0px'
        })

        return (
            <div style={{padding:30}}>
            <div style={{padding: 20}}>
                <MyCard>
                <Table>
                <TableHead style={{border: 0}}>
                <TableRow style={{border: 0, padding: 2}}>
                <TableCell><InputLabel style={{fontSize: 14, fontWeight: 'bold'}}>View by</InputLabel></TableCell>
                <TableCell><InputLabel style={{fontSize: 14, fontWeight: 'bold'}}>Range</InputLabel></TableCell>
                </TableRow>
                </TableHead>
                <TableBody>
                <TableRow>
                <TableCell>
                <Select
            labelId="select-filled-label"
            id="select-filled"
            value="Order"
                >
                <MenuItem value="Order">
                <em>Order</em>
                </MenuItem>
                </Select>
                </TableCell>
                <TableCell>
                    <Select
            labelId="select-filled-label"
            id="select-filled"
            value={this.state.selectedAge}
            onChange={event => this.setAge(event.target.value as string)}
                >
                <MenuItem value="">
                <em>None</em>
                </MenuItem>
                <MenuItem value={24}>24 hrs</MenuItem>
                <MenuItem value={48}>48 hrs</MenuItem>
                <MenuItem value={168}>1 Week</MenuItem>
                </Select>
                </TableCell></TableRow>
                </TableBody>
                </Table>
                </MyCard>
                </div>
                <div>
                <ProductionMinMax />
                </div>
                </div>
        );
    }

}

export default MinMaxView;
