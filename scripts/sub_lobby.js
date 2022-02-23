async function onload_body_lobby() {
  //reset_callback_lobbyuebersicht();

  if (getCookie("lobbyid") == null) {
    setCookie("lobbyid", getSessionID(), 1);
  }

  if (getCookie("lobbyid") == getSessionID()) {
    document.getElementById("startbutton").innerHTML = '<br><a href="/game.js" class="button blue" type="button" onclick="game_setcookie()">Spiel starten!</a>';
  }

  // owntracks config file
  var config = {
    _type: "configuration",
    waypoints: [],
    _build: 24600,
    autostartOnBoot: true,
    cleanSession: false,
    clientId: getSessionID(),
    cmd: true,
    connectionTimeoutSeconds: 30,
    debugLog: true,
    deviceId: "gts7xlwifi",
    experimentalFeatures: [],
    fusedRegionDetection: true,
    host: "193.197.230.34",
    ignoreInaccurateLocations: 0,
    ignoreStaleLocations: 0.0,
    info: true,
    keepalive: 3600,
    locatorDisplacement: 500,
    locatorInterval: 900,
    locatorPriority: 2,
    mode: 0,
    monitoring: -1,
    moveModeLocatorInterval: 10,
    mqttProtocolLevel: 4,
    notificationEvents: true,
    notificationGeocoderErrors: true,
    notificationHigherPriority: false,
    notificationLocation: true,
    opencageApiKey: "",
    password: "",
    ping: 30,
    port: 1884,
    pubExtendedData: false,
    pubQos: 1,
    pubRetain: true,
    pubTopicBase: "game/" + getCookie("lobbyid") + "/" + getCookie("team"),
    remoteConfiguration: false,
    reverseGeocodeProvider: "Device",
    sub: false,
    subQos: 2,
    subTopic: "",
    theme: 0,
    tid: "",
    tls: false,
    tlsCaCrt: "",
    tlsClientCrt: "",
    tlsClientCrtPassword: "",
    username: getSessionID(),
    ws: false
  };

  var cd = document.getElementById("configdata");
  cd.value = JSON.stringify(config);

  await mqtt_sub("game/" + getCookie("lobbyid"));
  tx_game("getnames", [{ lobbyid: getCookie("lobbyid") }]);
}
