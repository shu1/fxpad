function visualizer(canvas, analyser, i, nTracks, color) {
	var context2d = canvas.getContext("2d");
	var canvasHeight = canvas.height;

	analyser.fftSize = 512;
	var data = new Uint8Array(analyser.frequencyBinCount);
	analyser.getByteFrequencyData(data);

	var length = Math.ceil(data.length * 0.75);	// frequencies are mostly flat towards highs
	var width = canvas.width / length;
	var offset = width / nTracks * i;

	context2d.fillStyle = color;
	for (var j = length-1; j >= 0; --j) {
		context2d.fillRect(j * width + offset, (1 - data[j]/256) * canvasHeight, width, 1);
	}
}
