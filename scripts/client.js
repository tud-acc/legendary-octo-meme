var INPUTMODE = 0;
var RECOMMENDED;
var PLAYERPOS, TEAMPOS, ENEMYPOS;
var BORDERS = [];
var FLAGS, FLAGS_TEAM, FLAGS_ENEMY;
var RADIUS = 50;
var GADGETS;
var GADGETS_TEAM;
var SCORE;

// StartKoordinaten OL Canvas:
const startCoord = [10.057, 48.8676];
const zoomLevel = 16;

// Seitenaufruf, Karte erstellen
window.onload = async function () {
  mapSetup(startCoord, zoomLevel);
};

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
  }
}

// Setze Spielfeld zurück
function resetBorder() {
  BORDERS = [];
  // map.js
  clearBorder();
  resetFlags();
}
// setze Flaggen zurück
function resetFlags() {
  FLAGS = [];
  // map.js
  redrawFlags();
}

//------------------------------------------------------------------//
//  MQTT
//------------------------------------------------------------------//

//------------------------------------------------------------------//
//  Hilfsfunktionen / Spielfunktionen
//------------------------------------------------------------------//

// verarbeite Spieldaten (JSON)
function parseGameData(json) {
  BORDERS = json.gameArea;
  FLAGS = json.flags;
  FLAGS_TEAM = json.flagsTeam;
  FLAGS_ENEMY = json.flagsEnemy;
  TEAMPOS = json.teamPos;
  ENEMYPOS = json.enemyPos;
  GADGETS = json.gadgets;
  GADGETS_TEAM = json.teamGadgets;
  SCORE = json.score;

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

  if (GADGETS_TEAM.scan > 0) {
    document.getElementById("btn_scan").disabled = false;
  } else {
    document.getElementById("btn_scan").disabled = true;
  }
}

// löse Scan aus
function useScan() {
  //deaktiviere Scan button, wenn kein weiterer Scan verfügbar ist
  if (GADGETS_TEAM.scan - 1 < 1) {
    document.getElementById("btn_scan").disabled = true;
  }
  // ToDo:
  // sende ans backend
}

// erstelle gamedata fürs Backend @Spiel-erstellen
// rückgabe als json Objekt
function createGameData() {
  let newGameData = {
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

  return newGameData;
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
