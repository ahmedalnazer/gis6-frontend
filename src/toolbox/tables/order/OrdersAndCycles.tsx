import React from 'react';
import {Link} from "react-router-dom";
import Box from '@material-ui/core/Box';
import { makeStyles, useTheme } from '@material-ui/core/styles';
import Collapse from '@material-ui/core/Collapse';
import IconButton from '@material-ui/core/IconButton';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import TableFooter from '@material-ui/core/TableFooter';
import TablePagination from '@material-ui/core/TablePagination';
import Checkbox from '@material-ui/core/Checkbox';
import Typography from '@material-ui/core/Typography';
import Paper from '@material-ui/core/Paper';
import KeyboardArrowDownIcon from '@material-ui/icons/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@material-ui/icons/KeyboardArrowUp';
import FirstPageIcon from '@material-ui/icons/FirstPage';
import VisibilityIcon from '@material-ui/icons/Visibility';
import KeyboardArrowLeft from '@material-ui/icons/KeyboardArrowLeft';
import KeyboardArrowRight from '@material-ui/icons/KeyboardArrowRight';
import LastPageIcon from '@material-ui/icons/LastPage';
import TableFilter from './table_filter';
import { fetchJson } from './../../../restApi';

import "./styles.scss"

type Order = {
	id: number,
	name: string,
	cycles: number,
	endTime: string,
}

type Cycle = {
	id: number,
	ref_order: string,
	injCycle: number,
	startTime: string,
	endTime: string,
}

const useStyles1 = makeStyles((theme) => ({
	root: {
		flexShrink: 0,
		marginLeft: theme.spacing(2.5),
	},
}));

type TablePaginationActionsProps = Readonly<{
	count: number;
	onChangePage: Function;
	page: number;
	rowsPerPage: number
}>;

function TablePaginationActions(props: TablePaginationActionsProps) {
	const classes = useStyles1();
	const theme = useTheme();
	const { count, page, rowsPerPage, onChangePage } = props;

	const handleFirstPageButtonClick = (event: any) => {
		onChangePage(event, 0);
	};

	const handleBackButtonClick = (event: any) => {
		onChangePage(event, page - 1);
	};

	const handleNextButtonClick = (event: any) => {
		onChangePage(event, page + 1);
	};

	const handleLastPageButtonClick = (event: any) => {
		onChangePage(event, Math.max(0, Math.ceil(count / rowsPerPage) - 1));
	};

	return (
		<div className={classes.root}>
			<IconButton
				onClick={handleFirstPageButtonClick}
				disabled={page === 0}
				aria-label="first page"
			>
				{theme.direction === 'rtl' ? <LastPageIcon /> : <FirstPageIcon />}
			</IconButton>
			<IconButton onClick={handleBackButtonClick} disabled={page === 0} aria-label="previous page">
				{theme.direction === 'rtl' ? <KeyboardArrowRight /> : <KeyboardArrowLeft />}
			</IconButton>
			<IconButton
				onClick={handleNextButtonClick}
				disabled={page >= Math.ceil(count / rowsPerPage) - 1}
				aria-label="next page"
			>
				{theme.direction === 'rtl' ? <KeyboardArrowLeft /> : <KeyboardArrowRight />}
			</IconButton>
			<IconButton
				onClick={handleLastPageButtonClick}
				disabled={page >= Math.ceil(count / rowsPerPage) - 1}
				aria-label="last page"
			>
				{theme.direction === 'rtl' ? <FirstPageIcon /> : <LastPageIcon />}
			</IconButton>
		</div>
	);
}

type OrderRowProps = Readonly<{
	order: Order;
}>;

function OrderRow(props: OrderRowProps) {
	const order = props.order;
	const [open, setOpen] = React.useState(false);
	const [cycles, setCycles] = React.useState<Cycle[]>([])
	const [IsLoading, setIsLoading] = React.useState(true);
	const [page, setPage] = React.useState(0);
	const [rowsPerPage, setRowsPerPage] = React.useState(10);

	async function loadCycles(order: number) {
		const cycles = await fetchJson("/order/" + order + "/cycles/");
		setCycles(cycles);
		setIsLoading(false);
	}

	React.useEffect(() => {
		loadCycles(order.id);
	},
		[open, order]);

	function toggleOpen() {
		if (open) {
			setCycles([])
		}
		setOpen(!open)
	}

	const handleChangePage = (event: any, newPage: number) => {
		setPage(newPage);
	};

	const handleChangeRowsPerPage = (event: any) => {
		setRowsPerPage(parseInt(event.target.value, 10));
		setPage(0);
	};

	return (
		<>
			<TableRow>
				<TableCell><Checkbox /></TableCell>
				<TableCell>{order['id']}</TableCell>
				<TableCell>{order['cycles']}</TableCell>
				<TableCell>{new Date(order['endTime']).toLocaleString()}</TableCell>
				<TableCell>
					<IconButton aria-label="expand row" size="small" onClick={() => toggleOpen()}>
						{open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
					</IconButton>
				</TableCell>
			</TableRow>
			<TableRow>
				<TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
					<Collapse in={open} timeout="auto" unmountOnExit>
						<Box margin={1}>
							<Typography variant="h6" gutterBottom component="div">
								Order Data
						</Typography>
							<Table size="small" aria-label="purchases">
								<TableHead>
									<TableRow>
										<TableCell />
										<TableCell>Cycle Number</TableCell>
										<TableCell>Start Time</TableCell>
										<TableCell>End Time</TableCell>
										<TableCell />
									</TableRow>
								</TableHead>
								<TableBody>
									{IsLoading ? <TableRow><TableCell>Loading Data ...</TableCell></TableRow> : (rowsPerPage > 0
										? cycles.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
										: cycles
									).map((cycle) => (
										<TableRow key={cycle.id}>
											<TableCell><Checkbox /></TableCell>
											<TableCell component="th" scope="row">
												{cycle.id}
											</TableCell>
											<TableCell>{new Date(cycle.startTime).toLocaleString()}</TableCell>
											<TableCell>{new Date(cycle.endTime).toLocaleString()}</TableCell>
											<TableCell>
												<Link to={`/cycledata/${cycle.id}`}>
													<IconButton>
														<VisibilityIcon />
													</IconButton>
												</Link>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
								<TableFooter>
									<TableRow>
										<TablePagination
											rowsPerPageOptions={[10, 50, 100, { label: 'All', value: -1 }]}
											colSpan={3}
											count={cycles.length}
											rowsPerPage={rowsPerPage}
											page={page}
											SelectProps={{
												inputProps: { 'aria-label': 'rows per page' },
												native: true,
											}}
											labelRowsPerPage="Cycles per page"
											onChangePage={handleChangePage}
											onChangeRowsPerPage={handleChangeRowsPerPage}
											ActionsComponent={TablePaginationActions}
										/>
									</TableRow>
								</TableFooter>
							</Table>
						</Box>
					</Collapse>
				</TableCell>
			</TableRow>
		</>
	);
}

export default function OrderAndCyclesTable() {
	const [Orders, setOrders] = React.useState<Order[]>([]);
	const [IsLoading, setIsLoading] = React.useState(true);
	const [Age, setAge] = React.useState<string>("24");
	const [page, setPage] = React.useState(0);
	const [rowsPerPage, setRowsPerPage] = React.useState(5);

	const columns = [
		{ name: 'id', title: 'Order #' },
		{ name: 'cycles', title: 'Total Cycles' },
		{ name: 'endTime', title: 'Date Complete' },
	];

	async function loadOrders(age: string) {
		const orders = await fetchJson("/order?age=" + age);
		setOrders(orders);
		setIsLoading(false);
	}

	React.useEffect(() => {
		loadOrders(Age);
	},
		[Age]);

	const handleChangePage = (event: any, newPage: number) => {
		setPage(newPage);
	};

	const handleChangeRowsPerPage = (event: any) => {
		setRowsPerPage(parseInt(event.target.value, 10));
		setPage(0);
	};

	//render list of Orders
	if (IsLoading) {
		return <p>Table loading...</p>;
	}

	return (
		<>
			<TableFilter onChangeAge={setAge} defaultAge={Age} />
			<TableContainer component={Paper}>
				<Table aria-label="collapsible table">
					<TableHead>
						<TableRow>
							<TableCell />
							{columns.map(
								row => (
									<TableCell>{row.title}</TableCell>
								)
							)}
							<TableCell />
						</TableRow>
					</TableHead>
					<TableBody>
						{Orders.map((order) => (
							<OrderRow key={order.id} order={order} />
						))}
					</TableBody>
					<TableFooter>
						<TableRow>
							<TablePagination
								rowsPerPageOptions={[5, 10, 25, { label: 'All', value: -1 }]}
								colSpan={3}
								count={Orders.length}
								rowsPerPage={rowsPerPage}
								labelRowsPerPage="Orders per page"
								page={page}
								SelectProps={{
									inputProps: { 'aria-label': 'rows per page' },
									native: true,
								}}
								onChangePage={handleChangePage}
								onChangeRowsPerPage={handleChangeRowsPerPage}
								ActionsComponent={TablePaginationActions}
							/>
						</TableRow>
					</TableFooter>
				</Table>
			</TableContainer>
		</>
	);
}
