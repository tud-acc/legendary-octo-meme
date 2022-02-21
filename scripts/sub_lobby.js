function onload_body_lobby() {
  //reset_callback_lobbyuebersicht();

  if (getCookie("lobbyid") == null) {
    setCookie("lobbyid", getSessionID(), 1);
  }

  if (getCookie("lobbyid") == getSessionID()) {
    alert("gleiche lobby und session id");
    document.getElementById("startbutton").innerHTML = '<button class="button blue" type="button">Spiel starten!</button>';
  }

  mqtt_sub("game");
}
