const mapboxgl = require('mapbox-gl');
import { MapboxStyleDefinition, MapboxStyleSwitcherControl } from "mapbox-gl-style-switcher";
import "mapbox-gl-style-switcher/styles.css";

mapboxgl.accessToken = 'pk.eyJ1IjoicnVjaGl0Z2FyZyIsImEiOiJjazRnaHBoaG8wd2p1M25vMjYwOWJncGtjIn0.5xb7bYFfwNXTXAbfH5yigw';
let map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/streets-v11',
  center: [31.078924053154672, -29.7],
  zoom: 11,
});

let dirHead = "./data/geojson/";
let menu = document.getElementById('menu');
let geojsons = [];

let layers = ["Built Up", "Open Space", "Tree Cover"];
let colors = ["red", "blue", "green"];
let layersWithoutSpace = [];
for(let i in layers) {
  layersWithoutSpace.push(layers[i].replace(/\s/g, ''));
}

fetch("./geojsons", {
  method: "get",
}).then(response => response.json())
  .then(jsonData => {
    geojsons = jsonData;
  })
  .then(() => {
    for(let i = 0; i < geojsons.length; i++) {
      let color;
      for(let j in layersWithoutSpace) {
        if(geojsons[i].includes(layersWithoutSpace[j])) color = colors[j];
      }

      map.addLayer({
        'id': geojsons[i],
        'type': 'fill',
        'source': {
          'type': 'geojson',
          'data': dirHead + geojsons[i] + ".geojson"
        },
        'paint': {
          'fill-color': color,
          'fill-opacity': 0.7
        }
      });
      if(geojsons[i].includes("2016") || geojsons[i].includes("2017")) {
        map.setLayoutProperty(geojsons[i], 'visibility', 'none');
      }
      // add checkbox
      let checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = false;
      // layer name
      let classNames = geojsons[i].split('_');
      geojson = classNames[2] + ' ' + classNames[3];
      // add span
      let span = document.createElement('span');
      span.textContent = geojson;
      let div = document.createElement('div');
      div.appendChild(checkbox);
      div.appendChild(span);
      menu.appendChild(div);
      checkbox.onchange = function(e) {
        let clickedLayer = geojsons[i];
        e.preventDefault();
        e.stopPropagation();

        let visibility = map.getLayoutProperty(clickedLayer, 'visibility');

        if (visibility === 'visible') {
          map.setLayoutProperty(clickedLayer, 'visibility', 'none');
          checkbox.checked = false;
        } else {
          checkbox.checked = true;
          map.setLayoutProperty(clickedLayer, 'visibility', 'visible');
        }
      };
      if(checkbox.nextSibling.textContent.includes("2018")) checkbox.checked = true;
    }
  });

let legend = document.getElementById("legend");
for (let i in layers) {
  let layer = layers[i];
  let color = colors[i];
  let item = document.createElement('div');
  let key = document.createElement('span');
  key.className = 'legend-key';
  key.style.backgroundColor = color;

  let value = document.createElement('span');
  value.innerHTML = layer;
  item.appendChild(key);
  item.appendChild(value);
  legend.appendChild(item);
}

let layerList = document.getElementById('basemap');
let inputs = layerList.getElementsByTagName('input');

function switchLayer(layer) {
  let layerId = layer.target.id;
  map.setStyle('mapbox://styles/mapbox/' + layerId);
}

for (let i = 0; i < inputs.length; i++) {
  inputs[i].onclick = switchLayer;
}