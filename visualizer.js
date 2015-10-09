// DJ effects pad 2011 by Shuichi Aizawa
"use strict";

function Visualizer(canvas, frequencyBinCount) {
	var gl, width, height, n, positions, programInfo, bufferInfo;
	var length = Math.ceil(frequencyBinCount * 0.67);	// trim off the high end which are flat anyway
	var data = new Uint8Array(length);

	if (window.twgl) {
		width = 2 / length;	// 2 is width of clipspace
		n = 4;
		positions = new Float32Array(length * n);
		for (var i = length-1; i >= 0; --i) {
			var x = i / length * 2 - 1;	// x normalized to -1 ~ 1
			positions[i*n] = x;
			positions[i*n+1] = -1;
			positions[i*n+2] = x;
		}

		gl = twgl.getWebGLContext(canvas);
		programInfo = twgl.createProgramInfo(gl, ["vs", "fs"]);
		bufferInfo = twgl.createBufferInfoFromArrays(gl, {position:{numComponents:2, data:positions}});
	} else {
		width = canvas.width / length;
		height = canvas.height;
		gl = canvas.getContext("2d");
	}

	this.draw = function(analyser, color, offset, progress) {
		analyser.getByteFrequencyData(data);

		if (window.twgl) {
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
		} else {
			gl.fillStyle = color;
			for (var i = length-1; i >= 0; --i) {
				drawOne(i, 1);
			}

			gl.fillStyle = "dimgray";
			drawOne(Math.floor(length * progress), 2);
		}

		function drawOne(i, h) {
			gl.fillRect(i * width, (1 - data[i]/256) * height, width, h);
		}
	}
}
