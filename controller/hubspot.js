const {User} = require('../model/user');
const axios = require('axios');
const Hubspot = require('hubspot');
const {getExpiry} = require('../common-middleware');
const {getProjectById, getReportsByProjectId} = require('./sumoquote');
const HOST = process.env.HOST;

exports.connect = async (req, res) => {
    console.log("Hubspot Auth connect start")
    return res.redirect(process.env.HUBSPOT_COONETION_URL);
    console.log("Hubspot Auth connect end")
}

exports.callback = async (req, res) => {
    try {
        console.log("Hubspot Auth callback start")
        if (req.query.code !== undefined && req.query.code) {
            const authData = {
                clientId: process.env.HUBSPOT_CLIENT_ID,
                clientSecret: process.env.HUBSPOT_CLIENT_SECRET,
                redirectUri: process.env.HUBSPOT_REDIRECT_URI
            };

            const hubspot = new Hubspot(authData)

            const tokenStore = await hubspot.oauth.getAccessToken({code: req.query.code});

            const option = {
                method: 'get',
                url: 'https://api.hubapi.com/oauth/v1/refresh-tokens/' + tokenStore.refresh_token
            }

            const userInfo = await axios(option)
            const findUser = await User.findOne({hubspotPortalId: userInfo.data.hub_id})
            let userId = 0;
            if (findUser) {
                findUser.hubspotRefreshToken = tokenStore.refresh_token;
                findUser.hubspotAccessToken = tokenStore.access_token;
                findUser.hubspotTokenExpiry = getExpiry(tokenStore.expires_in);
                await findUser.save()
                tokenStore.updated_at = new Date();
                hubspot.setAccessToken((tokenStore.access_token));
                userId = findUser._id;
            }
            const user = new User({
                user: userInfo.data.user,
                hubspotUserId: userInfo.data.user_id,
                hubspotPortalId: userInfo.data.hub_id,
                hubspotRefreshToken: tokenStore.refresh_token,
                hubspotAccessToken: tokenStore.access_token,
                hubspotTokenExpiry: expiryTime
            })
            await user.save();
            userId = user._id;
            console.log("Hubspot Auth callback end")
            return res.redirect('/sumoquote/connect?id=' + userId);
        } else {
            console.log('Wrong:- Hubspot Code Not Found!')
        }
    } catch (error) {
        return res.status(400).json({from: '(controller/hubspot/callback) Function Error :- ', message: error.message});
    }
}

exports.crmCardReport = async (req, res) => {
    try {
        console.log("Hubspot Crm Card Report start")
        console.log("Hubspot User:- " + req.user.user + "and portalID :- " + req.user.hubspotPortalId)

        const sumoToken = req.user.sumoquoteAccessToken;
        const associatedObjectId = req.query.associatedObjectId;

        const data = await getProjectById(associatedObjectId, sumoToken);
        if (data ?. message !== undefined || data ?. message) {
            return res.status(400).json(data);
        }
        let projectObject = (data.Data.find((data) => data.ProjectIdDisplay === associatedObjectId))

        if (projectObject && projectObject ?. Id) {
            const reports = await getReportsByProjectId(projectObject.Id, sumoToken);
            if (reports ?. message !== undefined || reports ?. message) {
                return res.status(400).json(reports);
            }
            let results = reports.Data.sort((a, b) => {
                if (a.SignatureDate && b.SignatureDate) {
                    return new Date(b.SignatureDate) - new Date(a.SignatureDate)
                } else if (a.SignatureDate) {
                    return -1
                } else if (b.SignatureDate) {
                    return 1
                } else {
                    return new Date(b.TitleReportPage.ReportDate) - new Date(a.TitleReportPage.ReportDate)
                }
            }).map((data, i) => {
                let signedOptions = [];

                if (data.TotalSignedValue) {
                    signedOptions.push({
                        "type": "IFRAME",
                        "width": 0,
                        "height": 0,
                        "uri": HOST + '/hubspot/download?projectId=' + projectObject.Id + '&reportId=' + data.Id + '&portalId=' + req.user.hubspotPortalId,
                        "label": "Download",
                        "associatedObjectProperties": []
                    })
                } else {
                    signedOptions.push({
                        "type": "CONFIRMATION_ACTION_HOOK",
                        "confirmationMessage": "Do you want to send a reminder to for signing?",
                        "confirmButtonText": "Yes",
                        "cancelButtonText": "No",
                        "httpMethod": "PUT",
                        "associatedObjectProperties": ["protected_account"],
                        "uri": "https://example.com/tickets/245",
                        "label": "Remind?"
                    })
                }

                return {
                    "objectId": i + 1,
                    "title": data.TitleReportPage.ReportType || "Report",
                    "properties": [
                        {
                            ...this.findDate(
                                {altValue: "Not available", "label": "Created Date", "dataType": "STRING", "value": data.TitleReportPage.ReportDate}
                            )
                        },
                        {
                            "label": "Status",
                            "dataType": "STATUS",
                            "name": "status",
                            ...this.reportStatus(data.SentForSignatureOn, data.SignatureDate)
                        },
                        {
                            ...this.findDate(
                                {altValue: "Not available", value: data.SentForSignatureOn, "label": "Sent for Signing Date", "dataType": "STRING"}
                            )
                        },
                        {
                            ...this.findDate(
                                {altValue: "Not available", "label": "Signed Date", "dataType": "STRING", "value": data.SignatureDate}
                            )
                        }, {
                            "label": "Value",
                            "dataType": "CURRENCY",
                            "value": data.TotalSignedValue || sumTiers(data.EstimateDetailsPage),
                            "currencyCode": "USD"
                        }, {
                            "label": "Layout Used",
                            "dataType": "STRING",
                            "value": data.ReportLayoutName
                        },
                    ],
                    "actions": [
                        {
                            "type": "IFRAME",
                            "width": 890,
                            "height": 748,
                            "uri": 'https://app.sumoquote.com/report/' + associatedObjectId + '/' + data.ReportId,
                            "label": "Edit/View",
                            "associatedObjectProperties": []
                        },
                    ].concat(signedOptions)
                }
            });

            console.log("Hubspot Crm Card Report end")
            return res.json({
                results,
                "settingsAction": {
                    "type": "IFRAME",
                    "width": 890,
                    "height": 748,
                    "uri": HOST + '/hubspot/settings?deal=' + associatedObjectId + '&portal=' + req.user.hubspotPortalId + '&userId=' + req.user._id,
                    "label": "Settings"
                },
                "primaryAction": {
                    "type": "IFRAME",
                    "width": 1000,
                    "height": 850,
                    "uri": 'https://app.sumoquote.com/project/' + associatedObjectId,
                    "label": "View Project"
                },
                "secondaryAction": []
            })
        } else {
            console.log("Hubspot Crm Card Report end")
            return res.json({
                "primaryAction": {
                    "type": "IFRAME",
                    "width": 1000,
                    "height": 850,
                    "uri": HOST + '/sumoquote/create-deal?deal=' + associatedObjectId + 'portal=' + req.user.hubspotPortalId + 'userId=' + req.user._id,
                    "label": "Create Project"
                },
                "secondaryAction": []
            })
        }
    } catch (error) {
        return res.status(400).json({from: '(controller/hubspot/crmCardReport) Function Error :- ', message: error.message});
    }
}

exports.getObjectData = async (id, object, token) => {
    try {
        console.log("Hubspot get object data start")
        console.log("Hubspot Object:- " + object + "and ObjectId :- " + id)
        const config = {
            method: 'get',
            url: 'https://api.hubapi.com/crm/v3/objects/' + object + '/' + id,
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        };

        const {data} = await axios(config);
        console.log("Hubspot get object data end")
        return data;
    } catch (error) {
        return {from: '(controller/hubspot/getObjectData) Function Error :- ', message: error.message};
    }
}


exports.findDate = async (data) => {
    if (!data.value || isNaN(new Date(data.value).getDate())) {
        delete data.value;
        let value = data.altValue;
        delete data.altValue
        return {
            ...data,
            value
        }
    }
    let result = data.value.split('T', 10)
    return {value: result[0], "label": data.label, "dataType": "DATE"}
}

exports.reportStatus = async (sent, signed) => {
    if (sent && signed) {
        return {"value": "Signed", optionType: "SUCCESS"}
    } else if (sent) {
        return {"value": "Sent for signature", optionType: "INFO"}
    } else {
        return {"value": "Not sent", optionType: "WARNING"}
    }
}


exports.uploadPDFtoHubspot = async (id) => {

    try {
        let option = {
            "access": "PUBLIC_NOT_INDEXABLE",
            "ttl": "P2W",
            "overwrite": false,
            "duplicateValidationStrategy": "NONE",
            "duplicateValidationScope": "EXACT_FOLDER"
        };
    } catch (error) {
        console.log(error)
    }
}
