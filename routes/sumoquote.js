const router = require('express').Router();
const { connect, disconnect, callback, responseWebhook } = require('../controller/sumoquote');


router.get('/connect',connect);
router.get('/callback',callback);
router.get('/disconnect',disconnect);
router.get('/webhook/signatory-signed/:sumoquoteWebhookId',responseWebhook);


module.exports = router;