"use strict";
(function() {
var canvas, context2d, audioContext, filters=[], texts=[];

var vars = {
	textHeight:18,
	nLoaded:0,
	time:0
}

var stems = [
	{name:"Music", file:"music.wav", color:"red"},
	{name:"Vocals", file:"vocals.wav", color:"green"},
	{name:"BG Vocals", file:"bgvocals.wav", color:"blue"}
]

window.onload = function() {
	if (stems) {
		for (var i = 0; i < stems.length; ++i) {
			loadAudio(i, stems[i].file);
		}
	}

	canvas = document.getElementById("canvas");
	context2d = canvas.getContext("2d");

	canvas.addEventListener("touchstart", mouseDown);
	canvas.addEventListener("touchmove", mouseMove);
	window.addEventListener("touchend", mouseUp);
	canvas.addEventListener("mousedown", mouseDown);
	canvas.addEventListener("mousemove", mouseMove);
	window.addEventListener("mouseup", mouseUp);
	window.addEventListener("keydown", keyDown);

	requestAnimationFrame(draw);

	function loadAudio(index, src) {
		if (window.AudioContext) {
			audioContext = audioContext || new AudioContext();
			var audio = document.createElement("audio");
			audio.onloadedmetadata = function(event) {
				var source = audioContext.createMediaElementSource(event.target);
				setupFilter(index, source);
				filters[index].audio = event.target;
			}
			audio.src = src;
		}
		else if (window.webkitAudioContext) {
			audioContext = audioContext || new webkitAudioContext();
			var request = new XMLHttpRequest();
			request.open("get", src, true);
			request.responseType = "arraybuffer";
			request.onload = function() {
				var source = audioContext.createBufferSource();
				source.buffer = audioContext.createBuffer(request.response, false);
				setupFilter(index, source);
				filters[index].source = source;
			}
			request.send();
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

		filters[index] = {x:0.5, y:0.5, lo:lo, hi:hi};
		vars.nLoaded++;
		if (stems) setFilter(index, true);
		requestAnimationFrame(draw);
	}
}

function setFilter(index, value) {
	filters[index].on = value;

	var cellWidth = canvas.width / stems.length;
	var font = context2d.font = (value ? "bold " : "") + vars.textHeight + "pt sans-serif";
	var width = context2d.measureText(stems[index].name).width;
	var x = (cellWidth - width)/2 + cellWidth*index;
	texts[index] = {font:font, x:x, x2:x+width};

	vars.nOn = 0;
	for (var i = filters.length-1; i >= 0; --i) {
		if (filters[i] && filters[i].on) {
			vars.nOn++;
		}
	}
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

		if (vars.play) {
			var n = 0, arc = Math.PI*2 / vars.nOn;
			context2d.lineWidth = 2;

			for (var i = filters.length-1; i >= 0; --i) {
				context2d.strokeStyle = stems ? stems[i].color : "darkgray";
				if (filters[i].on) {
					++n;
					drawArc(arc * n, arc * (n+1));
				} else {
					drawArc(0, Math.PI*2);
				}
			}
		}

		if (stems) {
			var y = canvas.height-2;
			for (var i = texts.length-1; i >= 0; --i) {
				if (texts[i]) {
					context2d.fillStyle = stems[i].color;
					context2d.font = texts[i].font;
					context2d.fillText(stems[i].name, texts[i].x, y);
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

function keyDown(event) {
	var i = event.keyCode-49;
	if (i >= 0 && i <= filters.length-1) {
		setFilter(i, !filters[i].on);
		requestAnimationFrame(draw);
	}
}

function mouseDown(event) {
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

	if (!vars.drag && audioContext) {
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
		if (!vars.drag && audioContext) {
			mouseXY(event);
			doFilters(vars.x / canvas.width, vars.y / canvas.height);
			requestAnimationFrame(draw);
		}
		event.preventDefault();
	}
}

function mouseUp(event) {
	if (!vars.play && event.target == canvas && (!stems || vars.nLoaded == stems.length)) {
		for (var i = filters.length-1; i >= 0; --i) {
			if (window.AudioContext) {
				filters[i].audio.play();
			} else {
				filters[i].source.start(0);
			}
			vars.play = true;
		}
		if (vars.play) requestAnimationFrame(draw);
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
