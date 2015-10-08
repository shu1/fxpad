// DJ effects pad 2011 by Shuichi Aizawa
"use strict";
function Visualizer(canvas) {
	var gl = twgl.getWebGLContext(canvas);
	var programInfo = twgl.createProgramInfo(gl, ["vs", "fs"]);

	var length = 744;	// analyser.frequencyBinCount - trim off the high end which are flat anyway
	var data = new Uint8Array(length);
	var positions = new Float32Array(length * 2);
	for (var i = length-1; i >= 0; --i) {
		positions[i*2] = i / length * 2 - 1;	// x normalized to -1 ~ 1
	}
	var bufferInfo = twgl.createBufferInfoFromArrays(gl, {position:{numComponents:2, data:positions}});

	this.draw = function(analyser, color) {
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
		twgl.drawBufferInfo(gl, gl.POINT, bufferInfo);
	}
}
