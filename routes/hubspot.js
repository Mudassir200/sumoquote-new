const router = require('express').Router();
const { getSumoquoteAccessToken } = require( '../helper/sumoquoteAuth');
const {connect, callback, crmCardReport, setting, syncDealToProject, downloadReport} = require('../controller/hubspot');
const {requireConnectCrmCard, requiredAuth} = require('../common-middleware');
const {getHubspotAccessToken} = require('../helper/hubspotAuth');
const { downloadPdfReport } = require('../controller/sumoquote');

router.get('/connect', connect);
router.get('/callback', callback);
router.get('/crmCardReport', requireConnectCrmCard, getHubspotAccessToken,getSumoquoteAccessToken, crmCardReport);
router.get('/settings', requiredAuth, getHubspotAccessToken,getSumoquoteAccessToken, setting);
router.post('/sync', requiredAuth, getHubspotAccessToken,getSumoquoteAccessToken, syncDealToProject);
router.get('/download', requiredAuth, getHubspotAccessToken,getSumoquoteAccessToken, downloadReport);


module.exports = router;
