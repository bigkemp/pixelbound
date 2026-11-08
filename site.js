// The whole site as one screen, like the game: one canvas, one loop, one input handler, and screens
// you move between. Landscape is the game's own 480x272; a phone held upright gets a 272-wide screen
// with its own layouts, so the text stays readable and everything can be tapped.
(function () {
"use strict";
var PB = window.PB, Kit = window.Kit, DL = window.PB_DOWNLOADS;
var canvas = document.getElementById("screen"), c = canvas.getContext("2d"), say = document.getElementById("say"), video = document.getElementById("trailer"), clip = document.getElementById("clip");
var W = 480, H = 272, portrait = false, touch = navigator.maxTouchPoints > 0 || matchMedia("(pointer:coarse)").matches;
var INK = "#0c0a09", PANEL = "#14100e", LINE = "#7a1a1a", GOLD = "#f0c14a", PALE = "#fff0a0", MUTE = "#d8b080", PAPER = "#e7d7b1", BROWN = "#2c1c10", SEAL = "#8a1a1a", GROUND = "#1a0609";
var text = Kit.text, sfx = Kit.sfx;

// ---- Art -------------------------------------------------------------------------------------
var images = {}, pending = 0, loaded = 0;
function img(path) {
	if (images[path]) return images[path];
	var i = new Image(); pending++;
	i.onload = i.onerror = function () { loaded++; };
	i.src = "assets/" + path + ".png";
	return (images[path] = i);
}
["sky", "spires_far", "spires", "clouds_far", "clouds_near", "fog_back", "fog_front", "body", "hand_left", "hand_right", "hand_left_glow", "hand_right_glow", "globe", "globe_clouds", "knight_aura", "logo_small", "logo_crop"].forEach(function (n) { img("title/" + n); });
img("world/world");
var SHOTS = [
	["title", "THE TITLE SCREEN"], ["windmill", "WINDMILL HILL: THE SAILS CARRY PLATFORMS"], ["galleon", "STORM GALLEON, AND THE HAMMER CYCLONE"],
	["select", "CLASS SELECT"], ["geode", "GEODE HEART: CRYSTALS BOUNCE ARROWS"], ["cove", "SHIPWRECK COVE AT SUNSET"],
	["story_knight", "THE CROWNED KNIGHT GLOATS ON THE WORLD MAP"], ["pagoda", "DROWNED PAGODA, OVER THE DEEP SEA"], ["forge", "EMBER FORGE: THE LAVA RISES NOW AND THEN"],
	["maps", "THE MAP SELECT"], ["nave", "BELL NAVE: A CHAPEL OVER A HIDDEN CRYPT"], ["campaign", "EVERY TOWER IS A STAIR OF FLOORS"],
	["airlift", "A BOSS FALLS AND THE GARGOYLE TAKES STATIC"], ["shaft", "DEEP SHAFT: NO FLOOR, NO CEILING"], ["isles", "GLOW SPONGE CAVERNS IN THE CAMPAIGN"],
	["court", "ASHEN COURT: IT STARTS HERE"], ["temple", "TEMPLE STEPS"], ["campaign_floor", "MONSTERS CLIMB OUT OF COFFINS"]
];
SHOTS.forEach(function (s) { img("shots/" + s[0]); });
function ready(i) { return i && i.complete && i.naturalWidth; }
function drawImg(path, x, y, a) { var i = images[path]; if (ready(i)) { if (a !== undefined) c.globalAlpha = a; c.drawImage(i, x, y); c.globalAlpha = 1; } }
PB.order.forEach(function (id) { Kit.classSheet(id); });
var cameo = Kit.sheet("cameo", PB.cameo), bunny = Kit.sheet("static", PB.static);
bunny.ax = 14; bunny.ay = 25; cameo.ax = 14; cameo.ay = 21;
function spr(s, frame, x, feet, scale, flip) {
	var i = s.idx[frame]; if (i === undefined) i = 0;
	if (!ready(s.img)) return;
	c.save(); c.translate(Math.round(x), Math.round(feet)); c.scale(flip ? -scale : scale, scale);
	c.drawImage(s.img, i * s.w, 0, s.w, s.h, -s.ax, -s.ay, s.w, s.h); c.restore();
}

// ---- Drawing kit, in the look of the game's own menus ----------------------------------------
function panel(x, y, w, h) {
	c.fillStyle = INK; c.fillRect(x, y, w, h);
	c.fillStyle = LINE; c.fillRect(x + 1, y + 1, w - 2, h - 2);
	c.fillStyle = PANEL; c.fillRect(x + 2, y + 2, w - 4, h - 4);
	c.fillStyle = "rgba(240,193,74,.5)"; c.fillRect(x + 4, y + 4, w - 8, 1); c.fillRect(x + 4, y + h - 5, w - 8, 1); c.fillRect(x + 4, y + 4, 1, h - 8); c.fillRect(x + w - 5, y + 4, 1, h - 8);
}
function tab(str) {
	var w = str.length * 6 + 16, x = (W - w) >> 1;
	c.fillStyle = INK; c.fillRect(x - 1, 4, w + 2, 15); c.fillStyle = SEAL; c.fillRect(x, 5, w, 13); c.fillStyle = "#c43a3a"; c.fillRect(x, 5, w, 1);
	text(c, str, W >> 1, 8, PALE, 1, true);
}
// The bottom strip: key hints at a keyboard. Touch screens tap the buttons instead.
function hints(list) {
	if (touch) return;
	var total = 0; list.forEach(function (h) { total += h[0].length * 6 + 6 + h[1].length * 6 + 12; });
	var x = (W - total + 12) >> 1, y = H - 13;
	c.fillStyle = INK; c.fillRect(0, y - 3, W, 16);
	list.forEach(function (h) {
		var kw = h[0].length * 6 + 3;
		c.fillStyle = "#3a3148"; c.fillRect(x - 2, y - 1, kw, 9); text(c, h[0], x, y, PALE); x += kw + 2;
		text(c, h[1], x, y, MUTE); x += h[1].length * 6 + 12;
	});
}
function wrap(str, max) {
	var out = [], line = "";
	str.toUpperCase().split(" ").forEach(function (w) { if ((line + " " + w).trim().length > max) { out.push(line); line = w; } else line = (line + " " + w).trim(); });
	if (line) out.push(line);
	return out;
}
function para(str, x, y, max, color, gap) { var l = wrap(str, max); l.forEach(function (s, i) { text(c, s, x, y + i * (gap || 9), color || PAPER); }); return y + l.length * (gap || 9); }
function slant(x, y, w, h, lean, color) {
	c.fillStyle = color;
	for (var r = 0; r < h; r++) c.fillRect(x + Math.round(lean * (1 - r / h)), y + r, w - lean, 1);
}
var hitList = [];
function hit(x, y, w, h, onDo, onHover) { hitList.push({ x: x, y: y, w: w, h: h, onDo: onDo, onHover: onHover }); }
function button(x, y, w, h, label, on, onDo, onHover) {
	c.fillStyle = INK; c.fillRect(x - 1, y - 1, w + 2, h + 2);
	c.fillStyle = on ? "#5a1018" : "#2a0d12"; c.fillRect(x, y, w, h);
	c.fillStyle = on ? GOLD : LINE; c.fillRect(x, y, w, 1); c.fillRect(x, y + h - 1, w, 1); c.fillRect(x, y, 1, h); c.fillRect(x + w - 1, y, 1, h);
	text(c, label, x + (w >> 1), y + ((h - 7) >> 1), on ? PALE : MUTE, 1, true);
	hit(x, y, w, h, onDo, onHover);
}
function backButton() { button(4, 4, 40, touch ? 18 : 14, "BACK", false, function () { go("title"); }); }

// ---- Screens ---------------------------------------------------------------------------------
var screen = "load", t = 0, idle = 0, screens = {}, ticks = 0;
function go(name, keepHistory) {
	if (screen === "watch" && name !== "watch") { video.pause(); video.hidden = true; canvas.classList.remove("clear"); Kit.holdMusic(false); }
	if (screen === "heroes" && name !== "heroes") { clip.pause(); clip.hidden = true; canvas.classList.remove("clear"); }
	screen = name; t = 0; idle = 0;
	if (screens[name].enter) screens[name].enter();
	if (!keepHistory && name !== "load") { try { history.pushState(null, "", "#" + name); } catch (e) {} }
	announce();
}
function announce() { var s = screens[screen]; if (s.speak) say.textContent = s.speak(); }
addEventListener("popstate", function () { var want = (location.hash || "").slice(1); if (screens[want] && want !== "load") go(want, true); else go("title", true); });

// Title
var MENU = [["WATCH THE TRAILER", "watch"], ["HEROES", "heroes"], ["THE STORY", "story"], ["GALLERY", "gallery"], ["DOWNLOAD", "download"]], menuAt = 0;
function strip(path, offset, top, dx) {
	var i = images[path]; if (!ready(i)) return;
	var x = -(((offset % i.width) + i.width) % i.width);
	c.drawImage(i, x + dx, top); c.drawImage(i, x + dx + i.width, top);
}
// The knight's plume and sash, drawn as in the game (scripts/ui/title_screen.gd). Off for now (the user
// did not like how they looked on the site); titleArt no longer calls drawPlume or drawStrands. Each strand a
// tapering ribbon along a curve that ripples in the wind, inked, with a dark fold and a lit streak.
// Strand: [first control, second control, tip, width, phase, base, lit, taper?], relative to its root.
var PLUME_ROOT = [258, 50], PLUME_INK = "#0a0608", STRAND_STEPS = 22;
var PLUME_STRANDS = [
	[[30, -22], [90, 10], [160, 46], 24, 2.1, "#8a0c1c", "#c0202e"],
	[[34, -26], [100, -14], [176, 18], 24, 1.2, "#b8142a", "#f0404a"],
	[[24, -10], [70, 30], [130, 74], 20, 3.0, "#a01024", "#e03440"],
	[[30, -18], [88, 4], [160, 36], 26, 0.0, "#d81c30", "#ff6a6a"],
	[[24, -26], [70, -30], [124, -8], 16, 4.2, "#e83040", "#ff9a8a"]];
var RIBBON_ROOT = [114, 158], RIBBON_TAILS = [
	[[-14, 6], [-30, 26], [-36, 64], 12, 0.6, "#8a0c1c", "#c0202e", 0.5],
	[[-10, 4], [-22, 20], [-24, 54], 14, 2.0, "#b8142a", "#f0404a", 0.45]];
function darken(hex, k) {
	var n = parseInt(hex.slice(1), 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
	return "rgb(" + Math.round(r * (1 - k)) + "," + Math.round(g * (1 - k)) + "," + Math.round(b * (1 - k)) + ")";
}
function strandRest(s) {
	if (s.rest) return s.rest;
	var rest = [], swing = [], half = [], across = [], along = [], taper = s.length > 7 ? s[7] : 0.9, i;
	for (i = 0; i <= STRAND_STEPS; i++) {
		var q = i / STRAND_STEPS, u = 1 - q, a = 3 * u * u * q, b = 3 * u * q * q, d = q * q * q;
		rest.push([s[0][0] * a + s[1][0] * b + s[2][0] * d, s[0][1] * a + s[1][1] * b + s[2][1] * d]);
		swing.push(6 * Math.pow(q, 1.3));
		half.push(s[3] * 0.5 * (1 - taper * Math.pow(q, 1.4)) + 0.5);
	}
	for (i = 0; i <= STRAND_STEPS; i++) {
		var p = rest[Math.min(i + 1, STRAND_STEPS)], m = rest[Math.max(i - 1, 0)], dx = p[0] - m[0], dy = p[1] - m[1], l = Math.hypot(dx, dy) || 1;
		along.push([dx / l, dy / l]); across.push([-dy / l, dx / l]);
	}
	return (s.rest = { rest: rest, swing: swing, half: half, across: across, along: along });
}
function strandShape(s) {
	var r = strandRest(s), centre = [], ink = [[], []], body = [[], []], fold = [], streak = [], i;
	for (i = 0; i <= STRAND_STEPS; i++) {
		var q = i / STRAND_STEPS, wave = Math.sin(ticks * 0.09 + s[4] - q * 5.5) * r.swing[i], drift = Math.sin(ticks * 0.05 + s[4] + q * 3) * 1.5 * q;
		centre.push([r.rest[i][0] + r.across[i][0] * wave + r.along[i][0] * drift, r.rest[i][1] + r.across[i][1] * wave + r.along[i][1] * drift]);
	}
	for (i = 0; i <= STRAND_STEPS; i++) {
		var p = centre[Math.min(i + 1, STRAND_STEPS)], m = centre[Math.max(i - 1, 0)], dx = p[0] - m[0], dy = p[1] - m[1], l = Math.hypot(dx, dy) || 1;
		var nx = -dy / l, ny = dx / l, h = r.half[i], ce = centre[i];
		ink[0].push([ce[0] + nx * (h + 1), ce[1] + ny * (h + 1)]); ink[1].push([ce[0] - nx * (h + 1), ce[1] - ny * (h + 1)]);
		body[0].push([ce[0] + nx * h, ce[1] + ny * h]); body[1].push([ce[0] - nx * h, ce[1] - ny * h]);
	}
	for (i = 1; i < Math.floor(STRAND_STEPS * 0.9); i++) {
		fold.push([Math.round(centre[i][0] + (body[1][i][0] - centre[i][0]) * 0.6), Math.round(centre[i][1] + (body[1][i][1] - centre[i][1]) * 0.6)]);
		streak.push([Math.round(centre[i][0] + (body[0][i][0] - centre[i][0]) * 0.45), Math.round(centre[i][1] + (body[0][i][1] - centre[i][1]) * 0.45)]);
	}
	return { ink: ink, body: body, fold: fold, streak: streak, base: s[5], lit: s[6] };
}
// One quad per step, as the game's triangle strip, so a strand that curls over itself still fills.
function strandFill(sides, x, y, color) {
	c.fillStyle = color; c.beginPath();
	for (var i = 0; i < STRAND_STEPS; i++) {
		var a = sides[0][i], b = sides[0][i + 1], d = sides[1][i + 1], e = sides[1][i];
		c.moveTo(x + a[0], y + a[1]); c.lineTo(x + b[0], y + b[1]); c.lineTo(x + d[0], y + d[1]); c.lineTo(x + e[0], y + e[1]); c.closePath();
	}
	c.fill();
}
function strandLine(pts, x, y, color) {
	c.strokeStyle = color; c.lineWidth = 2; c.lineJoin = "round"; c.beginPath();
	pts.forEach(function (p, i) { if (i) c.lineTo(x + p[0], y + p[1]); else c.moveTo(x + p[0], y + p[1]); });
	c.stroke();
}
function drawStrands(list, root, sx, sy, dx, by) {
	var shapes = list.map(strandShape), x = root[0] + dx, y = root[1] + by;
	shapes.forEach(function (s) { strandFill(s.ink, x + sx, y + sy, "rgba(13,0,5,0.45)"); });
	shapes.forEach(function (s) {
		strandFill(s.ink, x, y, PLUME_INK); strandFill(s.body, x, y, s.base);
		strandLine(s.fold, x, y, darken(s.base, 0.45)); strandLine(s.streak, x, y, s.lit);
	});
}
function disc(x, y, r, color) { c.fillStyle = color; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); }
function drawPlume(dx, by) {
	drawStrands(PLUME_STRANDS, PLUME_ROOT, 2, 3, dx, by);
	var x = PLUME_ROOT[0] + dx, y = PLUME_ROOT[1] + by;
	disc(x, y - 2, 10, PLUME_INK); disc(x, y - 2, 9, "#b82826"); disc(x - 3, y - 5, 4, "#e04a36");
}
var KNIGHT_DOWN = 14;
function titleArt(dx) {
	var f = Math.floor(ticks / 6) % 128, breath = Math.floor(ticks / 40) % 4 === 2 ? 1 : 0, gl = images["title/globe"];
	drawImg("title/sky", dx, 0);
	strip("title/clouds_far", ticks / 10, 0, dx);
	drawImg("title/spires_far", dx, 0);
	strip("title/clouds_near", ticks / 4, 0, dx);
	drawImg("title/spires", dx, 0);
	c.globalAlpha = 0.25; strip("title/fog_back", ticks / 5, 168, dx); c.globalAlpha = 1;
	// the knight and his globe stand lower than in the game, so the unfinished bottom of the painting sits off screen
	breath += KNIGHT_DOWN;
	drawImg("title/knight_aura", dx, breath, 0.5);
	drawImg("title/body", dx, breath);
	if (ready(gl)) c.drawImage(gl, (f % 16) * 120, Math.floor(f / 16) * 120, 120, 120, 182 + dx, 170 + breath, 120, 120);
	drawImg("title/globe_clouds", dx + Math.round(Math.sin(ticks * 0.02) * 2), breath);
	var glow = 0.4 + 0.4 * Math.sin(ticks * 0.05);
	drawImg("title/hand_left_glow", dx, breath, glow); drawImg("title/hand_right_glow", dx, breath, glow);
	drawImg("title/hand_left", dx, breath); drawImg("title/hand_right", dx, breath);
	c.globalAlpha = 0.55; strip("title/fog_front", -ticks / 3, 212, dx); c.globalAlpha = 1;
}
function soundButton(x, y) {
	var on = Kit.sound();
	button(x, y, 64, touch ? 18 : 13, on ? "SOUND ON" : "SOUND OFF", on, function () { Kit.setSound(!Kit.sound()); });
}
// The studio logo in the title's corner, a button to the About page. Under the cursor it rocks
// up to 25 degrees left and right on its centre and PRESENTING circles it like a planet's ring, passing behind it and in front.
var pointerAt = null, logoTap = 0, logoWake = 0, RING = "PRESENTING - PRESENTING - ";
function logoTick() {
	var s = titleSpot(), over = pointerAt && pointerAt.x >= s[0] && pointerAt.y >= s[1] && pointerAt.x < s[0] + s[2] && pointerAt.y < s[1] + s[3];
	if (logoTap > 0) logoTap--;
	logoWake = Math.max(0, Math.min(1, logoWake + (over || logoTap > 0 ? 0.08 : -0.06)));
}
function titleLogo() {
	var s = titleSpot();
	hit(s[0], s[1], s[2], s[3], function () { go("about"); });
	var e = logoWake * logoWake * (3 - 2 * logoWake), turn = Math.sin(ticks * 0.05) * (25 * Math.PI / 180) * e;
	var cx = s[0] + (s[2] >> 1), cy = s[1] + (s[3] >> 1) + 4, rx = Math.min(44, W - cx - 4), ry = 10, tilt = -0.18;
	var letters = [];
	if (e > 0) RING.split("").forEach(function (ch, i) {
		var a = ticks * 0.02 - i * (Math.PI * 2 / RING.length), ex = Math.cos(a) * rx, ey = Math.sin(a) * ry;
		letters.push({ ch: ch, x: cx + ex * Math.cos(tilt) - ey * Math.sin(tilt), y: cy + ex * Math.sin(tilt) + ey * Math.cos(tilt), front: Math.sin(a) > 0, depth: Math.sin(a) });
	});
	function ringHalf(front) {
		letters.forEach(function (l) {
			if (l.front !== front || l.ch === " ") return;
			var x = Math.round(l.x - 2), y = Math.round(l.y - 3);
			c.globalAlpha = e * (front ? 1 : 0.55 + 0.25 * (1 + l.depth));
			text(c, l.ch, x + 1, y + 1, INK); text(c, l.ch, x, y, front ? PALE : MUTE);
		});
		c.globalAlpha = 1;
	}
	ringHalf(false);
	if (ready(LOGO)) { c.save(); c.translate(s[0] + s[2] / 2, s[1] + s[3] / 2); c.rotate(turn); c.drawImage(LOGO, -s[2] / 2, -s[3] / 2); c.restore(); } // rocks flat on its centre, 25 degrees each way
	ringHalf(true);
}
screens.title = {
	speak: function () { return "Title screen. " + MENU[menuAt][0] + " selected."; },
	input: function (a) {
		if (a === "up" || a === "down") { menuAt = (menuAt + (a === "down" ? 1 : MENU.length - 1)) % MENU.length; sfx("ui", 0.4); announce(); }
		if (a === "confirm") { sfx("select"); go(MENU[menuAt][1]); }
	},
	tick: function () { if (!touch && ++idle > 1500) { idleOpened = true; go("watch"); } },
	draw: function () {
		if (portrait) {
			c.fillStyle = GROUND; c.fillRect(0, 0, W, H);
			titleArt(-104);
			c.fillStyle = "rgba(12,10,9,.5)"; c.fillRect(0, 0, W, 66);
			drawImg("title/logo_crop", (W - 258) >> 1, 6);
			if (!logoFly) titleLogo();
			text(c, "THE LAST PIXEL STANDING", W >> 1, 56, PALE, 1, true);
			var rowH = Math.min(31, Math.floor((H - 272 - 22) / MENU.length));
			MENU.forEach(function (m, i) {
				button(16, 276 + i * rowH, W - 32, rowH - 4, m[0], i === menuAt, function () { menuAt = i; go(m[1]); });
			});
			soundButton(4, H - 19);
			text(c, "V" + PB.version + " KOMPA POMPA", W - 4 - (PB.version.length + 13) * 6, H - 14, MUTE);
			return;
		}
		titleArt(0);
		drawImg("title/logo_small", 0, 0);
		if (!logoFly) titleLogo();
		text(c, "THE LAST PIXEL STANDING", 16, 42, PALE);
		var h = touch ? 22 : 15, gap = touch ? 25 : 18, w = 114;
		MENU.forEach(function (m, i) {
			var y = 54 + i * gap;
			button(12, y, w, h, m[0], i === menuAt, function () { menuAt = i; go(m[1]); }, function () { if (menuAt !== i) { menuAt = i; sfx("ui", 0.3); announce(); } });
		});
		text(c, "V" + PB.version + "  KOMPA POMPA", 472 - (PB.version.length + 15) * 6, 6, PAPER);
		soundButton(408, 16);
		hints([["ARROWS", "MOVE"], ["ENTER", "SELECT"], ["M", "SOUND"]]);
	}
};

// Trailer: real footage from the game. The video sits behind the canvas, which keeps a clear hole for it.
var VIDEO_W = 272, playFailed = false, seenInput = 0;
function videoBox() { return portrait ? { x: 0, y: 26, w: W, h: Math.round(W * 272 / 480) } : { x: 0, y: 0, w: W, h: H }; }
function placeVideo() {
	var r = canvas.getBoundingClientRect(), b = videoBox(), k = r.width / W;
	video.style.left = r.left + b.x * k + "px"; video.style.top = r.top + b.y * k + "px"; video.style.width = b.w * k + "px"; video.style.height = b.h * k + "px";
}
function togglePlay() { if (video.paused) playVideo(); else video.pause(); }
// Opened on purpose it plays with sound; a browser that refuses gets it muted rather than not at all.
function playVideo() {
	playFailed = false;
	var p = video.play();
	if (p && p.catch) p.catch(function () {
		if (!video.muted) { video.muted = true; var q = video.play(); if (q && q.catch) q.catch(function () { playFailed = true; }); } else playFailed = true;
	});
}
function trailerSound(x, y, w, h) { button(x, y, w, h, video.muted ? "SOUND OFF" : "SOUND ON", !video.muted, function () { video.muted = !video.muted; }); }
var idleOpened = false;
screens.watch = {
	enter: function () {
		if (!video.getAttribute("src")) { video.src = "assets/trailer.mp4"; }
		video.muted = idleOpened; idleOpened = false;
		Kit.holdMusic(true);
		video.hidden = false; canvas.classList.add("clear"); placeVideo(); playVideo(); seenInput = 0;
	},
	speak: function () { return "Trailer: real gameplay footage from Pixelbound, with the game's sound. Press M to mute."; },
	input: function (a) {
		seenInput = 0;
		if (a === "confirm") togglePlay();
		if (a === "left" && video.duration) video.currentTime = Math.max(0, video.currentTime - 5);
		if (a === "right" && video.duration) video.currentTime = Math.min(video.duration - 0.1, video.currentTime + 5);
		if (a === "down") go("download");
		if (a === "back") go("title");
	},
	tick: function () { seenInput++; },
	draw: function () {
		var b = videoBox();
		if (portrait) {
			c.fillStyle = GROUND; c.fillRect(0, 0, W, H);
			c.clearRect(b.x, b.y, b.w, b.h);
			tab("TRAILER");
			backButton();
			var y = b.y + b.h + 8;
			if (video.duration) { c.fillStyle = "#3a2a24"; c.fillRect(0, b.y + b.h, W, 3); c.fillStyle = GOLD; c.fillRect(0, b.y + b.h, W * video.currentTime / video.duration, 3); }
			y = para("REAL FOOTAGE FROM THE GAME. ONE HIT AND YOU'RE OUT, ON ONE SCREEN OR ONLINE, WITH UP TO FOUR PLAYERS.", 12, y, 41, PAPER, 10) + 8;
			[[PB.order.length, "CLASSES"], [PB.counts.maps, "MAPS"], [PB.counts.towers, "TOWERS"]].forEach(function (f, i) { var x = 12 + i * 86; text(c, f[0], x, y, GOLD, 2); text(c, f[1], x, y + 17, MUTE); });
			y += 36;
			button(12, y, W - 24, 30, "GET THE FREE DEMO", true, function () { go("download"); });
			button(12, y + 36, (W >> 1) - 16, 26, video.paused ? "PLAY" : "PAUSE", false, togglePlay);
			trailerSound((W >> 1) + 4, y + 36, (W >> 1) - 16, 26);
			hit(b.x, b.y, b.w, b.h, togglePlay);
			return;
		}
		c.clearRect(0, 0, W, H);
		var show = video.paused || seenInput < 240;
		hit(0, 0, W, H, function () { if (seenInput >= 240) { seenInput = 0; return; } togglePlay(); });
		if (show) {
			backButton();
			button(W - 92, 4, 88, touch ? 18 : 14, "DOWNLOAD", true, function () { go("download"); });
			trailerSound(W - 164, 4, 68, touch ? 18 : 14);
			if (video.paused) { c.fillStyle = "rgba(12,10,9,.7)"; c.fillRect(190, 120, 100, 26); text(c, playFailed ? "TAP TO PLAY" : "PAUSED", 240, 129, PALE, 1, true); }
			if (video.duration) { c.fillStyle = "rgba(12,10,9,.8)"; c.fillRect(0, H - 3, W, 3); c.fillStyle = GOLD; c.fillRect(0, H - 3, W * video.currentTime / video.duration, 3); }
			if (!touch) { c.fillStyle = "rgba(12,10,9,.8)"; c.fillRect(90, H - 15, 300, 11); text(c, "ENTER PAUSE  ARROWS SKIP  M SOUND  ESC BACK", 240, H - 13, PAPER, 1, true); }
		}
	}
};

// Heroes: real footage of each hero's combo and skill, recorded from the game, with their capabilities over it.
var heroAt = 0;
var IDLE = [["idle0", 60], ["idle1", 30], ["blink", 8], ["idle0", 40], ["idle1", 30]], RUN = [["run0", 6], ["run1", 6], ["run2", 6], ["run3", 6]], WIN = [["win0", 18], ["win1", 18]];
var COLORS = { ranger: "#2e8a34", knight: "#c8306e", dwarf: "#b05a1a", barbarian: "#c43a1a", ninja: "#6a2aa8", alchemist: "#2a8aa8", hunter: "#8a7a2a", babybot: "#3a6ad8", soldier: "#2a4aa8", samurai: "#a82a2a", fighter: "#e0801a", fencer: "#a88a2a", engineer: "#d86a1a" };
function clipBox() { return portrait ? { x: 0, y: 26, w: W, h: Math.round(W * 272 / 480) } : { x: 0, y: 0, w: 320, h: 181 }; }
function placeClip() {
	var r = canvas.getBoundingClientRect(), b = clipBox(), k = r.width / W;
	clip.style.left = r.left + b.x * k + "px"; clip.style.top = r.top + b.y * k + "px"; clip.style.width = b.w * k + "px"; clip.style.height = b.h * k + "px";
}
function showClip() {
	var src = "assets/clips/" + PB.order[heroAt] + ".mp4";
	if (clip.getAttribute("src") !== src) clip.src = src;
	clip.hidden = false; placeClip();
	var p = clip.play(); if (p && p.catch) p.catch(function () {});
}
function pickHero(i) { heroAt = (i + PB.order.length) % PB.order.length; t = 0; showClip(); announce(); }
// Names the shot on screen: each clip is the combo, then the skill from window.PB_SKILL_AT's second on.
function clipLabel(b, id, d) {
	var at = window.PB_SKILL_AT && window.PB_SKILL_AT[id];
	if (!at) return;
	var label = clip.currentTime >= at ? "SKILL: " + d.skill : "COMBO: " + d.combo;
	c.fillStyle = "rgba(12,10,9,.85)"; c.fillRect(b.x, b.y + b.h - 13, label.length * 6 + 8, 13);
	text(c, label, b.x + 4, b.y + b.h - 10, GOLD);
}
function statRows(d, x, y, w, h, on, off) {
	["speed", "power", "range"].forEach(function (k, i) {
		var ry = y + i * (h + 2); text(c, k, x, ry + ((h - 7) >> 1), PALE);
		for (var n = 0; n < 5; n++) { c.fillStyle = n < d.stats[k] ? on : off; c.fillRect(x + 40 + n * (w + 2), ry, w, h); }
	});
}
function rosterTile(rid, i, x, y, size) {
	var on = i === heroAt, rs = Kit.classSheet(rid);
	c.fillStyle = on ? GOLD : LINE; c.fillRect(x, y, size, size); c.fillStyle = on ? COLORS[rid] : "#1e090d"; c.fillRect(x + 1, y + 1, size - 2, size - 2);
	c.save(); c.beginPath(); c.rect(x + 1, y + 1, size - 2, size - 2); c.clip(); spr(rs, on ? Kit.animFrame(RUN, t % 24) : "idle0", x + (size >> 1), y + size - 4, 1); c.restore();
	hit(x, y, size, size, function () { pickHero(i); });
}
screens.heroes = {
	enter: function () { canvas.classList.add("clear"); showClip(); },
	speak: function () { var d = PB.classes[PB.order[heroAt]]; return d.name + ", " + d.title + ". Video of their combo and skill. Speed " + d.stats.speed + ", power " + d.stats.power + ", range " + d.stats.range + " out of 5. Weapon " + d.weapon + ". " + d.text + " Skill " + d.skill + ". " + d.skillText; },
	input: function (a) {
		if (a === "left" || a === "right") { pickHero(heroAt + (a === "right" ? 1 : -1)); sfx("ui", 0.4); }
		if (a === "confirm") go("download");
		if (a === "back") go("title");
	},
	draw: function () {
		var id = PB.order[heroAt], d = PB.classes[id], b = clipBox(), since = Math.min(t, 14), slam = (14 - since) * (14 - since) * 0.6 | 0, col = COLORS[id], y;
		if (portrait) {
			c.fillStyle = GROUND; c.fillRect(0, 0, W, H);
			c.clearRect(b.x, b.y, b.w, b.h);
			clipLabel(b, id, d); tab("HEROES");
			backButton();
			hit(b.x, b.y, b.w >> 1, b.h, function () { pickHero(heroAt - 1); });
			hit(b.x + (b.w >> 1), b.y, b.w >> 1, b.h, function () { pickHero(heroAt + 1); });
			y = b.y + b.h;
			c.fillStyle = col; c.fillRect(0, y, W, 3);
			text(c, d.name, 10 - slam, y + 9, PALE, 3);
			text(c, d.title, 10, y + 33, MUTE);
			statRows(d, 10, y + 45, 16, 8, col, "#3a2a24");
			var sn = skinName(id);
			text(c, sn[0], 150, y + 14, PALE);
			skinLine(id, 144 + skinBody(id), y + 74, W - 150);
			text(c, d.weapon + " / " + d.combo, 10, y + 79, GOLD);
			var ny = para(d.text, 10, y + 90, 42, PAPER);
			text(c, "SKILL " + d.skill, 10, ny + 5, GOLD);
			para(d.skillText, 10, ny + 15, 42, PAPER);
			PB.order.forEach(function (rid, i) { rosterTile(rid, i, 3 + (i % 7) * 38, H - 78 + Math.floor(i / 7) * 38, 37); });
			return;
		}
		c.fillStyle = GROUND; c.fillRect(0, 0, W, H);
		c.clearRect(b.x, b.y, b.w, b.h);
		clipLabel(b, id, d); c.fillStyle = col; c.fillRect(320, 0, 3, 181); c.fillRect(0, 181, W, 2);
		hit(b.x, b.y, b.w >> 1, b.h, function () { pickHero(heroAt - 1); });
		hit(b.x + (b.w >> 1), b.y, b.w >> 1, b.h, function () { pickHero(heroAt + 1); });
		backButton();
		text(c, d.name, 330 - slam, 10, PALE, 3);
		text(c, d.title, 330, 34, MUTE);
		statRows(d, 330, 50, 18, 9, col, "#3a2a24");
		var sn = skinName(id);
		text(c, sn[0], 330, 88, PALE); text(c, sn[1], 472 - sn[1].length * 6, 88, MUTE);
		skinLine(id, 330 + skinBody(id), 140, 144);
		button(330, 148, 142, touch ? 28 : 24, "GET THE DEMO", true, function () { go("download"); });
		text(c, d.weapon + " / " + d.combo, 8, 187, GOLD);
		y = para(d.text, 8, 196, 77, PAPER, 8);
		text(c, "SKILL " + d.skill, 8, y + 1, GOLD);
		para(d.skillText, 8 + (d.skill.length + 7) * 6, y + 1, 76 - d.skill.length - 7, PAPER, 8);
		var rosterY = H - (touch ? 39 : 52);
		PB.order.forEach(function (rid, i) { rosterTile(rid, i, ((W - PB.order.length * 36) >> 1) + i * 36, rosterY, 35); });
		hints([["LEFT/RIGHT", "HERO"], ["ENTER", "GET THE DEMO"], ["ESC", "BACK"]]);
	}
};

// Story: the Missing poster, then the knight's real prologue on the world map.
var storyAt = 0, LINES = PB.lines.prologue;
function storyNext() { if (storyAt < LINES.length) { storyAt++; t = 0; sfx("ui", 0.4); announce(); } else go("download"); }
screens.story = {
	enter: function () { storyAt = 0; },
	speak: function () { return storyAt === 0 ? "Missing: Static, a lilac angora puffball. Last seen in a gold cage under a gargoyle, heading for the Crowned Knight's death machine. Reward: her." : "The Crowned Knight: " + LINES[storyAt - 1][1]; },
	input: function (a) {
		if (a === "confirm" || a === "right") storyNext();
		if (a === "left" && storyAt > 0) { storyAt--; t = 0; announce(); }
		if (a === "back") go("title");
	},
	draw: function () {
		var i = images["world/world"], k = Math.max(1, H / 448), mid = W >> 1;
		if (ready(i)) c.drawImage(i, Math.round((768 - W / k) / 2 + Math.sin(ticks / 400) * 60 * (portrait ? 1.5 : 1)), Math.round((448 - H / k) / 2), W / k, H / k, 0, 0, W, H);
		c.fillStyle = "rgba(60,8,14,.28)"; c.fillRect(0, 0, W, H);
		hit(0, 0, W, H, storyNext);
		tab(storyAt === 0 ? "THE STORY" : "VERDANT TOWER");
		backButton();
		if (storyAt === 0) {
			var pw = 182, ph = 204, px = mid - (pw >> 1), py = portrait ? 40 : 24;
			c.fillStyle = "rgba(44,28,16,.5)"; c.fillRect(px + 6, py + 6, pw + 4, ph + 4);
			c.fillStyle = BROWN; c.fillRect(px - 2, py - 2, pw + 4, ph + 4); c.fillStyle = PAPER; c.fillRect(px, py, pw, ph);
			c.fillStyle = "#a98c5a"; for (var dx = px + 4; dx < px + pw - 4; dx += 6) { c.fillRect(dx, py + 4, 3, 1); c.fillRect(dx, py + ph - 5, 3, 1); }
			text(c, "MISSING", mid, py + 10, SEAL, 3, true);
			var fr = t % 200 < 8 ? "blink" : Math.floor(t / 50) % 2 ? "idle0" : "idle1";
			spr(bunny, fr, mid, py + 112, 3);
			text(c, "STATIC", mid, py + 118, BROWN, 2, true);
			["LILAC ANGORA PUFFBALL.", "LAST SEEN IN A GOLD CAGE,", "UNDER A GARGOYLE, BOUND FOR", "THE KNIGHT'S DEATH MACHINE."].forEach(function (l, n) { text(c, l, mid, py + 138 + n * 9, BROWN, 1, true); });
			text(c, "REWARD: HER", mid, py + 180, SEAL, 2, true);
			if (touch) text(c, "TAP FOR THE NEXT PAGE", mid, Math.min(H - 12, py + ph + 10), PALE, 1, true);
			hints([["ENTER", "NEXT"], ["ESC", "BACK"]]);
			return;
		}
		var l = LINES[storyAt - 1], emote = PB.cameo.frames.indexOf(l[0] + "0") >= 0 ? l[0] : "talk", ember = Kit.classSheet("ranger");
		var barH = portrait ? 92 : 62, barY = H - barH - (touch ? 6 : 18);
		spr(ember, Math.floor(t / 30) % 2 ? "idle0" : "idle1", portrait ? 44 : 62, barY, 3);
		spr(cameo, emote + (Math.floor(t / 8) % 2), W - (portrait ? 60 : 72), barY + 4, portrait ? 3 : 4);
		c.fillStyle = BROWN; c.fillRect(6, barY, W - 12, barH); c.fillStyle = PAPER; c.fillRect(8, barY + 2, W - 16, barH - 4);
		var nw = 18 * 6 + 10, nx = W - nw - 14; c.fillStyle = BROWN; c.fillRect(nx - 1, barY - 8, nw + 2, 13); c.fillStyle = SEAL; c.fillRect(nx, barY - 7, nw, 11); text(c, "THE CROWNED KNIGHT", nx + 5, barY - 5, PALE);
		wrap(l[1].slice(0, Math.floor(t / 1.5)), portrait ? 40 : 72).forEach(function (w, n) { text(c, w, 16, barY + 12 + n * 11, BROWN); });
		if (touch) text(c, storyAt < LINES.length ? "TAP FOR MORE" : "TAP TO GET THE DEMO", W - 16 - (storyAt < LINES.length ? 12 : 19) * 6, barY + barH - 13, SEAL);
		hints([["ENTER", storyAt < LINES.length ? "NEXT" : "GET THE DEMO"], ["LEFT", "BACK A LINE"], ["ESC", "TITLE"]]);
	}
};

// Gallery: a wall of thumbnails, then one shot at a time.
var galAt = 0, galFull = false;
function galCols() { return portrait ? 3 : 6; }
function galStep(d) { galAt = (galAt + d + SHOTS.length) % SHOTS.length; sfx("ui", 0.3); announce(); }
screens.gallery = {
	enter: function () { galFull = false; },
	speak: function () { return "Gallery. Screenshot " + (galAt + 1) + " of " + SHOTS.length + ": " + SHOTS[galAt][1]; },
	input: function (a) {
		var step = { left: -1, right: 1, up: galFull ? 0 : -galCols(), down: galFull ? 0 : galCols() }[a];
		if (step) galStep(step);
		if (a === "confirm") { galFull = !galFull; sfx("select", 0.4); }
		if (a === "back") { if (galFull) galFull = false; else go("title"); }
	},
	draw: function () {
		c.fillStyle = GROUND; c.fillRect(0, 0, W, H);
		var shot = images["shots/" + SHOTS[galAt][0]];
		if (galFull) {
			if (portrait) {
				var ih = Math.round(W * 272 / 480), iy = Math.round((H - ih) / 2) - 30;
				tab((galAt + 1) + " OF " + SHOTS.length);
				if (ready(shot)) c.drawImage(shot, 0, iy, W, ih);
				para(SHOTS[galAt][1], 12, iy + ih + 8, 41, PALE, 10);
				var by = iy + ih + 34;
				button(12, by, 78, 32, "<", false, function () { galStep(-1); });
				button(97, by, 78, 32, "CLOSE", false, function () { galFull = false; });
				button(182, by, 78, 32, ">", false, function () { galStep(1); });
				return;
			}
			if (ready(shot)) c.drawImage(shot, 0, 0);
			c.fillStyle = "rgba(12,10,9,.84)"; c.fillRect(0, H - 13, W, 13);
			text(c, (galAt + 1) + "/" + SHOTS.length, 6, H - 10, GOLD);
			text(c, SHOTS[galAt][1], 246, H - 10, PALE, 1, true);
			text(c, "<", 4, 130, PALE, 2); text(c, ">", W - 14, 130, PALE, 2);
			hit(0, 0, 90, H, function () { galStep(-1); });
			hit(W - 90, 0, 90, H, function () { galStep(1); });
			hit(90, 0, W - 180, H, function () { galFull = false; });
			return;
		}
		var cols = galCols(), tw = portrait ? 84 : 72, th = portrait ? 48 : 42, stepX = portrait ? 88 : 76, stepY = portrait ? 56 : (touch ? 66 : 62), left = (W - (cols * stepX - (stepX - tw))) >> 1;
		if (!portrait) panel(2, 2, W - 4, H - (touch ? 4 : 20));
		tab("GALLERY");
		backButton();
		c.imageSmoothingEnabled = true;
		SHOTS.forEach(function (s, i) {
			var x = left + (i % cols) * stepX, y = 26 + Math.floor(i / cols) * stepY, on = i === galAt, im = images["shots/" + s[0]];
			c.fillStyle = on ? GOLD : LINE; c.fillRect(x - 1, y - 1, tw + 2, th + 2);
			if (ready(im)) c.drawImage(im, x, y, tw, th);
			hit(x, y, tw, th, function () { galAt = i; galFull = true; announce(); }, function () { if (galAt !== i) { galAt = i; announce(); } });
		});
		c.imageSmoothingEnabled = false;
		if (!touch) text(c, SHOTS[galAt][1], 240, 238, PALE, 1, true);
		else if (portrait) text(c, "TAP A SHOT TO SEE IT LARGER", W >> 1, 26 + 6 * stepY + 2, MUTE, 1, true);
		hints([["ARROWS", "MOVE"], ["ENTER", "VIEW"], ["ESC", "BACK"]]);
	}
};

// Download: the phone's own platform comes first on a phone.
var isAndroid = /Android/i.test(navigator.userAgent), isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
var DL_KEYS = isAndroid ? ["android", "win"] : ["win", "android"], dlAt = 0, dlMsg = 0, DL_WHO = { win: "ranger", android: "samurai" };
var DL_NOTES = {
	win: "OPEN THE DOWNLOADED PIXELBOUND DEMO EXE. THE GAME ISN'T CODE-SIGNED YET, SO WINDOWS MAY WARN YOU: CHOOSE MORE INFO, THEN RUN ANYWAY.",
	android: "OPEN THE APK ON YOUR PHONE AND ALLOW YOUR BROWSER TO INSTALL APPS WHEN ASKED. TOUCH CONTROLS TURN ON BY THEMSELVES. NEEDS A 64-BIT DEVICE."
};
var DEMO = "FREE DEMO: RANGER, BARBARIAN AND SAMURAI, DEATHMATCH IN THE ASHEN COURT, AND THE FIRST TOWER OF THE CAMPAIGN.";
var TOGETHER = "UP TO FOUR ON ONE SCREEN, ON KEYBOARDS AND PADS IN ANY MIX. PHONES ON THE SAME WI-FI JOIN BY QR CODE. OR HOST A GAME ONLINE.";
function getDownload(key) { var d = DL[key]; if (d.url) location.href = d.url; else dlMsg = 240; sfx("select"); }
function dlPlate(k, i, x, y, w, h) {
	var on = i === dlAt, d = DL[k], s = Kit.classSheet(DL_WHO[k]), a = on ? WIN : IDLE;
	c.fillStyle = on ? GOLD : LINE; c.fillRect(x, y, w, h); c.fillStyle = on ? "#4a1018" : "#1e090d"; c.fillRect(x + 1, y + 1, w - 2, h - 2);
	spr(s, Kit.animFrame(a, t % Kit.animLen(a)), x + 32, y + h - 10, 2);
	text(c, d.label, x + 66, y + 8, on ? PALE : MUTE, 2);
	text(c, d.detail.toUpperCase() + ", " + d.size.toUpperCase(), x + 66, y + 27, MUTE);
	text(c, "FREE DEMO " + PB.version, x + 66, y + 37, PAPER);
	hit(x, y, w, h, function () { dlAt = i; getDownload(k); announce(); }, function () { if (dlAt !== i) { dlAt = i; announce(); } });
}
screens.download = {
	enter: function () { dlMsg = 0; },
	speak: function () { var d = DL[DL_KEYS[dlAt]]; return "Download for " + d.label + ", " + d.detail + ", " + d.size + (d.url ? "." : ". The link goes live with the first public release."); },
	input: function (a) {
		if (a === "left" || a === "right" || a === "up" || a === "down") { dlAt = (dlAt + 1) % DL_KEYS.length; sfx("ui", 0.4); announce(); }
		if (a === "confirm") getDownload(DL_KEYS[dlAt]);
		if (a === "back") go("title");
	},
	tick: function () { if (dlMsg > 0) dlMsg--; },
	draw: function () {
		var y, key = DL_KEYS[dlAt];
		c.fillStyle = GROUND; c.fillRect(0, 0, W, H);
		if (portrait) {
			tab("GET THE DEMO");
			backButton();
			DL_KEYS.forEach(function (k, i) { dlPlate(k, i, 8, 26 + i * 62, W - 16, 58); });
			y = 154;
			if (isIOS) y = para("NO IPHONE OR IPAD VERSION YET. PLAY IT ON WINDOWS OR ANDROID.", 12, y, 41, GOLD) + 4;
			y = para(DEMO, 12, y, 41, GOLD) + 5;
			text(c, "HOW TO INSTALL", 12, y, GOLD);
			y = para(DL_NOTES[key], 12, y + 10, 41, PAPER) + 5;
			text(c, "PLAY TOGETHER", 12, y, GOLD);
			y = para(TOGETHER, 12, y + 10, 41, PAPER) + 5;
			var by = Math.max(y + 4, H - 44);
			if (!dlMsg) button(12, by, W - 24, 34, "DOWNLOAD FOR " + DL[key].label, true, function () { getDownload(key); });
			y = by + 3;
		} else {
			panel(2, 2, W - 4, H - (touch ? 4 : 20));
			tab("GO GET HER BACK");
			backButton();
			DL_KEYS.forEach(function (k, i) { dlPlate(k, i, 22 + i * 224, 26, 212, 58); });
			y = 92;
			if (isIOS) { text(c, "NO IPHONE OR IPAD VERSION YET. PLAY IT ON WINDOWS OR ANDROID.", 240, y, GOLD, 1, true); y += 12; }
			y = para(DEMO, 22, y, 72, GOLD) + 6;
			text(c, "HOW TO INSTALL", 22, y, GOLD);
			y = para(DL_NOTES[key], 22, y + 11, 72, PAPER) + 6;
			text(c, "PLAY TOGETHER", 22, y, GOLD);
			y = para(TOGETHER, 22, y + 11, 72, PAPER) + 6;
			if (!dlMsg) text(c, "BUILT BY KOMPA POMPA", 240, y + 8, MUTE, 1, true);
		}
		if (dlMsg > 0) {
			var my = portrait ? Math.min(y, H - 34) : y + 2, mw = W - 16;
			c.fillStyle = BROWN; c.fillRect(8, my, mw, 28); c.fillStyle = PAPER; c.fillRect(9, my + 1, mw - 2, 26);
			wrap("THE LINK GOES LIVE WITH THE FIRST PUBLIC RELEASE", portrait ? 40 : 72).forEach(function (l, n, all) { text(c, l, W >> 1, my + (all.length > 1 ? 5 : 10) + n * 10, BROWN, 1, true); });
		}
		hints([["LEFT/RIGHT", "PLATFORM"], ["ENTER", "DOWNLOAD"], ["ESC", "BACK"]]);
	}
};

// The hero's skins wait in a line on the heroes page, all at the same 2x as the rest of the art.
// Only the front one shows its colours and its name; the rest stand behind it in shadow, darker
// the further back. Every few seconds the front one walks off and the line steps up.
var SKINS = window.PB_SKINS, skinSheets = {}, skinFlip = document.createElement("canvas"), sf = skinFlip.getContext("2d");
function skinSheet(id) { if (!skinSheets[id]) { skinSheets[id] = new Image(); skinSheets[id].src = "assets/skins/" + id + ".png"; } return skinSheets[id]; }
function skinList(id) { return SKINS.classes[id].skins; }
// How wide the hero stands at 1x; an older cached skins.js without it falls back to the frame size.
function skinBody(id) { var d = SKINS.classes[id]; return d.bw || Math.round(d.w * 0.6); }
// A skin's frame, darkened toward a colour: amount 0 is the skin as it is, 1 a flat silhouette.
function skinDraw(id, n, frame, x, feet, shade, amount, alpha) {
	var d = SKINS.classes[id], i = skinSheet(id), f = SKINS.frames.indexOf(frame);
	if (!ready(i) || alpha <= 0) return;
	skinFlip.width = d.w; skinFlip.height = d.h;
	sf.globalCompositeOperation = "source-over"; sf.drawImage(i, f * d.w, n * d.h, d.w, d.h, 0, 0, d.w, d.h);
	if (amount > 0) { sf.globalCompositeOperation = "source-atop"; sf.globalAlpha = amount; sf.fillStyle = shade; sf.fillRect(0, 0, d.w, d.h); sf.globalAlpha = 1; }
	c.save(); c.globalAlpha = alpha; c.translate(Math.round(x), Math.round(feet)); c.scale(-2, 2); c.drawImage(skinFlip, -d.ax, -d.ay); c.restore();
}
var SKIN_IDLE = [["idle0", 30], ["idle1", 30], ["idle0", 30], ["blink", 6], ["idle1", 24]], SKIN_RUN = [["run0", 6], ["run1", 6], ["run2", 6], ["run3", 6]];
var SKIN_STAY = 150, SKIN_MOVE = 24;
function skinShade(pos) { return pos <= 0 ? 0 : (pos < 1 ? pos * 0.5 : Math.min(0.88, 0.5 + (pos - 1) * 0.08)); }
// Where the line is now: the front skin's index and how far the step-up has got (0 to 1).
function skinState(id) {
	var n = skinList(id).length, phase = t % SKIN_STAY, p = n > 1 && phase >= SKIN_STAY - SKIN_MOVE ? (phase - SKIN_STAY + SKIN_MOVE) / SKIN_MOVE : 0;
	return { at: Math.floor(t / SKIN_STAY) % n, p: p, n: n };
}
function skinLine(id, x, feet, width) {
	var s = skinState(id), n = s.n, bw = skinBody(id) * 2, gap = Math.max(14, Math.round(bw * 0.55)), last = Math.min(n - 1, Math.floor((width - bw) / gap));
	c.fillStyle = "#3a2a24"; c.fillRect(x - bw / 2, feet + 1, width, 2); c.fillStyle = "#1e090d"; c.fillRect(x - bw / 2, feet + 3, width, 1);
	for (var k = Math.min(n - 1, last + 1); k >= 0; k--) {
		var i = (s.at + k) % n, pos = k - s.p, walking = s.p > 0, alpha = k === 0 ? 1 - s.p : (k > last ? s.p : 1);
		var a = walking ? SKIN_RUN : SKIN_IDLE;
		skinDraw(id, i, Kit.animFrame(a, (ticks + i * 11) % Kit.animLen(a)), x + pos * gap, feet, GROUND, skinShade(pos), alpha);
	}
}
function skinName(id) { var s = skinState(id), n = s.n, i = (s.at + (s.p > 0.5 ? 1 : 0)) % n; return [skinList(id)[i].name, (i + 1) + "/" + n]; }

// Loading: the Kompa Pompa splash, held until the art is in and the logo has had its moment.
// Any key or tap skips the wait once everything has loaded.
var LOGO = img("title/kompa_pompa"), splashOut = -1, splashSkip = false, logoFly = 0, LOGO_FLY = 36;
// Where the splash shows the logo, and where the title keeps it: the logo flies from one to the other.
function splashSpot() { return [(W - 144) >> 1, portrait ? (H >> 1) - 110 : 40, 144, 146]; }
function titleSpot() { return portrait ? [W - 78, 200, 72, 73] : [400, touch ? 194 : 181, 72, 73]; }
// About: the studio behind the game, reached by pressing the studio logo on the title.
var ABOUT = [
	["KOMPA POMPA", "AN INDIE GAME STUDIO, AND THE MAKERS OF PIXELBOUND."],
	["THE GAME", "A PIXEL-ART ARENA FIGHTER FOR UP TO FOUR PLAYERS ON ONE SCREEN OR ONLINE, WITH THIRTEEN HEROES AND A CAMPAIGN TO CLIMB ALONE OR TOGETHER."],
	["MADE WITH", "THE GODOT ENGINE."]];
screens.about = {
	speak: function () { return "About. " + ABOUT.map(function (a) { return a[0] + ": " + a[1]; }).join(" "); },
	input: function (a) { if (a === "back") go("title"); if (a === "confirm") go("download"); },
	draw: function () {
		var y;
		c.fillStyle = GROUND; c.fillRect(0, 0, W, H);
		if (portrait) {
			tab("ABOUT");
			backButton();
			drawImg("title/kompa_pompa", (W - 72) >> 1, 30);
			y = 116;
			ABOUT.forEach(function (a) { text(c, a[0], 12, y, GOLD); y = para(a[1], 12, y + 10, 41, PAPER) + 8; });
			button(12, Math.max(y + 4, H - 44), W - 24, 34, "GET THE FREE DEMO", true, function () { go("download"); });
		} else {
			panel(2, 2, W - 4, H - (touch ? 4 : 20));
			tab("ABOUT");
			backButton();
			if (ready(LOGO)) c.drawImage(LOGO, 28, 50, 144, 146);
			y = 46;
			ABOUT.forEach(function (a) { text(c, a[0], 196, y, GOLD); y = para(a[1], 196, y + 11, 44, PAPER) + 8; });
			button(196, Math.max(y + 6, 200), 160, touch ? 22 : 18, "GET THE FREE DEMO", true, function () { go("download"); });
		}
	}
};
screens.load = {
	input: function () { splashSkip = true; },
	draw: function () {
		c.fillStyle = INK; c.fillRect(0, 0, W, H);
		var out = splashOut < 0 ? 1 : Math.max(0, 1 - splashOut / 24), rise = Math.min(1, Math.max(0, (t - 10) / 30)), sp = splashSpot(), lh = sp[3], ly = sp[1];
		if (ready(LOGO) && rise > 0) { c.globalAlpha = rise * out; c.drawImage(LOGO, sp[0], ly - Math.round((1 - rise) * 10), sp[2], lh); }
		var words = Math.min(1, Math.max(0, (t - 50) / 20)) * out;
		if (words > 0) { c.globalAlpha = words; text(c, "PRESENTS", W >> 1, ly + lh + 18, MUTE, 1, true); }
		c.globalAlpha = 1;
		if (pending && loaded < pending && t > 60) { c.fillStyle = LINE; c.fillRect((W >> 1) - 40, H - 24, 80, 3); c.fillStyle = GOLD; c.fillRect((W >> 1) - 40, H - 24, 80 * loaded / pending, 3); }
	}
};
function splashDone() {
	if (splashOut >= 0) return ++splashOut >= 24;
	if (pending && loaded >= pending && PB.order.every(function (id) { return Kit.classSheet(id).img.complete; }) && (t >= 150 || splashSkip)) {
		var want = (location.hash || "").slice(1);
		if (screens[want] && want !== "load" && want !== "watch" && want !== "title") splashOut = 0;
		else { logoFly = LOGO_FLY; return true; }
	}
	return false;
}
// The flight over the title: black lifts off the title while the logo shrinks into its corner.
function drawLogoFly() {
	var p = 1 - logoFly / LOGO_FLY, e = p * p * (3 - 2 * p), a = splashSpot(), b = titleSpot();
	c.globalAlpha = 1 - e; c.fillStyle = INK; c.fillRect(0, 0, W, H); c.globalAlpha = 1;
	if (!ready(LOGO)) return;
	var w = Math.round(a[2] + (b[2] - a[2]) * e), h = Math.round(a[3] + (b[3] - a[3]) * e);
	c.drawImage(LOGO, Math.round(a[0] + (b[0] - a[0]) * e), Math.round(a[1] + (b[1] - a[1]) * e), w, h);
}

// ---- One input handler for every screen ------------------------------------------------------
var MENU_KEYS = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down", a: "left", d: "right", w: "up", s: "down", Enter: "confirm", " ": "confirm", z: "confirm", j: "confirm", x: "confirm", Escape: "back", Backspace: "back", c: "back", k: "back" };
function menuInput(action) { idle = 0; var s = screens[screen]; if (s.input) s.input(action); }
addEventListener("keydown", function (e) {
	if (e.ctrlKey || e.metaKey || e.altKey) return;
	var k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
	if (k === "m") { if (screen === "watch") video.muted = !video.muted; else Kit.setSound(!Kit.sound()); e.preventDefault(); return; }
	if (MENU_KEYS[k]) { e.preventDefault(); if (!e.repeat || /Arrow/.test(k)) menuInput(MENU_KEYS[k]); }
});
function toScreen(e) { var r = canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height }; }
// Fingers are less exact than a cursor, so a tap reaches a little past each target; the nearest one wins.
function hitAt(p, slop) {
	var best = null, bestD = 1e9;
	for (var i = hitList.length - 1; i >= 0; i--) {
		var h = hitList[i], dx = Math.max(h.x - p.x, 0, p.x - h.x - h.w), dy = Math.max(h.y - p.y, 0, p.y - h.y - h.h), d = Math.hypot(dx, dy);
		if (d === 0) return h;
		if (d <= slop && d < bestD) { best = h; bestD = d; }
	}
	return best;
}
addEventListener("pointerdown", function (e) {
	if (e.pointerType === "touch" && !touch) touch = true;
	canvas.focus({ preventScroll: true });
	idle = 0;
	var h = hitAt(toScreen(e), e.pointerType === "touch" ? 5 : 0);
	if (h && h.onDo) { h.onDo(); sfx("ui", 0.3); }
});
canvas.addEventListener("pointerleave", function () { pointerAt = null; });
addEventListener("pointermove", function (e) {
	if (e.pointerType !== "mouse") return;
	idle = 0; seenInput = 0;
	pointerAt = toScreen(e);
	var h = hitAt(pointerAt, 0); canvas.style.cursor = h ? "pointer" : "default"; if (h && h.onHover) h.onHover();
});

// ---- Fit and loop ----------------------------------------------------------------------------
function fit() {
	var vw = document.documentElement.clientWidth, vh = document.documentElement.clientHeight, s;
	portrait = vh > vw * 1.1;
	if (portrait) {
		W = 272; s = Math.min(vw / W, vh / 430);
		H = Math.max(430, Math.min(620, Math.floor(vh / s)));
	} else {
		W = 480; H = 272; s = Math.min(vw / W, vh / H);
		// Whole-pixel scales where there's room; a phone's small screen uses all of it instead.
		if (s >= 2) s = Math.floor(s);
	}
	if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
	canvas.style.width = W * s + "px"; canvas.style.height = H * s + "px";
	placeVideo(); placeClip();
}
fit(); addEventListener("resize", fit); addEventListener("orientationchange", fit);
canvas.focus({ preventScroll: true });
var last = performance.now(), acc = 0;
function tickAll() {
	ticks++; t++;
	if (logoFly > 0) logoFly--;
	if (screen === "title") logoTick();
	var s = screens[screen];
	if (screen === "load") {
		if (splashDone()) {
			var want = (location.hash || "").slice(1);
			go(screens[want] && want !== "load" && want !== "watch" ? want : "title", true);
		}
		return;
	}
	if (s.tick) s.tick();
}
function frame(now) {
	acc += Math.min(now - last, 100); last = now;
	var steps = 0;
	while (acc >= 1000 / 60 && steps < 6) { acc -= 1000 / 60; tickAll(); steps++; }
	hitList = [];
	c.setTransform(1, 0, 0, 1, 0, 0); c.imageSmoothingEnabled = false; c.globalAlpha = 1;
	screens[screen].draw();
	if (logoFly > 0) drawLogoFly();
	// Inside a frame or another window the keys go elsewhere until the page gets focus: say so.
	if (screen !== "load" && !touch && !document.hasFocus()) {
		var mx = W >> 1, my = H >> 1;
		c.fillStyle = BROWN; c.fillRect(mx - 110, my - 12, 220, 24); c.fillStyle = PAPER; c.fillRect(mx - 109, my - 11, 218, 22);
		text(c, "CLICK HERE TO USE THE KEYBOARD", mx, my - 3, BROWN, 1, true);
	}
	requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
window.__site = { go: go, screen: function () { return screen; }, tick: tickAll, layout: function () { return [W, H, portrait, touch]; } };
})();
