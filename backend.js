//---------------------------------------------------
// Includes && Initialize && Modules
//---------------------------------------------------

// Server mit node-fastcgi, express, pug
var server = require("node-fastcgi");
var express = require("express");
var app = express();
app.set("view engine", "pug");
app.set("views", "./pug-views");

// Session && Cookies
var cache = require("memory-cache");
var session = require("express-session");
var Cookies = require("js-cookie");

// GeoInformatik
//var osmtogeojson = require('osmtogeojson');
//var overpassdata = require('./opquery.json');

// Hilfsfunktionen als "Fake"- JS Modules
// Components.utils.import("resource://./scripts/jsm_overpass");
var overpass = require("./scripts/jsm_overpass");
const game = require("./scripts/jsm_gamelogic");

// MQTT
var mqtt = require("mqtt");
var mqttclient;

// DEBUG VAR:
var D = true;

// App Use fuer express session
app.use(
  session({
    secret: "key",
    resave: false,
    saveUninitialized: false
  })
);

// Beispiel gamedata JSON Objekt als Ersatz fuer DB
/*
var gamedata = {
		"lobbies":[
			{
				"id": "xs2345fsdf",
				"lobbyname": "eine lobby",
				"teamA":{
					"players":[
						{
							"id": "xs2345fsdf",
							"name": "testuser",
							"pos":[]
						},
						{
							"id": "274574272456",
							"name": "anderer user",
							"pos":[]
						}
					],
					"score": 0,
					"gadgets":{
						"bombe": 0,
						"scan": 0
					},
					"scan": false,
				},
				"teamB": {
					"players": [
						{
							"id": "xs2345fsdf",
							"name": "beder",
							"position":[]
						},
						{
							"id": "274574272456",
							"name": "pretr",
							"position":[]
						}
					],
					"score": 0,
					"score": 0,
					"gadgets":{
						"bombe": 0,
						"scan": 0
					},
					"scan": false,
				},
				"gamearea":[
					[]
				],
				"flags":[
					[]
				],
				"recommendesPoints":[
					[]
				],
				"startCoords":[],
				"zoomlevel": 10,
				"gadgets": [
					{
						"type": "scan",
						"collectable": true, // false = explodierende bombe
						"coord": [9.213, 47.811],
						"radius": 50, // collectable true = Radius zum sammeln else Explosionsradius
						"time": 5000 // zeit bis explosion in ms
					}
				]

			}
		],
	}
*/

// Initiales "gamedata" JSON Objekt
var gamedata = {
  lobbies: []
};

//---------------------------------------------------
// Routen
//---------------------------------------------------

// GET Route /node.js -> PUG: index.pug
app.get("/node.js", function (req, res) {
  debug(D, "Backend - Route - GET /node.js");

  req.session.isAuth = true;
  req.session.cookie.httpOnly = false;

  if (cache.get(req.session.id) == null) {
    var session_data = {
      username: ""
    };
    cache.put(req.session.id, session_data, 3600000);
  } else {
    var session_data = cache.get(req.session.id);
    cache.put(req.session.id, session_data, 3600000);
  }

  res.render("index");
});

// POST Route /node.js -> Redirect: GET auf /node.js
app.post("/node.js", function (req, res) {
  session_data = cache.get(req.session.id);

  var body = "";
  req.on("data", function (data) {
    body += data;
  });

  req.on("end", async function () {
    var params = new URLSearchParams(body);

    if (params.status == "lobby_abandoned") {
      cache.put(req.session.id, session_data);
    }

    res.writeHead(303, { Location: "/node.js" });
    res.end();
  });
});

// GET Route /joingame.js -> PUG: joingame.pug
app.get("/joingame.js", function (req, res) {
  debug(D, "Backend - Route - GET /joingame.js");

  res.render("joingame");
});

// POST Route /joingame.js -> Redirect: GET auf /lobbyoverview.js
app.post("/joingame.js", function (req, res) {
  debug(D, "Backend - Route - POST /joingame.js");

  var session_data = cache.get(req.session.id);

  var body = "";
  req.on("data", function (data) {
    body += data;
  });

  req.on("end", async function () {
    var params = new URLSearchParams(body);

    session_data.username = params.get("username");
    cache.put(req.session.id, session_data);

    res.writeHead(303, { Location: "/lobbyoverview.js" });
    res.end();
  });
});

// GET Route /creategame.js -> PUG: creategame.pug
app.get("/creategame.js", function (req, res) {
  debug(D, "Backend - Route - GET /creategame.js");

  res.render("creategame");
});

// POST Route /creategame.js -> Redirect: GET auf /lobby.js
app.post("/creategame.js", function (req, res) {
  debug(D, "Backend - Route - POST /creategame.js");

  var session_data = cache.get(req.session.id);

  var body = "";
  req.on("data", function (data) {
    body += data;
  });

  req.on("end", async function () {
    var params = new URLSearchParams(body);

    session_data.username = params.get("username");

    var lobbyindex = Object.keys(gamedata.lobbies).length;

    var mapdata = JSON.parse(params.get("hidden"));

    var newgame_data = {
      id: req.session.id,
      lobbyname: params.get("lobbyname"),
      teamA: {
        players: [{ id: req.session.id, name: params.get("username"), pos: [0, 0] }],
        score: 0,
        gadgets: {
          bombe: 0,
          scan: 0
        },
        scan: false
      },
      teamB: {
        players: [],
        score: 0,
        gadgets: {
          bombe: 0,
          scan: 0
        },
        scan: false
      },
      gamearea: mapdata.gamearea,
      flags: mapdata.flags,
      recommendesPoints: mapdata.recommendedPoints,
      startCoords: mapdata.startCoords,
      zoomlevel: mapdata.zoomLevel,
      gadgets: []
    };

    gamedata.lobbies.push(newgame_data);

    cache.put(req.session.id, session_data);

    mqttclient.publish("lobby", JSON.stringify(get_mqtt_lobbies()));

    res.writeHead(303, { Location: "/lobby.js" });
    res.end();
  });
});

// GET Route /lobbyoverview.js -> PUG: creategame.pug
app.get("/lobbyoverview.js", function (req, res) {
  debug(D, "Backend - Route - GET /lobbyoverview.js");

  res.render("lobbyoverview");
});

// POST Route /lobbyoverview.js -> Redirect: GET auf /lobby.js
app.post("/lobbyoverview.js", function (req, res) {
  debug(D, "Backend - Route - POST /lobbyoverview.js");

  var session_data = cache.get(req.session.id);

  var body = "";
  req.on("data", function (data) {
    body += data;
  });

  req.on("end", async function () {
    var params = new URLSearchParams(body);

    var lobbyid = params.get("lobbyid");

    var addplayer = {
      id: req.session.id,
      name: session_data.username,
      pos: [0, 0]
    };

    var lobbyindex = getLobby(lobbyid)[0];

    gamedata.lobbies[lobbyindex].teamA.players.push(addplayer);

    let lobbyobj = game.getAllPlayers(getLobby(lobbyid)[1]);
    let response = buildResponse("playernames", lobbyobj);
    mqttclient.publish("game", JSON.stringify(response));

    res.writeHead(303, { Location: "/lobby.js" });
    res.end();
  });
});

// GET Route /lobby.js -> PUG: lobby.pug
app.get("/lobby.js", function (req, res) {
  debug(D, "Backend - Route - GET /lobby.js");

  res.render("lobby");
});

// POST Route /lobby.js -> Redirect: GET auf /game.js
app.post("/lobby.js", function (req, res) {
  debug(D, "Backend - Route - POST /lobby.js");

  res.writeHead(303, { Location: "/game.js" });
  res.end();
});

// GET Route /game.js -> PUG: game.pug
app.get("/game.js", function (req, res) {
  debug(D, "Backend - Route - GET /game.js");

  res.render("game");
});

// POST Route /recommendedPoints.js -> Write JSON response
app.post("/recommendedPoints.js", async function (req, res) {
  debug(D, "Backend - Route - GET /recommendedPoints.js");

  var body = "";
  req.on("data", function (data) {
    body += data;
  });

  req.on("end", async function () {
    var params = new URLSearchParams(body);
    var borders = JSON.parse(params.keys().next().value);

    let data = {};

    let points = await overpass.fetchData(borders.border);
    data.Points = points;

    res.write(JSON.stringify(data));
    res.end();
  });
});

server.createServer(app).listen(9998);
console.log("Backend - Server started");

//---------------------------------------------------
// MQTT
//---------------------------------------------------

// Autostart MQTT Listener mit Topic-Hierarchie
(async function main() {
  debug(D, "Backend - MQTT - Starte MQTT Listener");
  mqttclient = mqtt.connect("mqtt://127.0.0.1", {}).on("connect", function () {
    debug(D, "Connected");
    mqttclient.on("message", onMessage);
    mqttclient.subscribe("mqttfetch/#"); //mqttfetch/+/+/+/+/fr/+
  });
})();

// MQTT Fuktion fuer ankommende Messages
async function onMessage(topic, message) {
  debug(D, "Backend - MQTT - Funktion - onMessage");

  var jsm = JSON.parse(message);

  var response = { status: "", payload: [] };
  var ntopic = topic.split("/");

  if (ntopic[1] == "lobby") {
    debug(D, "Backend - MQTT - Funktion - onMessage - get_mqtt_lobbies(): ", get_mqtt_lobbies());
    mqttclient.publish("lobby", JSON.stringify(get_mqtt_lobbies()));
  } else if (ntopic[1] == "game") {
    // Getnames Lobby
    if (jsm.status == "getnames") {
      debug(D, "Backend - MQTT - Funktion - onMessage - status getnames: ");
      let lobbyid = jsm.payload[0].lobbyid;

      let lobbyobj = game.getAllPlayers(getLobby(lobbyid)[1]);
      response.status = "playernames_b";
      response.payload.push(lobbyobj);
      mqttclient.publish("game/" + lobbyid, JSON.stringify(response));

      // SwitchTeam
    } else if (jsm.status == "switchteam") {
      let lobbyid = jsm.payload[0].lobbyid;
      let playerid = jsm.payload[0].playerid;
      let lobbyindex = getLobby(lobbyid)[0];
      let lobbyjson = getLobby(lobbyid)[1];

      lobbyjson = game.playerSwapTeam(lobbyjson, playerid);
      gamedata.lobbies[lobbyindex] = lobbyjson;
      lobbyjson = game.getAllPlayers(lobbyjson);
      response.status = "playernames_b";
      response.payload.push(lobbyjson);

      mqttclient.publish("game/" + lobbyid, JSON.stringify(response));
    }
    // mapsetup
    else if (jsm.status == "mapsetup") {
      let lobby = getLobby(jsm.payload[0].lobbyid); //lobby[0] = id lobby[1]=jobbyJSON
      let team = jsm.payload[0].team;
      //debug(D, "Backend - MQTT - Funktion - onMessage - mapsetup: ", lobby);

      let data = game.buildClientJson(lobby[1], team);
      response.status = "mapsetup_b";
      response.payload.push(data);

      //mqttclient.publish(topic.replace("fr", "to"), JSON.stringify(response));
      mqttclient.publish("game/" + jsm.payload[0].lobbyid + "/" + team, JSON.stringify(response));
    }
    // positionsUpdate
    else if (jsm.status == "updatepos") {
      let lobbyid = jsm.payload[0].lobbyid; //lobby[0] = id lobby[1]=jobbyJSON
      let team = jsm.payload[0].team;
      let pid = jsm.payload[0].playerid;
      let pos = jsm.payload[0].pos;

      updatePosition(lobbyid, team, pid, pos);

      //
    } else if (jsm.status == "setbomb") {
      let lobbyid = jsm.payload[0].lobbyid; //lobby[0] = id lobby[1]=jobbyJSON
      let team = jsm.payload[0].team;
      let pos = jsm.payload[0].coord;

      placeBomb(lobbyid, team, pos);
      //
    } else if (jsm.status == "usescan") {
      startScan(jsm.payload[0].lobbyid, jsm.payload[0].team);
      //
    } else if (jsm.status == "leavelobby") {
      // leave lobby
      let lobbyid = jsm.payload[0].lobbyid;

      let playerid = jsm.payload[0].playerid;

      var lobbyindex = getLobby(lobbyid)[0];
      let lobbyjson = getLobby(lobbyid)[1];

      lobbyjson = game.deleteplayer(lobbyjson, playerid);

      response.status = "playernames_b";
      gamedata.lobbies[lobbyindex] = lobbyjson;

      lobbyjson = game.getAllPlayers(lobbyjson);
      response.payload.push(lobbyjson);

      mqttclient.publish("game/" + lobbyid, JSON.stringify(response));
    } else if (jsm.status == "destroylobby") {
      // destory lobby
      let lobbyid = jsm.payload[0].lobbyid;
      let playerid = jsm.payload[0].playerid;
      var lobbyindex = getLobby(lobbyid)[0];

      response.status = "destroylobby_b";

      gamedata.lobbies.splice(lobbyindex, 1);

      mqttclient.publish("game/" + lobbyid, JSON.stringify(response));
    } else if (jsm.status == "startgame") {
      debug(D, "Backend - MQTT - Funktion - onMessage - startgame: ");

      let lobbyid = jsm.payload[0].lobbyid;

      response.status = "startgame_b";

      mqttclient.publish("game/" + lobbyid, JSON.stringify(response));
    }
  }
}

// MQTT Funktion zum Auslesen der Lobbies
// Rueckgabe als JSON-Objekt
function get_mqtt_lobbies() {
  // Beispielhaftes mqtt_lobbies JSON Objekt
  /*
	var mqtt_lobbies = {
		"lobbies":[
			{
			"name":"",
			"id":"",
		}
		]
	};
	*/

  // mqtt_lobbies JSON Objekt, welches unten populiert wird
  var mqtt_lobbies = {
    lobbies: []
  };

  debug(D, "Backend - MQTT - Funktion - get_mqtt_lobbies - lobbys: ", mqtt_lobbies);

  var temp_lobby = { lobby: { name: "", id: "" } };
  for (var i = 0; i < Object.keys(gamedata.lobbies).length; i++) {
    temp_lobby = { lobby: { name: "", id: "" } };
    temp_lobby.lobby.name = gamedata.lobbies[i].lobbyname;
    temp_lobby.lobby.id = gamedata.lobbies[i].id;

    mqtt_lobbies.lobbies.push(temp_lobby.lobby);
  }

  return mqtt_lobbies;
}

// suche lobby anhand lobbyId
// gibt lobbyindex im array & lobby als json zurück
// --> [Arrayindex, lobbyAsJSON]
function getLobby(lobbyId) {
  let l = gamedata.lobbies;
  for (let i = 0; i < l.length; i++) {
    if (l[i].id == lobbyId) {
      return [i, l[i]];
    }
  }
  return [-1, {}];
}

// loesche lobby aus der liste wenn existent
// rueckgabe boolean ob erfolgreich
function deleteLobby(lobbyId) {
  let l = getLobby(lobbyId);
  if (l[0] > -1) {
    gamedata.lobbies.splice(l[0], 1);
    return true;
  }
  return false;
}

// Baut Antwort JSON-Objekt fuer Client
// Input: Status und Payload als JSON-Objekt oder Array
function buildResponse(status, payload) {
  var response = { status: "", payload: [] };
  response.status = status;
  if (Array.isArray(payload)) {
    response.payload = payload;
  }
  response.payload.push(payload);
  return response;
}

//---------------------------------------------------
// Hilfsfunktionen
//---------------------------------------------------

//Generiert eine Zufalls-ID fuer den Memory Cache
function getSessionID() {
  var id = Math.floor(Math.random() * 100000000) + 100000000;
  return id;
}

// Debug Funktion
// Input:
// boolean print (if true -> prints debug messages)
// string msg: console message
// vars: functions to be executed and printed to console
function debug(print, msg, vars) {
  if (print) {
    if (msg != "") {
      console.dir(msg);
    }
    if (vars !== undefined) {
      console.log(vars);
    }
    console.log("");
  }
}

// publish Gamedata an Team A&B
//
function publishGameData(lobby) {
  // erzeuge Spieldaten für Team A & B
  let dataA = game.buildClientJson(lobby, "A");
  let dataB = game.buildClientJson(lobby, "B");

  let topic = "game/" + lobby.id;
  let response = {
    status: "update_b",
    payload: [dataA]
  };

  mqttclient.publish(topic + "/A", JSON.stringify(response));
  response.payload = [dataB];
  mqttclient.publish(topic + "/B", JSON.stringify(response));
}

// aktualisiere Spielerposition
// lobbyId, team = 'A' ; 'B' / playerId / pos = [lon, lat]
function updatePosition(lobbyId, team, playerId, pos) {
  let lobby = getLobby(lobbyId);

  let gres = game.updatePlayerPos(lobby[1], team, playerId, pos);

  // spawne zufällig neues Gadget chance 1:20
  let random = randomIntFromInterval(0, 10);
  if (random == 2) {
    gres = game.spawnGadget(gres);
  }

  // schreibe lobbydaten & pubish via mqtt
  gamedata.lobbies[lobby[0]] = gres;
  publishGameData(gres);
}

// starte Scan für das Team
// lobbyId / team = 'A' ; 'B'
function startScan(lobbyId, team) {
  let lobby = getLobby(lobbyId);

  let gres = game.useScan(lobby[1], team);

  // schreibe lobbydaten & pubish via mqtt
  gamedata.lobbies[lobby[0]] = gres[0];
  publishGameData(gres[0]);

  //starte ScanTimer
  startScanTimer(lobbyId, gres[1], team);
}

// Platziere bombe
// lobbyID / team = 'A' ; 'B' / coord = [lon, lat]
function placeBomb(lobbyId, team, coord) {
  let lobby = getLobby(lobbyId);

  // lobbyNew = [lobby, bomid, bombtime]
  let gres = game.setBomb(lobby[1], team, coord);

  // schreibe lobbydaten & pubish via mqtt
  gamedata.lobbies[lobby[0]] = gres[0];
  publishGameData(gres[0]);

  // starte BombTimer
  startBombTimer(lobbyId, gres[2], gres[1]);
}

// starte Bombentimer beim bombe setzen
// ist zeit abgelaufen wird lobby aktualisiert und wieder an alle gesendet
async function startBombTimer(lobbyId, time, bombId) {
  // warte (time) ms
  await new Promise((r) => setTimeout(r, time));
  let lobby = getLobby(lobbyId);

  let gres = game.explodeBomb(lobby[1], bombId);

  // schreibe lobbydaten & pubish via mqtt
  gamedata.lobbies[lobby[0]] = gres;
  publishGameData(gres);
}

// starte Scantimer beim Scan benutzen
// ist zeit abgelaufen, wird lobby aktualisiert und wieder an alle gesendet
async function startScanTimer(lobbyId, time, team) {
  // warte (time) ms
  await new Promise((r) => setTimeout(r, time));
  let lobby = getLobby(lobbyId);

  let gres = game.resetScan(lobby[1], team);

  // schreibe lobbydaten & pubish via mqtt
  gamedata.lobbies[lobby[0]] = gres;
  publishGameData(gres);
}

// erstelle zufallszahl zwischen min und max
function randomIntFromInterval(min, max) {
  // min and max included
  return Math.floor(Math.random() * (max - min + 1) + min);
}
