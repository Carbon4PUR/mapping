// define global variables
let map, format1Dec, formatSI

function showMap() {
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
    map.light = L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap<\/a>, &copy; <a href="https://carto.com/attribution">CARTO<\/a>, <a href="http://prtr.ec.europa.eu">E-PRTR</a>'
    })
    /* Current default map. Switch by puting the .addTo above */
    /* Thunderforest green tiles with more information */
    map.green = L.tileLayer('https://tile.thunderforest.com/neighbourhood/{z}/{x}/{y}.png?apikey=9a85f60a13be4bf7bed59b5ffc0f4d86', {
            attribution: 'Maps &copy; <a href="https://www.thunderforest.com">Thunderforest</a>, Data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>, <a href="http://prtr.ec.europa.eu">E-PRTR</a>'
        })
        .addTo(map)

    /* Add the zoom buttons */
    map.sidebar = L.control.sidebar('sidebar', {
        position: 'left'
    }).addTo(map)


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
        for (type in chemicalParkMarkers) {
            if (e.target._zoom > 7 && !chemicalParkMarkers.isBack) {
                chemicalParkMarkers[type].bringToBack()
                chemicalParkMarkers[type].isBack = true
            } else {
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

/****************/
/* Settings tab */
let mapLayoutGreen = document.getElementById('map-layout-green'),
    mapLayoutLight = document.getElementById('map-layout-light'),
    modifyConsumers = document.getElementById('modify-consumers'),
    modalModifyConsumers = document.getElementById('modal-modify-consumers'),
    csvChemicalParks = document.getElementById('csv-chemical-parks'),
    csvPolyolPlants = document.getElementById('csv-polyol-plants'),
    renewEmissions = document.getElementById('renew-emissions'),
    modifyConsumersCreateLink = document.getElementById('modify-consumers-create-link'),
    modifyConsumersCreateJSON = document.getElementById('modify-consumers-create-json'),
    modifyConsumersLoadData = document.getElementById('modify-consumers-load-data'),
    closeModalList = document.getElementsByClassName('close-modal'),
    resetConsumers = document.getElementById('reset-consumers')

function toggleMapLayout() {
    mapLayoutGreen.classList.toggle('is-info')
    mapLayoutLight.classList.toggle('is-info')
    if (mapLayoutGreen.classList.contains('is-info')) {
        map.removeLayer(map.light)
        map.addLayer(map.green)
    } else {
        map.removeLayer(map.green)
        map.addLayer(map.light)
    }
}
mapLayoutGreen.addEventListener('click', toggleMapLayout)
mapLayoutLight.addEventListener('click', toggleMapLayout)

function putCsvInTextArea(file, textarea) {
    fetch(file)
        .then(response => response.text())
        .then(myBlob => textarea.value = myBlob)
}

function toggleModifyConsumers() {
    modalModifyConsumers.classList.toggle('is-active')
    if (!modalModifyConsumers.dataset.isInitialized) {
        putCsvInTextArea('chemicalparks v2.csv', csvChemicalParks)
        putCsvInTextArea('polyol plants europe v2.csv', csvPolyolPlants)
        modalModifyConsumers.dataset.isInitialized = true
    }
}
modifyConsumers.addEventListener('click', toggleModifyConsumers)
for (let i = 0; i < closeModalList.length; i++) {
    closeModalList[i].addEventListener('click', toggleModifyConsumers)
}

function modifyConsumersLink() {
    var script = document.createElement('script')
    script.onload = function () {
        convertCsvsToJSON().then(json => {
            var compressed = LZString.compressToEncodedURIComponent(JSON.stringify(json))
            window.prompt("Copy to clipboard: Ctrl+C, Enter", 'https://carbon4pur.github.io/mapping/index.html?c=' + compressed)

        })
    }
    script.src = 'vendor/lz-string.min.js'
    document.head.appendChild(script)
}
modifyConsumersCreateLink.addEventListener('click', modifyConsumersLink)

function downloadObjectAsJson(exportObj, exportName) {
    var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj));
    var downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", exportName + ".json");
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

function modifyConsumersJSON() {
    convertCsvsToJSON().then(json => addDistances(globalEmissionData, json))
        .then(obj => {
            downloadObjectAsJson(obj.chemParks, "chemicalParks")
        })
}
modifyConsumersCreateJSON.addEventListener('click', modifyConsumersJSON)

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
            for (type in csvs) {
                csv2geojson.csv2geojson(csvs[type], {
                    latfield: 'latitude',
                    lonfield: 'longitude',
                    delimiter: ';',
                }, (err, geojson) => {
                    if (err) {
                        console.error(err)
                    } else {
                        //console.log(csvs, geojson)
                        json[type] = geojson
                    }
                })
            }
            //console.log(globalChemicalData)
            resolve(json)
        }
        script.src = 'vendor/csv2geojson.js'
        document.head.appendChild(script)
    })
}

function addDistances(emissions, chemParks) {
    return new Promise((resolve, reject) => {
        for (c in chemParks) {
            deleteOldDistances(chemParks[c].features)
        }
        for (e in emissions) {
            deleteOldDistances(emissions[e].features)
            if (e != "stats") {
                for (c in chemParks) {
                    if (c != "stats") {
                        distancesBetweenFeatureLists(emissions[e].features, e, chemParks[c].features, c, groupByType1 = true)
                    }
                }
            }
        }
        resolve({
            emissions: emissions,
            chemParks: chemParks
        })
    })
}

function deleteOldDistances(list) {
    for (let f1 in list) delete list[f1].properties.distances
}

function distancesBetweenFeatureLists(list1, e, list2, c) {
    for (let f1 in list1) {
        for (let f2 in list2) {
            let feat1 = list1[f1],
                feat2 = list2[f2]
            let d = distance(feat1.geometry.coordinates[1], feat1.geometry.coordinates[0], feat2.geometry.coordinates[1], feat2.geometry.coordinates[0])
            if (d < 100001) {
                if (!feat1.properties.distances) feat1.properties.distances = {}
                feat1.properties.distances[feat2.properties.FacilityName] = {
                    distance: d,
                    type: c
                }
                if (!feat2.properties.distances) feat2.properties.distances = {}
                feat2.properties.distances[feat1.properties.FacilityName] = {
                    distance: d,
                    type: feat1.properties.type,
                    amount: feat1.properties.MTonnes
                }
            }
        }
    }

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
        .then(obj => {
            globalEmissionData = obj.emissions
            globalChemicalData = obj.chemParks
        })
        .then(loadChemicalParks(globalChemicalData))
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


function createNewEmissionsJSON() {
    renewEmissions.classList.add('is-loading')
    window.sortedFeatures = {
        'stats': {
            'totalMax': 0,
            max: {},
            totals: {
                "CO2, AIR": {},
                "CO, AIR": {}
            },
            "Description": "BEFORE CHANGING: PLEASE NOTE: the location for 'FJERNVARME FYN FYNSVÆRKET A/S' has to be changed from (9.80973039123284°, 5.33467590910096°) to 10.404647, 55.428245"
        }
    };
    var actions = ["CO2, AIR", "CO, AIR"].map(asyncGetData);
    var results = Promise.all(actions);
    results.then(data => { // or just .then(console.log)
        // iterate over all CO2 plants
        for (let i = 0; i < sortedFeatures['CO2, AIR'].features.length; i++) {
            let f = sortedFeatures['CO2, AIR'].features[i];
            // iterate over all CO plants
            for (let j = 0; j < sortedFeatures['CO, AIR'].features.length; j++) {
                let e = sortedFeatures['CO, AIR'].features[j];
                // check if plants are equal except amount
                if (checkEquality(e, f, false)) {
                    e.properties.co2Amount = f.properties.MTonnes;
                    f.properties.coAmount = e.properties.MTonnes;
                }
            }
        }
        addDistances(sortedFeatures, globalChemicalData)
        console.log(sortedFeatures)
        downloadObjectAsJson(sortedFeatures, "emissions")
        renewEmissions.classList.remove('is-loading')
    });
}
renewEmissions.addEventListener('click', createNewEmissionsJSON)

var asyncGetData = function asyncGetDataFromSparql(emissionName) {
    return new Promise(resolve => {
        sortedFeatures[emissionName] = {
            type: "FeatureCollection",
            features: []
        };
        /* query e-prtr with variables */
        var query = makeQueryEPRTR(emissionName);
        fetch(query)
            .then(function (response) {
                //console.log(response);
                return response.json();
            }, function (reject) {
                console.log(reject);
            })
            .then(myBlob => showEm(myBlob))
            .then(col => {
                sortedFeatures[emissionName].features = col;
                let m = col.reduce((a, b) => a.properties.MTonnes > b.properties.MTonnes ? a : b).properties.MTonnes;
                sortedFeatures.stats.max[emissionName] = m;
                if (sortedFeatures.stats.totalMax < m) sortedFeatures.stats.totalMax = m;
                for (let i = 0; i < col.length; i++) {
                    let cur = col[i];
                    if (isNaN(sortedFeatures.stats.totals[emissionName][cur.properties.NACEMainEconomicActivityName])) sortedFeatures.stats.totals[emissionName][cur.properties.NACEMainEconomicActivityName] = 0;
                    sortedFeatures.stats.totals[emissionName][cur.properties.NACEMainEconomicActivityName] += cur.properties.MTonnes;
                }
                resolve(sortedFeatures)
            });
    })
};

/* use http://semantic.eea.europa.eu/sparql online query tool to generate query */
function makeQueryEPRTR(emissionName = "CO2, AIR") {
    /* CORS headers not set by europa.eu, so we use a sparql proxy */
    var proxy = "https://cors-anywhere.herokuapp.com/";
    /* easiest sparql endpoint we could find */
    var url = "http://semantic.eea.europa.eu/sparql";
    var query = `PREFIX eprtr: <http://prtr.ec.europa.eu/rdf/schema.rdf#>
PREFIX facility: <http://prtr.ec.europa.eu/rdf/facility/>
PREFIX wgs84: <http://www.w3.org/2003/01/geo/wgs84_pos#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>
SELECT ?FacilityName ?FacilityDetails ?CountryName ?Lat ?Long ?ReportingYear ?NACEMainEconomicActivityName ?PollutantName ?Quantity {
  ?facility eprtr:facilityName ?FacilityName .
  ?facility eprtr:inCountry ?country . ?country eprtr:name ?CountryName .
  ?facility eprtr:latestReport ?latestReport . 
  ?facility wgs84:lat ?Lat . 
  ?facility wgs84:long ?Long .
  ?facility foaf:isPrimaryTopicOf ?FacilityDetails .
  ?latestReport eprtr:reportingYear ?ReportingYear .
  ?latestReport eprtr:nACEActivity ?nACEActivity . ?nACEActivity eprtr:name ?NACEMainEconomicActivityName
  values ?nACEActivity {
    <http://prtr.ec.europa.eu/rdf/nACEActivity/20.13>
    <http://prtr.ec.europa.eu/rdf/nACEActivity/23.52>
    <http://prtr.ec.europa.eu/rdf/nACEActivity/35.11>
    <http://prtr.ec.europa.eu/rdf/nACEActivity/06.20>
    <http://prtr.ec.europa.eu/rdf/nACEActivity/23.51>
    <http://prtr.ec.europa.eu/rdf/nACEActivity/20.15>
    <http://prtr.ec.europa.eu/rdf/nACEActivity/19.20>
    <http://prtr.ec.europa.eu/rdf/nACEActivity/24.10>
    
  }
  ?pollutantRelease eprtr:facilityReport ?latestReport .   
  ?pollutantRelease rdfs:label ?PollutantName . 
  values ?PollutantName {"` + emissionName + `"}  
  ?pollutantRelease eprtr:totalQuantity ?Quantity . 
} 
ORDER BY ?nACEActivity ?FacilityName ?ReportingYear
LIMIT 10000
	`;
    /* Warning: europa.eu is normally limiting results to 512, add nrOfHits to increase */
    return proxy + url + "?query=" + encodeURIComponent(query) + '&format=application%2Fsparql-results%2Bjson&nrOfHits=10000';
}


function showEm(data) {
    var r = createFeatureCollection(data.results.bindings);
    return r;
}

function createGeometry(long, lat) {
    return {
        type: "Point",
        coordinates: [parseFloat(long), parseFloat(lat)]
    };
}

function createProperties(obj) {
    return {
        CountryName: obj.CountryName.value,
        FacilityName: obj.FacilityName.value,
        FacilityDetails: obj.FacilityDetails.value,
        ReportingYear: obj.ReportingYear.value,
        MTonnes: obj.Quantity.value / 1E9,
        NACEMainEconomicActivityName: obj.NACEMainEconomicActivityName.value,
        PollutantName: obj.PollutantName.value
    };
}

function createFeatureFromObj(obj) {
    return {
        geometry: createGeometry(obj.Long.value, obj.Lat.value),
        properties: createProperties(obj),
        type: "Feature"
    };
}

function checkEquality(el, ft, checkAmount = true) {
    var checks = (el.properties.FacilityDetails == ft.properties.FacilityDetails ? 1 : 0) +
        (el.properties.FacilityName == ft.properties.FacilityName ? 1 : 0) +
        (el.properties.ReportingYear == ft.properties.ReportingYear ? 1 : 0) +
        (el.properties.MTonnes == ft.properties.MTonnes ? 1 : 0)
    return checks > (checkAmount ? 3 : 2);
}

function createFeatureCollection(array) {
    var col = [];
    for (var i = 0; i < array.length; i++) {
        var ft = createFeatureFromObj(array[i]);
        const found = col.some(el => checkEquality(el, ft));
        if (!found) col.push(ft);
    }
    return col;
}


/***********************/
/* Load data functions */
/***********************/

// keep reference to the markers for filtering
var markers = {}
var chemicalParkMarkers = {}
var globalPipelines = {}

/** 
 * convert json to map layer with circlemarkers
 * @param {data} an Object loaded from json data containing several geoJSON Objects. Each feature should contain a "properties" with FacilityName, PollutantName, MTonnes and NACEMainEconomicActivityName
 */
function loadPRTRlayers(data) {
    return new Promise((resolve, reject) => {
        for (emission in data) {
            if (emission != "stats") {
                for (f in data[emission].features) {
                    data[emission].features[f].properties.type = emission
                }
                markers[emission] = L.geoJson(data[emission], {
                    pointToLayer: function (feature, latlng) {
                        return L.circleMarker(latlng, {
                            radius: Math.sqrt(feature.properties.MTonnes / data.stats.totalMax) * 50,
                            color: "blue",
                            fillColor: "blue",
                            weight: 1,
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
        let otherEmission = ''
        if (feature.properties.co2Amount) otherEmission += formatSI(feature.properties.co2Amount) + ' Megatonnes CO<sub>2</sub>/year'
        if (feature.properties.coAmount) otherEmission += formatSI(feature.properties.coAmount) + ' Megatonnes CO/year'
        let thisEmission = formatSI(feature.properties.MTonnes) + ' Megatonnes '
        if (feature.properties.type == 'CO, AIR') thisEmission += 'CO/year'
        else thisEmission += 'CO<sub>2</sub>/year'
        let color = translucidColor("blue")
        return `<h2>${feature.properties.FacilityName}</h2>
                        ${feature.properties.CountryName}                    
                        <br><b><i>${feature.properties.NACEMainEconomicActivityName}</i></b>
                        <br>
                        <div class='popup-em' style='background: ${color}'>
                        Emissions:
                        <br>${thisEmission}` + (otherEmission != '' ? `<br />${otherEmission}` : '') + `</div>
                        <br><br><a href="${feature.properties.FacilityDetails}" target="_blank">More Facility details on E-PRTR page</a>`

    } else {
        console.log(feature)
    }
}

/** 
 * convert json to map layer with circlemarkers
 * @param {Object} data Object loaded from json data containing several geoJSON Objects. Each feature should contain a "properties" with FacilityName 
 */
function loadChemicalParksFromData(data) {
    // copy distance information to markers. This could be done while creating the json arrays to speedup the load time.
    addDistances(globalEmissionData, data)
    //console.log(data)    
    return new Promise((resolve, reject) => {
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
        if (url.searchParams.get("c")) {
            loadChemicalParksFromURI(url.searchParams.get("c"))
                .then(resolve())
        } else {
            loadChemicalParksFromData(data)
                .then(resolve())
        }
    })
}


function loadChemicalParksFromJSON() {
    return new Promise((resolve) => {
        fetch('chemicalParks.json')
            .then((response) => {
                    return response.json()
                },
                (reject) => {
                    console.error(reject)
                })
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
            return L.circle(latlng, 1000, { // radius expected in m, slider in km
                fillColor: "red",
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
function addConsumerPopupHandler(feature) {
    if (feature.properties) {
        return `<h2>${feature.properties.FacilityName}</h2>
                ${feature.properties.CountryName}
                <br><b><i class="${feature.properties.type.replace(" ", "-") + "-popup"}">${feature.properties.type}</i></b>
                <br>` + consumerPopupAvailability(feature)
    } else {
        console.log(feature)
    }
}

/**
 * Create a box with available emissions around a consumer
 *
 * @param {*} feature the consumer
 * @returns a DOM string containing a div with the availability
 */
function consumerPopupAvailability(feature) {
    let p = feature.properties
    p.availability = {
        ['CO2, AIR']: 0,
        ['CO, AIR']: 0
    }
    if (p.distances != undefined) {
        for (n in p.distances) {
            if (p.distances[n].distance < 1000) {
                p.availability[p.distances[n].type] += p.distances[n].amount
            }
        }
    }
    return '<div class="popup-em" style="background:' + translucidColor("red") + '">Available emissions:<br>(in a radius of 1&nbsp;km)<br>' +
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
function translucidColor(colorString, opacity = 0.6) {
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
        .domain([0, globalEmissionData.stats.totalMax]) // What's in the data, min-max
        .range([0, 50]) // Size in pixel

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
        .attr("cy", function (d) {
            return yCircle - size(d)
        })
        .attr("r", function (d) {
            return size(d)
        })
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
        .attr('x1', function (d) {
            return xCircle + size(d)
        })
        .attr('x2', xLabel)
        .attr('y1', function (d) {
            return yCircle - size(d)
        })
        .attr('y2', function (d) {
            return yCircle - size(d)
        })
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
        .attr('x', function (d) {
            return xLabel + (d >= 10 ? 1 : 7)
        })
        .attr('y', function (d) {
            return yCircle - size(d)
        })
        .text(function (d) {
            return format1Dec(d)
        }) // to display in Mt
        .style("font-size", 10)
        .attr('alignment-baseline', 'middle')
}


/*************************************/
/* Change layout with get parameters */
/*************************************/
var url = new URL(window.location.href)
if (!mapLayoutLight.classList.contains('is-info') && url.searchParams.get("style") == "light") toggleMapLayout()


/*************************************************/
/* And finally load all json data and display it */
/*************************************************/
document.addEventListener('DOMContentLoaded', (event) => {
    showMap()
    loadGlobalDefs()
    fetch('emissions.json')
        .then((response) => {
                return response.json()
            },
            (reject) => {
                console.error(reject)
            })
        .then(loadPRTRlayers)
        .then(createScale)
        .then(loadChemicalParksFromJSON)
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

function clone(obj) {
    var copy;
    // Handle the 3 simple types, and null or undefined
    if (null == obj || "object" != typeof obj) return obj;
    // Handle Date
    if (obj instanceof Date) {
        copy = new Date();
        copy.setTime(obj.getTime());
        return copy;
    }
    // Handle Array
    if (obj instanceof Array) {
        copy = [];
        for (var i = 0, len = obj.length; i < len; i++) {
            copy[i] = clone(obj[i]);
        }
        return copy;
    }
    // Handle Object
    if (obj instanceof Object) {
        copy = {};
        for (var attr in obj) {
            if (obj.hasOwnProperty(attr)) copy[attr] = clone(obj[attr]);
        }
        return copy;
    }
    throw new Error("Unable to copy obj! Its type isn't supported.");
}

/***********************************/
/* Intro.js tour                   */
/***********************************/
function setCookieNoTour() {
    setCookie('no-tour', 'true')
    introJs().exit()
}

document.getElementById('show-intro').addEventListener('click', () => {
    deleteCookie('no-tour')
    startIntro()
})

function checkIfIntro() {
    if (!getCookie('no-tour')) {
        startIntro()
    }
}

function startIntro() {
    var intro = introJs()
    intro.onexit(() => map.sidebar.open('info-content'))
    intro.setOptions({
        steps: [{
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
    map.sidebar.open('info-content')
    intro.start()
    document.getElementById('set-cookie-no-tour').addEventListener('click', setCookieNoTour)
}