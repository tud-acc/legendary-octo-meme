async function onload_body_game() {
  //reset_callback_lobbyuebersicht();

  /*
  if (getCookie("lobbyid") == null) {
    setCookie("lobbyid", getSessionID(), 1);
  }

  if (getCookie("lobbyid") == getSessionID()) {
    alert("gleiche lobby und session id");
    document.getElementById("startbutton").innerHTML = '<br><a href="/game.js" class="button blue" type="button" onclick="game_setcookie()">Spiel starten!</a>';
  }
*/
  var topic = "game/" + getCookie("lobbyid") + "/" + getCookie("team");
  console.dir("sub_game.js: topic: " + topic);
  await mqtt_sub(topic);

  tx_game("mapsetup", [{ lobbyid: getCookie("lobbyid"), team: getCookie("team") }]);
}
