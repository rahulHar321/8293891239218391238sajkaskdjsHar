const express = require('express');
const router = express.Router();
const fs = require("fs");

let dirHead = "./public/data/geojson/"
let geojsons = fs.readdirSync(dirHead);
let classes = new Set();
for(let i = 0; i < geojsons.length; i++) {
  geojsons[i] = geojsons[i].split('.')[0]
  classes.add(geojsons[i].split('-')[3]);
}

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', {
    title: 'Harvesting'
  });
});

router.get("/geojsons", function(req, res, next) {
  res.send(geojsons);
});
module.exports = router;
