import React from 'react';
import Select from '@material-ui/core/Select';
import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';

type TableFilterProps = Readonly<{
	onChangeAge: Function;
	defaultAge?: string;
}>;

export default function TableFilter(props: TableFilterProps) {
	const [Age, setAge] = React.useState<string>(props.defaultAge || '24');

	function changeAge(newAge:string) {
		setAge(newAge);
		props.onChangeAge(newAge);
	}

	return (
		<Table>
			<TableHead style={{ border: 0 }}>
				<TableRow style={{ border: 0, padding: 2 }}>
					<TableCell><InputLabel style={{ fontSize: 14, fontWeight: 'bold' }}>View by</InputLabel></TableCell>
					<TableCell><InputLabel style={{ fontSize: 14, fontWeight: 'bold' }}>Range</InputLabel></TableCell>
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
							value={Age}
							onChange={event => changeAge(event.target.value as string)}
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
	);
}
