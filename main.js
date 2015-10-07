"use strict";
(function() {
var canvas, context2d, audioContext, vars={}, tracks=[], logs=[];
var colors = ["red", "green", "blue", "orange", "maroon", "teal", "purple", "olive"];
var stems = [
	{text:"Music", src:"Music" + audioType},
	{text:"Vocals", src:"Vocals" + audioType},
	{text:"BG Vocals", src:"BGVocals" + audioType}
]

function initVars() {
	vars.nOn = 0;
	vars.nLoad = 0;
	vars.nLoaded = 0;
	vars.playing = false;	// TODO turn this into number of playing tracks
	tracks.length = 0;
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

	initVars();
	for (var i = stems.length-1; i >= 0; --i) {
		loadAudio(vars.nLoad, stems[vars.nLoad].text, stems[vars.nLoad].src);
		vars.nLoad++;
	}
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
		if (i >= 0 && i < tracks.length) {
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
			if (vars.useBuffer) {
				var reader = new FileReader();
				reader.onload = function(event) {
					loadBuffer(vars.nLoad, file.name, event.target.result, play);
					vars.nLoad++;
				}
				reader.readAsArrayBuffer(file);
			} else {
				loadAudio(vars.nLoad, file.name, URL.createObjectURL(file), play);
				vars.nLoad++;
			}
		} else {
			log("UNSUPPORTED FILE TYPE " + file.type);
		}
	}
}

function loadSC() {
	var url = document.getElementById("text").value;
	log("loadSoundcloud(" + url + ")");
	SC.get('/resolve', {url:url}, function(track) {
		if (track.stream_url) {
			pauseStop();
			loadAudio(vars.nLoad, track.title, track.stream_url + "?client_id=" + SC.options.client_id, true);
			vars.nLoad++;
		}
	});
}

function loadAudio(index, text, src, play) {
	if (vars.useBuffer) {
		log("loadBuffer(" + index + ", " + text + (play ? ", play)" : ")"));
		var request = new XMLHttpRequest();
		request.open("get", src, true);
    	request.withCredentials = true;
		request.responseType = "arraybuffer";
		request.onload = function() {
			loadBuffer(index, text, request.response, play);
		}
		request.send();
	} else {
		log("loadAudio(" + index + ", " + text + (play ? ", play)" : ")"));
		var audio = document.createElement("audio");
		audio.crossOrigin = "anonymous";
		audio.oncanplay = function() {
			initTracks(index, text);
			tracks[index].audio = audio;
			if (play) playStart();
		}
		audio.src = src;
	}
}

function loadBuffer(index, text, data, play) {
	log("loadData(" + index + ", " + text + (play ? ", play)" : ")"));
	audioContext.decodeAudioData(data, function(buffer) {
		initTracks(index, text);
		tracks[index].buffer = buffer;
		if (play) playStart();
	});
}

function initTracks(index, text) {
	log("initTracks(" + index + ")");

	var lo = audioContext.createBiquadFilter();
	lo.type = "lowpass";
	lo.frequency.value = audioContext.sampleRate/2;

	var hi = audioContext.createBiquadFilter();
	hi.type = "highpass";
	hi.frequency.value = 10;

	var analyser = audioContext.createAnalyser();

	lo.connect(hi);
	hi.connect(analyser);
	analyser.connect(audioContext.destination);

	tracks[index] = {text:text, lo:lo, hi:hi, analyser:analyser, on:true};
	vars.nLoaded++;
	vars.nOn++;

	var n = (vars.nLoad > vars.nLoaded) ? vars.nLoad : vars.nLoaded;
	vars.width = canvas.width / n;
	context2d.font = "bold " + vars.textHeight + "px sans-serif";
	for (var i = tracks.length-1; i >= 0; --i) {
		if (tracks[i]) {
			while (context2d.measureText(tracks[i].text).width > vars.width) {
				tracks[i].text = tracks[i].text.slice(0,-1);
			}
			setText(i);
		}
	}
	doFilters();
}

function setText(index) {
	tracks[index].font = context2d.font = (tracks[index].on ? "bold " : "") + vars.textHeight + "px sans-serif";
	var width = context2d.measureText(tracks[index].text).width;
	tracks[index].x = (vars.width - width)/2 + vars.width * index;
	tracks[index].x2 = tracks[index].x + width;
}

function toggleFilter(index) {
	log("filter(" + index + (tracks[index].on ? ", off)" : ", on)"));
	tracks[index].on = !tracks[index].on;
	setText(index);

	vars.nOn = 0;
	for (var i = tracks.length-1; i >= 0; --i) {
		if (tracks[i] && tracks[i].on) {
			vars.nOn++;
		}
	}

	doFilters(index);
}

function playStart() {
	for (var i = tracks.length-1; i >= 0; --i) {
		if (tracks[i].audio) {
			tracks[i].source = audioContext.createMediaElementSource(tracks[i].audio);
			tracks[i].source.connect(tracks[i].lo);
			tracks[i].audio.onended = ended;

			log("play(" + i + ")");
			tracks[i].audio.play();
		} else {
			tracks[i].source = audioContext.createBufferSource();
			tracks[i].source.buffer = tracks[i].buffer;
			tracks[i].source.connect(tracks[i].lo);
			tracks[i].source.onended = ended;

			if (tracks[i].source.start) {
				log("start(" + i + ")");
				tracks[i].source.start(0);
			}
			else {
				log("noteOn(" + i + ")");
				tracks[i].source.noteOn(0);
			}
		}
		vars.playing = true;
	}
}

function pauseStop(force) {
	if (force || vars.nLoad > 0) {
		if (vars.playing) {
			for (var i = tracks.length-1; i >= 0; --i) {
				if (tracks[i].audio) {
					log("pause(" + i + ")");
					tracks[i].audio.pause();
				}
				else if (tracks[i].source.stop) {
					log("stop(" + i + ")");
					tracks[i].source.stop(0);
				}
				else {
					log("noteOff(" + i + ")");
					tracks[i].source.noteOff(0);
				}
			}
		}
		initVars();
	}
}

function ended(event) {
	for (var i = tracks.length-1; i >= 0; --i) {
		if (tracks[i].audio == event.target || tracks[i].source == event.target) {
			log("ended(" + tracks[i].text + ")");
			tracks.splice(i, 1);
			vars.nLoaded--;
			vars.width = canvas.width / vars.nLoaded;
		}
	}

	vars.nOn = 0
	for (var i = tracks.length-1; i >= 0; --i) {
		setText(i);
		if (tracks[i].on) vars.nOn++;
	}

	if (!tracks.length) {
		initVars();
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

		for (var i = tracks.length-1; i >= 0; --i) {
			var color = (tracks.length == 1) ? "dimgray" : colors[i];
			visualizer(canvas, tracks[i].analyser, i, tracks.length, color);

			if (tracks[i].on) {
				context2d.strokeStyle = color;
				drawArc(arc * n, arc * (n+1));
				++n;
			}
		}
	}

	for (var i = tracks.length-1; i >= 0; --i) {
		if (tracks[i]) {
			context2d.font = tracks[i].font;
			context2d.fillStyle = (tracks.length == 1) ? "dimgray" : colors[i];
			context2d.fillText(tracks[i].text, tracks[i].x, vars.textY);
		}
	}

	if (vars.text) {
		context2d.font = vars.font;
		context2d.fillStyle = "dimgray";
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

	if (tracks[index] && !tracks[index].on) {
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

		for (var i = tracks.length-1; i >= 0; --i) {
			if (tracks[i] && tracks[i].on) {
				setFilter(i, q, lo, hi);
			}
		}
	}

	function setFilter(i, q, lo, hi) {
		tracks[i].lo.Q.value = q;
		tracks[i].lo.frequency.value = lo;
		tracks[i].hi.Q.value = q;
		tracks[i].hi.frequency.value = hi;
	}
}

function mouseDown(event) {
	vars.click = true;
	mouseXY(event);

	if (vars.y > vars.textY - vars.textHeight) {
		for (var i = tracks.length-1; i >= 0; --i) {
			if (vars.x > tracks[i].x && vars.x < tracks[i].x2) {
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
