// DJ effects pad 2011 by Shuichi Aizawa
"use strict";

function Visualizer(canvas, context2d, frequencyBinCount) {
	var gl, programInfo, bufferInfo, data, n, positions, options, texture, width;
	var height = canvas.height;
	var cutoff = 0.67;
	var visIndex = 0;

	if (window.twgl) {
		gl = twgl.getWebGLContext(canvas);
		gl.enable(gl.BLEND);
		gl.blendEquation(gl.FUNC_ADD);
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
	}

	init();

	function init() {
		switch(visIndex) {
		case 0:
			data = new Uint8Array(Math.ceil(frequencyBinCount * cutoff));
			width = canvas.width / data.length;
			break;
		case 1:
			data = new Uint8Array(Math.ceil(frequencyBinCount * cutoff));
			width = 2 / data.length;	// 2 is width of clipspace
			n = 4;
			positions = new Float32Array(data.length * n);
			for (var i = data.length-1; i >= 0; --i) {
				var x = i / data.length * 2 - 1;	// x normalized to -1 ~ 1
				positions[i*n] = x;
				positions[i*n+1] = -1;
				positions[i*n+2] = x;
			}
			programInfo = twgl.createProgramInfo(gl, ["vs1", "fs1"]);
			bufferInfo = twgl.createBufferInfoFromArrays(gl, {position:{numComponents:2, data:positions}});
			break;
		case 2:
			data = new Uint8Array(frequencyBinCount);
			options = {width:data.length, height:1, format:gl.ALPHA};
			texture = twgl.createTexture(gl, options);
			programInfo = twgl.createProgramInfo(gl, ["vs2", "fs2"]);
			bufferInfo = twgl.createBufferInfoFromArrays(gl, {position:{numComponents:2, data:[1,1,-1,1,1,-1,-1,-1]}});
			break;
		}
	}

	this.setIndex = function(index) {
		visIndex = index;
		if (visIndex == 0 && gl) {
			gl.clearColor(0, 0, 0, 0);
			gl.clear(gl.COLOR_BUFFER_BIT);
		}
		init();
	}

	this.getIndex = function() {
		return visIndex;
	}

	this.draw = function(analyser, color, offset, progress) {
		analyser.getByteFrequencyData(data);

		switch (visIndex) {
		case 0:
			context2d.fillStyle = color;
			for (var i = data.length-1; i >= 0; --i) {
				drawOne(i, 1);
			}
			context2d.fillStyle = "dimgray";
			drawOne(Math.floor(data.length * progress), 2);
			break;
		case 1:
			for (var i = data.length-1; i >= 0; --i) {
				positions[i*n+3] = data[i] / 128 - 1;	// y normalized to -1 ~ 1
			}
			gl.bindBuffer(gl.ARRAY_BUFFER, bufferInfo.attribs.position.buffer);
			gl.bufferData(gl.ARRAY_BUFFER, positions, gl.DYNAMIC_DRAW);
			var uniforms = {color:color, offset:width*offset};
			gl.useProgram(programInfo.program);
			twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo);
			twgl.setUniforms(programInfo, uniforms);
			twgl.drawBufferInfo(gl, gl.LINES, bufferInfo);
			break;
		case 2:
			twgl.setTextureFromArray(gl, texture, data, options);
			var uniforms = {color:color, texture:texture, resolution:[canvas.width, canvas.height]};
			gl.useProgram(programInfo.program);
			twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo);
			twgl.setUniforms(programInfo, uniforms);
			twgl.drawBufferInfo(gl, gl.TRIANGLE_STRIP, bufferInfo);
			break;
		}

		function drawOne(i, h) {
			context2d.fillRect(i * width, (1 - data[i]/255) * height, width, h);
		}
	}

	this.texts = function() {
		return ["Particles", "Bellagio", "Pixel shader"];
	}
}
