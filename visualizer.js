// DJ effects pad 2011 by Shuichi Aizawa
"use strict";

function Visualizer(canvas, frequencyBinCount) {
	var gl, programInfo, bufferInfo, data, texture, options, width, height;

	if (window.twgl) {
		gl = twgl.getWebGLContext(canvas);
		programInfo = twgl.createProgramInfo(gl, ["vs", "fs"]);
		bufferInfo = twgl.createBufferInfoFromArrays(gl, {position:{numComponents:2, data:[1,1,-1,1,1,-1,-1,-1]}});

		data = new Uint8Array(frequencyBinCount);
		options = {width:data.length, height:1, format:gl.ALPHA};
		texture = twgl.createTexture(gl, options);
	} else {
		gl = canvas.getContext("2d");
		data = new Uint8Array(Math.ceil(frequencyBinCount * 0.67));
		width = canvas.width / data.length;
		height = canvas.height;
	}

	this.draw = function(analyser, color, offset, progress) {
		analyser.getByteFrequencyData(data);

		if (window.twgl) {
			twgl.setTextureFromArray(gl, texture, data, options);

			var uniforms = {color:color, texture:texture, length:data.length, resolution:[canvas.width, canvas.height]};
			gl.useProgram(programInfo.program);
			twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo);
			twgl.setUniforms(programInfo, uniforms);
			twgl.drawBufferInfo(gl, gl.TRIANGLE_STRIP, bufferInfo);
		} else {
			gl.fillStyle = color;
			for (var i = data.length-1; i >= 0; --i) {
				drawOne(i, 1);
			}

			gl.fillStyle = "dimgray";
			drawOne(Math.floor(data.length * progress), 2);
		}

		function drawOne(i, h) {
			gl.fillRect(i * width, (1 - data[i]/255) * height, width, h);
		}
	}
}
