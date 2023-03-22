const router = require('express').Router();
const { getSumoquoteAccessToken } = require( '../helper/sumoquoteAuth');
const {connect, callback, crmCardReport, setting} = require('../controller/hubspot');
const {requireConnectCrmCard} = require('../common-middleware');
const {getHubspotAccessToken} = require('../helper/hubspotAuth');

router.get('/connect', connect);
router.get('/callback', callback);
router.get('/crmCardReport', requireConnectCrmCard, getHubspotAccessToken,getSumoquoteAccessToken, crmCardReport);
router.get('/settings', requireConnectCrmCard, getHubspotAccessToken,getSumoquoteAccessToken, setting);


module.exports = router;
