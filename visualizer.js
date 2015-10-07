// DJ effects pad 2011 by Shuichi Aizawa
"use strict";

function visualizer(canvas, analyser, index, nTracks, color) {
	var context2d = canvas.getContext("2d");
	var canvasHeight = canvas.height;

	analyser.fftSize = 256;
	var data = new Uint8Array(analyser.frequencyBinCount);
	analyser.getByteFrequencyData(data);

	var length = Math.ceil(data.length * 0.73);	// frequencies are mostly flat towards highs
	var width = canvas.width / length;
	var offset = width / nTracks * index;

	context2d.fillStyle = color;
	for (var i = length-1; i >= 0; --i) {
		context2d.fillRect(i * width + offset, (1 - data[i]/256) * canvasHeight, width, 1);
	}
}
