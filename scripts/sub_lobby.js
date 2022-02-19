

function onload_body_lobby(){

    //reset_callback_lobbyuebersicht();

    if(getCookie("lobbyid") == null){
        setCookie("lobbyid", getSessionID(), 1);
    }


    mqtt_sub("game");

}




