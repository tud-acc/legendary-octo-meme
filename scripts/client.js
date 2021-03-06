var INPUTMODE = 0;
var RECOMMENDED = [];
var PLAYERPOS = [],
  TEAMPOS,
  ENEMYPOS;
var BORDERS = [];
var FLAGS = [],
  FLAGS_TEAM,
  FLAGS_ENEMY;
var RADIUS = 50;
var GADGETS = [];
var GADGETS_TEAM;
var SCORE;

// StartKoordinaten OL Canvas:
var startCoord = []; //[10.057, 48.8676];
var zoomLevel = 16;

// Schalte zwischen Eingabemodi um
function switchInputMode(mode) {
  INPUTMODE = mode;
  let element = document.getElementById("inputmode");
  switch (INPUTMODE) {
    case 0:
      element.textContent = "Position aktualisieren";
      break;
    case 1:
      element.textContent = "Spielfeld zeichnen";
      break;
    case 2:
      element.textContent = "Flaggen Platzieren";
      break;
    case 3:
      element.textContent = "Bombe platzieren";
      break;

    default: //doNothing
  }
}

// Setze Spielfeld zurück
function resetBorder() {
  BORDERS = [];
  clearBorder();
}
// setze Flaggen zurück
function resetFlags() {
  FLAGS = [];
  redrawFlags();
}

//------------------------------------------------------------------//
//  Hilfsfunktionen / Spielfunktionen
//------------------------------------------------------------------//

// verarbeite Spieldaten (JSON)
function parseGameData(json) {
  console.log("parseGameData" + json);
  BORDERS = json.gameArea;
  FLAGS = json.flags;
  FLAGS_TEAM = json.flagsTeam;
  FLAGS_ENEMY = json.flagsEnemy;
  TEAMPOS = json.teamPos;
  ENEMYPOS = json.enemyPos;
  GADGETS = json.gadgets;
  GADGETS_TEAM = json.teamGadgets;
  SCORE = json.score;

  // erstaufruf --> Mapsetup aufrufen
  if (startCoord.length == 0) {
    startCoord = json.startCoords;
    zoomLevel = json.zoomLevel;
    mapSetup();
  }

  // redraw VectorLayers
  redrawBorder();
  redrawPlayerPos();
  redrawFlags();
  redrawGadgets();

  // update Score
  document.getElementById("scoreTeam").textContent = SCORE;

  // enable/disable bom/scan buttons
  if (GADGETS_TEAM.bombe > 0) {
    document.getElementById("btn_bomb").disabled = false;
  } else {
    document.getElementById("btn_bomb").disabled = true;
  }
  document.getElementById("btn_bomb").innerText = "Setze Bombe [" + GADGETS_TEAM.bombe + "]";

  if (GADGETS_TEAM.scan > 0) {
    document.getElementById("btn_scan").disabled = false;
  } else {
    document.getElementById("btn_scan").disabled = true;
  }
  document.getElementById("btn_scan").innerText = "Nutze Scan [" + GADGETS_TEAM.scan + "]";
}

// löse Scan aus
function useScan() {
  //deaktiviere Scan button, wenn kein weiterer Scan verfügbar ist
  if (GADGETS_TEAM.scan - 1 < 1) {
    document.getElementById("btn_scan").disabled = true;
  }
  let payload_0 = {
    lobbyid: getCookie("lobbyid"),
    team: getCookie("team")
  };
  tx_game("usescan", [payload_0]);
}

function switchTeam() {
  console.log(getCookie("lobbyid"));
  let payload_0 = {
    lobbyid: getCookie("lobbyid"),
    playerid: getSessionID()
  };
  if (getCookie("team") === "A") {
    setCookie("team", "B", 1);
  } else {
    setCookie("team", "A", 1);
  }
  tx_game("switchteam", [payload_0]);
}

// erstelle gamedata fürs Backend @Spiel-erstellen
// rückgabe als json Objekt
function createGameData() {
  let newGameData = {
    //lobbyid: getCookie("lobbyid"),
    gamearea: BORDERS,
    flags: [],
    recommendedPoints: RECOMMENDED,
    startCoords: [],
    zoomLevel: 10
  };

  FLAGS.forEach((f) => {
    let flag = {
      owner: 0,
      coord: f
    };
    newGameData.flags.push(flag);
  });

  // lese startcoordinaten
  let mapview = getCurrentMapView();
  newGameData.startCoords = mapview[0];
  newGameData.zoomLevel = mapview[1];

  return JSON.stringify(newGameData);
}

// Frage Markante Punkte im Spielfeld ab
async function fetchRecommendedPoints() {
  // Prüfe ob Spielfeld eine Fläche ist (mindestens 3 Punkte)
  if (BORDERS.length < 3) {
    alert("Fehler: Es muss ein Spielfeld mit mindestens 3 Punkten definiert sein.");
    return;
  }

  let url = "/recommendedPoints.js";
  let params = {
    border: BORDERS
  };

  let options = {
    method: "POST",
    body: JSON.stringify(params)
  };

  let response = await fetch(url, options);
  let content = await response.text();

  let jobj = JSON.parse(content);
  RECOMMENDED = jobj.Points;

  drawRecommendedPoints();
}

//Daten per AJAX- Fetch holen
async function getdata() {
  var response = await fetch("/data.js");
  var content = await response.text();

  var json_data = JSON.parse(content);
  return json_data;
}

function redirect_lobby_game_check() {
  if (getCookie("inlobby") == "true") {
    window.location.replace("/lobby.js");
    return false;
  } else if (getCookie("ingame") == "true") {
    window.location.replace("/game.js");
    return false;
  }
  return true;
}

function joingame_setcookie() {
  setCookie("inlobby", "true", 1);
  setCookie("team", "A", 1);
  setCookie("ingame", "false", 1);
}

function game_setcookie() {
  setCookie("inlobby", "false", 1);
  setCookie("ingame", "true", 1);

  tx_game("startgame", [{ lobbyid: getCookie("lobbyid") }]);
}

function game_b_setcookie() {
  setCookie("inlobby", "false", 1);
  setCookie("ingame", "true", 1);
}

function delete_cookie() {
  eraseCookie("inlobby");
  eraseCookie("ingame");
  eraseCookie("team");
  eraseCookie("lobbyid");
}

function leave_lobby() {
  if (getCookie("lobbyid") == getSessionID()) {
    tx_game("destroylobby", [{ lobbyid: getCookie("lobbyid"), playerid: getSessionID() }]);
    delete_cookie();

    window.location.replace("/node.js");
  } else {
    tx_game("leavelobby", [{ lobbyid: getCookie("lobbyid"), playerid: getSessionID() }]);
    delete_cookie();
    window.location.replace("/node.js");
  }
}

// Setzt einen Cookie mit der lobbyid, falls dieser noch nicht vorhanden ist
// Checkt, ob auf der Map Flaggen, Borders und Recommended Points gesetzt sind
function setowncookie() {
  if (getCookie("lobbyid") != getSessionID()) {
    setCookie("lobbyid", getSessionID(), 1);
  }
  setCookie("inlobby", true, 1);
  setCookie("team", "A", 1);
  setCookie("ingame", "false", 1);

  var mapdata = createGameData();
  document.getElementById("hidden").value = mapdata;

  if (FLAGS.length == 0) {
    alert("Keine Flaggen gesetzt. Bitte Flaggen platzieren.");
    return false;
  }
  if (BORDERS.length < 3) {
    alert("Bitte eine Spielfeldbegrenzung setzen.");
    return false;
  }
  if (RECOMMENDED.length == 0) {
    alert("Bitte nach zeichnen der Spielfeldbegrenzung nach empfohlenen Punkten suchen.");
    return false;
  }
}

function getSessionID() {
  var sid = getCookie("connect.sid");
  sid = sid.split(".");

  sid = sid[0].slice(4, sid[0].length);

  return sid;
}

//var map;
var json_data;

function download_config(filename, text) {
  var element = document.createElement("a");
  element.setAttribute("href", "data:application/octet-stream;charset=utf-8," + encodeURIComponent(text));
  element.setAttribute("download", filename);

  element.style.display = "none";
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}

/**
 * sends a request to the specified url from a form. this will change the window location.
 * @param {string} path the path to send the post request to
 * @param {object} params the parameters to add to the url
 * @param {string} [method=post] the method to use on the form
 */

function post(path, params, method = "post") {
  // The rest of this code assumes you are not using a library.
  // It can be made less verbose if you use one.
  const form = document.createElement("form");
  form.method = method;
  form.action = path;

  for (const key in params) {
    if (params.hasOwnProperty(key)) {
      const hiddenField = document.createElement("input");
      hiddenField.type = "hidden";
      hiddenField.name = key;
      hiddenField.value = params[key];

      form.appendChild(hiddenField);
    }
  }

  document.body.appendChild(form);
  form.submit();
}
