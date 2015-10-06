"use strict";
(function() {
var canvas, context2d, audioContext, vars={}, filters=[], texts=[], logs=[];	// TODO rename filters to tracks
var colors = ["red", "green", "blue", "orange", "magenta", "cyan", "black"];
var stems = [
	{text:"Music", src:"Music" + audioType},
	{text:"Vocals", src:"Vocals" + audioType},
	{text:"BG Vocals", src:"BGVocals" + audioType}
]

function initVars(load) {
	vars.nOn = 0;
	vars.nLoad = 0;
	vars.nLoaded = 0;
	vars.playing = false;
	filters.length = 0;
	texts.length = 0;

	if (load) {
		for (var i = stems.length-1; i >= 0; --i) {
			loadAudio(vars.nLoad, stems[vars.nLoad].src, stems[vars.nLoad].text);
			vars.nLoad++;
		}
	}
}

window.onload = function() {
	canvas = document.getElementById("canvas");
	context2d = canvas.getContext("2d");
	audioContext = new (window.AudioContext || window.webkitAudioContext)();
	if (window.nwf || navigator.userAgent.indexOf("Mobile") >= 0) {
		vars.useBuffer = true;
	}

	vars.fpsTime = 0;
	vars.fpsCount = 0;
	vars.fpsText = "";
	vars.nyquist = audioContext.sampleRate / 2;
	vars.octaves = Math.log(vars.nyquist / 40) / Math.LN2;
	vars.x = vars.filterX = canvas.width/2;
	vars.y = vars.filterY = canvas.height/2;
	vars.textHeight = 24;
	vars.textY = canvas.height - vars.textHeight/4;

	initVars(true);
	draw(0);

	if (window.PointerEvent) {
		canvas.onpointerdown = mouseDown;
		canvas.onpointermove = mouseMove;
		window.onpointerup = mouseUp;
	}
	canvas.ontouchstart = mouseDown;
	canvas.ontouchmove = mouseMove;
	window.ontouchend = mouseUp;
	canvas.onmousedown = mouseDown;
	canvas.onmousemove = mouseMove;
	window.onmouseup = mouseUp;

	window.onkeypress = function(event) {
		var i = event.charCode-49;
		if (i >= 0 && i < filters.length) {
			toggleFilter(i);
		}
	}

	canvas.ondrop = loadFiles;
	canvas.ondragover  = function(event) {
		event.preventDefault()
	}

	var file = document.getElementById("file");
	if (file) {
		file.onchange = loadFiles;
	}

	var text = document.getElementById("text");
	if (text) {
		text.onkeypress = function(event) {
			if (event.keyCode == 13) {
				loadSC();
			}
		}
	}

	var span = document.getElementById("span");
	if (span && !vars.useBuffer) {
		span.style.display = "inline";	// if not mobile then show sc input ui
	}

	function loadFiles(event) {
		pauseStop(true);
		var files = event.target.files || event.dataTransfer.files;
		for (var i = files.length-1; i >= 0; --i) {
			loadFile(files[i], files.length == 1);
		}
		event.preventDefault();

		function loadFile(file, play) {
			log("loadFile(" + file.name + ")");
			if (file.type.indexOf("audio") >= 0 || file.type.indexOf("ogg") >= 0) {
				var reader = new FileReader();
				reader.onload = function(event) {
					loadBuffer(vars.nLoad, event.target.result, file.name, play);
					vars.nLoad++;
				}
				reader.readAsArrayBuffer(file);
			} else {
				log("UNSUPPORTED FILE TYPE " + file.type);
			}
		}
	}
}

function loadSC() {
	var url = document.getElementById("text").value;
	log("loadSoundcloud(" + url + ")");
	SC.get('/resolve', {url:url}, function(track) {
		if (track.stream_url) {
			pauseStop();
			loadAudio(vars.nLoad, track.stream_url + "?client_id=" + SC.options.client_id, track.title, true);
			vars.nLoad++;
		}
	});
}

function loadAudio(index, src, text, play) {
	if (vars.useBuffer) {
		log("loadBuffer(" + index + ", " + text + (play ? ", play)" : ")"));
		var request = new XMLHttpRequest();
		request.open("get", src, true);
    	request.withCredentials = true;
		request.responseType = "arraybuffer";
		request.onload = function() {
			loadBuffer(index, request.response, text, play);
		}
		request.send();
	} else {
		log("loadAudio(" + index + ", " + text + (play ? ", play)" : ")"));
		var audio = document.createElement("audio");
		audio.crossOrigin = "anonymous";
		audio.oncanplay = function() {
			var source = audioContext.createMediaElementSource(audio);
			audio.onended = ended;
			initFilter(index, source, text);
			filters[index].audio = audio;
			if (play) playStart();
		}
		audio.src = src;
	}
}

function loadBuffer(index, data, text, play) {	// TODO store buffer for replay
	log("loadData(" + index + ", " + text + (play ? ", play)" : ")"));
	var source = audioContext.createBufferSource();
	audioContext.decodeAudioData(data, function(buffer) {
		source.buffer = buffer;
		source.onended = ended;
		initFilter(index, source, text);
		if (play) playStart();
	});
}

function initFilter(index, source, text) {
	log("initFilters(" + index + ")");

	var lo = audioContext.createBiquadFilter();
	lo.type = "lowpass";
	lo.frequency.value = audioContext.sampleRate/2;

	var hi = audioContext.createBiquadFilter();
	hi.type = "highpass";
	hi.frequency.value = 10;

	var analyser = audioContext.createAnalyser();

	source.connect(lo);
	lo.connect(hi);
	hi.connect(analyser);
	analyser.connect(audioContext.destination);

	filters[index] = {source:source, text:text, lo:lo, hi:hi, analyser:analyser, on:true};
	vars.nLoaded++;
	vars.nOn++;

	var n = (vars.nLoad > vars.nLoaded) ? vars.nLoad : vars.nLoaded;
	vars.width = canvas.width / n;
	context2d.font = "bold " + vars.textHeight + "px sans-serif";
	for (var i = filters.length-1; i >= 0; --i) {
		if (filters[i]) {
			while (context2d.measureText(filters[i].text).width > vars.width) {
				filters[i].text = filters[i].text.slice(0,-1);
			}
			setText(i);
		}
	}
	doFilters();
}

function setText(index) {
	var font = context2d.font = (filters[index].on ? "bold " : "") + vars.textHeight + "px sans-serif";
	var width = context2d.measureText(filters[index].text).width;
	var x = (vars.width - width)/2 + vars.width * index;
	texts[index] = {font:font, x:x, x2:x + width};
}

function toggleFilter(index) {
	log("filter(" + index + (filters[index].on ? ", off)" : ", on)"));
	filters[index].on = !filters[index].on;
	setText(index);

	vars.nOn = 0;
	for (var i = filters.length-1; i >= 0; --i) {
		if (filters[i] && filters[i].on) {
			vars.nOn++;
		}
	}

	doFilters(index);
}

function playStart() {
	for (var i = filters.length-1; i >= 0; --i) {
		if (filters[i].audio) {
			log("play(" + i + ")");
			filters[i].audio.play();
		}
		else if (filters[i].source.start) {
			log("start(" + i + ")");
			filters[i].source.start(0);
		}
		else {
			log("noteOn(" + i + ")");
			filters[i].source.noteOn(0);
		}
		vars.playing = true;
	}
}

function pauseStop(force) {
	if (force || vars.nLoad > 0) {
		if (vars.playing) {
			for (var i = filters.length-1; i >= 0; --i) {
				if (filters[i].audio) {
					log("pause(" + i + ")");
					filters[i].audio.pause();
				}
				else if (filters[i].source.stop) {
					log("stop(" + i + ")");
					filters[i].source.stop(0);
				}
				else {
					log("noteOff(" + i + ")");
					filters[i].source.noteOff(0);
				}
			}
		}
		initVars();
	}
}

function ended(event) {
	for (var i = filters.length-1; i >= 0; --i) {
		if (filters[i].audio == event.target || filters[i].source == event.target) {
			log("ended(" + filters[i].text + ")");
			filters.splice(i, 1);
			texts.splice(i, 1);
			vars.nLoaded--;
			vars.width = canvas.width / vars.nLoaded;
		}
	}

	vars.nOn = 0
	for (var i = filters.length-1; i >= 0; --i) {
		setText(i);
		if (filters[i].on) vars.nOn++;
	}

	if (!filters.length) {
		initVars(true);
	}
}

function draw(time) {
	vars.fpsCount++;
	if (time - vars.fpsTime > 984) {
		vars.fpsText = vars.fpsCount + "fps ";
		vars.fpsTime = time;
		vars.fpsCount = 0;
	}

	var canvasWidth = canvas.width, canvasHeight = canvas.height;
	context2d.clearRect(0, 0, canvasWidth, canvasHeight);

	context2d.lineWidth = 1;
	context2d.strokeStyle = "lightgray";
	context2d.moveTo(0, 0);
	context2d.lineTo(canvasWidth, canvasHeight);
	context2d.moveTo(canvasWidth, 0);
	context2d.lineTo(0, canvasHeight);
	context2d.moveTo(0, canvasHeight/2);
	context2d.lineTo(canvasWidth, canvasHeight/2);
	context2d.moveTo(canvasWidth/2, 0);
	context2d.lineTo(canvasWidth/2, canvasHeight);
	context2d.stroke();

	drawArc(0, Math.PI*2);

	if (vars.playing) {
		var n = 0, arc = Math.PI*2 / vars.nOn;
		context2d.lineWidth = 3;

		for (var i = filters.length-1; i >= 0; --i) {
			var color = (filters.length == 1) ? "gray" : colors[i];
			visualizer(canvas, filters[i].analyser, i, filters.length, color);

			if (filters[i].on) {
				context2d.strokeStyle = color;
				drawArc(arc * n, arc * (n+1));
				++n;
			}
		}
	}

	for (var i = texts.length-1; i >= 0; --i) {
		if (texts[i]) {
			context2d.font = texts[i].font;
			context2d.fillStyle = (texts.length == 1) ? "gray" : colors[i];
			context2d.fillText(filters[i].text, texts[i].x, vars.textY);
		}
	}

	if (vars.text) {
		context2d.font = vars.font;
		context2d.fillStyle = "gray";
		context2d.fillText(vars.fpsText + vars.text, 2, 10);
	}

	requestAnimationFrame(draw);

	function drawArc(a1, a2) {
		context2d.beginPath();
		context2d.arc(vars.filterX, vars.filterY, 20, a1, a2);
		context2d.stroke();
	}
}

function doFilters(index) {
	if (index == undefined) {
		vars.filterX = vars.x;
		vars.filterY = vars.y;
	}

	if (filters[index] && !filters[index].on) {
		setFilter(index, 1, vars.nyquist, 10);
	} else {
		var q = Math.abs(vars.filterY / canvas.height - 0.5) * 60;
		var x = vars.filterX / canvas.width;
		var lo = vars.nyquist, hi = 10;

		if (x < 0.5) {
			lo = vars.nyquist * Math.pow(2, vars.octaves * (x*1.8-0.9));	// 0 ~ 0.5 -> 0.1 ~ 1 -> -0.9 ~ 0
		} else {
			hi = vars.nyquist * Math.pow(2, vars.octaves * (x*1.8-1.9));	// 0.5 ~ 1 -> 0 ~ 0.9 -> -1 ~ -0.1
		}

		for (var i = filters.length-1; i >= 0; --i) {
			if (filters[i] && filters[i].on) {
				setFilter(i, q, lo, hi);
			}
		}
	}

	function setFilter(i, q, lo, hi) {
		filters[i].lo.Q.value = q;
		filters[i].lo.frequency.value = lo;
		filters[i].hi.Q.value = q;
		filters[i].hi.frequency.value = hi;
	}
}

function mouseDown(event) {
	vars.click = true;
	mouseXY(event);

	if (vars.y > vars.textY - vars.textHeight) {
		for (var i = texts.length-1; i >= 0; --i) {
			if (vars.x > texts[i].x && vars.x < texts[i].x2) {
				vars.drag = true;
				toggleFilter(i);
			}
		}
	}

	if (!vars.drag) {
		doFilters();
	}

	event.preventDefault();
}

function mouseXY(event) {
	if (event.touches) {
		vars.x = event.touches[0].pageX;
		vars.y = event.touches[0].pageY;
	} else {
		vars.x = event.pageX;
		vars.y = event.pageY;
	}
	vars.x -= canvas.offsetLeft;
	vars.y -= canvas.offsetTop;
}

function mouseMove(event) {
	if (vars.click) {
		if (!vars.drag) {
			mouseXY(event);
			doFilters();
		}
		event.preventDefault();
	}
}

function mouseUp(event) {
	if (!vars.playing && event.target == canvas) {
		if (vars.nLoaded >= vars.nLoad) {
			playStart();
		}
		else if (!vars.useBuffer) {
			loadSC();
		}
	}

	vars.click = false;
	vars.drag = false;
}

function log(text) {
	console.log(text);

	logs.push(text);
	vars.text = "";
	for (var i = logs.length-1; i >= 0; --i) {
		vars.text += logs[i] + " ";
	}

	context2d.font = vars.font = "10px sans-serif";
	if (context2d.measureText(vars.text).width > canvas.width) {
		logs.shift();
	}
}
})();
(function() {
var lastTime = 0;
var vendors = ['webkit'];
for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
	window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
	window.cancelAnimationFrame = window[vendors[x]+'CancelAnimationFrame'] || window[vendors[x]+'CancelRequestAnimationFrame'];
}
if (!window.requestAnimationFrame)
	window.requestAnimationFrame = function(callback, element) {
		var currTime = new Date().getTime();
		var timeToCall = Math.max(0, 16 - (currTime - lastTime));
		var id = window.setTimeout(function(){callback(currTime + timeToCall)}, timeToCall);
		lastTime = currTime + timeToCall;
		return id;
	};
if (!window.cancelAnimationFrame)
	window.cancelAnimationFrame = function(id) {
		clearTimeout(id);
	};
}());
if (!window.nwf) {
(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
})(window,document,'script','http://www.google-analytics.com/analytics.js','ga');
ga('create', 'UA-7050108-2', 'auto');
ga('send', 'pageview');
}
