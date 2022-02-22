/*
    Gamelogik NodeJS Modul fürs Backend
    
    const game = require('./jsm_gamelogic');
*/

var BOMBID = 0;
var BOMBTIMER = 10000; // Zeit in ms bis zur explosion
var SCANTIMER = 20000; // Zeit in ms Dauer des Scans

//------------------------------------------------------------------//
//  externe Funktionen
//------------------------------------------------------------------//

function update(lobby) {
  let l = checkFlags(lobby);
  l = checkGadgets(l);
  return l;
}

// aktualisiere position des Spielers
function updatePlayerPos(lobby, team, playerId, pos) {
  let pTeam = team == "A" ? lobby.teamA : lobby.teamB;

  pTeam.players.forEach((p) => {
    if (p.id == playerId) {
      p.position = pos;

      if (team == "A") {
        lobby.teamA = pTeam;
      } else {
        lobby.teamB = pTeam;
      }
      return update(lobby);
    }
  });
  return lobby; // falls spieler nicht gefunden
}

// Setzt eine Bombe für das entsprechende Team
// gibt aktualiisierte lobby zurück
function setBomb(lobby, team, coord) {
  BOMBID++;
  let bomb = {
    type: "bomb",
    collectable: false, // false = explodierende bombe
    coord: [],
    radius: 100, // collectable true = Radius zum sammeln else Explosionsradius
    time: 10000, // zeit bis explosion in ms
    owner: 0,
    id: BOMBID
  };
  let owner;

  if (team == "A") {
    if (lobby.teamA.gadgets.bombe < 0) {
      // prüfe ob Team bombe setzen darf
      return lobby;
    }
    lobby.teamA.gadgeds.bombe--;
    owner = 1;
  } else {
    if (lobby.teamB.gadgets.bombe < 0) {
      // prüfe ob Team bombe setzen darf
      return lobby;
    }
    lobby.teamB.gadgets.bombe--;
    owner = 2;
  }

  bomb.owner = owner;
  bomb.coord = coord;

  lobby.gadgets.push(bomb);

  return [lobby, BOMBID, BOMBTIMER];
}

// explodiere bombe mit id bombId
// gibt aktualisierte lobby zurück
function explodeBomb(lobby, bombId) {
  let g = lobby.gadgets;

  for (let i = 0; i < g.length; i++) {
    if (!g[i].collectable && g[i].id == bombId) {
      // ziele = generteam des owner teams
      let targetTeam = g[i].owner == 1 ? lobby.teamB : lobby.teamA;

      targetTeam.players.forEach((p) => {
        if (inRange(g[i].radius, g[i].coord, p.position)) {
          targetTeam.score--;
        }
      });

      g.splice(i, 1); // lösche gadget aus array
      break; // bombe gefunden springe aus loop
    }
  }

  lobby.gadgets = g;
  return lobby;
}

// benutzt scan für das entsprechende Team
// gibt aktualisierte lobby zurück
function useScan(lobby, team) {
  if (team == "A") {
    if (lobby.teamA.gadgets.scan < 0) {
      return lobby;
    }
    lobby.teamA.scan = true;
  } else {
    if (lobby.teamB.gadgets.scan < 0) {
      return lobby;
    }
    lobby.teamB.scan = true;
  }

  return [lobby, SCANTIMER];
}

// Deaktiviere Scan bei einem Team
// gibt aktualisierte lobby zurück
function resetScan(lobby, team) {
  if (team == "A") {
    lobby.teamA.scan = false;
  } else {
    lobby.teamB.scan = false;
  }
  return lobby;
}

// Erstelle json Daten für den client
// gibt json objekt zurück -> send mit mqtt
function buildClientJson(lobby, team) {
  let json = {};

  let teamData = team == "A" ? lobby.teamA : lobby.teamB;
  let enemyData = team == "A" ? lobby.teamB : lobby.teamA;

  // Flaggenpunkte sortieren
  let flags = [];
  let flagsTeam = [];
  let flagsEnemy = [];
  lobby.flags.forEach((f) => {
    if (f.owner == 0) {
      flags.push(f.coord);
    } else if (f.owner == 1) {
      if (team == "A") {
        flagsTeam.push(f.coord);
      } else {
        flagsEnemy.push(f.coord);
      }
    } else {
      if (team == "A") {
        flagsEnemy.push(f.coord);
      } else {
        flagsTeam.push(f.coord);
      }
    }
  });

  //-------------
  // PlayerPositions

  let teamPos = [];
  let enemypos = [];

  teamData.players.forEach((p) => {
    teamPos.push(p.position);
  });

  if (teamData.scan) {
    enemyData.players.forEach((p) => {
      enemypos.push(p.position);
    });
  }

  let gameArea = lobby.gamearea;
  let teamGadgets = teamData.gadgets;

  // füge Daten in Json objekt ein
  json.gameArea = gameArea;
  json.flags = flags;
  json.flagsTeam = flagsTeam;
  json.flagsEnemy = flagsEnemy;
  json.teamPos = teamPos;
  json.enemyPos = enemypos;
  json.teamGadgets = teamGadgets;
  json.score = teamData.score;
  json.gadgets = lobby.gadgets;
  json.startCoords = lobby.startCoords;
  json.zoomLevel = lobby.zoomlevel;

  return json;
}

// lese alle Spieler aus beiden Teams
// gibt json mit spielern aus den teams zurück
function getAllPlayers(lobby) {
  let playersA = [];
  let playersB = [];

  lobby.teamA.players.forEach((p) => {
    playersA.push(p.name);
  });

  lobby.teamB.players.forEach((p) => {
    playersB.push(p.name);
  });

  let json = {
    teamA: playersA,
    teamB: playersB
  };
  return json;
}

// Teamwechsel für spieler mit id durchführen
// gibt aktualisierte lobby zurück
function playerSwapTeam(lobby, playerId) {
  let player;

  // prüfe alle Spieler aus team A
  let plist = lobby.teamA.players;
  for (let i = 0; i < plist.length; i++) {
    if (plist[i].id == playerId) {
      player = plist[i];
      lobby.teamA.players.splice(i, 1);
      lobby.teamB.players.push(player);
      return lobby;
    }
  }

  plist = lobby.teamB.players;
  for (let i = 0; i < plist.length; i++) {
    if (plist[i].id == playerId) {
      player = plist[i];
      lobby.teamB.players.splice(i, 1);
      lobby.teamA.players.push(player);
      return lobby;
    }
  }
}

// Loescht einen Spieler aus der uebergebenen lobby
function deleteplayer(lobby, playerId) {
  let player;

  let plist = lobby.teamA.players;
  for (let i = 0; i < plist.length; i++) {
    if (plist[i].id == playerId) {
      delete lobby.teamA.players[i];
    }
  }
  plist = lobby.teamB.players;
  for (let i = 0; i < plist.length; i++) {
    if (plist[i].id == playerId) {
      delete lobby.teamB.players[i];
    }
  }
  return lobby;
}

// Platziert neues zufälliges Gadget zum Sammeln
// gibt aktualisierte lobby zurück
function spawnGadget(lobby) {
  let random = Math.round(Math.random()); // zufällig 0 oder 1
  let type = random ? "scan" : "bomb"; // 0= scan 1= bombe

  let size = lobby.recommendesPoints.length;
  let pos = lobby.recommendesPoints[Math.floor(Math.random() * size)];

  let gadget = {
    type: type,
    collectable: true, // false = explodierende bombe
    coord: pos,
    radius: 50, // collectable true = Radius zum sammeln else Explosionsradius
    time: 10000, // zeit bis explosion in ms
    owner: 0,
    id: -1
  };

  lobby.gadgets.push(gadget);
  return lobby;
}

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// Modulexport
module.exports = {
  update,
  updatePlayerPos,
  setBomb,
  explodeBomb,
  useScan,
  resetScan,
  buildClientJson,
  getAllPlayers,
  playerSwapTeam,
  deleteplayer
};
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

//------------------------------------------------------------------//
//  interne Funktionen
//------------------------------------------------------------------//

// Update flaggen // prüft wie viele Spieler bei der Flagge stehen
function checkFlags(lobby) {
  let updatedFlags = [];
  let a, b;

  // gehe durch alle flaggen
  lobby.flags.forEach((f) => {
    let owner = f.owner;
    a = 0;
    b = 0;

    // prüfe jeden Spieler in Team A
    lobby.teamA.players.forEach((p) => {
      if (inRange(50, f.coord, p.position)) {
        a++;
      }
    });

    // prüfe jeden SPieler in Team B
    lobby.teamB.players.forEach((p) => {
      if (inRange(50, f.coord, p.position)) {
        b++;
      }
    });

    // prüfe an welches Team die Flagge gehen soll
    // Team erhält 10 Punkte
    if (a > b) {
      f.owner = 1;
      lobby.teamA.score++;
    }
    if (b > a) {
      f.owner = 2;
      lobby.teamB.score++;
    }

    updatedFlags.push(f);
  });

  // update lobby
  lobby.flags = updatedFlags;
  return lobby;
}

// Prüfe ob Spieler ein gadget sammeln
function checkGadgets(lobby) {
  let g = lobby.gadgets;

  for (let i = 0; i < g.length; i++) {
    // Prüfe alle Spieler aus Team A
    lobby.teamA.players.forEach((p) => {
      if (inRange(50, g[i].coord, p.position)) {
        if (g.type == "bomb") {
          lobby.teamA.gadgets.bombe++;
        } else {
          lobby.teamA.gadgets.scan++;
        }
        g.splice(i, 1); // entferne gadget aus array da gesammelt
      }
    });
    // Prüfe alle Spieler aus Team B
    lobby.teamB.players.forEach((p) => {
      if (inRange(50, g[i].coord, p.position)) {
        if (g.type == "bomb") {
          lobby.teamB.gadgets.bombe++;
        } else {
          lobby.teamB.gadgets.scan++;
        }
        g.splice(i, 1); // entferne gadget aus array da gesammelt
      }
    });
  }

  lobby.gadgets = g;
  return lobby;
}

//Prüfe ob p1 innerhalb eines Kreises mit center und radius(dist) liegt
// dist = meter ; center, p1 = [lon,lat]
function inRange(dist, center, p1) {
  if (dist >= distance(center, p1)) {
    return true;
  }
  return false;
}

// berechne distanz zwischen zwei koordinaten
// p1,p2 [lon,lat]
function distance(p1, p2) {
  const r = 6371; // Erdradius in km laut Wikipedia

  let lat1 = deg2rad(p1[1]);
  let lon1 = deg2rad(p1[0]);
  let lat2 = deg2rad(p2[1]);
  let lon2 = deg2rad(p2[0]);

  let d = r * Math.acos(Math.sin(lat2) * Math.sin(lat1) + Math.cos(lat2) * Math.cos(lat1) * Math.cos(lon2 - lon1));
  //console.log(d);
  return d * 1000; // umrechung in Meter
}

// umrechnung Grad in Bogenmaß
function deg2rad(deg) {
  return deg * (Math.PI / 180);
}
