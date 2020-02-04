const express = require('express');
const router = express.Router();
/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('dashboard', {
        title: 'Yogesh'
    });
});
module.exports = router;
