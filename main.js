// DJ effects pad 2011 by Shuichi Aizawa
"use strict";
(function(){
var canvas, context2d, audioContext, visualizer, params={}, vars={}, styles=[], tracks=[], logs=[];
var colors = [
	[  0,0.5,  0],
	[  0,  0,  1],
	[  1,  0,  0],
	[  1,0.5,  0],
	[0  ,0.5,0.5],
	[  0,  0,0.5],
	[0.5,  0,  0],
	[0.5,  0,0.5],
	[0.5,0.5,  0],
	[0.5,0.5,0.5],
]
var stems = [{
	text: "Viva Las Vegas - Elvis Presley",
	tracks: [
		{text:"Music", src:"Viva-Music" + audioType},
		{text:"Vocals", src:"Viva-Vocals" + audioType},
		{text:"Chorus", src:"Viva-Chorus" + audioType},
	]
},{
	text: "Analog or Digital - Wildlife Control",
	tracks: [
		{text:"Bass", src:"Analog-Bass.mp3"},
		{text:"Guitar/Piano", src:"Analog-GuitarPiano.mp3"},
		{text:"Drums", src:"Analog-Drums.mp3"},
		{text:"Vocals", src:"Analog-Vocals.mp3"},
	]
},{
	text: "Don't Stop Me Now - Queen",
	tracks: [
		{text:"Vocals", src:"Dont-Vocals" + audioType},
		{text:"Piano", src:"Dont-Piano" + audioType},
		{text:"Bass", src:"Dont-Bass" + audioType},
		{text:"Chorus", src:"Dont-Chorus" + audioType},
		{text:"Drums", src:"Dont-Drums" + audioType},
		{text:"Guitar", src:"Dont-Guitar" + audioType},
	]
},{
	text: "Flaming June - BT",
	tracks: [
		{text:"Piano Harp", src:"FJ-PianoHarp" + audioType},
		{text:"Strings Brass", src:"FJ-StringsBrass" + audioType},
		{text:"FX Original", src:"FJ-FXOriginal" + audioType},
		{text:"Synths", src:"FJ-Synths" + audioType},
		{text:"FX Adds Rises Hits", src:"FJ-FXAddsRisesHits" + audioType},
		{text:"Perc Electronic", src:"FJ-PercElectronic" + audioType},
		{text:"Bass", src:"FJ-Bass" + audioType},
		{text:"Perc Orchestral", src:"FJ-PercOrchestral" + audioType},
	]
}]

function initVars() {
	vars.nOn = 0;
	vars.nPlay = 0;
	vars.nLoad = 0;
	vars.nLoaded = 0;
	tracks.length = 0;
}

window.onload = function() {
	window.requestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame;
	audioContext = new (window.AudioContext || window.webkitAudioContext)();
	canvas = document.getElementById("canvas");
	context2d = canvas.getContext("2d");

	log(navigator.userAgent);
	if (window.nwf || navigator.userAgent.indexOf("Mobile") >= 0 || navigator.userAgent.indexOf("Android") >= 0) {
		vars.useBuffer = true;
	}

	var param = location.search.slice(1).split("&");
	for (var i = 0; i < param.length; ++i) {
		log(param[i]);
		var pair = param[i].split("=");
		params[pair[0]] = pair[1];
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
	loadStems(params["track"]);

	for (var i = colors.length-1; i >= 0; --i) {
		styles[i] = "rgb(" + Math.floor(colors[i][0]*255) + "," + Math.floor(colors[i][1]*255) + "," + Math.floor(colors[i][2]*255) + ")";
	}

	visualizer = new Visualizer(context2d, document.getElementById("gl"));
	visualizer.setIndex(params["vis"]);
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

	window.onkeypress = function(event) {
		var i = (event.charCode == 48) ? 9 : event.charCode-49;	// map 0 key to 10th
		if (i >= 0 && i < tracks.length) {
			toggleEffect(i);
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

	element = document.getElementById("url");
	if (element) {
		element.onkeypress = function(event) {
			if (event.keyCode == 13) {
				loadSC();
			}
		}
	}

	element = document.getElementById("span");
	if (element && vars.useBuffer) {	// if mobile then hide
		element.style.display = "none";
	}

	element = document.getElementById("visualizer");
	if (element) {
		var texts = visualizer.texts();
		for (var i = 0; i < texts.length; ++i) {
			var option = document.createElement("option");
			option.value = i;
			option.innerHTML = texts[i];
			if (i == visualizer.index()) option.selected = true;
			element.appendChild(option);
		}

		element.onchange = function(event) {
			var index = event.target.value;
			log("visualizer(" + index + ")");
			visualizer.setIndex(index);
		}
	}

	element = document.getElementById("stems");
	if (element) {
		for (var i = 0; i < stems.length; ++i) {
			var option = document.createElement("option");
			option.value = i;
			option.innerHTML = stems[i].text;
			if (i == vars.stem) option.selected = true;
			element.appendChild(option);
		}

		element.onchange = function(event) {
			var index = event.target.value;
			loadStems(index);
		}
	}
}

function loadStems(index) {
	pauseStop(true);
	index = parseInt(index);
	if (index >= 0 && index < stems.length) {
		vars.stem = index;
		log("loadTrack(" + vars.stem + ")");
		var stemTracks = stems[vars.stem].tracks;
		for (var i = 0; i < stemTracks.length; ++i) {
			loadAudio(i, stemTracks[i].text, "audio/" + stemTracks[i].src);
			vars.nLoad++;
		}
	}
}

function loadFiles(event) {
	var files = event.target.files || event.dataTransfer.files;
	var length = files.length;
	if (length > 0) {
		pauseStop(true);
		if (length > colors.length) {
			length = colors.length;
			log("MAX " + length + " FILES");
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

function loadSC() {
	var url = document.getElementById("url").value;
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
	log("loadAudio(" + (index+1) + ")");
	if (vars.useBuffer) {
		var request = new XMLHttpRequest();
		request.open("get", src, true);
    	request.withCredentials = true;
		request.responseType = "arraybuffer";
		request.onload = function() {
			loadBuffer(index, text, request.response, play);
		}
		request.send();
	} else {
		var audio = document.createElement("audio");
		audio.crossOrigin = "anonymous";
		audio.oncanplaythrough = function() {
			if (!tracks[index]) {	// workaround for Chrome bug where this gets called on replays
				initTrack(index, text);
				tracks[index].source = audioContext.createMediaElementSource(audio);
				tracks[index].source.connect(tracks[index].lo);
				tracks[index].audio = audio;
				tracks[index].audio.onended = ended;
				if (play) playStart();
			}
		}
		audio.src = src;
	}
}

function loadBuffer(index, text, data, play) {
	log("loadBuffer(" + (index+1) + ")");
	audioContext.decodeAudioData(data, function(buffer) {
		initTrack(index, text);
		tracks[index].buffer = buffer;
		if (play) playStart();
	});
}

function initTrack(index, text) {
	log("initEffects(" + (index+1) + ")");
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
	tracks[index].x1 = (vars.width - width)/2 + vars.width * index;
	tracks[index].x2 = tracks[index].x1 + width;
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

function playStart() {
	for (var i = tracks.length-1; i >= 0; --i) {
		if (tracks[i].audio) {
			log("play(" + (i+1) + ")");
			tracks[i].audio.play();
		} else {
			tracks[i].source = audioContext.createBufferSource();
			tracks[i].source.buffer = tracks[i].buffer;
			tracks[i].source.connect(tracks[i].lo);
			tracks[i].source.onended = ended;
			tracks[i].time = audioContext.currentTime;

			if (tracks[i].source.start) {
				log("start(" + (i+1) + ")");
				tracks[i].source.start(0);
			}
			else {
				log("noteOn(" + (i+1) + ")");
				tracks[i].source.noteOn(0);
			}
		}
		tracks[i].play = true;
		vars.nPlay++;
	}
}

function pauseStop(force) {
	if (force || vars.nLoad > 0) {
		if (vars.nPlay > 0) {
			for (var i = tracks.length-1; i >= 0; --i) {
				if (tracks[i].audio) {
					log("pause(" + (i+1) + ")");
					tracks[i].audio.pause();
				}
				else if (tracks[i].source.stop) {
					log("stop(" + (i+1) + ")");
					tracks[i].source.stop(0);
				}
				else {
					log("noteOff(" + (i+1) + ")");
					tracks[i].source.noteOff(0);
				}
				tracks[i].play = false;
			}
		}
		initVars();
	}
}

function ended(event) {
	for (var i = tracks.length-1; i >= 0; --i) {
		if (tracks[i].audio == event.target || tracks[i].source == event.target) {
			log("ended(" + (i+1) + ")");
			vars.nPlay--;
			tracks[i].play = false;
			tracks[i].on = false;
			setText(i);
		}
	}

	vars.nOn = 0;
	for (var i = tracks.length-1; i >= 0; --i) {
		if (vars.nPlay < 1) {
			tracks[i].on = true;
			setText(i);
		}

		if (tracks[i].on) vars.nOn++;
	}
}

function draw(time) {
	vars.fpsCount++;
	if (time - vars.fpsTime > 984) {
		vars.fpsText = vars.fpsCount + "fps ";
		vars.fpsTime = time;
		vars.fpsCount = 0;
	}

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

	if (vars.nPlay < 1 || vars.nOn < 1) {
		drawArc(0, Math.PI*2);
	}

	var n = 0, arc = Math.PI*2 / vars.nOn;
	context2d.lineWidth = 3;

	for (var i = tracks.length-1; i >= 0; --i) {
		var track = tracks[i];
		if (track && track.play) {
			var c = (tracks.length == 1) ? colors.length-1 : i;
			var progress = track.audio ?
				track.audio.currentTime / track.audio.duration :
				(audioContext.currentTime - track.time) / track.buffer.duration;
			visualizer.draw(track.analyser, (visualizer.index() > 1) ? colors[c] : styles[c], i / tracks.length, progress);

			if (track.on) {
				context2d.strokeStyle = styles[c];
				drawArc(arc * n, arc * (n+1));
				++n;
			}
		}
	}

	for (var i = tracks.length-1; i >= 0; --i) {
		if (tracks[i]) {
			context2d.font = tracks[i].font;
			context2d.fillStyle = styles[(vars.nPlay < 1 || tracks.length == 1 || !tracks[i].play) ? colors.length-1 : i];
			context2d.fillText(tracks[i].text, tracks[i].x1, vars.textY);
		}
	}

	if (vars.nLoaded < vars.nLoad) {
		context2d.font = "bold " + vars.textHeight + "px sans-serif";;
		context2d.fillStyle = "gray";
		context2d.fillText("Loading..", canvas.width/2 - 50, canvas.height/2);
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
	if (vars.click && !vars.drag && vars.nPlay < 1) {
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
	console.log(audioContext.currentTime.toFixed(3), text);

	logs.push(text);
	vars.text = "";
	for (var i = logs.length-1; i >= 1; --i) {
		vars.text += logs[i] + " ";
	}

	context2d.font = vars.font = "10px sans-serif";
	if (context2d.measureText(vars.text).width > canvas.width) {
		logs.shift();
	} else {
		vars.text += logs[0];
	}
}
})();
if(!window.nwf){
(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
})(window,document,'script','http://www.google-analytics.com/analytics.js','ga');
ga('create', 'UA-7050108-2', 'auto');
ga('send', 'pageview');
}
