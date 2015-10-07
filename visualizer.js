// DJ effects pad 2011 by Shuichi Aizawa
"use strict";

function visualizer(canvas, analyser, nTracks, index, color, progress) {	// TODO pass in frequency cutoff
	var context2d = canvas.getContext("2d");
	var canvasHeight = canvas.height;

	analyser.fftSize = 256;
	var data = new Uint8Array(analyser.frequencyBinCount);
	analyser.getByteFrequencyData(data);

	var length = Math.ceil(data.length * 0.73);	// frequencies are mostly flat towards highs
	var width = canvas.width / length;
	var offset = width / nTracks * index;	// to prevent overlap of tracks if needed

	context2d.fillStyle = color;
	for (var i = length-1; i >= 0; --i) {
		draw(i, 1);
	}

	context2d.fillStyle = "dimgray";
	draw(Math.floor(length * progress), 2);

	function draw(i, h) {
		context2d.fillRect(i * width, (1 - data[i]/256) * canvasHeight, width, h);
	}
}
