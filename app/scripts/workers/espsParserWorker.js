'use strict';

function toJSO(string, annotates, name, sampleRate) {

	var labelJSO = {};
	labelJSO.name = name;
	labelJSO.annotates = annotates;
	labelJSO.sampleRate = sampleRate;
	labelJSO.levels = [];

	// var ext = '_' + filePath.split('.')[filePath.split('.').length - 1];

	// remove all empty lines from string
	string = string.replace(/([ \t]*\r?\n)+/g, '\n');
	// replace all blanks with single whitespace
	string = string.replace(/[ \t]+/g, ' ');
	var lines = string.split('\n');

	// find header end
	var headEndIdx;
	for (var i = 0; i < lines.length; i++) {
		if (lines[i] === '#') {
			headEndIdx = i;
			break;
		}
	}

	//init empty labelJSO
	labelJSO.levels[0] = {};
	labelJSO.levels[0].name = name;
	labelJSO.levels[0].items = [];

	var idCounter = 1;

	// set level type
	var prevLineArr;
	var curLineArr = lines[headEndIdx + 1].split(/\s+/);
	if (curLineArr[curLineArr.length - 1] !== 'H#') {
		labelJSO.levels[0].type = 'POINT';
	} else {
		labelJSO.levels[0].type = 'SEGMENT';
	}

	if (labelJSO.levels[0].type === 'POINT') {
		for (i = headEndIdx + 1; i < lines.length - 1; i++) {
			curLineArr = lines[i].split(/\s+/);
			labelJSO.levels[0].items.push({
				id: idCounter,
				labels: [{
					name: name,
					value: curLineArr[curLineArr.length - 1]
				}],
				sampleStart: Math.floor(curLineArr[1] * sampleRate)
			});
			idCounter += 1;
		}
	} else {
		// take care of H#
		curLineArr = lines[headEndIdx + 1].split(/\s+/);
		labelJSO.levels[0].items.push({
			id: idCounter,
			labels: [{
				name: name,
				value: ''
			}],
			sampleStart: 0,
			sampleDur: Math.floor(curLineArr[1] * sampleRate)
		});
		idCounter += 1;
		for (i = headEndIdx + 2; i < lines.length - 1; i++) {
			curLineArr = lines[i].split(/\s+/);
			prevLineArr = lines[i - 1].split(/\s+/);
			labelJSO.levels[0].items.push({
				id: idCounter,
				labels: [{
					name: name,
					value: curLineArr[curLineArr.length - 1]
				}],
				sampleStart: Math.floor(prevLineArr[1] * sampleRate),
				sampleDur: Math.floor((curLineArr[1] - prevLineArr[1]) * sampleRate)
			});
			idCounter += 1;
		}

	}

	return labelJSO;
};

/**
 * SIC! This function probably has to be fixed...
 */
function toESPS(data, name, sampleRate) {
	var espsStr = '';
	// construct header
	espsStr += 'signal ' + name + '\n';
	espsStr += 'nfields 1\n';
	espsStr += '#\n';
	var curLabel;
	for (var j = 0; j < data.length; j++) {
	//angular.forEach(data, function (i, idx) {
		if (data[j].labels[0].value === '' && j === 0) {
			curLabel = 'H#';
		} else {
			curLabel = data[j].labels[0].value;
		}
		espsStr += '\t' + String((data[j].sampleStart + data[j].sampleDur) / sampleRate) + '\t125\t' + curLabel + '\n';
	}
	//});

	// console.log(espsStr);
	return espsStr;
};


/**
 * add event listener to webworker
 */
self.addEventListener('message', function (e) {
	var data = e.data;
	switch (data.cmd) {
	case 'parseESPS':
		// sampleRate = data.sampleRate;
		var retVal = toJSO(data.textGrid, data.annotates, data.name, data.sampleRate)
		if (retVal.type === undefined) {
			self.postMessage({
				'status': {
					'type': 'SUCCESS',
					'message': ''
				},
				'data': retVal
			});
		} else {
			self.postMessage(retVal);
		}
		break;
	case 'parseJSO':
		var retVal = toESPS(data.level.items, data.level.name, data.sampleRate)
		if (retVal.type === undefined) {
			self.postMessage({
				'status': {
					'type': 'SUCCESS',
					'message': ''
				},
				'data': retVal
			});
		} else {
			self.postMessage(retVal);
		}
		break;		
	default:
		self.postMessage({
			'status': {
				'type': 'ERROR',
				'message': 'Unknown command sent to espsParserWorker: ' + data.cmd
			}
		});

		break;
	}
})