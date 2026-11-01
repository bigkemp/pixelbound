// Drawing and sound helpers for the site's screens: the game's sprites, pixel font and animation tables.
(function () {
"use strict";
var PB = window.PB, sheets = {};
function sheet(id, def) {
	if (sheets[id]) return sheets[id];
	var img = new Image(), idx = {};
	img.src = "assets/sprites/" + id + ".png";
	def.frames.forEach(function (n, i) { idx[n] = i; });
	return (sheets[id] = { img: img, w: def.w, h: def.h, ax: def.ax === undefined ? def.w >> 1 : def.ax, ay: def.ay === undefined ? def.h - 1 : def.ay, idx: idx });
}
function text(ctx, str, x, y, color, scale, center) {
	scale = scale || 1; str = String(str).toUpperCase();
	if (center) x -= Math.round((str.length * 6 - 1) * scale / 2);
	ctx.fillStyle = color || "#fff";
	for (var n = 0; n < str.length; n++) {
		var g = PB.glyphs[str[n]];
		if (!g) continue;
		for (var r = 0; r < 7; r++) for (var c = 0; c < 5; c++)
			if (g[r][c] === "#") ctx.fillRect(Math.round(x + (n * 6 + c) * scale), Math.round(y + r * scale), scale, scale);
	}
}
function animLen(a) { return a.reduce(function (s, f) { return s + f[1]; }, 0); }
function animFrame(a, t) { for (var i = 0; i < a.length; i++) { if (t < a[i][1]) return a[i][0]; t -= a[i][1]; } return a[a.length - 1][0]; }

// Sound stays off until asked for: a website shouldn't start making noise on a phone by itself.
var soundOn = false, audioCtx = null, buffers = {}, music = null;
function loadSound(name) {
	if (buffers[name] || !audioCtx) return;
	buffers[name] = "loading";
	fetch("assets/sfx/" + name + ".wav").then(function (r) { return r.arrayBuffer(); }).then(function (b) { return audioCtx.decodeAudioData(b); })
		.then(function (d) { buffers[name] = d; }).catch(function () { buffers[name] = null; });
}
function sfx(name, volume) {
	if (!soundOn || !audioCtx) return;
	var b = buffers[name];
	if (!b || b === "loading") { loadSound(name); return; }
	var src = audioCtx.createBufferSource(), g = audioCtx.createGain();
	g.gain.value = volume || 0.5;
	src.buffer = b; src.connect(g); g.connect(audioCtx.destination); src.start();
}
function setSound(on) {
	soundOn = on;
	if (on && !audioCtx) {
		var AC = window.AudioContext || window.webkitAudioContext;
		if (AC) { audioCtx = new AC(); ["ui", "select"].forEach(loadSound); }
	}
	if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
	if (!music) { music = new Audio("assets/sfx/menu.wav"); music.loop = true; music.volume = 0.25; }
	updateMusic();
}
// The trailer brings its own sound, so the menu music waits while it plays.
var musicHeld = false;
function updateMusic() {
	if (!music) return;
	if (soundOn && !musicHeld) { var p = music.play(); if (p && p.catch) p.catch(function () {}); } else music.pause();
}
function holdMusic(v) { musicHeld = v; updateMusic(); }
window.Kit = { animFrame: animFrame, animLen: animLen, sheet: sheet, classSheet: function (id) { return sheet(id, PB.classes[id]); }, text: text, sfx: sfx, setSound: setSound, holdMusic: holdMusic, sound: function () { return soundOn; } };
})();
