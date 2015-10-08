// DJ effects pad 2011 by Shuichi Aizawa
"use strict";
var gl, programInfo;

function initVisualizer(canvas) {
	gl = twgl.getWebGLContext(canvas);
	programInfo = twgl.createProgramInfo(gl, ["vs", "fs"]);
}

function visualizer(time, analyser) {
	analyser.fftSize = 256;
	var data = new Uint8Array(analyser.frequencyBinCount);
	analyser.getByteFrequencyData(data);

	var arrays = {position:{numComponents:2, data:data}};
	var bufferInfo = twgl.createBufferInfoFromArrays(gl, arrays);

	twgl.resizeCanvasToDisplaySize(gl.canvas);
	gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

	var uniforms = {
		time: time * 0.001,
		resolution: [gl.canvas.width, gl.canvas.height],
	};

	gl.useProgram(programInfo.program);
	twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo);
	twgl.setUniforms(programInfo, uniforms);
	twgl.drawBufferInfo(gl, gl.TRIANGLES, bufferInfo);
}
/*
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
*/
