function onload_body_lobby() {
  //reset_callback_lobbyuebersicht();

  if (getCookie("lobbyid") == null) {
    setCookie("lobbyid", getSessionID(), 1);
  }

  if (getCookie("lobbyid") == getSessionID()) {
    alert("gleiche lobby und session id");
    document.getElementById("startbutton").innerHTML = '<br><a href="/game.js" class="button blue" type="button" onclick="game_setcookie()">Spiel starten!</a>';
  }
  alert("mqtt sub game");
  mqtt_sub("game/" + getCookie("lobbyid"));
  tx_game("getnames", [{ lobbyid: getCookie("lobbyid") }]);
}
