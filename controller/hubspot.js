const {User} = require('../model/user');
const axios = require('axios');
const Hubspot = require('hubspot');
const {getExpiry, checkPropertyObj, getDate} = require('../common-middleware');
const {getProjectByDealId, getReportsByProjectId,getTierItemDetails} = require('./sumoquote');
const {getHubspotObjectData} = require('../helper/hubspotAuth');
const {sumoApiKeyHeader} = require('../helper/sumoquoteAuth');
const HOST = process.env.HOST;

exports.connect = async (req, res) => {
    console.log("Hubspot Auth connect start");
    res.render('pages/connecthubspot', {url: process.env.HUBSPOT_COONETION_URL});
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
                findUser.hubspotTokenExpiry = await getExpiry(tokenStore.expires_in);
                await findUser.save()
                tokenStore.updated_at = new Date();
                hubspot.setAccessToken((tokenStore.access_token));
                userId = findUser._id;
            } else {
                const user = new User({
                    user: userInfo.data.user,
                    hubspotUserId: userInfo.data.user_id,
                    hubspotPortalId: userInfo.data.hub_id,
                    hubspotRefreshToken: tokenStore.refresh_token,
                    hubspotAccessToken: tokenStore.access_token,
                    hubspotTokenExpiry: await getExpiry(tokenStore.expires_in)
                })
                await user.save();
                userId = user._id;
                console.log("Create New user .." + userId);
            }
            console.log("Hubspot Auth callback end");
            return res.redirect('/sumoquote/connect?id=' + userId);
        } else {
            console.log('Wrong:- Hubspot Code Not Found!');
        }
    } catch (error) {
        return res.status(400).json({from: '(controller/hubspot/callback) Function Error :- ', message: error.message});
    }
}

exports.crmCardReport = async (req, res) => {
    try {
        console.log("Hubspot Crm Card Report start")
        console.log("Hubspot User:- " + req.user.user + "and portalID :- " + req.user.hubspotPortalId)

        const sumoToken = req.user.sumoquoteAccessToken || req.user.sumoquoteAPIKEY;
        console.log(sumoToken);
        const associatedObjectId = req.query.associatedObjectId;

        const data = await getProjectByDealId(associatedObjectId, sumoToken, 'development');
        // console.log(data.Data[0]);
        if (data ?. message !== undefined || data ?. message) {
            return res.status(400).json(data);
        }
        let projectObject = (data.Data.find((data) => data.ProjectIdDisplay === associatedObjectId))

        if (projectObject && projectObject ?. Id) {
            const reports = await getReportsByProjectId(projectObject.Id, sumoToken, 'development');
            console.log(reports);
            if (reports ?. message !== undefined || reports ?. message) {
                return res.status(400).json(reports);
            }
            let resultsReports = reports.Data.sort(async (a, b) => {
                if (a.SignatureDate && b.SignatureDate) {
                    return new Date(b.SignatureDate) - new Date(a.SignatureDate)
                } else if (a.SignatureDate) {
                    return -1
                } else if (b.SignatureDate) {
                    return 1
                } else {
                    return new Date(b.TitleReportPage.ReportDate) - new Date(a.TitleReportPage.ReportDate)
                }
            }).map(async (data, i) => {
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
                            ...await this.findDate({
                                "label": "Created Date",
                                "dataType": "STRING",
                                "value": data.TitleReportPage.ReportDate
                            })
                        },
                        {
                            "label": "Status",
                            "dataType": "STATUS",
                            "name": "status",
                            ...await this.reportStatus(data.SentForSignatureOn, data.SignatureDate)
                        },
                        {
                            ...await this.findDate({
                                value: data.SentForSignatureOn,
                                "label": "Sent for Signing Date",
                                "dataType": "STRING"
                            })
                        },
                        {
                            ...await this.findDate({
                                "label": "Signed Date", "dataType": "STRING",
                                "value": data.SignatureDate,
                                "dataType": "STRING"
                            })
                        }, 
                        {
                            "label": "Value",
                            "name": "value",
                            "dataType": "CURRENCY",
                            "value": data.TotalSignedValue || 00, //|| sumTiers(data.EstimateDetailsPage)
                            "currencyCode": "USD"
                        }, 
                        {
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

            const results = await Promise.all(resultsReports)

            console.log("Hubspot Crm Card Report end")
            return res.json({
                results,
                "settingsAction": {
                    "type": "IFRAME",
                    "width": 890,
                    "height": 748,
                    "uri": HOST + '/hubspot/settings?deal=' + associatedObjectId + '&portalId=' + req.user.hubspotPortalId + '&userId=' + req.user._id,
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
                    "uri": HOST + '/sumoquote/create-project?deal=' + associatedObjectId + '&portalId=' + req.user.hubspotPortalId + '&userId=' + req.user._id,
                    "label": "Create Project"
                },
                "secondaryAction": []
            })
        }
    } catch (error) {
        return res.status(400).json({from: '(controller/hubspot/crmCardReport) Function Error :- ', message: error.message});
    }
}

exports.findDate = async (data) => {
    if (!data.value || isNaN(new Date(data.value).getDate())) {
        return {
            ...data
        }
    }
    // let result = data.value.split('T', 10)
    return {value: data.value.split('T')[0], "label": data.label, "dataType": "DATE"}
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

exports.setting = async (req, res) => {
    try {
        console.log("Hubspot setting start")
        if (req.query.portalId) {
            res.render('pages/settings', {
                deal: req.query.deal,
                portalId: req.query.portalId,
                sumoConnection: "disconnect",
                connectionLink: process.env.HOST + '/sumoquote/disconnect?connectionId=' + req.user._id
            });
        } else {
            return res.send("Portal Id Not Found!");
        }

    } catch (error) {
        return res.status(400).json({from: '(controller/hubspot/setting) Function Error :- ', message: error.message});
    }
}

exports.syncDealToProject = async (req, res) => {
    try {
        console.log("Hubspot syncronize deal to project start")
        if (req.query.deal) {
            const user = req.user;
            let properties = "?properties=dealname,hs_object_id,companycam_project_id,customer_first_name,customer_last_name,email,phone_number,address_line_1,address_line_2,state,zip_code,city"
            let objectData = await getHubspotObjectData(req.query.deal, 'deal', user.hubspotAccessToken, properties);
            if (objectData.id) {
                let newSumoUpdate = {};
                let objectProperties = objectData.properties;
                if (await checkPropertyObj(objectProperties, 'customer_first_name')) 
                    newSumoUpdate["customerFirstName"] = objectProperties.customer_first_name;
                 else 
                    newSumoUpdate["customerFirstName"] = "No first name";
                
                if (await checkPropertyObj(objectProperties, 'address_line_1')) 
                    newSumoUpdate["addressLine1"] = objectProperties.address_line_1;
                 else 
                    newSumoUpdate["addressLine1"] = "Unknown";
                
                if (await checkPropertyObj(objectProperties, 'customer_last_name')) 
                    newSumoUpdate["customerLastName"] = objectProperties.customer_last_name;
                
                if (await checkPropertyObj(objectProperties, 'phone_number')) 
                    newSumoUpdate["phoneNumber"] = objectProperties.phone_number;

                if (await checkPropertyObj(objectProperties, 'state')) 
                    newSumoUpdate["province"] = objectProperties.state;
                
                if (await checkPropertyObj(objectProperties, 'address_line_2')) 
                    newSumoUpdate["addressLine2"] = objectProperties.address_line_2;

                if (await checkPropertyObj(objectProperties, 'email')) {
                    var emailRegex = /^[-!#$%&'*+\/0-9=?A-Z^_a-z{|}~](\.?[-!#$%&'*+\/0-9=?A-Z^_a-z`{|}~])*@[a-zA-Z0-9](-*\.?[a-zA-Z0-9])*\.[a-zA-Z](-?[a-zA-Z0-9])+$/;
                    if(objectProperties.email.length < 254 && emailRegex.test(objectProperties.email))
                        newSumoUpdate["emailAddress"] = objectProperties.email;
                }
                
                if (await checkPropertyObj(objectProperties, 'zip_code')) 
                    newSumoUpdate["postalCode"] = objectProperties.zip_code;
                
                if (await checkPropertyObj(objectProperties, 'city')) 
                    newSumoUpdate["city"] = objectProperties.city;

                const {Data} = await getProjectByDealId(req.query.deal, user.sumoquoteAPIKEY, 'development');
                if (Data[0].Id) {
                    console.log(Data[0].Id);
                    console.log("New Update Data :- ", newSumoUpdate);
                    const config = {
                        method: 'put',
                        url: 'https://api.sumoquote.com/v1/Project/' + Data[0].Id,
                        headers: await sumoApiKeyHeader(user.sumoquoteAPIKEY, 'development', 'application/*+json'),
                        data: JSON.stringify(newSumoUpdate)
                    };
                    let {data} = await axios(config);
                    console.log("Project Update response :- ", data);
                    return res.status(200).json({message: 'Data Syncronize successfully!'});
                }
            } else {
                return res.send('Deal Data Not get from api please re-sync data');
            }
        } else {
            return res.send("Deal Id Not Found!");
        }
        console.log("Hubspot syncronize deal to project end")
    } catch (error) {
        return res.status(400).json({from: '(controller/hubspot/syncDealToProject) Function Error :- ', message: error.message});
    }
}


exports.downloadReport = async (req, res) => {
    try {
        console.log("Hubspot download report start")  
        const user = req.user;  
        let config = {
            method: 'get',
            url: `https://api.sumoquote.com/v1/Project/${req.query.projectId}/Report/${req.query.reportId}`,
            headers: await sumoApiKeyHeader(user.sumoquoteAPIKEY, 'development', 'application/json')
        };
    
        const { data:{ Data } } = await axios(config)
        const items = await getTierItemDetails(Data)
        // console.log(items);
    
        let total = 0;
        await items.map(async (item) => {
            total += item.price * item.quantity
        })

        let downloadUrlConfig = {
            method: 'get',
            url: `https://api.sumoquote.com/v1/Project/${req.query.projectId}/Report/${req.query.reportId}/download`,
            headers: await sumoApiKeyHeader(user.sumoquoteAPIKEY, 'development', 'application/json')
        };
    
        const { data: { Data : { FileUrl } } } = await axios(downloadUrlConfig)
        
        res.render('pages/more', {
            items: items,
            total,
            downloadUrl: FileUrl
        });
        console.log("Hubspot download report end")
    } catch (error) {
        return res.status(400).json({from: '(controller/hubspot/downloadReport) Function Error :- ', message: error.message});
    }
}


exports.createProjectOnCreateDeal = async (req, res) => {
    console.log({ query: req.query, body: req.body });
    console.log("body",JSON.stringify(req.body));
}