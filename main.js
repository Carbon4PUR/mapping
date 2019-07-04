/* allows us to create filters within a Leaflet GeoJSON layer */
L.GeoJSON.include({
    setFilter: function (originalData, _) {
        this.options.filter = _
        this.clearLayers()
        this.addData(originalData)
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
var formatSI = d3.format(',.2f')

let emissionColors = {
    "CO2, AIR": 'rgb(241, 177, 48)',
    "CO, AIR": 'rgb(234,110,57)'
},
    chemicalColors = {
        "chemical parks": "rgb(0,168,189)",
        "polyol plants": "rgb(12,168,118)"
    },
    nace = {
        "Manufacture of basic iron and steel and of ferro-alloys": { style: 'nace-iron', color: '#ff0000', looping: true, catalytic: true, active: true },
        "Manufacture of other inorganic basic chemicals": { style: 'nace-inorganic', color: 'rgb(214,70,111)', looping: true, catalytic: true, active: true },
        "Production of electricity": { style: 'nace-electricity', color: 'rgb(190,85,153)', looping: true, catalytic: false, active: true },
        "Extraction of natural gas": { style: 'nace-ng', color: 'rgb(151,133,176)', looping: true, catalytic: false, active: true }, // find color
        "Manufacture of refined petroleum products": { style: 'nace-petroleum', color: 'rgb(103,155,186)', looping: true, catalytic: false, active: true },
        "Manufacture of cement": { style: 'nace-cement', color: '#5a6067', looping: true, catalytic: false, active: true },
        "Manufacture of lime and plaster": { style: 'nace-lime', color: '#000000', looping: true, catalytic: false, active: true },
        "Manufacture of fertilisers and nitrogen compounds": { style: 'nace-fertilisers', color: '#938e99', looping: true, catalytic: false, active: true }
    }


/*********************************************************/
/* Keep a copy of the loaded jsons, in case we need them */
let globalEmissionData, globalChemicalData;

/***********************/
/* Handle interactions */
/***********************/

/************/
/* Info tab */
let resetButton = document.getElementById('reset-filters-button')

function resetFilters() {
    // reset to "chemical looping"
    compatFilterButtons[1].click()
    // activate CO and CO2 (the return-function returns a function, so () to execute it)    
    if (!pollutantFilterCOButton.classList.contains('is-activated')) returnTogglePollutantFilter(pollutantFilterCOButton)()
    if (!pollutantFilterCO2Button.classList.contains('is-activated')) returnTogglePollutantFilter(pollutantFilterCO2Button)()
    // set distance to 25 km
    distanceChemicalPlantSlider.value = 25
    // deactivate filter buttons
    if (polyolFilterButton.classList.contains('is-info')) togglePolyolFilter()
    if (radiusFilterButton.classList.contains('is-info')) toggleRadiusFilter()
    if (sizeFilterButton.classList.contains('is-info')) toggleSizeFilter()
    // set min size to 5 kt
    polyolSlider.value = 5
    polyolOutput.value = 5
    // launch update
    if (document.createEvent) {     // all browsers except IE before version 9
        var changeEvent = document.createEvent("Event");
        changeEvent.initEvent("input");
        distanceChemicalPlantSlider.dispatchEvent(changeEvent)
    }

}
resetButton.addEventListener('click', resetFilters)

/*****************/
/* Emissions tab */
let compatFilterButtons = [document.getElementById('compat-filter-manual-button'),
document.getElementById('compat-filter-loop-button'),
document.getElementById('compat-filter-cat-button')]

let pollutantFilterCO2Button = document.getElementById('pollutant-filter-CO2-button'),
    pollutantFilterCOButton = document.getElementById('pollutant-filter-CO-button')

let naceButtons = document.getElementsByClassName('nace-button')

let co2FilteredSumOutput = document.getElementById('sumCO2'),
    coFilteredSumOutput = document.getElementById('sumCO'),
    co2CombinedFilteredSumOutput = document.getElementById('sumCO2combined'),
    coCombinedFilteredSumOutput = document.getElementById('sumCOcombined')

let naceDeselectButton = document.getElementById('nace-deselect-all')

/* styling */
pollutantFilterCO2Button.style.background = emissionColors["CO2, AIR"]
pollutantFilterCOButton.style.background = emissionColors["CO, AIR"]

function toggleCompatFilter(event) {
    for (var i = 0; i < compatFilterButtons.length; i++) {
        compatFilterButtons[i].classList.remove('is-info')
    }
    event.target.classList.add('is-info')
    if (event.target.id == 'compat-filter-cat-button') {
        for (name in nace) {
            nace[name].active = nace[name].catalytic
        }
    }
    else if (event.target.id == 'compat-filter-loop-button') {
        for (name in nace) {
            nace[name].active = nace[name].looping
        }
    }
    updateNaceButtons()
    updateEmissionsFilter()
}
for (var i = 0; i < compatFilterButtons.length; i++) {
    compatFilterButtons[i].addEventListener('click', toggleCompatFilter)
}

function updateNaceButtons() {
    for (var i = 0; i < naceButtons.length; i++) {
        let naceName = naceButtons[i].id.replace("-filter-button", "")
        if (nace[naceName].active) {
            naceButtons[i].classList.add('is-activated', nace[naceName].style)
        }
        else {
            naceButtons[i].classList.remove('is-activated', nace[naceName].style)
        }
    }
}

function returnTogglePollutantFilter(button) {
    return function () {
        button.classList.toggle('is-activated')
        if (button.classList.contains('is-activated')) button.style.background = emissionColors[button.id.includes("CO2") ? "CO2, AIR" : "CO, AIR"]
        else button.style.background = '#fff'
        getFilteredTotals()
        toggleFilterEmittersByPollutant(button.id.includes("CO2") ? "CO2, AIR" : "CO, AIR")
    }
}
function toggleFilterEmittersByPollutant(pollutant) {
    if (map.hasLayer(markers[pollutant])) {
        map.removeLayer(markers[pollutant])
    }
    else {
        map.addLayer(markers[pollutant])
    }
}
pollutantFilterCO2Button.addEventListener('click', returnTogglePollutantFilter(pollutantFilterCO2Button))
pollutantFilterCOButton.addEventListener('click', returnTogglePollutantFilter(pollutantFilterCOButton))


function getFilteredTotals() {
    let co2sum = 0, cosum = 0, co2sumCombined = 0, cosumCombined = 0
    for (name in nace) {
        if(nace[name].active){
            if (pollutantFilterCOButton.classList.contains('is-activated')) cosum += globalEmissionData.stats.totals['CO, AIR'][name]
            if (pollutantFilterCO2Button.classList.contains('is-activated')) co2sum += globalEmissionData.stats.totals['CO2, AIR'][name]
        }
    }
    for (f in globalEmissionData['CO, AIR'].features) {
        let props = globalEmissionData['CO, AIR'].features[f].properties
        if (pollutantFilterCOButton.classList.contains('is-activated')
            && nace[props.NACEMainEconomicActivityName].active
            && props.co2Amount
            && props.co2Amount > 0){
            co2sumCombined += props.co2Amount
            cosumCombined += props.MTonnes
        }
    }
    co2CombinedFilteredSumOutput.style.background = '#ddc'
    coCombinedFilteredSumOutput.style.background = '#ddc'
    co2FilteredSumOutput.style.background = '#ddc'
    coFilteredSumOutput.style.background = '#ddc'
    setTimeout(function () {
        co2FilteredSumOutput.style.background = '#fff'
        coFilteredSumOutput.style.background = '#fff'
        co2CombinedFilteredSumOutput.style.background = '#fff'
        coCombinedFilteredSumOutput.style.background = '#fff'
    }, 500)
    co2FilteredSumOutput.textContent = formatSI(co2sum) + ' MT'
    coFilteredSumOutput.textContent = formatSI(cosum) + ' MT'
    co2CombinedFilteredSumOutput.textContent = formatSI(co2sumCombined) + ' MT'
    coCombinedFilteredSumOutput.textContent = formatSI(cosumCombined) + ' MT'
}

function deselectAllNaceFilter() {
    for (name in nace) {
        nace[name].active = false
    }
    updateNaceButtons()
    updateEmissionsFilter()
}
naceDeselectButton.addEventListener('click', deselectAllNaceFilter)

let toggleFilterNACE = (buttonId) => {
    // put compat button in "manual" mode
    for (var i = 0; i < compatFilterButtons.length; i++) {
        compatFilterButtons[i].classList.remove('is-info')
    }
    document.getElementById('compat-filter-manual-button').classList.add('is-info')
    // update nace object
    nace[buttonId.replace("-filter-button", "")].active = !nace[buttonId.replace("-filter-button", "")].active
    // color active buttons
    updateNaceButtons()
    // only display active emissions
    updateEmissionsFilter()
}

/**
 * Dirty hack to display a button for each NACE category.
 * Should probably not come from the color list
 *
 */
function addNACEFilters() {
    for (var name in nace) {
        let emissionSums = formatSI(globalEmissionData.stats.totals['CO2, AIR'][name]) + 'Mt CO2, ' + formatSI(globalEmissionData.stats.totals['CO, AIR'][name]) + ' Mt CO';
        let button = d3.select('#naceCategories')
            .append('a')
            .attr('id', name + '-filter-button')
            .attr('class', 'button is-small is-activated is-fullwidth nace-button ' + nace[name].style)
            .on('click', (a, b, c) => { toggleFilterNACE(c[0].id) })
            .attr('title', emissionSums)
            .text(name);
    }
}

/***********************/
/* Chemical plants tab */
let distanceChemicalPlant = document.getElementById('distance-chemical-plant'),
    polyolFilterButton = document.getElementById('polyol-filter-button'),
    radiusFilterButton = document.getElementById('radius-filter-button')

let distanceChemicalPlantSlider = document.getElementById('distance-chemical-plant-slider'),
    distanceChemicalPlantOutput = document.getElementById('distance-chemical-plant-slider-output'),
    polyolSlider = document.getElementById('polyol-slider'),
    polyolOutput = document.getElementById('polyol-slider-output');

let sizeFilterButton = document.getElementById('size-filter-button');

/**
 * Toggle if only polyol plants are shown or all chemical plants
 */
let togglePolyolFilter = () => {
    polyolFilterButton.classList.toggle('is-info')
    if (map.hasLayer(chemicalParkMarkers['chemical parks'])) {
        map.removeLayer(chemicalParkMarkers['chemical parks']);
    }
    else {
        map.addLayer(chemicalParkMarkers['chemical parks']);
    }
    updateEmissionsFilter()
};
polyolFilterButton.addEventListener('click', togglePolyolFilter);

/**
 * Decide for each emission if it should be displayed depending on all active filters
 */
function updateEmissionsFilter() {
    for (marker in markers) {
        var m = markers[marker]
        m.setFilter(globalEmissionData[marker], function (feature) {
            let isVisible = true
            isVisible = (nace[feature.properties.NACEMainEconomicActivityName].active)
            // if selected, only show those next to chemParks
            if (isVisible && radiusFilterButton.classList.contains('is-info')) {
                isVisible =
                    // if the chemical parks are not limited to polyol plants, check for distance to chemParks
                    (!polyolFilterButton.classList.contains('is-info') && decideIfInDistance(feature, 'chemical parks'))
                    // and always check for distance to polyol plants
                    || decideIfInDistance(feature, 'polyol plants')
            }
            // if selected, only show clusters with enough CO for x kt polyol
            if (isVisible && sizeFilterButton.classList.contains('is-info')) {
                isVisible = decideIfInVisibleCluster(feature)
            }
            return isVisible
        });
    }
    getFilteredTotals()
}

/**
 * Checks if the feature is within the radius of a chemical cluster that has enough CO emissions
 *
 * @param {*} feature: an emission feature
 * @returns
 */
function decideIfInVisibleCluster(feature) {
    let minCOavailability = polyolOutput.value * 15 / 50000
        // check all distances of the emission if there are any chemical plants within the defined radius
        for (d in feature.properties.distances) {
            for (c in feature.properties.distances[d]) {
                let chem = feature.properties.distances[d][c]
                if (chem < distanceChemicalPlantOutput.value * 1000) {
                    // if so, find the corresponding chemical plant and see if it has enough CO
                    // this should probably be globalChemicalData
                    for (marker in chemicalParkMarkers) {
                        // if only polyol plants are shown, don't check the chemical parks
                        if (!polyolFilterButton.classList.contains('is-info') || marker == 'polyol plants') {
                            for (f in chemicalParkMarkers[marker]._layers) {
                                let feat = chemicalParkMarkers[marker]._layers[f].feature
                                if (feat.properties.FacilityName == c) {
                                    return feat.properties.availability['CO, AIR'] > minCOavailability
                                }

                            }
                    }
                }
            }
        }
    }
    return false
}

/**
 * Returns true if the feature is within the defined distance of an active chemical or polyol plant
 *
 * @param {*} feature: A feature with properties, geometry and
 * @param {string} typeOfChemicalPlant: either 'chemical parks' or 'polyol plants'
 */
function decideIfInDistance(feature, typeOfChemicalPlant) {
    let minDistance = 99999999 // in meter, must be bigger than the max filter
    if (feature.properties.distances) {
        if (feature.properties.distances[typeOfChemicalPlant]) {
            minDistance = Math.min(minDistance, Object.entries(feature.properties.distances[typeOfChemicalPlant]).reduce((old, [, value]) => Math.min(value, old), minDistance))
        }
    }
    return minDistance < distanceChemicalPlantOutput.value * 1000
}

/**
 * Toggle if only emissions within defined radius are shown or all
 */
let toggleRadiusFilter = () => {
    radiusFilterButton.classList.toggle('is-info')
    updateEmissionsFilter()
};
radiusFilterButton.addEventListener('click', toggleRadiusFilter);



/**
 * Toggles if the button is pressed limiting the view to only plants with at least x kt polyol
 */
let toggleSizeFilter = () => {
    sizeFilterButton.classList.toggle('is-info')
    if(sizeFilterButton.classList.contains('is-info')) radiusFilterButton.classList.add('is-info')
    updatePolyolSizeFilter()
    updateEmissionsFilter()
}
sizeFilterButton.addEventListener('click', toggleSizeFilter);

let updatePolyolSizeFilter = () => {
    let isActive = sizeFilterButton.classList.contains('is-info');
    // This was defined by the consortium. A 50 kt polyol plant needs 15 kt of CO (or an equivalent amount of CH4 or H2)
    let minCOavailability = polyolOutput.value * 15 / 50000
    for (marker in chemicalParkMarkers) {
        var m = chemicalParkMarkers[marker]
        m.setFilter(globalChemicalData[marker], feature => {            
            return isActive ? feature.properties.availability['CO, AIR'] > minCOavailability : true
        })
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
            // update the popups for all chemical clusters
            layer.setPopupContent(addConsumerPopupHandler(layer.feature, type))
            return layer.setRadius(event.target.value * 1000)
        })
    }
    // if emissions limited to distance, update filter    
    if (radiusFilterButton.classList.contains('is-info')) {
        updateEmissionsFilter()
    }


});
polyolSlider.addEventListener('input', function (event) {
    // Update output with slider value
    polyolOutput.value = event.target.value
    updatePolyolSizeFilter()
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
                        fillColor: nace[feature.properties.NACEMainEconomicActivityName].color,
                        weight: 1,
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
        return `<h2>${feature.properties.FacilityName}</h2>
                        <i>${feature.properties.NACEMainEconomicActivityName}</i>
                        <br />${feature.properties.MTonnes} Mt ${type}` + (otherEmission != '' ? `<br />(${otherEmission})` : '')

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
    // copy distance information to markers. This could be done while creating the json arrays to speedup the load time.
    for (emission in globalEmissionData) {
        if (emission != "stats") {
            for (f in globalEmissionData[emission].features) {
                let feat = globalEmissionData[emission].features[f]
                if (feat.properties.distances) {
                    for (e in feat.properties.distances) {
                        for (chem in feat.properties.distances[e]) {
                            for (c in data[e].features) {
                                if (data[e].features[c].properties.FacilityName == chem) {
                                    if (!data[e].features[c].properties.distances) data[e].features[c].properties.distances = []
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
            chemicalParkMarkers[type] = convertGeoJSONToChemLayer(data, type).addTo(map);
        }
    }
    // keep global reference
    globalChemicalData = data;
}

function convertGeoJSONToChemLayer(data, type) {
    return L.geoJson(data[type], {
        pointToLayer: function (feature, latlng) {
            feature.properties['type'] = type
            return L.circle(latlng, distanceChemicalPlantOutput.value * 1000, { // radius expected in m, slider in km
                fillColor: chemicalColors[feature.properties.type],
                weight: 0,
                fillOpacity: 0.4
            }).bindPopup(addConsumerPopupHandler(feature, type))
        }
    })
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
    p.availability = { ['CO2, AIR']: 0, ['CO, AIR']: 0 };
    if (p.distances != undefined) {
        for (e in p.distances) {
            if (p.distances[e].distance < distanceChemicalPlantOutput.value * 1000) {
                p.availability[p.distances[e].type] += p.distances[e].value
            }
        }
    }

    return 'Available emissions in ' + distanceChemicalPlantOutput.value + '&nbsp;km:<br>CO<sub>2</sub>: ' +
        formatSI(feature.properties.availability['CO2, AIR']) + '&nbsp;MT<br>CO: ' +
        formatSI(feature.properties.availability['CO, AIR']) + '&nbsp;MT';
}

/**
 * Create circles with different sizes as a legend
 * @needs globalEmissionData as a global variable
 */
let createScale = () => {
    var height = 75
    var width = 130
    var svg = d3.select("#scale")
        .append("svg")
        .attr("width", width)
        .attr("height", height)

    // The scale you use for bubble size
    var size = d3.scaleSqrt()
        .domain([0, globalEmissionData.stats.totalMax])  // What's in the data, min-max
        .range([0, 50])  // Size in pixel

    // Add legend: circles
    var valuesToShow = [0.1, 5, 20] // [globalEmissionData.stats.totalMax / 100, globalEmissionData.stats.totalMax / 10, globalEmissionData.stats.totalMax]
    var xCircle = 38
    var xLabel = 100
    var yCircle = 74
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
        .attr('x', function (d) { return xLabel + (d>=10 ? 1 : 7) })
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
        .then(checkIfIntro)
})


/***********************************/
/* Helper functions (cookies etc.) */
/***********************************/
const setCookie = (name, value, days = 100, path = '/') => {
    const expires = new Date(Date.now() + days * 864e5).toUTCString()
    document.cookie = name + '=' + encodeURIComponent(value) + '; expires=' + expires + '; path=' + path
}

const getCookie = (name) => {
    return document.cookie.split('; ').reduce((r, v) => {
        const parts = v.split('=')
        return parts[0] === name ? decodeURIComponent(parts[1]) : r
    }, '')
}

const deleteCookie = (name, path = "/") => {
    setCookie(name, '', -1, path)
}

/***********************************/
/* Intro.js tour                   */
/***********************************/
function setCookieNoTour(){
    setCookie('no-tour', 'true')
    introJs().exit()
}

document.getElementById('show-intro').addEventListener('click', () => {
    deleteCookie('no-tour')
    startIntro()
})
function checkIfIntro(){
    if(!getCookie('no-tour')){
        startIntro()
    }
}
function startIntro(){
        var intro = introJs()
        intro.onexit(() => sidebar.open('info-content'))
        intro.setOptions({
            steps: [
            { 
                intro: `Welcome to the Carbon4PUR mapping! If you want, you can follow this short introduction to see the main functions, or you can skip the tour.<br>
                <button id="set-cookie-no-tour" class="introjs-button" title="This is the only cookie used on this site. If you don't want to use cookies, the tour will be shown on each reload. Click anywhere outside the tour to make it disappear."><p>Don't show the tour again</p><p style="font-size: x-small; color: #746427;">&#9432; This will set a cookie.</p></button>`
            },
            {
                element: "#sidebar-close-info-span",
                intro: "This closes the sidebar so you can focus on the map."
            },
            {
                element: '#info-tab-li',
                intro: "Here you find information about the map and the data",

            },
            {
                element: '#emitter-tab-li',
                intro: "In this tab, you can filter the bubbles on the map representing emissions.",
                position: 'right'
            },
            {
                element: '#consumer-tab-li',
                intro: 'Here you can filter by chemical parks and polyol plants.',
                position: 'left'
            },
            {
                element: '#settings-tab-li',
                intro: "And if you like another map layout or restart the tour, click here.",
                position: 'bottom'
            },
            {
                intro: "Click on any bubble to see more information about it.<br>That's it, now play with it."
            }
            ]
        })
        introJs.fn.oncomplete(setCookieNoTour)
        sidebar.open('info-content')
        intro.start();
        document.getElementById('set-cookie-no-tour').addEventListener('click', setCookieNoTour)
  }