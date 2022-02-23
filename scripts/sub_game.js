async function onload_body_game() {
  var topic = "game/" + getCookie("lobbyid") + "/" + getCookie("team");
  await mqtt_sub(topic);

  tx_game("mapsetup", [{ lobbyid: getCookie("lobbyid"), team: getCookie("team") }]);
}
