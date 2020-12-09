import React from 'react';
import Card from '@material-ui/core/Card';
import Grid from '@material-ui/core/Grid';
import Button from '@material-ui/core/Button';
import Table from '@material-ui/core/Table';
import MenuItem from '@material-ui/core/MenuItem';
import TextField from '@material-ui/core/TextField'
import TableCell from '@material-ui/core/TableCell';
import TableRow from '@material-ui/core/TableRow';
import Select from '@material-ui/core/Select';
import { InputLabel } from '@material-ui/core';
import { styled } from '@material-ui/core';
import Switch from '@material-ui/core/Switch';


class OrderCreate extends React.Component {
    state = {
        submitSuccess: false,
        orderName: "",
        targetParts: 0,
        orderId: 0
    }

    private handleSubmit = async (
        e: React.FormEvent<HTMLFormElement>
    ): Promise<void> => {
        e.preventDefault();

        if (this.validateForm()) {
            const submitSuccess: boolean = await this.submitForm();
            this.setState({ submitSuccess });
        }
    };

    private orderNumberChange(): boolean {
//        this.setState({submitSuccess: true});
        return true;
    }

    private submitForm(): boolean {
        const requestOptions = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: this.state.orderName, targetParts: this.state.targetParts })
        };
        fetch('http://localhost:8000/order/', requestOptions)
            .then(response => response.json())
            .then(data => this.setState({ orderId: data.id }))
            .then( () => {
                const requestOptions = {
                    method: 'PUT',
                };
                fetch('http://localhost:8000/order/' + this.state.orderId + "/start/", requestOptions)
                    .then(response => response.status)
                    .then(status => {
                        console.log("start status: " + status);
                        if (status == 200) {
                            this.setState({ submitSuccess: true });
                        }
                    });
            });
        return true;
    }

    private validateForm(): boolean {
        // TODO: validate
        return true;
    }

    render() {
        console.log("current state: " + JSON.stringify(this.state));
        const MyTableCell = styled(TableCell) ({
            borderBottom: 'none',
            width: 300,
            padding: '4px 18px',
        });

        return (
            <div style={{paddingTop: "10px"}}>
                <Card style={{width: 700, margin: 'auto', border: 0, padding: "30px 20px 10px 20px", borderBottom: "0px"}}>
                    <form onSubmit={this.handleSubmit}>
                        <Table size="small" style={{paddingTop: "40px", margin: 'auto', borderBottom: "none"}}>
                            <TableRow>
                                <MyTableCell><InputLabel>Selected Process</InputLabel></MyTableCell>
                                <MyTableCell><InputLabel>Order Number</InputLabel></MyTableCell>
                            </TableRow>
                            <TableRow>
                                <MyTableCell style={{borderSpacing: '0 25px'}}><Select fullWidth={true} variant="filled" value="Black PP Left Door"><MenuItem value="Black PP Left Door">Black PP Left Door</MenuItem></Select></MyTableCell>
                                <MyTableCell><TextField fullWidth={true} onChange={this.orderNumberChange} variant="filled" name="orderName"  onInput={e=>{this.state.orderName = (e.target as any).value}}/></MyTableCell>
                            </TableRow>
                            <br/><br/>
                            <TableRow>
                                <MyTableCell><InputLabel>Number of Shots/Cycles/Parts</InputLabel></MyTableCell>
                                <MyTableCell><InputLabel>Shutdown GI6 when complete</InputLabel></MyTableCell>
                            </TableRow>
                            <TableRow>
                                <MyTableCell><TextField fullWidth={true} onChange={this.orderNumberChange} variant="filled" name="targetParts" onInput={e=>{this.state.targetParts = (e.target as any).value}}/></MyTableCell>
                                <MyTableCell><Switch color="primary"/></MyTableCell>
                            </TableRow>
                            <TableRow>
                                <MyTableCell/>
                                <TableCell style={{padding: "20px 18px", borderBottom: 'none'}} align="right"><Button type="submit" disabled={this.state.submitSuccess} variant="contained" size="large" color="primary">Done</Button></TableCell>
                            </TableRow>
                        </Table>
                    </form>
                </Card>
            </div>
        );
        
    }

};

export default OrderCreate;
