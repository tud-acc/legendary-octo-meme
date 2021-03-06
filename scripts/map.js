var MAP;
var STARTCOORD = [10.066274498130579, 48.841235087603536]; // HS Aalen
var ZOOMLVL = 14;
//------------------------------------------------------------------//

//------------------------------------------------------------------//
//  Maplayer Setup
//------------------------------------------------------------------//

// BaseLayer OSM Tilelayer
var tl_osm = new ol.layer.Tile({
  source: new ol.source.XYZ({
    url: "https://a.tile.openstreetmap.de/{z}/{x}/{y}.png"
  })
});

// VectorLayer Spielfeldgrenzen
var vl_Border = new ol.layer.Vector({
  source: new ol.source.Vector({}),
  style: f_styleBorders
});

//VectorLayer Empfohlene Flaggenpunkte
var vl_RecommendedPoints = new ol.layer.Vector({
  source: new ol.source.Vector({}),
  style: f_styleRecommended
});

// VectorLayer Spieler -- Icon style wird separat gesetzt
var vl_Player = new ol.layer.Vector({
  source: new ol.source.Vector({}),
  dataProjection: "EPSG:4326",
  featureProjection: "EPSG:3857",
  style: f_stylePlayer
});

// VectorLayer Flags -- Icon style wird separat gesetzt
var vl_Flags = new ol.layer.Vector({
  source: new ol.source.Vector({}),
  style: f_styleFlagNeutral
});

// VectorLayer Perks -- Icon style wird separat gesetzt
var vl_Perks = new ol.layer.Vector({
  source: new ol.source.Vector({})
  //style: f_styleFlagNeutral
});

//------------------------------------------------------------------//
//  Map Funktionen
//------------------------------------------------------------------//

// MapSetup Spiel erstellen
function mapSetupCreateGame() {
  // Erstelle OpenLayers Map
  var pos = ol.proj.fromLonLat(STARTCOORD);
  MAP = new ol.Map({
    target: "map",
    layers: [tl_osm, vl_Border, vl_RecommendedPoints, vl_Player, vl_Flags, vl_Perks],
    view: new ol.View({
      center: pos,
      zoom: ZOOMLVL
    })
  });

  // Erstelle Event-Listener Koordinaten beim klicken
  MAP.on("singleclick", function (evt) {
    let coord = ol.proj.transform(evt.coordinate, "EPSG:3857", "EPSG:4326");
    clickHandler(coord);
  });

  switchInputMode(1);
}

// MapSetup beim Seitenaufruf
function mapSetup() {
  // Erstelle OpenLayers Map
  var pos = ol.proj.fromLonLat(startCoord);
  MAP = new ol.Map({
    target: "map",
    layers: [tl_osm, vl_Border, vl_RecommendedPoints, vl_Player, vl_Flags, vl_Perks],
    view: new ol.View({
      center: pos,
      zoom: zoomLevel
    })
  });

  // Erstelle Event-Listener Koordinaten beim klicken
  MAP.on("singleclick", function (evt) {
    let coord = ol.proj.transform(evt.coordinate, "EPSG:3857", "EPSG:4326");
    clickHandler(coord);
  });
}

// Klick Handler beim klicken in die Karte
function clickHandler(coord) {
  console.log("Click on: " + coord);
  let payload_0;

  switch (INPUTMODE) {
    case 0: // setze PlayerPos
      PLAYERPOS = coord;
      redrawPlayerPos();

      payload_0 = {
        lobbyid: getCookie("lobbyid"),
        team: getCookie("team"),
        playerid: getSessionID(),
        pos: coord
      };
      tx_game("updatepos", [payload_0]);
      break;

    case 1: // setze Mapgrenze
      BORDERS.push(coord);
      redrawBorder();
      break;

    case 2: // setze Flagge
      if (isInGameArea(coord)) {
        FLAGS.push(coord);
        redrawFlags();
      } else {
        alert("Gew??hlter Punkt liegt auserhalb des Spielfeldes.");
      }

      break;

    case 3: // setze Bombe
      payload_0 = {
        lobbyid: getCookie("lobbyid"),
        team: getCookie("team"),
        coord: coord
      };
      tx_game("setbomb", [payload_0]);
      switchInputMode(0);
      break;
    default: // do Nothing
  }
}

// frage Aktuelle Kartenposition und zoomstufe ab
// r??ckgabe [ [lon,lat], zoom(int) ]
function getCurrentMapView() {
  let view = MAP.getView();

  let center = ol.proj.toLonLat(view.getCenter());
  let zoom = Math.ceil(view.getZoom());
  return [center, zoom];
}

function isInGameArea(coord) {
  let border = [];
  BORDERS.forEach((b) => {
    border.push(b);
  });
  border.push(BORDERS[0]);
  let gameArea = new ol.geom.Polygon([border]);

  if (gameArea.intersectsCoordinate(coord)) {
    return true;
  }
  return false;
}

//------------------------------------------------------------------//
//  Layerupdate Funktionen

// Rerender Borders
function redrawBorder() {
  let border = [];
  BORDERS.forEach((b) => {
    border.push(b);
  });
  border.push(BORDERS[0]);
  let p = new ol.Feature({
    type: "icon",
    geometry: new ol.geom.Polygon([border]).transform("EPSG:4326", "EPSG:3857")
  });
  vl_Border.getSource().clear();
  vl_Border.getSource().addFeature(p);
}

// Rerender Player Positions:
function redrawPlayerPos() {
  vl_Player.getSource().clear();
  // Draw Enemys if Scan is enabled (else array empty)
  ENEMYPOS.forEach((enemy) => {
    let e = new ol.Feature({
      featureProjection: "EPSG:3857",
      type: "icon",
      geometry: new ol.geom.Point(enemy).transform("EPSG:4326", "EPSG:3857")
    });
    e.setStyle(f_stylePlayerEnemy);
    vl_Player.getSource().addFeature(e);
  });

  // Draw Teammember position
  TEAMPOS.forEach((mate) => {
    let m = new ol.Feature({
      featureProjection: "EPSG:3857",
      type: "icon",
      geometry: new ol.geom.Point(mate).transform("EPSG:4326", "EPSG:3857")
    });
    m.setStyle(f_stylePlayerTeam);
    vl_Player.getSource().addFeature(m);
  });

  let x = new ol.Feature({
    featureProjection: "EPSG:3857",
    type: "icon",
    geometry: new ol.geom.Point(PLAYERPOS).transform("EPSG:4326", "EPSG:3857")
  });
  x.setStyle(f_stylePlayer);
  vl_Player.getSource().addFeature(x);
}

// Zeichne Flaggen radius in metern
function drawFlagRadius(flag) {
  // Radius umrechnen
  let r = RADIUS / ol.proj.getPointResolution("EPSG:4326", 1, flag, "m");

  let c = new ol.Feature({
    featureProjection: "EPSG:3857",
    type: "icon",
    geometry: new ol.geom.Circle(flag, r).transform("EPSG:4326", "EPSG:3857")
  });
  c.setStyle(f_styleFlagArea);
  vl_Flags.getSource().addFeature(c);
}

// Rerender Flags
function redrawFlags() {
  vl_Flags.getSource().clear();

  // Neutrale Flaggen:
  FLAGS.forEach((flag) => {
    drawFlagRadius(flag);
    let f = new ol.Feature({
      featureProjection: "EPSG:3857",
      type: "icon",
      geometry: new ol.geom.Point(flag).transform("EPSG:4326", "EPSG:3857")
    });
    f.setStyle(f_styleFlagNeutral);
    vl_Flags.getSource().addFeature(f);
  });

  // Team Flaggen:
  FLAGS_TEAM.forEach((flag) => {
    drawFlagRadius(flag);
    let f = new ol.Feature({
      featureProjection: "EPSG:3857",
      type: "icon",
      geometry: new ol.geom.Point(flag).transform("EPSG:4326", "EPSG:3857")
    });
    f.setStyle(f_styleFlagTeam);
    vl_Flags.getSource().addFeature(f);
  });

  // Gegner Flaggen:
  FLAGS_ENEMY.forEach((flag) => {
    drawFlagRadius(flag);
    let f = new ol.Feature({
      featureProjection: "EPSG:3857",
      type: "icon",
      geometry: new ol.geom.Point(flag).transform("EPSG:4326", "EPSG:3857")
    });
    f.setStyle(f_styleFlagEnemy);
    vl_Flags.getSource().addFeature(f);
  });
}

// Rerender Perks
function redrawGadgets() {
  vl_Perks.getSource().clear();

  GADGETS.forEach((perk) => {
    console.log(perk);
    let p = new ol.Feature({
      featureProjection: "EPSG:3857",
      type: "icon",
      geometry: new ol.geom.Point(perk.coord).transform("EPSG:4326", "EPSG:3857")
    });
    drawPerkRadius(perk.coord, perk.radius, perk.collectable, perk.owner);
    if (perk.type == "bomb") {
      p.setStyle(f_stylePerkBomb);
    } else {
      p.setStyle(f_stylePerkScan);
    }
    vl_Perks.getSource().addFeature(p);
  });
}

function drawRecommendedPoints() {
  let rec = [];
  RECOMMENDED.forEach((n) => {
    if (isInGameArea(n)) {
      rec.push(n);
      let p = new ol.Feature({
        featureProjection: "EPSG:3857",
        type: "icon",
        geometry: new ol.geom.Point(n).transform("EPSG:4326", "EPSG:3857")
      });
      vl_RecommendedPoints.getSource().addFeature(p);
    }
  });
  RECOMMENDED = rec;
}

// Zeichne Perk Radius (sammelbar oder explosion)
function drawPerkRadius(coord, radius, collectable, owner) {
  // Radius umrechnen
  let r = radius / ol.proj.getPointResolution("EPSG:4326", 1, coord, "m");

  let c = new ol.Feature({
    featureProjection: "EPSG:3857",
    type: "icon",
    geometry: new ol.geom.Circle(coord, r).transform("EPSG:4326", "EPSG:3857")
  });
  c.setStyle(f_stylePerkCollectable);
  if (!collectable) {
    if (getCookie("team") == "A" && owner == 1) {
      c.setStyle(f_stylePerkExplodableTeam);
    } else {
      c.setStyle(f_stylePerkExplodable);
    }
  }
  vl_Perks.getSource().addFeature(c);
}

// Leert Border Layer
function clearBorder() {
  vl_Border.getSource().clear();
  vl_RecommendedPoints.getSource().clear();
}

// Leere Recommended Layer
function clearRecommendedPoints() {
  vl_RecommendedPoints.getSource().clear();
}

//------------------------------------------------------------------//
//  Maplayer Styles
//------------------------------------------------------------------//

// Mapborder Style
function f_styleBorders(w) {
  return new ol.style.Style({
    stroke: new ol.style.Stroke({
      color: "red",
      width: 2
    })
  });
}

function f_styleRecommended(w) {
  return new ol.style.Style({
    image: new ol.style.Icon({
      anchor: [0.5, 0.5],
      opacity: 1,
      src: "./img/markerX.svg",
      scale: 0.12
    })
  });
}

// PlayerPosition style
function f_stylePlayer(w) {
  return new ol.style.Style({
    image: new ol.style.Icon({
      anchor: [0.5, 1],
      opacity: 1,
      src:
        "data:image/svg+xml;utf8," +
        '<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">' +
        '<path d="M 100 300 L 200 400 L 300 300 A 141 141 0 1 0 100 300" stroke="red" fill="green" stroke-width="2" fill-opacity="0.6"/></svg>',
      scale: 0.15
    })
  });
}

// TeamPlayerPosition style
function f_stylePlayerTeam(w) {
  return new ol.style.Style({
    image: new ol.style.Icon({
      anchor: [0.5, 1],
      opacity: 1,
      src:
        "data:image/svg+xml;utf8," +
        '<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">' +
        '<path d="M 100 300 L 200 400 L 300 300 A 141 141 0 1 0 100 300" stroke="red" fill="blue" stroke-width="2" fill-opacity="0.6"/></svg>',
      scale: 0.15
    })
  });
}

// EnemyPlayerPosition style
function f_stylePlayerEnemy(w) {
  return new ol.style.Style({
    image: new ol.style.Icon({
      anchor: [0.5, 1],
      opacity: 1,
      src:
        "data:image/svg+xml;utf8," +
        '<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">' +
        '<path d="M 100 300 L 200 400 L 300 300 A 141 141 0 1 0 100 300" stroke="red" fill="red" stroke-width="2" fill-opacity="0.6"/></svg>',
      scale: 0.15
    })
  });
}

// Flag-Area style
function f_styleFlagArea(w) {
  return new ol.style.Style({
    stroke: new ol.style.Stroke({
      color: "gray",
      width: 2
    })
  });
}

// Neutral Flag style
function f_styleFlagNeutral(w) {
  return new ol.style.Style({
    image: new ol.style.Icon({
      anchor: [0.5, 1],
      opacity: 1,
      src: "./img/flagNeutral.svg",
      scale: 0.15
    })
  });
}

// Team Flag style
function f_styleFlagTeam(w) {
  return new ol.style.Style({
    image: new ol.style.Icon({
      anchor: [0.5, 1],
      opacity: 1,
      src: "./img/flagTeam.svg",
      scale: 0.15
    })
  });
}

// Enemy Flag style
function f_styleFlagEnemy(w) {
  return new ol.style.Style({
    image: new ol.style.Icon({
      anchor: [0.5, 1],
      opacity: 1,
      src: "./img/flagEnemy.svg",
      scale: 0.15
    })
  });
}

// Perk Scan Style
function f_stylePerkScan(w) {
  return new ol.style.Style({
    image: new ol.style.Icon({
      anchor: [0.5, 0.5],
      opacity: 1,
      src: "./img/radar.svg",
      scale: 0.2
    })
  });
}

// Perk Bomb Style
function f_stylePerkBomb(w) {
  return new ol.style.Style({
    image: new ol.style.Icon({
      anchor: [0.5, 0.5],
      opacity: 1,
      src: "./img/bomb.svg",
      scale: 0.15
    })
  });
}

// Perk Collectable
function f_stylePerkCollectable(w) {
  return new ol.style.Style({
    stroke: new ol.style.Stroke({
      color: "green",
      width: 3
    }),
    fill: new ol.style.Fill({
      color: "rgba(0,255,0,0.2)"
    })
  });
}

// Perk explodable
function f_stylePerkExplodable(w) {
  return new ol.style.Style({
    stroke: new ol.style.Stroke({
      color: "red",
      width: 3
    }),
    fill: new ol.style.Fill({
      color: "rgba(255,0,0,0.2)"
    })
  });
}

//perk explodable team
function f_stylePerkExplodableTeam(w) {
  return new ol.style.Style({
    stroke: new ol.style.Stroke({
      color: "blue",
      width: 3
    }),
    fill: new ol.style.Fill({
      color: "rgba(0,0,255,0.2)"
    })
  });
}
//-------------------------------
