// define global variables
let map

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

    /* Add the zoom buttons */
    L.control.zoom({
        position: 'topright'
    }).addTo(map)

    /* Set up a layout object with different map styles and a toggle function */
    map.layout = {
        items: {
            light: {
                layer: L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png', {
                    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap<\/a>, &copy; <a href="https://carto.com/attribution">CARTO<\/a>, <a href="http://prtr.ec.europa.eu">E-PRTR</a>'
                }),
                button: document.getElementById('map-layout-light')
            },
            green: {
                layer: L.tileLayer('https://tile.thunderforest.com/neighbourhood/{z}/{x}/{y}.png?apikey=9a85f60a13be4bf7bed59b5ffc0f4d86', {
                    attribution: 'Maps &copy; <a href="https://www.thunderforest.com">Thunderforest</a>, Data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>, <a href="http://prtr.ec.europa.eu">E-PRTR</a>'
                }).addTo(map),
                button: document.getElementById('map-layout-green')
            }
        },
        toggle: function () {
            for (layout in map.layout.items) {
                let l = map.layout.items[layout]
                l.button.classList.toggle('is-info')
                if (l.button.classList.contains('is-info')) {
                    map.addLayer(l.layer)
                } else {
                    map.removeLayer(l.layer)
                }
            }
        }
    }
    for (layout in map.layout.items) {
        let l = map.layout.items[layout]
        l.button.addEventListener('click', map.layout.toggle)
    }

    /* Add the sidebar */
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

    map.filters = {
        items: {
            eoAvailability: {
                button: document.getElementById('filter-by-eo'),
                filterFunction: (feature) => {
                    return feature.properties.hasEthyleneOxide == "1"
                },
                activeOnLoad: true
            },
            left: {
                button: document.getElementById('filter-by-geo'),
                filterFunction: (feature) => {
                    return feature.geometry.coordinates[0] <= 0
                },
                activeOnLoad: false
            }
        },
        createFilterFunction: function (name, filter) {
            return function () {
                filter.button.classList.toggle('is-info')
                if (filter.button.classList.contains('is-info')) {
                    map.filters.filterConditions[name] = filter.filterFunction
                }
                else {
                    delete map.filters.filterConditions[name]
                }
                map.filters.filter()
            }
        },
        filterConditions: {},
        filter : function(layer){
            map.geoJSONlayer.setFilter(map.data, function (feature) {
                let isVisible = true
                for (condition in map.filters.filterConditions){
                    isVisible = isVisible && map.filters.filterConditions[condition](feature)
                }
                return isVisible
            })
        }
    }
    for (filter in map.filters.items) {
        let f = map.filters.items[filter]
        f.button.addEventListener('click', map.filters.createFilterFunction(filter, f))
        if (f.activeOnLoad) {
            f.button.classList.add('is-info')
            map.filters.filterConditions[filter] = f.filterFunction
        }
        else {
            f.button.classList.remove('is-info')
        }
    }

}

function showDataLayer(data) {
    map.data = data
    map.geoJSONlayer = L.geoJson(data, {
        pointToLayer: function (feature, latlng) {
            return L.circleMarker(latlng, {
                radius: 30,
                color: feature.properties.color,
                fillColor: feature.properties.color,
                weight: 1,
                opacity: 0.7,
                fillOpacity: 0.4
            }).bindPopup(addPopupHandler(feature))
        }
    }).addTo(map)
    
    map.filters.filter()
}

function addPopupHandler(feature) {
    return `<h2>${feature.properties.FacilityName}</h2>
        ${feature.properties.CountryName}`
}

document.addEventListener('DOMContentLoaded', (event) => {
    showMap()
    fetch('data.json')
        .then(
            (response) => {
                return response.json()
            },
            (reject) => {
                console.error(reject)
            })
        .then(showDataLayer)
})