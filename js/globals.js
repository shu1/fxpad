// DJ effects pad 2011 by Shuichi Aizawa
"use strict";

var canvas, context2d, audioContext, visualizer, vars={}, styles=[], tracks=[], logs=[];

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

var stems = [{	// first is intentionally blank
},{
	type: "40vbr44he.m4a",
	tracks: [
		{text:"Music", src:"Viva-Music"},
		{text:"Vocals", src:"Viva-Vocals"},
		{text:"Chorus", src:"Viva-Chorus"},
	]
},{
	type: "80vbr44he.m4a",
	tracks: [
		{text:"Bass", src:"Analog-Bass"},
		{text:"Guitar/Piano", src:"Analog-GuitarPiano"},
		{text:"Drums", src:"Analog-Drums"},
		{text:"Vocals", src:"Analog-Vocals"},
	]
},{
	type: "40vbr44he.m4a",
	tracks: [
		{text:"Vocals", src:"Dont-Vocals"},
		{text:"Piano", src:"Dont-Piano"},
		{text:"Bass", src:"Dont-Bass"},
		{text:"Chorus", src:"Dont-Chorus"},
		{text:"Drums", src:"Dont-Drums"},
		{text:"Guitar", src:"Dont-Guitar"},
	]
},{
	type: "40vbr44he.m4a",
	tracks: [
		{text:"Piano Harp", src:"FJ-PianoHarp"},
		{text:"Strings Brass", src:"FJ-StringsBrass"},
		{text:"FX Original", src:"FJ-FXOriginal"},
		{text:"Synths", src:"FJ-Synths"},
		{text:"FX Adds Rises Hits", src:"FJ-FXAddsRisesHits"},
		{text:"Perc Electronic", src:"FJ-PercElectronic"},
		{text:"Bass", src:"FJ-Bass"},
		{text:"Perc Orchestral", src:"FJ-PercOrchestral"},
	]
}]
