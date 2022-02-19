/*  
    Overpass Modul für NodeJs Backend
    
    [!] Benötigt node-fetch 
    npm install node-fetch@2.6.0
*/
const fetch = require('node-fetch');


//------------------------------------------------------------------//
//  externe Funktionen
//------------------------------------------------------------------//

let debug = "48.86457932365886 10.047451335906983 48.87032409845702 10.055347759246828 48.86563799266281 10.063115436553955 48.862405453097836 10.053287822723389";

async function fetchData(polygon){
    let q1 = escapeQueryChars(query1);
    let q2 = escapeQueryChars(query2);
    
    let ovpQuery = base_url + q1 + polyToString(polygon) + q2;
    
    let json =  await fetchOvpQuery(ovpQuery);
    
    return extractCoords(json);
}


// Modulexport
module.exports = { 
    fetchData
};

//------------------------------------------------------------------//
//  interne Funktionen 
//------------------------------------------------------------------//

// Fetch Json via Overpass API
async function fetchOvpQuery(url){
    
    console.log(url)
    
    let result = await fetch(url);
    let json = await result.json();
    
    //console.log(json);
    return json;
    
}

// wandelt polygon array zu string 
function polyToString(polygon){
    let s = "";
    polygon.forEach(p =>{
        s += " " + p[1] + " "+p[0]
    });
    return s.trim().replace(/ /g, "%20");
}

function escapeQueryChars(q){
    q = q.replace(/(\r\n|\n|\r)/gm, "");
    q = q.replace(/\s/g,'%20');
    q = q.replace(/"/g, '\"');
    return q;
}

// Erstelle Koordinaten array
function extractCoords(json){
    let nodes = [];
    
    json.elements.forEach(e =>{
        if(e.type == "node"){
            nodes.push([e.lon, e.lat]);
        }
        else if(e.type == "way"){
            let len = Object.keys(e.geometry).length -1;
            nodes.push([e.geometry[0].lon, e.geometry[0].lat]);
            nodes.push([e.geometry[len].lon, e.geometry[len].lat])
        }
    });
    
    console.log(nodes)
    return nodes;
}

//------------------------------------------------------------------//
//  OVP Query vorlage
//------------------------------------------------------------------//
const base_url = "https://overpass-api.de/api/interpreter?data=";

const query1 = `
[out:json];
nwr(poly:"
`;

const query2 = `
")-> .all;
(
  node.all["amenity"="hunting_stand"];
  node.all["amenity"="bench"];
  node.all["tourism"="viewpoint"];
  node.all["historic"="archaeological_site"];
  node.all["historic"="wayside_cross"];
  node.all["power"="pole"];
  node.all["natural"="peak"];
  node.all["highway"="bus_stop"];
  
  relation.all["playground"];
  
  way.all["highway"];
);

out geom;
`;