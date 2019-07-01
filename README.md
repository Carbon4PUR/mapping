# mapping
The mapping activities from the Carbon4PUR project.

#Workflow:
## Emissions
Open sparql.html and wait for it to complete. The result will be logged in the console. Copy the object and paste it in prtr.json.
Careful: we corrected the coordinates for one plant (see comment in top of file), please keep those changes in the new version.

## Chemical parks and polyol plants
The list of all chemical plants known to us is in chemicalparks.csv. It has been converted with a previous version of the polyolConverter.html
Todo: add a converter.

All polyol plants are in "polyol plants europe v2.csv" and can be converted by opening polyolConverter.html. The result object in the console can be copied to "chemicalParks.json into the "polyol plant" object. Careful: Do not replace the whole file!

## Distances

By running chemicalParkDistances.html, chemicalParks.json and prtr.json will be loaded and distances added to the emissions data. Copy the resulting object into "emissions.json".

Done, you have a working version with updated data.

![EU logo](img/eu.png "EU logo")
This project has received funding from the European Union's Horizon 2020 research and innovation programme under grant agreement No 768919
