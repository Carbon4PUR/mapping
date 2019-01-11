window.dataModel = {
  "stats": {
    "totalMax":36.8,
  },
  "data": [
    {
      "category": "emitters",
      "icon": "icon-emitter",
      "iconText": "CO",
      "name":"CO",
      "displayName":"CO",
      "title": "CO emitters",
      "color":"#004e83",
      "layers": {
        "Aluminium production": {
          "features":[
            {
              "FacilityReportID":"1310637",
              "ReportingYear":"2014",
              "PollutantName":"Carbon monoxide (CO)",
              "MTonnes":"0.0354",
              "FacilityName":"Alcoa Fjarðaál",
              "City":"Fjarðabyggð",
              "CountryName":"Iceland",
              "NACEMainEconomicActivityName":"Aluminium production",
              "TotalQuantity":"35400000",
              "UnitName":"kilogram",
              "relativeQuantity": 0.95,
              "__comment-size": "calculated by dividing quantity by totalMax",
              "coordinates": [
                65,
                -14
              ]
            },
          ]
        }
      }
    },
    {
      "category": "emitters",
      "icon": "icon-emitter",
      "iconText": "CO<sub>2</sub>",
      "name":"CO2",
      "displayName":"CO<sub>2</sub>",
      "title": "CO<sub>2</sub> emitters",
      "color":"#002941",
      "layers": {
        "Aluminium production": {
          "features":[
            {
              "FacilityReportID":"1310637",
              "ReportingYear":"2014",
              "PollutantName":"Carbon dioxide (CO2)",
              "MTonnes":"0.0354",
              "FacilityName":"Alcoa Fjarðaál",
              "City":"Fjarðabyggð",
              "CountryName":"Iceland",
              "NACEMainEconomicActivityName":"Aluminium production",
              "TotalQuantity":"35400000",
              "UnitName":"kilogram",
              "relativeQuantity": 0.95,
              "__comment-size": "calculated by dividing quantity by totalMax",
              "coordinates": [
                65.033756,
                -14.099652
              ]
            },
          ]
        }
      }
    },
    {
      "category": "consumers",
      "icon": "icon-consumer",
      "iconText": "",
      "name":"CO-CO2",
      "displayName":"CO & CO<sub>2</sub>",
      "title": "consumers",
      "color":"#CC7300",
      "layers": {
        "Chemical parks": {
          "features": [
            {
              "FacilityName":"Schwendt",
              "relativeQuantity": 0.2,
              "__comment-size": "calculated by dividing quantity by totalMax",
              "potentials": {
                "500": {},
                "1000": {
                  "CO": 0.00613
                },
                "5000": {
                  "CO": 0.016399999999999998,
                  "CO2": 4.396
                },
                "10000": {
                  "CO": 0.016399999999999998,
                  "CO2": 4.775
                },
                "50000": {
                  "CO": 0.06923300000000003,
                  "CO2": 7.846000000000001
                }
              },
              "coordinates": [
                53.0932724,
                14.2312786
              ]
            }
          ]
        }
      }
    }
  ]
};
