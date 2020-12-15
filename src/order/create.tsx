import React, { useState, useEffect } from 'react';
import Card from '@material-ui/core/Card';
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
import {BACKEND_URL} from './../restApi';


const OrderCreate = () => {
    const [submitSuccess, setSubmitSuccess] = useState(false);
    var orderName: string = "";
    var targetParts: string = "";

    function setOrderName(value: string) {
        orderName = value;
    }

    function setTargetParts(value: string) {
        targetParts = value;
    }

    const MyTableCell = styled(TableCell) ({
        borderBottom: 'none',
        width: 300,
        padding: '4px 18px',
    });

    const TextFieldComponent = (props: any) => {
        const cb = props.callback;
        const [value, setValue] = useState("");

        function changeValue(e: any) {
            // TODO: name validation
            setValue(e.target.value as string);
        }

        useEffect(() => { cb(value) })

        return (
            <MyTableCell><TextField fullWidth={true} variant="filled" value={value} onInput={changeValue}/></MyTableCell>
        )
    }

    function handleSubmit (e: React.FormEvent<HTMLFormElement>) : void {
        e.preventDefault();
        if (validateForm()) {
            setSubmitSuccess(submitForm());
        }
    };

    function submitForm(): boolean {
        console.log("order name: " + orderName + ", parts: " + targetParts);
        const requestOptions = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: orderName, targetParts: parseInt(targetParts, 10) })
        };
        fetch(BACKEND_URL + '/order/', requestOptions)
            .then(response => response.json())
            .then(data => {return(data.id);})
            .then( (id) => {
                const requestOptions = {
                    method: 'PUT',
                };
                fetch(BACKEND_URL + '/order/' + id + "/start/", requestOptions)
                    .then(response => response.status)
                    .then(status => {
                        if (status !== 200) {
                            return false;
                        }
                    });
            });
        return true;
    }

    function validateForm(): boolean {
        // TODO: overall validation
        return true;
    }

    return (
            <div style={{paddingTop: "10px"}}>
                <Card style={{width: 700, margin: 'auto', border: 0, padding: "30px 20px 10px 20px", borderBottom: "0px"}}>
                    <form onSubmit={handleSubmit}>
                        <Table size="small" style={{paddingTop: "40px", margin: 'auto', borderBottom: "none"}}>
                            <TableRow>
                                <MyTableCell><InputLabel>Selected Process</InputLabel></MyTableCell>
                                <MyTableCell><InputLabel>Order Number</InputLabel></MyTableCell>
                            </TableRow>
                            <TableRow>
                                <MyTableCell style={{borderSpacing: '0 25px'}}><Select fullWidth={true} variant="filled" value="Black PP Left Door"><MenuItem value="Black PP Left Door">Black PP Left Door</MenuItem></Select></MyTableCell>
                                <TextFieldComponent title="name" callback={setOrderName}/>
                            </TableRow>
                            <br/><br/>
                            <TableRow>
                                <MyTableCell><InputLabel>Number of Shots/Cycles/Parts</InputLabel></MyTableCell>
                                <MyTableCell><InputLabel>Shutdown GI6 when complete</InputLabel></MyTableCell>
                            </TableRow>
                            <TableRow>
                                <TextFieldComponent title="targetParts" callback={setTargetParts}/>
                                <MyTableCell><Switch color="primary"/></MyTableCell>
                            </TableRow>
                            <TableRow>
                                <MyTableCell/>
                                <TableCell style={{padding: "20px 18px", borderBottom: 'none'}} align="right"><Button type="submit" disabled={submitSuccess} variant="contained" size="large" color="primary">Done</Button></TableCell>
                            </TableRow>
                        </Table>
                    </form>
                </Card>
            </div>
        );
};

export default OrderCreate;
