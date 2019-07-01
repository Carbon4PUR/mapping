/* allows us to create filters within a Leaflet GeoJSON layer */
L.GeoJSON.include({
    setFilter: function (_) {
        if (!this._geojson) {
            this._geojson = this.toGeoJSON()
        }
        this.options.filter = _
        this.clearLayers()
        this.addData(this._geojson)
        return this
    }
})

/* Set up the map with initial center and zoom level */
let map = L.map('map', {
    center: [51.65892, 6.41601], // roughly show Europe
    zoom: 5, // roughly show Europe (from 1 to 18 -- decrease to zoom out, increase to zoom in)
    scrollWheelZoom: false,
    zoomControl: false // to put the zoom butons on the right
})
L.control.zoom({
    position: 'topright'
}).addTo(map)
/* Carto light-gray basemap tiles with labels */
let light = L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap<\/a>, &copy; <a href="https://carto.com/attribution">CARTO<\/a>, <a href="http://prtr.ec.europa.eu">E-PRTR</a>'
})
/* Current default map. Switch by puting the .addTo above */
/* Thunderforest green tiles with more information */
let green = L.tileLayer('https://tile.thunderforest.com/neighbourhood/{z}/{x}/{y}.png?apikey=9a85f60a13be4bf7bed59b5ffc0f4d86', {
    attribution: 'Maps &copy; <a href="https://www.thunderforest.com">Thunderforest</a>, Data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>, <a href="http://prtr.ec.europa.eu">E-PRTR</a>'
})
    .addTo(map)

/* Add the zoom buttons */
var sidebar = L.control.sidebar('sidebar', { position: 'left' }).addTo(map)


/* On the map, scrolling should zoom */
map.on('focus', () => {
    map.scrollWheelZoom.enable();
})
/* Outside of the map, scrolling should not zoom */
map.on('blur', () => {
    map.scrollWheelZoom.disable();
})

/*********************************************************/
/* Definitions of colors, NACE categories etc. */

// show all numbers with 1,000.00 format
var formatSI = d3.format(',.2f');

let emissionColors = {
    "CO2, AIR": 'rgb(240, 175, 67)',
    "CO, AIR": 'rgb(218,73,106)'
};
let chemicalColors = {
    "chemical parks": "rgb(0,168,189)",
    "polyol plants": "rgb(12,168,118)"
}
let naceColors = {
    "Manufacture of refined petroleum products": '#c7428f',
    "Manufacture of fertilisers and nitrogen compounds": '#9884b0',
    "Manufacture of cement": '#5a6067',
    "Manufacture of lime and plaster": '#000000',
    "Production of electricity": '#b06ca4',
    "Manufacture of other inorganic basic chemicals": '#7995b8',
    "Manufacture of basic iron and steel and of ferro-alloys": '#ff0000' //ToDo: find better colors
};
let naceBgColors = {
    "Manufacture of refined petroleum products": '#000',
    "Manufacture of fertilisers and nitrogen compounds": '#000',
    "Manufacture of cement": '#fff',
    "Manufacture of lime and plaster": '#fff',
    "Production of electricity": '#000',
    "Manufacture of other inorganic basic chemicals": '#000',
    "Manufacture of basic iron and steel and of ferro-alloys": '#000' //ToDo: find better colors
};
let fullNaceList = {
    "Manufacture of refined petroleum products": true,
    "Manufacture of fertilisers and nitrogen compounds": true,
    "Manufacture of cement": true,
    "Manufacture of lime and plaster": true,
    "Production of electricity": true,
    "Manufacture of other inorganic basic chemicals": true,
    "Manufacture of basic iron and steel and of ferro-alloys": true //ToDo: find better colors
};

/*********************************************************/
/* Keep a copy of the loaded jsons, in case we need them */
let globalEmissionData, globalChemicalData;
/* Cluster object containing information for each chemical park about its neighboring emissions */
let globalClusters = {};

/***********************/
/* Handle interactions */
/***********************/

/***********************/
/* Info tab */

/***********************/
/* Emissions tab */
let compatFilterButtons = [document.getElementById('compat-filter-manual-button'),
document.getElementById('compat-filter-loop-button'),
document.getElementById('compat-filter-cat-button')];

let pollutantFilterCO2Button = document.getElementById('pollutant-filter-CO2-button'),
    pollutantFilterCOButton = document.getElementById('pollutant-filter-CO-button');

let naceButtons = document.getElementsByClassName('nace-button');

let co2FilteredSumOutput = document.getElementById('sumCO2'),
    coFilteredSumOutput = document.getElementById('sumCO');

let naceDeselectButton = document.getElementById('nace-deselect-all');

/* styling */
pollutantFilterCO2Button.style.background = emissionColors["CO2, AIR"];
pollutantFilterCOButton.style.background = emissionColors["CO, AIR"];

function toggleCompatFilter(event) {
    for (var i = 0; i < compatFilterButtons.length; i++) {
        compatFilterButtons[i].classList.remove('is-info');
    }
    event.target.classList.add('is-info');
    var naceList;
    if (event.target.id == 'compat-filter-manual-button') {
        return true;
    }
    else if (event.target.id == 'compat-filter-loop-button') {
        naceList = fullNaceList;
    }
    else {
        naceList = { 'Manufacture of other inorganic basic chemicals': true, 'Manufacture of basic iron and steel and of ferro-alloys': true };
    }
    filterEmittersByNACE(naceList = naceList);
};
for (var i = 0; i < compatFilterButtons.length; i++) {
    compatFilterButtons[i].addEventListener('click', toggleCompatFilter);
}

function togglePollutantFilter(button) {
    return function () {
        button.classList.toggle('is-activated');
        if (button.classList.contains('is-activated')) button.style.background = emissionColors[button.id.includes("CO2") ? "CO2, AIR" : "CO, AIR"]
        else button.style.background = '#fff'
        //console.log(button.id);
        getFilteredTotals();
        toggleFilterEmittersByPollutant(button.id.includes("CO2") ? "CO2, AIR" : "CO, AIR");
    }
}
function toggleFilterEmittersByPollutant(pollutant) {
    if (map.hasLayer(markers[pollutant])) {
        map.removeLayer(markers[pollutant]);
    }
    else {
        map.addLayer(markers[pollutant]);
    }
}
pollutantFilterCO2Button.addEventListener('click', togglePollutantFilter(pollutantFilterCO2Button));
pollutantFilterCOButton.addEventListener('click', togglePollutantFilter(pollutantFilterCOButton));

function filterEmittersByNACE(naceList) {
    // console.log(naceList);						
    for (var i = 0; i < naceButtons.length; i++) {
        let naceName = naceButtons[i].id.replace("-filter-button", "");
        if (naceName in naceList) {
            naceButtons[i].classList.add('is-activated');
            naceButtons[i].style.background = naceColors[naceName];
            naceButtons[i].style.color = naceBgColors[naceName];
        }
        else {
            naceButtons[i].classList.remove('is-activated');
            naceButtons[i].style.background = '#fff';
            naceButtons[i].style.color = '#000';
        }
    }
    getFilteredTotals();
    for (marker in markers) {
        var m = markers[marker];
        if (naceList != null) {
            m.setFilter(function (feature) {
                return (feature.properties.NACEMainEconomicActivityName in naceList);
            });
        }
        else {
            m.setFilter(function (f) { return true })
        }
    }
}

function getFilteredTotals() {
    let co2sum = 0, cosum = 0;
    for (var i = 0; i < naceButtons.length; i++) {
        let naceName = naceButtons[i].id.replace("-filter-button", "");
        if (naceButtons[i].classList.contains('is-activated')) {
            if (pollutantFilterCOButton.classList.contains('is-activated')) cosum += globalEmissionData.stats.totals['CO, AIR'][naceName]
            if (pollutantFilterCO2Button.classList.contains('is-activated')) co2sum += globalEmissionData.stats.totals['CO2, AIR'][naceName]
        }
    }
    co2FilteredSumOutput.style.background = '#ddc';
    coFilteredSumOutput.style.background = '#ddc';
    setTimeout(function () {
        co2FilteredSumOutput.style.background = '#fff';
        coFilteredSumOutput.style.background = '#fff';
    }, 500);
    co2FilteredSumOutput.textContent = formatSI(co2sum) + ' MT';
    coFilteredSumOutput.textContent = formatSI(cosum) + ' MT';
}

function deselectAllNaceFilter() {
    filterEmittersByNACE([]);
}
naceDeselectButton.addEventListener('click', deselectAllNaceFilter);

let categoryMenuEntry = (name) => {
    let emissionSums = formatSI(globalEmissionData.stats.totals['CO2, AIR'][name]) + 'Mt CO2, ' + formatSI(globalEmissionData.stats.totals['CO, AIR'][name]) + ' Mt CO';
    let button = d3.select('#naceCategories')
        .append('a')
        .attr('id', name + '-filter-button')
        .attr('class', 'button is-small is-activated is-fullwidth nace-button')
        .style('background-color', naceColors[name])
        .style('color', naceBgColors[name])
        .on('click', (a, b, c) => { toggleFilterNACE(c[0].id) })
        .attr('title', emissionSums)
        .text(name);
}

let toggleFilterNACE = (buttonId) => {
    document.getElementById(buttonId).classList.toggle('is-activated');
    for (var i = 0; i < compatFilterButtons.length; i++) {
        compatFilterButtons[i].classList.remove('is-info');
    }
    document.getElementById('compat-filter-manual-button').classList.add('is-info');
    let naceButtons = document.getElementsByClassName('nace-button');
    naceList = {}
    for (var i = 0; i < naceButtons.length; i++) {
        naceButtons[i].classList.contains('is-activated') ? naceList[naceButtons[i].id.replace("-filter-button", "")] = true : false;
    }
    filterEmittersByNACE(naceList);
}

let addNACEFilters = () => {
    for (var nace in naceColors) {
        categoryMenuEntry(nace);
    }
}

/***********************/
/* Chemical plants tab */
let distanceChemicalPlant = document.getElementById('distance-chemical-plant'),
    polyolFilter = document.getElementById('polyol-filter-button'),
    radiusFilter = document.getElementById('radius-filter-button')

let distanceChemicalPlantSlider = document.getElementById('distance-chemical-plant-slider'),
    distanceChemicalPlantOutput = document.getElementById('distance-chemical-plant-slider-output'),
    polyolSlider = document.getElementById('polyol-slider'),
    polyolOutput = document.getElementById('polyol-slider-output');

let sizeFilterButton = document.getElementById('size-filter-button');

/**
 * Toggle if only polyol plants are shown or all chemical plants
 */
let togglePolyolFilter = () => {
    polyolFilter.classList.toggle('is-info')
    if (map.hasLayer(chemicalParkMarkers['chemical parks'])) {
        map.removeLayer(chemicalParkMarkers['chemical parks']);        
    }
    else {
        map.addLayer(chemicalParkMarkers['chemical parks']);
    }
    updateDistanceFilter()
};
polyolFilter.addEventListener('click', togglePolyolFilter);

/**
 * Calculate distance of each emission to each chemical plant and decide if it should be displayed
 */
function updateDistanceFilter() {
    for (marker in markers) {
        var m = markers[marker]
        if (radiusFilter.classList.contains('is-info')) {
            m.setFilter(function (feature) {  
                let minDistance = 99999999 // in meter, must be bigger than the max filter
                if(feature.properties.distances){
                    if (!polyolFilter.classList.contains('is-info')){
                        if(feature.properties.distances['chemical parks']){
                            minDistance = Math.min(minDistance, Object.entries(feature.properties.distances['chemical parks']).reduce((old, [key, value]) => Math.min(value, old), minDistance))
                            
                        }
                    }
                    if(feature.properties.distances['polyol plants']){                        
                        minDistance = Math.min(minDistance, Object.entries(feature.properties.distances['polyol plants']).reduce((old, [key, value]) => Math.min(value, old), minDistance))
                    }
                }                           
                return minDistance < distanceChemicalPlantOutput.value * 1000
            });
        }
        else {
            m.setFilter(function (feature) { return true })
        }
    }
}

/**
 * Toggle if only emissions within defined radius are shown or all
 */
let toggleRadiusFilter = () => {
    radiusFilter.classList.toggle('is-info')
    updateDistanceFilter()
};
radiusFilter.addEventListener('click', toggleRadiusFilter);



/**
 * Toggles if the button is pressed limiting the view to only plants with at least x kt polyol
 */
let toggleSizeFilter = () => {
    sizeFilterButton.classList.toggle('is-info')
    filterBySize()   
}
sizeFilterButton.addEventListener('click', toggleSizeFilter);

let filterBySize = () => {
    let isActive = sizeFilterButton.classList.contains('is-info');
    // This was defined by the consortium. A 50 kt polyol plant needs 15 kt of CO (or an equivalent amount of CH4 or H2)
    let minCOavailability = polyolOutput.value * 15 / 50000
    for (marker in chemicalParkMarkers) {
        var m = chemicalParkMarkers[marker]
        if (isActive) {
            console.log('Size filter now active');
            m.setFilter(feature => {
                return feature.properties.availability['CO, AIR'] > minCOavailability;
            })
        }
        else {
            m.setFilter(feature => {
                return true
            })
        }
    }
}

/* Glitch in the slider, reset the value to put button in middle of slider */
distanceChemicalPlantSlider.value = distanceChemicalPlantSlider.getAttribute("value");
polyolSlider.value = polyolSlider.getAttribute("value");

distanceChemicalPlantSlider.addEventListener('input', function (event) {
    // Update output with slider value
    distanceChemicalPlantOutput.value = event.target.value;
    // Update size of circle
    for (layer in chemicalParkMarkers) {
        chemicalParkMarkers[layer].eachLayer((layer) => {
            return layer.setRadius(event.target.value * 1000);
        })
    }
    // if emissions limited to distance, update filter    
    if (radiusFilter.classList.contains('is-info')) {        
        updateDistanceFilter()
    }
});
polyolSlider.addEventListener('input', function (event) {
    // Update output with slider value
    polyolOutput.value = event.target.value
    filterBySize()
});

/***********************/
/* Settings tab */
let mapLayoutGreen = document.getElementById('map-layout-green'),
    mapLayoutLight = document.getElementById('map-layout-light');

let toggleMapLayout = () => {
    mapLayoutGreen.classList.toggle('is-info');
    mapLayoutLight.classList.toggle('is-info');
    if (mapLayoutGreen.classList.contains('is-info')) {
        map.removeLayer(light);
        map.addLayer(green);
    }
    else {
        map.removeLayer(green);
        map.addLayer(light);
    }
};
mapLayoutGreen.addEventListener('click', toggleMapLayout);
mapLayoutLight.addEventListener('click', toggleMapLayout);



/***********************/
/* Load data functions */
/***********************/

// keep reference to the markers for filtering
var markers = {};
var chemicalParkMarkers = {};

/** 
* convert json to map layer with circlemarkers
* @param {data} an Object loaded from json data containing several geoJSON Objects. Each feature should contain a "properties" with FacilityName, PollutantName, MTonnes and NACEMainEconomicActivityName
*/
function loadPRTRlayers(data) {
    //console.log(data);
    for (emission in data) {
        if (emission != "stats") {
            markers[emission] = L.geoJson(data[emission], {
                pointToLayer: function (feature, latlng) {
                    return L.circleMarker(latlng, {
                        radius: Math.sqrt(feature.properties.MTonnes / data.stats.totalMax) * 50,
                        color: emissionColors[feature.properties.PollutantName],
                        fillColor: naceColors[feature.properties.NACEMainEconomicActivityName],
                        weight: 2,
                        opacity: 0.7,
                        fillOpacity: 0.4
                    }).bindPopup(addEmitterPopupHandler(feature, emission))
                }
            }).addTo(map);
        }
    }
    globalEmissionData = data;
}

/**
 *Add a popup to a GeoJSON feature of a certain type
 *
 * @param {*} feature A GeoJSON feature with geometry and properties
 * @param {string} type The name of the category, in this case "CO2" or "CO" 
 * @returns
 */
function addEmitterPopupHandler(feature, type) {
    if (feature.properties) {
        type = type.replace('CO2', 'CO<sub>2</sub>');
        let otherEmission = '';
        if (feature.properties.co2Amount) otherEmission += feature.properties.co2Amount + ' Mt CO<sub>2</sub>';
        if (feature.properties.coAmount) otherEmission += feature.properties.coAmount + ' Mt CO';
        return `<h3>${feature.properties.FacilityName}</h3>
                        <i>${feature.properties.NACEMainEconomicActivityName}</i>
                        <br />${feature.properties.MTonnes} Mt ${type}
                        <br />(${otherEmission})
        `
    }
    else {
        console.log(feature);
    }
}

/** 
* convert json to map layer with circlemarkers
* @param {Object} data Object loaded from json data containing several geoJSON Objects. Each feature should contain a "properties" with FacilityName 
*/
let loadChemicalParks = (data) => {
    // copy distance information to markers
    for (emission in globalEmissionData) {
        if (emission != "stats") {
            for (f in globalEmissionData[emission].features) {
                let feat = globalEmissionData[emission].features[f]
                if(feat.properties.distances){
                    for(e in feat.properties.distances){
                        for(chem in feat.properties.distances[e]){
                            for(c in data[e].features){
                                if(data[e].features[c].properties.FacilityName == chem){
                                    if(!data[e].features[c].properties.distances) data[e].features[c].properties.distances = []
                                    data[e].features[c].properties.distances.push({
                                        'name': feat.properties.FacilityName,
                                        'distance': feat.properties.distances[e][chem],
                                        'type': emission,
                                        'value': feat.properties.MTonnes
                                    })
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    for (type in data) {
        if (type != "stats") {
            chemicalParkMarkers[type] = L.geoJson(data[type], {
                pointToLayer: function (feature, latlng) {
                    // this is morally so wrong. The 50 should be loaded from the slider or a config
                    return L.circle(latlng, 50 * 1000, { // radius expected in m, slider in km
                        fillColor: chemicalColors[type],
                        weight: 0,
                        fillOpacity: 0.4
                    }).bindPopup(addConsumerPopupHandler(feature, type))
                }
            }).addTo(map);
        }
    }
    
    
    // keep global reference
    globalChemicalData = data;
}

/**
 *Add a popup to a GeoJSON feature of a certain type
 *
 * @param {*} feature A GeoJSON feature with geometry and properties
 * @param {string} type The name of the category, in this case "chemical parks" or "polyol plant" 
 * @returns
 */
function addConsumerPopupHandler(feature, type) {
    if (feature.properties) {
        return `<h3>${feature.properties.FacilityName}</h3>
                <i class="${type.replace(" ", "-") + "-popup"}">${type === 'chemical parks' ? "Chemical park" : "Polyol plant"}</i>
                <br>` + consumerPopupAvailability(feature);
    }
    else {
        console.log(feature);
    }
};


function consumerPopupAvailability(feature) {
    let p = feature.properties
    p.availability = {['CO2, AIR'] : 0, ['CO, AIR'] : 0};
    if(p.distances != undefined){
        for(e in p.distances){
            if(p.distances[e].distance < distanceChemicalPlantOutput.value * 1000){                
                p.availability[p.distances[e].type] += p.distances[e].value
            }
        }
    }
    
    return 'Available emissions in '+distanceChemicalPlantOutput.value+'&nbsp;km:<br>CO<sub>2</sub>: '+
                    formatSI(feature.properties.availability['CO2, AIR']) + '&nbsp;MT<br>CO: '+
                    formatSI(feature.properties.availability['CO, AIR'])+'&nbsp;MT';
}

/**
 * Create circles with different sizes as a legend
 * @needs globalEmissionData as a global variable
 */
let createScale = () => {
    var height = 120
    var width = 185
    var svg = d3.select("#scale")
        .append("svg")
        .attr("width", width)
        .attr("height", height)

    // The scale you use for bubble size
    var size = d3.scaleSqrt()
        .domain([0, globalEmissionData.stats.totalMax])  // What's in the data, let's say it is percentage
        .range([0, 50])  // Size in pixel

    // Add legend: circles
    var valuesToShow = [globalEmissionData.stats.totalMax / 100, globalEmissionData.stats.totalMax / 10, globalEmissionData.stats.totalMax]
    var xCircle = 60
    var xLabel = 150
    var yCircle = 110
    svg
        .selectAll("legend")
        .data(valuesToShow)
        .enter()
        .append("circle")
        .attr("cx", xCircle)
        .attr("cy", function (d) { return yCircle - size(d) })
        .attr("r", function (d) { return size(d) })
        .style("fill", "none")
        .style("stroke", "black")
        .style("stroke-width", "0.8")
        .attr("stroke", "black")

    // Add legend: segments
    svg
        .selectAll("legend")
        .data(valuesToShow)
        .enter()
        .append("line")
        .attr('x1', function (d) { return xCircle + size(d) })
        .attr('x2', xLabel)
        .attr('y1', function (d) { return yCircle - size(d) })
        .attr('y2', function (d) { return yCircle - size(d) })
        .attr('stroke', 'black')
        .style("stroke", "black")
        .style("stroke-width", "0.8")
        .style('stroke-dasharray', ('2,2'))

    // Add legend: labels
    svg
        .selectAll("legend")
        .data(valuesToShow)
        .enter()
        .append("text")
        .attr('x', xLabel)
        .attr('y', function (d) { return yCircle - size(d) })
        .text(function (d) { return formatSI(d) }) // to display in Mt
        .style("font-size", 10)
        .attr('alignment-baseline', 'middle')
}


/*************************************************/
/* And finally load all json data and display it */
/*************************************************/

document.addEventListener('DOMContentLoaded', (event) => {
    fetch('emissions.json')
        .then((response) => { return response.json() },
            (reject) => { console.error(reject) })
        .then(loadPRTRlayers)
        .then(createScale)
        .then(addNACEFilters)
        .then(getFilteredTotals)
        .then(() => fetch('chemicalParks.json'))
        .then((response) => { return response.json() },
            (reject) => { console.error(reject) })
        .then(loadChemicalParks)
})

/********************/
/* Helper functions */
/********************/
/*
function distance(feature1, feature2){
    let x = feature1.geometry.coordinates[1] - feature2.geometry.coordinates[1],
    y= (feature1.geometry.coordinates[0]-feature2.geometry.coordinates[0]) * Math.cos(feature2.geometry.coordinates[1)
    return 110.25 * Math.sqrt(x*x+y*y)
}*/