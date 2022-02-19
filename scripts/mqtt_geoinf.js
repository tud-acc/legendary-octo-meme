var message;

async function mqtt_sub(topic) {
  message = new mqtt_fetch(topic);
  console.log("message: " + message);

  await message.init("193.197.230.34", 1884);
  //await message.init("192.168.0.90", 1884);

  console.dir("topic:");
  console.dir(topic);
  if (topic == "lobby") {
    message.set_callback(topic, rx_lobby, true);
    await message.send({ hallo: "pisse" });
  } else {
    message.set_callback(topic, rx_game, true);
    var payload = {
      status: "getnames",
      payload: [{ lobbyid: getCookie("lobbyid") }]
    };
    await message.send(payload);
  }
  //await message.send(payload);
}

function rx_lobby(topic, data) {
  // data ist bereits JSON Object, kein parse noetig
  console.log("lobbydata received");

  console.log(data);
  console.dir("nach data");
  // console.log(JSON.parse(data));
  console.dir("nach parsedata");

  console.dir(data.lobbies[0]);

  var lobbyindex = Object.keys(data.lobbies).length;
  console.dir("lobbyindex");
  console.dir(lobbyindex);

  var lobbystring = "<form method='POST' onsubmit='sub_game()'>";

  for (var i = 0; i < lobbyindex; i++) {
    lobbystring +=
      "<input type='radio' value='" +
      data.lobbies[i].id +
      "' name='lobbyid' id='" +
      i +
      "'>";
    lobbystring +=
      "<label for='" + i + "'> " + data.lobbies[i].name + "</label><br>";
  }
  lobbystring +=
    "<input type='submit' class='button center blue' value='Lobby beitreten'>";
  lobbystring += "</form>";
  console.dir(lobbystring);
  document.getElementById("lobbyuebersicht").innerHTML = lobbystring;
  /*
    form(method="POST")
    input(type="submit" class='button center blue' value="Lobby beitreten")
 */
}

function sub_game() {
  console.log("sub game anfang");
  var selection = document.querySelector('input[name="lobbyid"]:checked').value;
  console.dir(selection);
  setCookie("lobbyid", selection, 1);
  //mqtt_sub("game");
}

function rx_game(topic, data) {
  console.log("gamedata received");
  console.log(data);

  var lobbynameindexteamA = data.payload[0].teamA.length;
  var lobbynameindexteamB = data.payload[0].teamB.length;

  console.dir(lobbynameindexteamA);
  console.dir(lobbynameindexteamB);

  var lobbynamesteamA = "";
  var lobbynamesteamB = "";

  for (var i = 0; i < lobbynameindexteamA; i++) {
    lobbynamesteamA += data.payload[0].teamA[i] + "<br>";
  }
  for (var i = 0; i < lobbynameindexteamB; i++) {
    lobbynamesteamB += data.payload[0].teamB[i] + "<br>";
  }

  console.dir(lobbynamesteamA);
  console.dir(lobbynamesteamB);

  //document.getElementById("lobbynames").innerHTML = lobbynamesteamA + lobbynamesteamB;

  document.getElementById("teamA").innerHTML = lobbynamesteamA;

  document.getElementById("teamB").innerHTML = lobbynamesteamB;
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
