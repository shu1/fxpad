// DJ effects pad 2011 by Shuichi Aizawa
"use strict";
var gl, programInfo, length, positions, bufferInfo;

function initVisualizer(canvas) {
	gl = twgl.getWebGLContext(canvas);
	programInfo = twgl.createProgramInfo(gl, ["vs", "fs"]);

	length = Math.ceil(1024 * 0.73);	// need to update depending on fftSize
	positions = new Float32Array(length * 2);
	for (var i = length-1; i >= 0; --i) {
		positions[i*2] = i / length * 2 - 1;	// x normalized to -1 ~ 1
	}
	bufferInfo = twgl.createBufferInfoFromArrays(gl, {position:{numComponents:2, data:positions}});
}

function visualizer(analyser, color) {
//	analyser.fftSize = 256;
	var data = new Uint8Array(analyser.frequencyBinCount);
	analyser.getByteFrequencyData(data);

	for (var i = length-1; i >= 0; --i) {
		positions[i*2+1] = data[i] / 128 - 1;	// y normalized to -1 ~ 1
	}
	gl.bindBuffer(gl.ARRAY_BUFFER, bufferInfo.attribs.position.buffer);
	gl.bufferData(gl.ARRAY_BUFFER, positions, gl.DYNAMIC_DRAW);

	var uniforms = {color:color};
	gl.useProgram(programInfo.program);
	twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo);
	twgl.setUniforms(programInfo, uniforms);
	twgl.drawBufferInfo(gl, gl.LINE_STRIP, bufferInfo);
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
