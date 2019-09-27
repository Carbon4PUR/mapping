// define global variables
let map, format1Dec, formatSI, light, green, sidebar

function showMap(){
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
    map = L.map('map', {
        center: [51.65892, 6.41601], // roughly show Europe
        zoom: 5, // roughly show Europe (from 1 to 18 -- decrease to zoom out, increase to zoom in)
        scrollWheelZoom: false,
        zoomControl: false // to put the zoom butons on the right
    })
 
    L.control.zoom({
        position: 'topright'
    }).addTo(map)
    /* Carto light-gray basemap tiles with labels */
    light = L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap<\/a>, &copy; <a href="https://carto.com/attribution">CARTO<\/a>, <a href="http://prtr.ec.europa.eu">E-PRTR</a>'
    })
    /* Current default map. Switch by puting the .addTo above */
    /* Thunderforest green tiles with more information */
    green = L.tileLayer('https://tile.thunderforest.com/neighbourhood/{z}/{x}/{y}.png?apikey=9a85f60a13be4bf7bed59b5ffc0f4d86', {
        attribution: 'Maps &copy; <a href="https://www.thunderforest.com">Thunderforest</a>, Data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>, <a href="http://prtr.ec.europa.eu">E-PRTR</a>'
    })
        .addTo(map)

    /* Add the zoom buttons */
    sidebar = L.control.sidebar('sidebar', { position: 'left' }).addTo(map)


    /* On the map, scrolling should zoom */
    map.on('focus', () => {
        map.scrollWheelZoom.enable()
    })
    /* Outside of the map, scrolling should not zoom */
    map.on('blur', () => {
        map.scrollWheelZoom.disable()
    })
    /* This is to put the emissions in the foreground on high zoom levels */
    map.on("zoomend", function (e) {        
        for(type in chemicalParkMarkers){
            if(e.target._zoom > 7 && !chemicalParkMarkers.isBack){
                chemicalParkMarkers[type].bringToBack()                
                chemicalParkMarkers[type].isBack = true
            }
            else {
                chemicalParkMarkers[type].bringToFront()                
                chemicalParkMarkers[type].isBack = false
            }
        }
    })
}

/*********************************************************/
/* Definitions of colors, NACE categories etc. */

/**
 * Load everything that needs external libraries after deferred loading
 *
 */
function loadGlobalDefs() {
    // show all numbers with 1,000.00 format
    format1Dec = d3.format(',.1f')
    formatSI = d3.format(',.3f')
}

let emissionColors = {
    "Germany": 'rgb(241, 177, 48)',
    "Belgium": 'rgb(234,110,57)',
    "Netherlands": 'rgb(0,110,57)'
},
    chemicalColors = {
        "chemical parks": "rgb(0,168,189)",
        "polyol plants": "rgb(12,168,118)"
    },
    nace = {
            "Energy sector": { style: 'nace-iron', color: '#ff0000', looping: true, catalytic: true, active: true },
            "Productiona and processing of metals": { style: 'nace-inorganic', color: 'rgb(214,70,111)', looping: true, catalytic: true, active: true },
            "Chemical industry": { style: 'nace-electricity', color: 'rgb(190,85,153)', looping: true, catalytic: false, active: true },
            "Paper and wood production processing": { style: 'nace-ng', color: 'rgb(151,133,176)', looping: true, catalytic: false, active: true },
            "Mineral industry": { style: 'nace-petroleum', color: 'rgb(103,155,186)', looping: true, catalytic: false, active: true },
            "Waste and waste water management": { style: 'nace-cement', color: '#5a6067', looping: true, catalytic: false, active: true },
            "Other activities": { style: 'nace-lime', color: '#000000', looping: true, catalytic: false, active: true },
            "Animal and vegetable products from the food and beverage sector": { style: 'nace-fertilisers', color: '#938e99', looping: true, catalytic: false, active: true }

    }


/*********************************************************/
/* Keep a copy of the loaded jsons, in case we need them */
let globalEmissionData, globalChemicalData

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
    // set distance to 20 km
    distanceChemicalPlantSlider.value = 20
    // deactivate filter buttons
    if (polyolFilterButton.classList.contains('is-info')) togglePolyolFilter()
    if (radiusFilterButton.classList.contains('is-info')) toggleRadiusFilter()
    if (sizeFilterButton.classList.contains('is-info')) toggleSizeFilter()
    // set min size to 5 kt
    polyolSlider.value = 5
    polyolOutput.value = 5
    // launch update
    if (document.createEvent) {     // all browsers except IE before version 9
        var changeEvent = document.createEvent("Event")
        changeEvent.initEvent("input")
        distanceChemicalPlantSlider.dispatchEvent(changeEvent)
    }

}
resetButton.addEventListener('click', resetFilters)

/*****************/
/* Emissions tab */
let compatFilterManualButton = document.getElementById('compat-filter-manual-button'),
    compatFilterLoopButton = document.getElementById('compat-filter-loop-button')
    compatFilterCatButton = document.getElementById('compat-filter-cat-button')
    compatFilterButtons = [compatFilterManualButton,compatFilterLoopButton,compatFilterCatButton]

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

/**
 * when clicking on a compat button, switch mode
 *
 * @param {event} event the click event on a compat button
 */
function toggleCompatFilter(event) {    
    activateCompatButton(event.target)
    if (event.target == compatFilterCatButton) {
        for (name in nace) {
            nace[name].active = nace[name].catalytic
        }
    }
    else if (event.target == compatFilterLoopButton) {
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

function activateCompatButton(button) {
    for (var i = 0; i < compatFilterButtons.length; i++) {
        compatFilterButtons[i].classList.remove('is-info')
    }
    button.classList.add('is-info')
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


function getFilteredTotals() { /*
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
            && pollutantFilterCO2Button.classList.contains('is-activated')
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
    co2FilteredSumOutput.textContent = format1Dec(co2sum) + ' Megatonnes/year'
    coFilteredSumOutput.textContent = format1Dec(cosum) + ' Megatonnes/year'
    co2CombinedFilteredSumOutput.textContent = format1Dec(co2sumCombined) + ' Megatonnes/year'
    coCombinedFilteredSumOutput.textContent = format1Dec(cosumCombined) + ' Megatonnes/year'*/
}

function toggleAllNaceFilter() {
    if(naceDeselectButton.text == "Deselect all"){        
        activateCompatButton(compatFilterManualButton)
        naceDeselectButton.text = "Select all"
        for (name in nace) {
            nace[name].active = false
        }
    }
    else {        
        activateCompatButton(compatFilterLoopButton)
        naceDeselectButton.text = "Deselect all"
        for (name in nace) {
            nace[name].active = true
        }
    }
    updateNaceButtons()
    updateEmissionsFilter()
    
}
naceDeselectButton.addEventListener('click', toggleAllNaceFilter)



let toggleFilterNACE = (buttonId) => {
    activateCompatButton(compatFilterManualButton)
    // update nace object
    nace[buttonId.replace("-filter-button", "")].active = !nace[buttonId.replace("-filter-button", "")].active
    // color active buttons
    updateNaceButtons()
    // only display active emissions
    updateEmissionsFilter()
}

/**
 * Display a button for each NACE category.
 *
 */
function addNACEFilters() {
    for (var name in nace) {
        //let emissionSums = formatSI(globalEmissionData.stats.totals['CO2, AIR'][name]) + ' Megatonnes CO2/year, ' + formatSI(globalEmissionData.stats.totals['CO, AIR'][name]) + ' Megatonnes CO/year';
        let button = d3.select('#naceCategories')
            .append('a')
            .attr('id', name + '-filter-button')
            .attr('class', 'button is-small is-activated is-fullwidth nace-button ' + nace[name].style)
            .on('click', (a, b, c) => { toggleFilterNACE(c[0].id) })
            //.attr('title', emissionSums)
            .text(name)
    }
}

/***********************/
/* Chemical plants tab */
let distanceChemicalPlant = document.getElementById('distance-chemical-plant'),
    polyolFilterButton = document.getElementById('polyol-filter-button'),
    pipelineFilterButton = document.getElementById('pipeline-filter-button'),
    radiusFilterButton = document.getElementById('radius-filter-button')

let distanceChemicalPlantSlider = document.getElementById('distance-chemical-plant-slider'),
    distanceChemicalPlantOutput = document.getElementById('distance-chemical-plant-slider-output'),
    polyolSlider = document.getElementById('polyol-slider'),
    polyolOutput = document.getElementById('polyol-slider-output')

let sizeFilterButton = document.getElementById('size-filter-button')

/**
 * Toggle if only polyol plants are shown or all chemical plants
 */
let togglePolyolFilter = () => {
    polyolFilterButton.classList.toggle('is-info')
    if (map.hasLayer(chemicalParkMarkers['chemical parks'])) {
        map.removeLayer(chemicalParkMarkers['chemical parks'])
    }
    else {
        map.addLayer(chemicalParkMarkers['chemical parks'])
    }
    updateEmissionsFilter()
}
polyolFilterButton.addEventListener('click', togglePolyolFilter)

/**
 * Toggle if only plants with ethylene pipelines are shown or all chemical plants
 */
let togglePipelineFilter = () => {
    pipelineFilterButton.classList.toggle('is-info')
    updatePlantFilter()
    updateEmissionsFilter()
}
pipelineFilterButton.addEventListener('click', togglePipelineFilter)

/**
 * Decide for each emission if it should be displayed depending on all active filters
 */
function updateEmissionsFilter() {
    for (marker in markers) {
        var m = markers[marker]
        m.setFilter(globalEmissionData[marker], function (feature) {
            let isVisible = true
            isVisible = (nace[feature.properties.MainIASectorName].active)
            // if selected, only show those next to chemParks
            if (isVisible && radiusFilterButton.classList.contains('is-info')) {
                isVisible =
                    // if the chemical parks are not limited to polyol plants, check for distance to chemParks
                    (!polyolFilterButton.classList.contains('is-info') && decideIfInDistance(feature, 'chemical parks'))
                    // and always check for distance to polyol plants
                    || decideIfInDistance(feature, 'polyol plants')
                    // if selected, only show clusters with enough CO for x kt polyol
                if (isVisible && sizeFilterButton.classList.contains('is-info')) {
                    isVisible = decideIfInVisibleCluster(feature)
                }
            }
            return isVisible
        })
    }
    getFilteredTotals()
    getActiveChemPlants()
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
    // console.log(feature);
    
    for (d in feature.properties.distances) {
        for (paramStyle in feature.properties.distances[d]) {
            let chem = feature.properties.distances[d][paramStyle]
            if (chem < distanceChemicalPlantOutput.value * 1000) {
                // if so, find the corresponding chemical plant and see if it has enough CO
                // this should probably be globalChemicalData
                for (marker in chemicalParkMarkers) {
                    // if only polyol plants are shown, don't check the chemical parks
                    if (!polyolFilterButton.classList.contains('is-info') || marker == 'polyol plants') {
                        for (f in chemicalParkMarkers[marker]._layers) {
                            let feat = chemicalParkMarkers[marker]._layers[f].feature
                            if (feat.properties.FacilityName == paramStyle) {
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
}
radiusFilterButton.addEventListener('click', toggleRadiusFilter)



/**
 * Toggles if the button is pressed limiting the view to only plants with at least x kt polyol
 */
let toggleSizeFilter = () => {
    sizeFilterButton.classList.toggle('is-info')
    if(sizeFilterButton.classList.contains('is-info')) {
        radiusFilterButton.classList.add('is-info')
        polyolSlider.disabled = false
    }
    else {
        polyolSlider.disabled = true
    }
    updatePlantFilter()
    updateEmissionsFilter()
}
sizeFilterButton.addEventListener('click', toggleSizeFilter)

function updatePlantFilter() {
    let isSizeFilterActive = sizeFilterButton.classList.contains('is-info')
    let isPipelineFilterActive = pipelineFilterButton.classList.contains('is-info')
    // This was defined by the consortium. A 50 kt polyol plant needs 15 kt of CO (or an equivalent amount of CH4 or H2)
    let minCOavailability = polyolOutput.value * 15 / 50000
    for (marker in chemicalParkMarkers) {        
        var m = chemicalParkMarkers[marker]
        m.setFilter(globalChemicalData[marker], feature => {
            return (!isSizeFilterActive || feature.properties.availability['CO, AIR'] > minCOavailability) &&
                   (!isPipelineFilterActive || feature.properties.ePipeline == 1)
        })
    }
}

/* Glitch in the slider, reset the value to put button in middle of slider */
distanceChemicalPlantSlider.value = distanceChemicalPlantSlider.getAttribute("value")
polyolSlider.value = polyolSlider.getAttribute("value")

distanceChemicalPlantSlider.addEventListener('input', function (event) {
    // Update output with slider value
    distanceChemicalPlantOutput.value = event.target.value
    for (layer in chemicalParkMarkers) {
        chemicalParkMarkers[layer].eachLayer((layer) => {
            // update the popups for all chemical clusters
            layer.setPopupContent(addConsumerPopupHandler(layer.feature, type))            
            // Update size of circle
            return layer.setRadius(event.target.value * 1000)
        })
    }
    // if emissions limited to distance, update filter    
    if (radiusFilterButton.classList.contains('is-info')) {
        updateEmissionsFilter()
    }


})
polyolSlider.addEventListener('input', function (event) {
    // Update output with slider value
    polyolOutput.value = event.target.value
    updatePlantFilter()
    updateEmissionsFilter()
})

let numberChemParks = document.getElementById('number-chem-parks'),
numberPolyolPlants = document.getElementById('number-polyol-plants')
function getActiveChemPlants(){
}

/****************/
/* Settings tab */
let mapLayoutGreen = document.getElementById('map-layout-green'),
    mapLayoutLight = document.getElementById('map-layout-light'),
    mapShowConsumers = document.getElementById('map-show-consumers'),
    modifyConsumers = document.getElementById('modify-consumers'),
    modalModifyConsumers = document.getElementById('modal-modify-consumers'),
    csvChemicalParks = document.getElementById('csv-chemical-parks'),
    csvPolyolPlants = document.getElementById('csv-polyol-plants'),
    modifyConsumersCreateLink = document.getElementById('modify-consumers-create-link'),
    modifyConsumersLoadData = document.getElementById('modify-consumers-load-data'),
    closeModalList = document.getElementsByClassName('close-modal'),
    resetConsumers = document.getElementById('reset-consumers')

function toggleMapLayout() {
    mapLayoutGreen.classList.toggle('is-info')
    mapLayoutLight.classList.toggle('is-info')
    if (mapLayoutGreen.classList.contains('is-info')) {
        map.removeLayer(light)
        map.addLayer(green)
    }
    else {
        map.removeLayer(green)
        map.addLayer(light)
    }
}
mapLayoutGreen.addEventListener('click', toggleMapLayout)
mapLayoutLight.addEventListener('click', toggleMapLayout)

function toggleShowConsumers() {
    mapShowConsumers.classList.toggle('is-info')
    polyolFilterButton.classList.remove('is-info')
    if (mapShowConsumers.classList.contains('is-info')) {
        polyolFilterButton.disabled = false
        for(l in chemicalParkMarkers)
            map.addLayer(chemicalParkMarkers[l])
    }
    else {
        polyolFilterButton.disabled = true
        for(l in chemicalParkMarkers)
            map.removeLayer(chemicalParkMarkers[l])
    }
}
mapShowConsumers.addEventListener('click', toggleShowConsumers)

function putCsvInTextArea(file, textarea) {			
    fetch(file)
        .then(response => response.text())
        .then(myBlob => textarea.value = myBlob)
}

function toggleModifyConsumers(){    
    modalModifyConsumers.classList.toggle('is-active')
    if (!modalModifyConsumers.dataset.isInitialized){
        putCsvInTextArea('chemicalparks.csv', csvChemicalParks)
        putCsvInTextArea('polyol plants europe v2.csv', csvPolyolPlants)
        modalModifyConsumers.dataset.isInitialized = true
    }
}
modifyConsumers.addEventListener('click', toggleModifyConsumers)
for (let i=0; i < closeModalList.length; i++) {    
    closeModalList[i].addEventListener('click', toggleModifyConsumers)
}

function modifyConsumersLink(){
    var script = document.createElement('script')
    script.onload = function () {
        convertCsvsToJSON().then(json => {
            var compressed = LZString.compressToEncodedURIComponent(JSON.stringify(json))
            window.prompt("Copy to clipboard: Ctrl+C, Enter", 'https://carbon4pur.github.io/mapping/index.html?c=' +compressed)

        })
    }
    script.src = 'vendor/lz-string.min.js'
    document.head.appendChild(script)
}
modifyConsumersCreateLink.addEventListener('click', modifyConsumersLink)

function convertCsvsToJSON() {    
    return new Promise((resolve) => {
        // only load csv2geojson if needed
        var script = document.createElement('script')
        script.onload = function () {
            let csvs = {
                "chemical parks": csvChemicalParks.value,
                "polyol plants": csvPolyolPlants.value
            } 
            let json = {}
            for(type in csvs){
                csv2geojson.csv2geojson(csvs[type], {
                    latfield: 'latitude',
                    lonfield: 'longitude',
                    delimiter: ';',
                }, (err, geojson) => {
                    if (err) {
                        console.error(err)
                    } else {
                        //console.log(geojson)
                        json[type] = geojson
                    }
                })
            }
            globalChemicalData = json
            //console.log(globalChemicalData)
            resolve(json)
        }
        script.src = 'vendor/csv2geojson.js'
        document.head.appendChild(script)
    })
}

function addDistances(emissions, chemParks) {
    return new Promise((resolve, reject) => {
        for(eCat in emissions){
            if(eCat != "stats"){
                for(f in emissions[eCat].features){
                    let feat = emissions[eCat].features[f]
                    delete feat.properties.distances
                    for(cat in chemParks){
                        //console.log(globalChemParks)
                        for(park in chemParks[cat].features){
                            let p = chemParks[cat].features[park]
                            let d = distance(feat.geometry.coordinates[1], feat.geometry.coordinates[0], p.geometry.coordinates[1], p.geometry.coordinates[0])   
                            if(d<100001){
                                if(!feat.properties.distances) feat.properties.distances = {}
                                if(!feat.properties.distances[cat]) feat.properties.distances[cat] = {}
                                    feat.properties.distances[cat][p.properties.FacilityName] = d
                                    //console.log(p.properties.FacilityName)
                            }
                        }
                    }
                }
            }
        }
        globalEmissionData = emissions
        console.log(globalEmissionData)
        
        resolve(emissions)
    })
}

function distance(lat1, lng1, lat2, lng2) {
    var rad = Math.PI / 180,
        lt1 = lat1 * rad,
        lt2 = lat2 * rad,
        sinDLat = Math.sin((lat2 - lat1) * rad / 2),
        sinDLon = Math.sin((lng2 - lng1) * rad / 2),
        a = sinDLat * sinDLat + Math.cos(lt1) * Math.cos(lt2) * sinDLon * sinDLon,
        c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return 6371000 * c
}

function loadConsumersData() {
    modifyConsumersLoadData.classList.add('is-loading')
    convertCsvsToJSON().then(chemParks => addDistances(globalEmissionData, chemParks))
        .then(a => loadPRTRlayers())
        .then(b => loadChemicalParks(globalChemicalData))
        .then(() => {
            modifyConsumersLoadData.classList.remove('is-loading')
            modalModifyConsumers.classList.remove('is-active')
        })
}

modifyConsumersLoadData.addEventListener('click', loadConsumersData)

resetConsumers.addEventListener('click', () => {    
    delete modalModifyConsumers.dataset.isInitialized
    loadChemicalParksFromJSON()
})


/***********************/
/* Load data functions */
/***********************/

// keep reference to the markers for filtering
var markers = {}
var chemicalParkMarkers = {}

/** 
* convert json to map layer with circlemarkers
* @param {data} an Object loaded from json data containing several geoJSON Objects. Each feature should contain a "properties" with FacilityName, PollutantName, MTonnes and NACEMainEconomicActivityName
*/
function loadPRTRlayers(data) {
    return new Promise((resolve, reject) => {
        console.log(data)
        var lookup = {};
        var items = data['CO2, AIR'].features;
        var result = [];
        for (var item, i = 0; item = items[i++];) {
            var name = item.properties.MainIASectorName;

            if (!(name in lookup)) {
                lookup[name] = 1;
                result.push(name);
            }
        }
        console.log(result);
        
        
        for (emission in data) {
            if (emission != "stats") {
                for(f in data[emission].features) {
                    data[emission].features[f].properties.type = emission
                }                
                markers[emission] = L.geoJson(data[emission], {
                    pointToLayer: function (feature, latlng) {                        
                        return L.circleMarker(latlng, {
                            radius: Math.sqrt(feature.properties["TotalQuantity [kg/year]"] / data.stats.totalMax / 1000000000) * 50,
                            color: emissionColors[feature.properties.CountryName],
                            fillColor: nace[feature.properties.MainIASectorName].color,
                            weight: 2,
                            opacity: 0.7,
                            fillOpacity: 0.4
                        }).bindPopup(addEmitterPopupHandler(feature))
                    }
                }).addTo(map)
            }
        }
        globalEmissionData = data
        resolve(data)
    })
}

/**
 *Add a popup to a GeoJSON feature of a certain type
 *
 * @param {*} feature A GeoJSON feature with geometry and properties
 * @param {string} type The name of the category, in this case "CO2" or "CO" 
 * @returns {string} a DOM string containing the popup
 */
function addEmitterPopupHandler(feature) {
    if (feature.properties) {
        let thisEmission = formatSI(feature.properties["TotalQuantity [kg/year]"]) + ' Megatonnes CO<sub>2</sub>/year'
        let color = translucidColor('blue' ) //nace[feature.properties.NACEMainEconomicActivityName].color)
        return `<h2>${feature.properties.FacilityName}</h2>
                        ${feature.properties.CountryName}                    
                        <br><b><i>${feature.properties.NACEMainEconomicActivityName}</i></b>
                        <br>
                        <div class='popup-em' style='background: ${color}'>
                        Emissions:
                        <br />${thisEmission}</div>`

    }
    else {
        console.log(feature)
    }
}

/** 
* convert json to map layer with circlemarkers
* @param {Object} data Object loaded from json data containing several geoJSON Objects. Each feature should contain a "properties" with FacilityName 
*/
function loadChemicalParksFromData(data) {
    // copy distance information to markers. This could be done while creating the json arrays to speedup the load time.
    //console.log(data)    
    return new Promise((resolve, reject) => {
        for (emission in globalEmissionData) {
            if (emission != "stats") {
                for (f in globalEmissionData[emission].features) {
                    let feat = globalEmissionData[emission].features[f]
                    if (feat.properties.distances) {
                        for (e in feat.properties.distances) {
                            for (chem in feat.properties.distances[e]) {
                                for (paramStyle in data[e].features) {
                                    if (data[e].features[paramStyle].properties.FacilityName == chem) {
                                        if (!data[e].features[paramStyle].properties.distances) data[e].features[paramStyle].properties.distances = []
                                        data[e].features[paramStyle].properties.distances.push({
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
                chemicalParkMarkers[type] = convertGeoJSONToChemLayer(data, type).addTo(map)
            }
        }
        // keep global reference
        globalChemicalData = data
        resolve()
    })
}

function loadChemicalParksFromURI(c) {
    loadScript('vendor/lz-string.min.js', () => {
        let string = LZString.decompressFromEncodedURIComponent(c)
        console.log(string, JSON.parse(string))
        loadChemicalParksFromData(JSON.parse(string))
    })
}

function loadChemicalParks(data) {
    return new Promise((resolve, reject) => {
        for (marker in chemicalParkMarkers) {
            map.removeLayer(chemicalParkMarkers[marker])
        }
        chemicalParkMarkers = {}
        if(url.searchParams.get("c")) {
            loadChemicalParksFromURI(url.searchParams.get("c"))
            .then(resolve())
        }
        else {
            loadChemicalParksFromData(data)
            .then(resolve())
        }
    })
}


function loadChemicalParksFromJSON() {
    return new Promise((resolve) => {
        fetch('chemicalParks.json')
            .then((response) => { return response.json() },
                (reject) => { console.error(reject) })
            .then(loadChemicalParks)
            .then(() => resolve())
    })
}


function loadScript(url, callback) {
    // Adding the script tag to the head as suggested before
    var head = document.head
    var script = document.createElement('script')
    script.type = 'text/javascript'
    script.src = url
    // Then bind the event to the callback function.
    // There are several events for cross browser compatibility.
    script.onreadystatechange = callback
    script.onload = callback
    // Fire the loading
    head.appendChild(script)
}

/**
 * Convert a geojson to a layer with circles and popups
 *
 * @param {*} data an object from json containing an array of geoJSON
 * @param {string} type the name of the geoJSON inside the data
 * @returns {layer} a geoJSON layer
 */
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
        return `<h2>${feature.properties.FacilityName}</h2>
                ${feature.properties.Country}
                <br><b><i class="${type.replace(" ", "-") + "-popup"}">${type === 'chemical parks' ? "Chemical park" : "Polyol plant"}</i></b>
                <br>` + consumerPopupAvailability(feature, type)
    }
    else {
        console.log(feature)
    }
}

/**
 * Create a box with available emissions around a consumer
 *
 * @param {*} feature the consumer
 * @param {*} type consumer type ("chemical parks" or "polyol plants")
 * @returns a DOM string containing a div with the availability
 */
function consumerPopupAvailability(feature, type) {
    let p = feature.properties
    p.availability = { ['CO2, AIR']: 0, ['CO, AIR']: 0 }
    if (p.distances != undefined) {
        for (e in p.distances) {
            if (p.distances[e].distance < distanceChemicalPlantOutput.value * 1000) {
                p.availability[p.distances[e].type] += p.distances[e].value
            }
        }
    }
    return '<div class="popup-em" style="background:'+ translucidColor(chemicalColors[type]) +'">Available emissions:<br>(in a radius of ' + distanceChemicalPlantOutput.value + '&nbsp;km)<br>' +
        formatSI(feature.properties.availability['CO2, AIR']) + '&nbsp;Megatonnes CO<sub>2</sub>/year<br>' +
        formatSI(feature.properties.availability['CO, AIR']) + '&nbsp;Megatonnes CO/year</div>'
}

/**
 * create a translucid color from a color string for the popups
 *
 * @param {*} colorString
 * @param {number} [opacity=0.6]
 * @returns color
 */
function translucidColor(colorString, opacity=0.6){
    let c = d3.color(colorString)
    c.opacity = opacity
    return c
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
        .text(function (d) { return format1Dec(d) }) // to display in Mt
        .style("font-size", 10)
        .attr('alignment-baseline', 'middle')
}


/*************************************/
/* Change layout with get parameters */
/*************************************/
var url = new URL(window.location.href)
if(!mapLayoutLight.classList.contains('is-info') && url.searchParams.get("style") == "light") toggleMapLayout()


/*************************************************/
/* And finally load all json data and display it */
/*************************************************/
document.addEventListener('DOMContentLoaded', (event) => {
    showMap()
    loadGlobalDefs()
    fetch('emissions.json')
        .then((response) => { return response.json() },
            (reject) => { console.error(reject) })
        .then(loadPRTRlayers)
        .then(createScale)
        .then(addNACEFilters)
        .then(getFilteredTotals)
        .then(loadChemicalParksFromJSON)
        //.then(checkIfIntro)
        //.then(getActiveChemPlants)
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
                intro: "Here you find information about the map and the data"
            },
            {
                element: '#emitter-tab-li',
                intro: "In this tab, you can filter the bubbles on the map representing emissions."
            },
            {
                element: '#consumer-tab-li',
                intro: 'Here you can filter by chemical parks and polyol plants.'
            },
            {
                element: '#legal-tab-li',
                intro: 'All the background info and data as well as legal information about licenses and data.'
            },
            {
                element: '#settings-tab-li',
                intro: "And if you like another map layout or restart the tour, click here."
            },
            {
                intro: "Click on any bubble to see more information about it.<br>That's it, now play with it."
            }
            ],
            doneLabel: '<div title="This is the only cookie used on this site. If you don\'t want to use cookies, the tour will be shown on each reload. Click anywhere outside the tour to make it disappear."><span>Done</span><span style="color: #746427;"> &#9432;</span><div>'
        })
        introJs.fn.oncomplete(setCookieNoTour)
        sidebar.open('info-content')
        intro.start()
        document.getElementById('set-cookie-no-tour').addEventListener('click', setCookieNoTour)
  }