// DJ effects pad 2011 by Shuichi Aizawa
"use strict";

var records=[];

function record(action) {
	if (tracks[0]) {
		var time = tracks[0].audio ? tracks[0].audio.currentTime : audioContext.currentTime - tracks[0].time;
		records.push({a:action, t:time, x:vars.x, y:vars.y});
	}
}

function printRecords() {
	var pt=0, px=0, py=0;
	for (var i = 0; i < records.length; ++i) {
		console.log(records[i].a, records[i].t - pt, records[i].x - px, records[i].y - py);
		pt = records[i].t;
		px = records[i].x;
		py = records[i].y;
	}
}
