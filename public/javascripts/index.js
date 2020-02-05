L.mapbox.accessToken = 'pk.eyJ1IjoicnVjaGl0Z2FyZyIsImEiOiJjazRnaHBoaG8wd2p1M25vMjYwOWJncGtjIn0.5xb7bYFfwNXTXAbfH5yigw';
let map = L.mapbox.map('map').setView([-29.734859, 31.069185], 13);
let zoomControl = map.zoomControl;
map.removeControl(zoomControl);
let geojsons = [];
let layers = ["Built Up", "Open Space", "Tree Cover"];
// count the years
let years = new Set();
let colors = ["red", "blue", "green"];
/*
  layerDict = {
    "Built Up: {
      2018: {
        polygon:
        area:
      }
    },
    "Open Space: {
      2017: {
        polygon:
        area:
      }
    }
  }
*/
let layerDict = {};
let overlays = {};
// record the checkbox for year slider
let overlaySwitcher = {};
let layersWithoutSpace = [];
// default year for year slider
let controlYear = 2019;
for (let i in layers) {
    layersWithoutSpace.push(layers[i].replace(/\s/g, ''));
    layerDict[layers[i]] = {};
    overlays[layers[i]] = L.featureGroup().addTo(map);
    overlaySwitcher[layers[i]] = true;
}
// draw
let featureGroup = L.featureGroup().addTo(map);

let drawControl = new L.Control.Draw({
    edit: {
        featureGroup: featureGroup
    },
    draw: {
        polygon: {
            allowIntersection: false, // Restricts shapes to simple polygons
            drawError: {
                color: '#e1e100', // Color the shape will turn when intersects
                message: '<strong>Oh snap!<strong> you can\'t draw that!' // Message that will show when intersect
            },
            shapeOptions: {
                color: 'black'
            }
        },
        polyline: false,
        rectangle: false,
        circle: false,
        marker: false
    }
})

// download geojsons
fetch("./geojsons", {
    method: "get",
}).then(response => response.json())
    .then(jsonData => {
        geojsons = jsonData;
    })
    .then(() => {
        let dirHead = "./data/geojson/";
        for (let i = 0; i < geojsons.length; i++) {
            let index = 0;
            for (let j in layersWithoutSpace) {
                if (geojsons[i].includes(layersWithoutSpace[j])) index = j;
            }
            // layer name
            let layerName = layers[index];
            let year = parseInt(geojsons[i].split('_')[3]);
            years.add(year);
            let overlay = new L.mapbox.featureLayer()
                .loadURL(dirHead + geojsons[i] + ".geojson");
            overlay.on('ready', function (e) {
                map.fitBounds(overlay.getBounds());
                this.eachLayer(function (layer) {
                    layer.setStyle({
                        stroke: false,
                        fillColor: colors[index],
                        fillOpacity: 0.5
                    });
                });
                try {
                    let features = overlay.getGeoJSON().features;
                    layerDict[layerName][year].area = 0;
                    layerDict[layerName][year].polygon = []
                    for (let i in features) {
                        if (features[i].geometry.type == "Polygon") {
                            let polygon = turf.polygon(features[i].geometry.coordinates);
                            layerDict[layerName][year].polygon.push(polygon);
                            layerDict[layerName][year].area += turf.area(polygon) / 1000000;
                        }
                        if (features[i].geometry.type == "MultiPolygon") {
                            for (let j in features[i].geometry.coordinates) {
                                let polygon = turf.polygon(features[i].geometry.coordinates[j]);
                                layerDict[layerName][year].polygon.push(polygon);
                                layerDict[layerName][year].area += turf.area(polygon) / 1000000;
                            }
                        }
                    }
                    layerDict[layerName][year].area = Math.round(layerDict[layerName][year].area * 1000) / 1000;
                } catch (e) {
                    layerDict[layerName][year].polygon = undefined;
                    layerDict[layerName][year].area = "N/A";
                }
                if (year == "2019") document.getElementById(layerName).textContent = layerDict[layerName][year].area;
            });
            layerDict[layerName][year] = overlay;
        }

        // layer control
        let layerControl = L.control.layers({
            'Streets': L.mapbox.tileLayer('mapbox.streets').addTo(map),
            'Satellite': L.mapbox.tileLayer('mapbox.satellite')
        }, overlays, {
            collapsed: false,
            autoZIndex: true,
        }).addTo(map);
        map.on("overlayadd", function (e) {
            if (layers.includes(e.name)) {
                let year = document.getElementById("yearSlider").value;
                overlaySwitcher[e.name] = true;
                layerDict[e.name][year].addTo(map);
                map.fitBounds(layerDict[e.name][year].getBounds());
            } else {
                map.fitBounds(e.layer.getBounds());
            }
        })
        map.on("overlayremove", function (e) {
            if (layers.includes(e.name)) {
                let year = document.getElementById("yearSlider").value;
                overlaySwitcher[e.name] = false;
                map.removeLayer(layerDict[e.name][year]);
            }
        })
        let buildingDots = new L.featureGroup();
        let buildingFootprints = new L.featureGroup();
        let buildingDotsLoader = new L.mapbox.featureLayer()
            .loadURL("data/BuildingDots.geojson")
            .on('ready', function (e) {
                let json = this.getGeoJSON();
                for (let i = json.features.length - 1; i >= 0; i--) {
                    L.circleMarker(L.latLng(json.features[i].geometry.coordinates[1], json.features[i].geometry.coordinates[0]), {
                        radius: 3,
                        color: "#D35400",
                    }).addTo(buildingDots);
                }
            });
        let buildingFootprintsLoader = new L.mapbox.featureLayer();
        buildingFootprintsLoader.loadURL("data/BuildingFootprints.geojson")
            .on('ready', function (e) {
                this.eachLayer(function (layer) {
                    layer.setStyle({
                        stroke: false,
                        fillColor: "#D35400",
                        fillOpacity: 0.5
                    });
                });
            });

        let farms = new L.mapbox.featureLayer();
        farms.loadURL("data/FarmClassification.geojson")
            .on('ready', function (e) {
                this.eachLayer(function (layer) {
                    layer
                        .setStyle({
                            stroke: false,
                            fillColor: "yellow",
                            fillOpacity: 0.5
                        })
                        .bindPopup(layer.feature.properties.Class_Name.replace(/_|\//g, ' '), {
                            closeOnClick: false,
                            autoClose: false
                        });
                });
            });

        let buildingControl = L.control.layers({}, {
            "Buildings": buildingDots,
            "BuildingFootprints": buildingFootprintsLoader,
            "Farms": farms
        }, {
            collapsed: false,
            autoZIndex: true,
        }).addTo(map);

        // year slider
        let yearArray = [];
        for (y of years) {
            yearArray.push(y);
        }
        let maxYear = Math.max(...yearArray);
        for (i in layerDict) {
            layerDict[i][maxYear].addTo(map);
        }
        let yearSilder = L.control.slider(function (value) {
            featureGroup.clearLayers();
            for (let i in layerDict) {
                if (map.hasLayer(layerDict[i][controlYear])) map.removeLayer(layerDict[i][controlYear]);
            }
            for (let i in layerDict) {
                if (overlaySwitcher[i]) layerDict[i][value].addTo(map);
                document.getElementById(i).textContent = layerDict[i][value].area;
            }
            controlYear = value;
        }, {
            max: maxYear,
            min: Math.min(...yearArray),
            value: maxYear,
            step: 1,
            size: '200px',
            orientation: 'horizontal',
            id: 'yearSlider',
            collapsed: false,
            syncSlider: true,
            title: "Year Slider"
        }).addTo(map);
        // opacity slider
        let opacitySlider = L.control.slider(function (value) {
            for (let i in layerDict) {
                for (let j in layerDict[i]) {
                    layerDict[i][j].setStyle({
                        fillOpacity: value
                    });
                }
            }
        }, {
            max: 1.0,
            min: 0.1,
            value: 0.5,
            step: 0.1,
            size: '200px',
            orientation: 'horizontal',
            id: 'slider',
            collapsed: false,
            syncSlider: true,
            title: "Layer Opacity"
        }).addTo(map);
    });

// legend
let legend = document.createElement("legend");
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
map.legendControl.addLegend(legend.innerHTML);
document.getElementsByClassName("map-legends wax-legends leaflet-control")[0].classList.add("leaflet-control-layers");

// diplay area
L.Control.display = L.Control.extend({
    initialize: function (options) {
        L.Util.setOptions(this, options);
    },

    onAdd: function (map) {
        let container = L.DomUtil.create('div', 'leaflet-control-layers');
        let display = document.createElement("div");
        let table = document.createElement("table");
        let rowHead = document.createElement("tr");
        for (let i in layers) {
            let th = document.createElement("th");
            th.innerHTML = layers[i] + " (km<sup>2</sup>)";
            th.style.textAlign = "center";
            th.style.padding = "0px 5px 0px 5px";
            rowHead.appendChild(th);
        }
        table.appendChild(rowHead);
        let rowDisplay = document.createElement("tr");
        for (let i in layers) {
            let td = document.createElement("td");
            td.textContent = '';
            td.id = layers[i];
            td.style.textAlign = "center";
            td.style.padding = "0px 5px 0px 5px";
            rowDisplay.appendChild(td);
        }
        table.appendChild(rowDisplay);
        display.appendChild(table);
        container.innerHTML = display.innerHTML;
        return container;
    }
});

L.control.display = function (options) {
    return new L.Control.display(options);
};
let display = new L.control.display({position: 'topleft'}).addTo(map);
zoomControl.addTo(map);


// draw
drawControl.addTo(map);

map.on('draw:created', showPolygonArea);
map.on('draw:edited', showPolygonAreaEdited);

function showPolygonAreaEdited(e) {
    e.layers.eachLayer(function (layer) {
        showPolygonArea({layer: layer});
    });
}

function showPolygonArea(e) {
    featureGroup.addLayer(e.layer);
    let latlngs = [];
    for (let latlng in e.layer._latlngs[0]) {
        let a = [];
        a.push(e.layer._latlngs[0][latlng].lng);
        a.push(e.layer._latlngs[0][latlng].lat);
        latlngs.push(a);
    }
    // add the first point
    latlngs.push(latlngs[0]);
    // multipolygon form
    let polygon = turf.polygon([latlngs]);
    // m squre to km squre
    let area = turf.area(polygon);
    area = Math.round(area);

    // calculate overlapping area
    // layers = ["Built Up", "Open Space", "Tree Cover"];
    let overlapArea = [];
    // init overlap area
    for (let i = 0; i < layers.length; i++) overlapArea.push(0);
    let year = document.getElementById("yearSlider").value;
    for (let l in layers) {
        let layer = layers[l];
        for (let i in layerDict[layer][year].polygon) {
            let intersection = turf.intersect(layerDict[layer][year].polygon[i], polygon);
            if (intersection) {
                if (intersection.geometry.type == "Polygon") {
                    let overlapPolygon = turf.polygon(intersection.geometry.coordinates);
                    overlapArea[l] += turf.area(overlapPolygon);
                } else if (intersection.geometry.type == "MultiPolygon") {
                    for (let j in intersection.geometry.coordinates) {
                        let overlapPolygon = turf.polygon(intersection.geometry.coordinates[j]);
                        overlapArea[l] += turf.area(overlapPolygon);
                    }
                }
                overlapArea[l] = Math.round(overlapArea[l]);
            }
        }
    }
    // popup html
    let table = document.createElement("table");
    let row = document.createElement("tr");
    let th = document.createElement("th");
    th.innerHTML = "Total Area";
    th.style.textAlign = "left";
    row.appendChild(th);

    let td = document.createElement("td");
    td.textContent = area;
    td.style.textAlign = "right";
    row.appendChild(td);
    table.appendChild(row);
    for (let i in layers) {
        let row = document.createElement("tr");
        let th = document.createElement("th");
        th.innerHTML = layers[i];
        th.style.textAlign = "left";
        row.appendChild(th);

        let td = document.createElement("td");
        td.textContent = overlapArea[i];
        td.style.textAlign = "right";
        row.appendChild(td);
        table.appendChild(row);
    }
    row = document.createElement("tr");
    td = document.createElement("td");
    td.colSpan = "2";
    td.innerHTML = "Unit: m<sup>2</sup>";
    td.style.textAlign = "right";
    row.appendChild(td);
    table.appendChild(row);

    e.layer.bindPopup(table, {
        closeOnClick: false,
        autoClose: false
    });
    e.layer.openPopup();
}

let credctrl = L.controlCredits({
    image: "./images/terra.png",
    link: "#",
    text: "TERRA",
    width: 50,
    height: 56,
    position: 'bottomleft'
}).addTo(map);
