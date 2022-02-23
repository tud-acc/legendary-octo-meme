var message;

async function mqtt_sub(topic) {
  message = new mqtt_fetch(topic);
  console.log("message: " + message);

  await message.init("193.197.230.34", 1884);
  //await message.init("192.168.0.90", 1884);

  if (topic == "lobby") {
    message.set_callback(topic, rx_lobby, true);
    await message.send({ hallo: "hello" });
  } else {
    message.set_callback(topic, rx_game, true);
  }
}

function rx_lobby(topic, data) {
  // data ist bereits JSON Object, kein parse noetig

  var lobbyindex = Object.keys(data.lobbies).length;

  var lobbystring = "<form method='POST' onsubmit='sub_game()'>";

  for (var i = 0; i < lobbyindex; i++) {
    lobbystring += "<input type='radio' value='" + data.lobbies[i].id + "' name='lobbyid' id='" + i + "'>";
    lobbystring += "<label for='" + i + "'> " + data.lobbies[i].name + "</label><br>";
  }
  lobbystring += "<input type='submit' class='button center blue' value='Lobby beitreten'>";
  lobbystring += "</form>";
  document.getElementById("lobbyuebersicht").innerHTML = lobbystring;
}

function sub_game() {
  var selection = document.querySelector('input[name="lobbyid"]:checked').value;
  setCookie("lobbyid", selection, 1);
}

function rx_game(topic, data) {
  if (data.status == "mapsetup_b") {
    console.log("rx_game: mapsetup_b");

    parseGameData(data.payload[0]);
  } else if (data.status == "playernames_b") {
    console.log("rx_game: playernames");

    var lobbynameindexteamA = data.payload[0].teamA.length;
    var lobbynameindexteamB = data.payload[0].teamB.length;
    var lobbynamesteamA = "";
    var lobbynamesteamB = "";

    for (var i = 0; i < lobbynameindexteamA; i++) {
      lobbynamesteamA += data.payload[0].teamA[i] + "<br>";
    }
    for (var i = 0; i < lobbynameindexteamB; i++) {
      lobbynamesteamB += data.payload[0].teamB[i] + "<br>";
    }

    document.getElementById("teamA").innerHTML = lobbynamesteamA;

    document.getElementById("teamB").innerHTML = lobbynamesteamB;
  } else if (data.status == "update_b") {
    console.log("rx_game: update");
    parseGameData(data.payload[0]);
  } else if (data.status == "destroylobby_b") {
    console.log("rx_game: destroylobby_b");

    delete_cookie();
    window.location.replace("/node.js");
  } else if (data.status == "startgame_b") {
    console.dir("rx_game: startgame_b");

    if (getCookie("lobbyid") != getSessionID()) {
      console.log("rx_game: startgame_b");
      game_b_setcookie();
      window.location.replace("/game.js");
    }
  }
}

async function tx_game(status, payload) {
  var request = { status: "", payload: [] };
  request.status = status;
  request.payload = payload;
  await message.send(JSON.stringify(request));
}

function reset_callback_lobbyuebersicht() {
  console.dir("reset calback lobbyuebersicht");
  message.delete_callback("lobby");
}

function reset_callback_game() {
  console.dir("reset calback game");
  message.delete_callback("game");
}
