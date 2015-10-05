"use strict";
(function() {
var canvas, context2d, audioContext, filters=[], texts=[], logs=[], vars={};
var colors = ["red", "green", "blue", "orange"];
var stems = [
	{text:"Music", src:"Music" + audioType},
	{text:"Vocals", src:"Vocals" + audioType},
	{text:"BG Vocals", src:"BGVocals" + audioType}
]

window.onload = function() {
	canvas = document.getElementById("canvas");
	context2d = canvas.getContext("2d");
	audioContext = new (window.AudioContext || window.webkitAudioContext)();
	if (window.nwf || navigator.userAgent.indexOf("Mobile") >= 0) {
		vars.useBuffer = true;
	}

	vars.x = vars.filterX = canvas.width/2;
	vars.y = vars.filterY = canvas.height/2;
	vars.textY = canvas.height-6;
	vars.textHeight = 18;
	vars.nyquist = audioContext.sampleRate / 2;
	vars.octaves = Math.log(vars.nyquist / 40) / Math.LN2;

	vars.nOn = 0;
	vars.nLoad = 0;
	vars.nLoaded = 0;
	for (var i = 0; i < stems.length; ++i) {
		vars.nLoad++;
		loadAudio(i, stems[i].src, stems[i].text);
	}

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
		var i = event.keyCode-49;
		if (i >= 0 && i <= filters.length-1) {
			toggleFilter(i);
		}
	}

	canvas.ondrop = loadFile;
	canvas.ondragover  = function(event) {
		event.preventDefault()
	}

	var file = document.getElementById("file");
	if (file) {
		file.onchange = loadFile;
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
		span.style.display = "inline";	// show sc input ui
	}

	requestAnimationFrame(draw);
}

function loadFile(event) {
	var file = (event.target.files || event.dataTransfer.files)[0];	// TODO multiple files
	log("loadFile(" + file.name + ")");

	if (file.type.indexOf("audio") >= 0 || file.type.indexOf("ogg") >= 0) {
		var reader = new FileReader();
		reader.onload = function(event) {
			pauseStop();
			loadBuffer(vars.nLoaded, event.target.result, file.name, true);
		}
		reader.readAsArrayBuffer(file);
	} else {
		log("UNSUPPORTED FILE TYPE " + file.type);
	}
	event.preventDefault();
}

function loadSC() {
	log("loadSC()");
	SC.get('/resolve', {url:document.getElementById("text").value}, function(track) {
		if (track.stream_url) {
			pauseStop();
			loadAudio(vars.nLoaded, track.stream_url + "?client_id=" + SC.options.client_id, track.title, true);
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
			initFilter(index, source, text);
			filters[index].audio = audio;
			if (play) playStart();
		}
		audio.src = src;
	}
}

function loadBuffer(index, data, text, play) {
	log("loadData(" + index + (play ? ", play)" : ")"));
	var source = audioContext.createBufferSource();
	audioContext.decodeAudioData(data, function(buffer) {
		source.buffer = buffer;
		initFilter(index, source, text);
		filters[index].source = source;
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

	source.connect(lo);
	lo.connect(hi);
	hi.connect(audioContext.destination);

	filters[index] = {on:true, text:text, lo:lo, hi:hi};
	vars.nLoaded++;
	vars.nOn++;

	var n = (vars.nLoad > vars.nLoaded) ? vars.nLoad : vars.nLoaded;
	vars.cellWidth = canvas.width / n;
	context2d.font = "bold " + vars.textHeight + "pt sans-serif";
	for (var i = filters.length-1; i >= 0; --i) {
		if (filters[i]) {
			while (context2d.measureText(filters[i].text).width > vars.cellWidth) {
				filters[i].text = filters[i].text.slice(0,-1);
			}
			setText(i);
		}
	}
	requestAnimationFrame(draw);
}

function setText(index) {
	var font = context2d.font = (filters[index].on ? "bold " : "") + vars.textHeight + "pt sans-serif";
	var width = context2d.measureText(filters[index].text).width;
	var x = (vars.cellWidth - width)/2 + vars.cellWidth * index;
	texts[index] = {font:font, x:x, x2:x + width};
}

function toggleFilter(index) {
	log("filter(" + index + (filters[index].on ? ", off)" : ", on)"));
	filters[index].on = !filters[index].on;
	setText(index);

	if (filters[index].on) {
		vars.nOn++;
	} else {
		vars.nOn--;
	}
	doFilters(index);
}

function playStart() {
	for (var i = filters.length-1; i >= 0; --i) {
		if (filters[i].audio) {
			log("play(" + i + ")");
			filters[i].audio.play();
		} else {
			if (filters[i].source.start) {
				log("start(" + i + ")");
				filters[i].source.start(0);
			} else {
				log("noteOn(" + i + ")");
				filters[i].source.noteOn(0);
			}
		}
		vars.playing = true;
	}
}

function pauseStop() {
	if (vars.nLoad > 0) {
		for (var i = filters.length-1; i >= 0; --i) {
			if (filters[i].audio) {
				log("pause(" + i + ")");
				filters[i].audio.pause();
			} else {
				if (filters[i].source.stop) {
					log("stop(" + i + ")");
					filters[i].source.stop(0);
				} else {
					log("noteOff(" + i + ")");
					filters[i].source.noteOff(0);
				}
			}
		}
		filters.length = 0;
		texts.length = 0;
		vars.nLoaded = 0;
		vars.nLoad = 0;
		vars.nOn = 0;
		vars.playing = false;
	}
}

function draw(time) {
	context2d.clearRect(0, 0, canvas.width, canvas.height);

	context2d.lineWidth = 1;
	context2d.strokeStyle = "lightgray";
	context2d.moveTo(0, 0);
	context2d.lineTo(canvas.width, canvas.height);
	context2d.moveTo(canvas.width, 0);
	context2d.lineTo(0, canvas.height);
	context2d.moveTo(0, canvas.height/2);
	context2d.lineTo(canvas.width, canvas.height/2);
	context2d.moveTo(canvas.width/2, 0);
	context2d.lineTo(canvas.width/2, canvas.height);
	context2d.stroke();
	drawArc(0, Math.PI*2);

	if (vars.playing) {
		var n = 0, arc = Math.PI*2 / vars.nOn;
		context2d.lineWidth = 3;
		for (var i = filters.length-1; i >= 0; --i) {
			if (filters[i].on) {
				context2d.strokeStyle = (filters.length == 1) ? "gray" : colors[i];
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
		context2d.fillText(vars.text, 2, 12);
	}

	function drawArc(a1, a2) {
		context2d.beginPath();
		context2d.arc(vars.filterX, vars.filterY, 20, a1, a2);
		context2d.stroke();
	}
}

function doFilters(index) {
	if (filters[index] && !filters[index].on) {
		setFilter(index, 1, vars.nyquist, 10);
	} else {
		var q = Math.abs(vars.y / canvas.height - 0.5) * 60;
		var x = vars.x / canvas.width;
		var lo = vars.nyquist, hi = 10;

		if (x < 0.5) {
			lo = vars.nyquist * Math.pow(2, vars.octaves * (x*2-1));
		} else {
			hi = vars.nyquist * Math.pow(2, vars.octaves * (x*2-2));
		}

		for (var i = filters.length-1; i >= 0; --i) {
			if (filters[i].on) {
				setFilter(i, q, lo, hi);
			}
		}

		vars.filterX = vars.x;
		vars.filterY = vars.y;
	}

	requestAnimationFrame(draw);

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
	requestAnimationFrame(draw);
}

function log(text) {
	console.log(text);

	logs.push(text);
	vars.text = "";
	for (var i = logs.length-1; i >= 0; --i) {
		vars.text += logs[i] + " ";
	}

	context2d.font = vars.font = "10pt sans-serif";
	if (context2d.measureText(vars.text).width > canvas.width) {
		logs.shift();
	}

	requestAnimationFrame(draw);
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
