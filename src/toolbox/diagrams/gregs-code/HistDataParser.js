// Copyright 2020 Barnes Group Inc. All rights reserved.

const fs = require('fs');
const base64Binary = require('./base64-binary');

function dumpCycle(cycleObject)
{
	console.log('='.repeat(80));
	console.log('Injection cycle: ' + cycleObject.injCycle);
	
	if (cycleObject.duplicateSlices)
	{
		console.log('-'.repeat(80));
		console.log('WARNING: Duplicate slices found');
		let dups = cycleObject.duplicateSlices;
		for (key in dups)
		{
			console.log('Slice ' + key + ' has ' + dups[key] + ' entries');
		}
	}
	
	if (cycleObject.graphData)
	{
		console.log('-'.repeat(80));
		console.log('Graph data with ' + cycleObject.graphData.length + ' series');
		console.log(cycleObject.graphData);
	}
}

function dumpParsedData(parsedData)
{
	let cycleCount = parsedData.length;
	console.log('Number of cycles: ' + cycleCount);
	
	for (cycleIndex = 0; cycleIndex < cycleCount; cycleIndex++)
	{
		dumpCycle(parsedData[cycleIndex]);
	}
}

function convertToGraphData(cycleNumber, slices)
{
	// Assume that any slice with the same number of samples
	// comes from the same device
	// NOTE: JavaScript returns the keys in ascending order so there
	// is no need to sort them.
	let groups = {};
	for (var sliceNumber in slices)
	{
		let sampleCount = slices[sliceNumber].data.length;
		if (!groups[sampleCount]) groups[sampleCount] = [];
		groups[sampleCount].push(sliceNumber);
	}
	
	let graphData = [];
	for (var sampleCount in groups)
	{
		let sliceArray = groups[sampleCount];

		// Create the graph elements with their names
		let start = graphData.length;
		for (signal = 0; signal < sampleCount; signal++)
		{
			graphData[start + signal] =
			{
				name: 'i' + cycleNumber + 'd' + sampleCount + 's' + signal,
				data: []
			}
		}
		
		// Now reorganize the data
		for (slice = 0; slice < sliceArray.length; slice++)
		{
			let sliceValues = slices[sliceArray[slice]].data;
			for (signal = 0; signal < sampleCount; signal++)
			{
				graphData[start + signal].data.push(sliceValues[signal]);
			}
		}
	}
	
	return graphData;
}

function parseSensorDataUint16(sliceObject)
{
	let arrayBuffer = base64Binary.decodeArrayBuffer(sliceObject.values);
	let byteValues = new Uint8Array(arrayBuffer);
	let count =  byteValues.length / 2;
	let dataValues = new Uint16Array(count);
	for (i = 0; i < count; i++)
	{
		let j = i + i;
		dataValues[i] = (byteValues[j + 1] << 8) + byteValues[j];
	}
	return dataValues;
}

function parseCycle(cycleObject)
{
	let sdsCount = cycleObject.sensordata_set.length;
	let slices = {};
	let duplicateSlices = {};

	for (sliceIndex = 0; sliceIndex < sdsCount; sliceIndex++)
	{
		let sliceObject = cycleObject.sensordata_set[sliceIndex];
		let sliceNumber = sliceObject.slice;
		if (!slices[sliceNumber])
		{
			slices[sliceNumber] =
			{
				index: sliceIndex,
				data: parseSensorDataUint16(sliceObject)
			};
		}
		else
		{
			if (duplicateSlices[sliceNumber]) duplicateSlices[sliceNumber]++;
			else duplicateSlices[sliceNumber] = 2;
		}
	}

	cycleObject.duplicateSlices = duplicateSlices;
	cycleObject.graphData = convertToGraphData(cycleObject.injCycle, slices)
}

function parseData(data)
{
	let json = JSON.parse(data);
	let cycleCount = json.length;
	for (cycleIndex = 0; cycleIndex < cycleCount; cycleIndex++)
	{
		parseCycle(json[cycleIndex]);
	}
	return json;
}

fs.readFile('greg.txt', function(err, data)
{
	if (err) console.log(err);
	else
	{
		dumpParsedData(parseData(data));
	}
});
