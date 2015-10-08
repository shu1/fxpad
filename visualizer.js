// DJ effects pad 2011 by Shuichi Aizawa
"use strict";
function Visualizer(canvas) {
	var gl = twgl.getWebGLContext(canvas);
	var programInfo = twgl.createProgramInfo(gl, ["vs", "fs"]);

	var length = Math.ceil(128 * 0.73);	// analyser.frequencyBinCount - trim off the high end which are flat anyway
	var width = 2 / length;	// distance between data points
	var data = new Uint8Array(length);

	var n = 4;
	var positions = new Float32Array(length * n);
	for (var i = length-1; i >= 0; --i) {
		var x = i / length * 2 - 1;	// x normalized to -1 ~ 1
		positions[i*n] = x;
		positions[i*n+1] = -1;
		positions[i*n+2] = x;
	}
	var bufferInfo = twgl.createBufferInfoFromArrays(gl, {position:{numComponents:2, data:positions}});

	this.draw = function(analyser, color, offset) {
		analyser.getByteFrequencyData(data);

		for (var i = length-1; i >= 0; --i) {
			positions[i*n+3] = data[i] / 128 - 1;	// y normalized to -1 ~ 1
		}
		gl.bindBuffer(gl.ARRAY_BUFFER, bufferInfo.attribs.position.buffer);
		gl.bufferData(gl.ARRAY_BUFFER, positions, gl.DYNAMIC_DRAW);

		var uniforms = {color:color, offset:width*offset};
		gl.useProgram(programInfo.program);
		twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo);
		twgl.setUniforms(programInfo, uniforms);
		twgl.drawBufferInfo(gl, gl.LINES, bufferInfo);
	}
}
