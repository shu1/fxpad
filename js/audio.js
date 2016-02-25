// DJ effects pad 2011 by Shuichi Aizawa
"use strict";

function loadAudio(index, text, src, play) {
	log("loadAudio(" + (index+1) + ")");
	if (vars.useBuffer && src.indexOf("soundcloud") < 0) {
		var request = new XMLHttpRequest();
		request.open("get", src, true);
		request.responseType = "arraybuffer";
    	request.withCredentials = true;
		request.onload = function() {
			loadBuffer(index, text, request.response, play);
		}
		request.onerror = function(e) {
			console.log(e);
			log("loadBufferError(" + (index+1) + ")");
		}
		request.send();
	} else {
		var audio = new Audio();	// document.createElement("audio");	// Firefox doesn't like createElement("audio")
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
		audio.onerror = function(e) {
			console.log(e);
			log("loadAudioError(" + (index+1) + ")");
		}
		audio.src = src;
//		audio.load();	// necessary?
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
	setFont(true);
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
			log("end(" + (i+1) + ")");
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
