"use strict";
(function() {
var canvas, context2d, audioContext, filters=[], texts=[];

var vars = {
	textHeight:18,
	nLoaded:0,
	time:0
}

window.onload = function() {
	if (window.AudioContext) {
		audioContext = new AudioContext();
	}
	else if (window.webkitAudioContext) {
		audioContext = new webkitAudioContext();
		if (navigator.userAgent.indexOf("Mobile") >= 0) {
			vars.buffer = true;
		}
	}

	if (typeof stems != "undefined") {
		vars.stems = stems;
		for (var i = 0; i < vars.stems.length; ++i) {
			loadAudio(i, vars.stems[i].file);
		}
	}

	canvas = document.getElementById("canvas");
	context2d = canvas.getContext("2d");
	requestAnimationFrame(draw);

	canvas.ontouchstart = mouseDown;
	canvas.ontouchmove = mouseMove;
	window.ontouchend = mouseUp;
	canvas.onmousedown = mouseDown;
	canvas.onmousemove = mouseMove;
	window.onmouseup = mouseUp;
	window.onkeypress = keyPress;

	var url = document.getElementById("url");
	if (url) {
		url.onkeypress = function(event) {
			if (event.keyCode == 13) {
				loadSC();
			}
		}
	}
}

function loadSC() {
	var url = document.getElementById("url").value;
	SC.get('/resolve', {url:url}, function(track) {
		if (track.stream_url) {
			loadAudio(vars.nLoaded, track.stream_url + "?client_id=" + SC.options.client_id, true);
		}
	});
}

function loadAudio(index, src, play) {
	if (vars.buffer) {
		var request = new XMLHttpRequest();
		request.open("get", src, true);
		request.responseType = "arraybuffer";
		request.onload = function() {
			var source = audioContext.createBufferSource();
			source.buffer = audioContext.createBuffer(request.response, false);
			setupFilter(index, source);
			filters[index].source = source;
		}
    	request.withCredentials = true;
		request.send();
	} else {
		var audio = document.createElement("audio");
		audio.oncanplay = function() {
			var source = audioContext.createMediaElementSource(audio);
			setupFilter(index, source);
			filters[index].audio = audio;
			if (play) playStart();
		}
		audio.crossOrigin = "anonymous";
		audio.src = src;
	}
}

function setupFilter(index, source) {
	var lo = audioContext.createBiquadFilter();
	lo.type = "lowpass";
	lo.frequency.value = audioContext.sampleRate/2;

	var hi = audioContext.createBiquadFilter();
	hi.type = "highpass";
	hi.frequency.value = 10;

	source.connect(lo);
	lo.connect(hi);
	hi.connect(audioContext.destination);

	filters[index] = {on:true, x:0.5, y:0.5, lo:lo, hi:hi};
	vars.nLoaded++;
	if (vars.stems) setFilter(index, true);
	requestAnimationFrame(draw);
}

function setFilter(index, value) {
	filters[index].on = value;

	var cellWidth = canvas.width / vars.stems.length;
	var font = context2d.font = (value ? "bold " : "") + vars.textHeight + "pt sans-serif";
	var width = context2d.measureText(vars.stems[index].name).width;
	var x = (cellWidth - width)/2 + cellWidth*index;
	texts[index] = {font:font, x:x, x2:x+width};

	vars.nOn = 0;
	for (var i = filters.length-1; i >= 0; --i) {
		if (filters[i] && filters[i].on) {
			vars.nOn++;
		}
	}
}

function playStart() {
	for (var i = filters.length-1; i >= 0; --i) {
		if (filters[i].audio) {
			filters[i].audio.play();
		}
		else if (filters[i].source) {
			filters[i].source.start(0);
		}
		vars.playing = true;
	}

	if (vars.playing) requestAnimationFrame(draw);
}

function draw(time) {
	if (time != vars.time) {
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

		if (vars.playing) {
			var n = 0, arc = Math.PI*2 / vars.nOn;
			context2d.lineWidth = 2;

			for (var i = filters.length-1; i >= 0; --i) {
				context2d.strokeStyle = vars.stems ? vars.stems[i].color : "darkgray";
				if (vars.stems && filters[i].on) {
					drawArc(arc * n, arc * (n+1));
					++n;
				} else {
					drawArc(0, Math.PI*2);
				}
			}
		}

		if (vars.stems) {
			var y = canvas.height-2;
			for (var i = texts.length-1; i >= 0; --i) {
				if (texts[i]) {
					context2d.fillStyle = vars.stems[i].color;
					context2d.font = texts[i].font;
					context2d.fillText(vars.stems[i].name, texts[i].x, y);
				}
			}
		}
	}
	vars.time = time;

	function drawArc(angle1, angle2) {
		context2d.beginPath();
		context2d.arc(filters[i].x * canvas.width, filters[i].y * canvas.height, 20, angle1, angle2);
		context2d.stroke();
	}
}

function doFilters(x, y) {
	var nyquist = audioContext.sampleRate / 2;
	var nOctaves = Math.log(nyquist / 40) / Math.LN2;
	var res = Math.abs(y - 0.5) * 2;	// map 0.5 to 0

	var lo = 0.99, hi = 0.01;	// not max to prevent audio deterioration
	if (x < 0.5) {	// left half is low pass
		lo = x * 2 * 0.8 + 0.2; // map 0 ~ 0.5 to 0.2 ~ 1
	}
	else if (x > 0.5) {	// right half is high pass
		hi = (x - 0.5) * 2 * 0.8;	// map 0.5 ~ 1 to 0 ~ 0.8
	}

	for (var i = filters.length-1; i >= 0; --i) {
		if (filters[i].on) {
			filters[i].lo.frequency.value = nyquist * Math.pow(2, nOctaves * (lo - 1));
			filters[i].lo.Q.value = res * 30;

			filters[i].hi.frequency.value = nyquist * Math.pow(2, nOctaves * (hi - 1));
			filters[i].hi.Q.value = res * 30;

			filters[i].x = x;
			filters[i].y = y;
		}
	}
}

function keyPress(event) {
	var i = event.keyCode-49;
	if (i >= 0 && i <= filters.length-1) {
		setFilter(i, !filters[i].on);
		requestAnimationFrame(draw);
	}
}

function mouseDown(event) {
	if (!vars.stems && !vars.playing) {
		loadSC();
	}

	vars.click = true;
	mouseXY(event);

	if (vars.y > canvas.height - vars.textHeight) {
		for (var i = texts.length-1; i >= 0; --i) {
			if (vars.x > texts[i].x && vars.x < texts[i].x2) {
				setFilter(i, !filters[i].on);
				vars.drag = true;
			}
		}
	}

	if (!vars.drag) {
		doFilters(vars.x / canvas.width, vars.y / canvas.height);
	}
	requestAnimationFrame(draw);
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
			doFilters(vars.x / canvas.width, vars.y / canvas.height);
			requestAnimationFrame(draw);
		}
		event.preventDefault();
	}
}

function mouseUp(event) {
	if (!vars.playing && event.target == canvas && (!vars.stems || vars.nLoaded == vars.stems.length)) {
		playStart();
	}

	vars.click = false;
	vars.drag = false;
}
})();
(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
})(window,document,'script','http://www.google-analytics.com/analytics.js','ga');
ga('create', 'UA-7050108-2', 'auto');
ga('send', 'pageview');
