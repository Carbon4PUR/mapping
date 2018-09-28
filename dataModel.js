window.dataModel = {
  "stats": {
    "totalMax":36.8,
  },
  "data": {
    "emitters": {
      "CO": {
        "emName":"CO",
        "emDisplayName":"CO",
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
                  65.033756,
                  -14.099652
                ]
              },
            ]
          }
        }
      }
    },
    "consumers":{
      "CO & CO2": {
        "emName":"CO & CO2",
        "emDisplayName":"CO & CO<sub>2</sub>",
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
                  -14.099652,
                  65.033756
                ]
              }
            ]
          }
        }
      }
    }
  }
};
