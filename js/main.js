// DJ effects pad 2011 by Shuichi Aizawa
"use strict";

window.onload = function() {
	canvas = document.getElementById("canvas");
	context2d = canvas.getContext("2d");
	audioContext = new (window.AudioContext || window.webkitAudioContext)();
	var ua = navigator.userAgent;
	log(ua);
	if (window.nwf || ua.indexOf("Mobile") >= 0 || ua.indexOf("Android") >= 0 || ua.indexOf("Edge") >= 0) {
		vars.useBuffer = true;
	}

	var params = {}
	var param = location.search.slice(1).split("&");
	if (param && param[0]) {	// even if no params, param[0] still becomes an empty string
		for (var i = 0; i < param.length; ++i) {
			log(param[i]);
			var pair = param[i].split("=");
			params[pair[0]] = pair[1];
		}
	}

	vars.stem = 0;
	vars.fpsTime = 0;
	vars.fpsCount = 0;
	vars.fpsText = "";
	vars.nyquist = audioContext.sampleRate / 2;
	vars.octaves = Math.log(vars.nyquist / 40) / Math.LN2;
	vars.x = vars.filterX = canvas.width/2;
	vars.y = vars.filterY = canvas.height/2;
	vars.bar = 48;
	vars.textHeight = 18;
	vars.logHeight = 12;
	vars.lockText = "  Lock  ";

	initVars();
	toggleLock(false);
	loadStems(params["track"]);

	for (var i = colors.length-1; i >= 0; --i) {
		styles[i] = "rgb(" + Math.floor(colors[i][0]*255) + "," + Math.floor(colors[i][1]*255) + "," + Math.floor(colors[i][2]*255) + ")";
	}

	visualizer = new Visualizer(context2d, document.getElementById("gl"));
	visualizer.setIndex(params["vis"]);

	window.requestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame;
	requestAnimationFrame(draw);

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

	window.onorientationchange = function(event) {
		switch(window.orientation) {
		case 90:
		case -90:
			setDisplay("landscape", "none");
//			if (!vars.landscape) {	// only do once
				vars.landscape = 1;
//			}
			break;
		case 0:
		case 180:
			setDisplay("landscape", "block");
			break;
		}
	}

	window.onkeypress = function(event) {
		var i = (event.charCode == 48) ? 9 : event.charCode-49;	// map 0 key to 10th
		if (i >= 0 && i < tracks.length) {
			toggleEffect(i);
		}

		if (event.charCode == 96) {	// `
			toggleLock();
			if (!vars.lock) {	// TODO streamline this filter reset
				vars.x = canvas.width/2;
				vars.y = canvas.height/2;
				doFilters();
			}
		}
	}

	element = document.getElementById("stems");
	if (element) {
		element.onchange = function(event) {
			var index = event.target.value;
			loadStems(index);
		}
	}

	SC.initialize({client_id:'28c66c838c6f68e374e707978b672fa8'});

	element = document.getElementById("url");
	if (element) {
		element.onkeypress = function(event) {
			if (event.keyCode == 13) {
				loadSC();
			}
		}
	}

	canvas.ondrop = loadFiles;
	canvas.ondragover  = function(event) {
		event.preventDefault()
	}

	var element = document.getElementById("file");
	if (element) {
		element.onchange = loadFiles;
	}

	element = document.getElementById("visualizer");
	if (element) {
		element.onchange = function(event) {
			var index = event.target.value;
			log("visualizer(" + index + ")");
			visualizer.setIndex(index);
		}
	}
}

function initVars() {
	vars.nOn = 0;
	vars.nPlay = 0;
	vars.nLoad = 0;
	vars.nLoaded = 0;
	tracks.length = 0;
}

function loadStems(index) {
	pauseStop(true);
	index = parseInt(index);
	if (index > 0 && index < stems.length) {
		vars.stem = index;
		log("loadTrack(" + vars.stem + ", " + stems[vars.stem].type + ")");
		var stemTracks = stems[vars.stem].tracks;
		for (var i = 0; i < stemTracks.length; ++i) {
			loadAudio(i, stemTracks[i].text, "audio/" + stemTracks[i].src + stems[vars.stem].type);
			vars.nLoad++;
		}
	}
}

function loadSC() {
	var url = document.getElementById("url").value;
	log("loadSoundCloud(" + url + ")");
	SC.get('/resolve', {url:url}, function(track) {
		if (track.stream_url) {
			pauseStop();
			loadAudio(vars.nLoad, track.title, track.stream_url + "?client_id=" + SC.options.client_id, true);
			vars.nLoad++;
		}
	});
}

function loadFiles(event) {
	var files = event.target.files || event.dataTransfer.files;
	var length = files.length;
	if (length > 0) {
		pauseStop(true);
		if (length > colors.length) {
			length = colors.length;
			log("MAX " + colors.length + " FILES");
		}
		for (var i = 0; i < length; ++i) {
			loadFile(files[i], files.length == 1);
		}
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

function toggleEffect(index) {
	if (vars.nPlay < 1 || tracks[index].play) {
		log("effects(" + (index+1) + (tracks[index].on ? ", off)" : ", on)"));
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
}

function toggleLock(force) {
	if (force != undefined) {
		vars.lock = force;
	} else {
		vars.lock = !vars.lock;
	}
	log("lock(" + (vars.lock ? "on)" : "off)"));

	vars.lockFont = setFont(vars.lock);
	var width = context2d.measureText(vars.lockText).width;
	vars.lockX1 = (canvas.width - width)/2;
	vars.lockX2 = vars.lockX1 + width;
}

function setText(index) {
	tracks[index].font = setFont(tracks[index].on);
	var width = context2d.measureText(tracks[index].text).width;
	tracks[index].x1 = (vars.width - width)/2 + vars.width * index;
	tracks[index].x2 = tracks[index].x1 + width;
}

function setFont(bold) {
	return context2d.font = (bold ? "bold " : "") + vars.textHeight + "pt sans-serif";
}

function draw(time) {
	if (vars.landscape > 0 && window.innerHeight < window.innerWidth) {	// hack since onorientationchange doesn't change innerHeight immediately
		setHeight();
		vars.landscape = -1;
		log("setResolution(" + canvas.width + "x" + canvas.height + ")");
	}

	vars.fpsCount++;
	if (time - vars.fpsTime > 984) {
		vars.fpsText = vars.fpsCount + "fps ";
		vars.fpsTime = time;
		vars.fpsCount = 0;
	}

	context2d.clearRect(0, 0, canvas.width, canvas.height);
	context2d.strokeStyle = "lightgray";
	context2d.lineWidth = 1;
	context2d.moveTo(0, 0);
	context2d.lineTo(canvas.width, canvas.height);
	context2d.moveTo(canvas.width, 0);
	context2d.lineTo(0, canvas.height);
	context2d.moveTo(0, canvas.height/2);
	context2d.lineTo(canvas.width, canvas.height/2);
	context2d.moveTo(canvas.width/2, 0);
	context2d.lineTo(canvas.width/2, canvas.height);
	context2d.moveTo(0, vars.bar);
	context2d.lineTo(canvas.width, vars.bar);
	context2d.moveTo(0, canvas.height - vars.bar);
	context2d.lineTo(canvas.width, canvas.height - vars.bar);
	context2d.stroke();

	if (vars.nPlay < 1 || vars.nOn < 1) {
		drawArc(0, Math.PI*2);
	}

	var n = 0, arc = Math.PI*2 / vars.nOn;
	context2d.lineWidth = 3;

	for (var i = tracks.length-1; i >= 0; --i) {
		var track = tracks[i];
		if (track && track.play) {
			var c = (tracks.length == 1) ? colors.length-1 : i;

			if (visualizer.index() > 0) {
				var progress = track.audio ?
					track.audio.currentTime / track.audio.duration :
					(audioContext.currentTime - track.time) / track.buffer.duration;
				visualizer.draw(track.analyser, (visualizer.index() > 2) ? colors[c] : styles[c], i / tracks.length, progress);
			}

			if (track.on) {	// TODO bring this out of vis code and into UI code
				context2d.strokeStyle = styles[c];
				drawArc(arc * n, arc * (n+1));
				++n;
			}
		}
	}

	var y = canvas.height - (vars.bar - vars.textHeight)/2;
	for (var i = tracks.length-1; i >= 0; --i) {
		if (tracks[i]) {
			context2d.font = tracks[i].font;
			context2d.fillStyle = styles[(vars.nPlay < 1 || tracks.length == 1 || !tracks[i].play) ? colors.length-1 : i];
			context2d.fillText(tracks[i].text, tracks[i].x1, y);
		}
	}

	context2d.fillStyle = "gray";
	context2d.font = vars.lockFont;
	context2d.fillText(vars.lockText, vars.lockX1, (vars.bar + vars.textHeight)/2);

	if (vars.nLoaded < vars.nLoad) {
		setFont(true);
		context2d.fillText("Loading..", canvas.width/2 - 50, canvas.height/2);
	}

	context2d.font = vars.logHeight + "px sans-serif";
	context2d.fillText(vars.fpsText, 2, vars.bar);
	for (var i = logs.length-1; i >= 0; --i) {
		context2d.fillText(logs[i], 2, vars.bar + vars.logHeight*(i+1));
	}

	requestAnimationFrame(draw);

	function drawArc(a1, a2) {
		context2d.beginPath();
		context2d.arc(vars.filterX, vars.filterY, 20, a1, a2);
		context2d.stroke();
	}
}

function log(text) {
	text = audioContext.currentTime.toFixed(3) + " " + text;
	console.log(text);
	logs.push(text);
	if (logs.length > (canvas.height - vars.bar*2) / vars.logHeight) {
		logs.shift();
	}
}

function mouseDown(event) {
	vars.click = true;
	mouseXY(event);

	if (vars.y < vars.bar && vars.x > vars.lockX1 && vars.x < vars.lockX2) {
		vars.drag = true;
		toggleLock();
	}
	else if (vars.y > canvas.height - vars.bar) {
		for (var i = tracks.length-1; i >= 0; --i) {
			if (vars.x > tracks[i].x1 && vars.x < tracks[i].x2) {
				vars.drag = true;
				toggleEffect(i);
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
	vars.x -= canvas.offsetLeft + 3;	// 3 for border width
	vars.y -= canvas.offsetTop + 3;	// TODO convert to float for variable height?
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
	if (vars.click && !vars.drag && vars.nPlay < 1) {
		if (vars.nLoaded >= vars.nLoad) {
			playStart();
		}
		else if (!vars.useBuffer) {
			loadSC();
		}
	}

	if (!vars.lock) {
		vars.x = canvas.width/2;
		vars.y = canvas.height/2;
		doFilters();
	}

	vars.click = false;
	vars.drag = false;
}

if(!window.nwf){
(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
})(window,document,'script','http://www.google-analytics.com/analytics.js','ga');
ga('create','UA-7050108-2','auto');
ga('send','pageview');
}
