const axios = require('axios');
const {getExpiry, checkPropertyObj} = require('../common-middleware');
const {User} = require('../model/user');
const mongoose = require('mongoose');
const {sumoApiKeyHeader} = require('../helper/sumoquoteAuth');
const {getHubspotObjectData} = require('../helper/hubspotAuth');

exports.connect = async (req, res) => {
    try {
        console.log("sumoquote connect page start")
        const baseUrl = "https://sumo-quote.auth0.com/authorize"
        const client_id = process.env.SUMO_CLIENT_ID
        const audience = "https://api.sumoquote.com"
        const redirect_uri = process.env.SUMO_REDIRECT_URI + '?connectId=' + req.query.id
        const response_type = "code&protocol=oauth2&scope=offline_access"

        const url = baseUrl + '?client_id=' + encodeURI(client_id) + '&audience=' + encodeURI(audience) + '&redirect_uri=' + encodeURI(redirect_uri) + '&response_type=' + encodeURI(response_type)
        console.log("sumoquote connect page end")
        res.render('pages/connectsumo', {
            appId: req.query.id,
            url
        });
    } catch (error) {
        return res.status(400).json({from: '(controller/sumoquote/connect) Function Error :- ', message: error.message});
    }
}

exports.callback = async (req, res) => {
    try {
        console.log("sumoquote callback page start")
        if (req.query.code !== undefined && req.query.code) {
            const user = await User.findById(req.query.connectId)
            if (! user) {
                return res.send('Sumoquote App connection is broken,because user not found contact the developer')
            }
            let data = {
                audience: "https://api.sumoquote.com",
                grant_type: 'authorization_code',
                client_id: process.env.SUMO_CLIENT_ID,
                client_secret: process.env.SUMO_CLIENT_SECRET,
                code: req.query.code,
                redirect_uri: process.env.SUMO_REDIRECT_URI
            };
            let config = {
                method: 'POST',
                url: 'https://sumo-quote.auth0.com/oauth/token',
                headers: {
                    'content-type': 'application/json'
                },
                data: data
            };
            const {data: response} = await axios(config)
            const expiryTime = await getExpiry(response.expires_in);

            user.sumoquoteAccessToken = response.access_token;
            user.sumoquoteTokenExpiry = expiryTime;
            user.sumoquoteRefreshToken = response.refresh_token;

            if (user.sumoquoteWebhookId) {
                await this.deleteWebhook(user.sumoquoteWebhookId, response.access_token);
            }

            const sumoquoteWebhookId = user.sumoquoteWebhookId || new mongoose.Types.ObjectId();
            let createwebhook = await this.createWebhook(sumoquoteWebhookId, response.access_token);
            if (createwebhook ?. message !== undefined || createwebhook ?. message) {
                return res.status(400).json(createwebhook);
            }
            user.sumoquoteWebhookId = sumoquoteWebhookId;
            await user.save();
            return res.render('pages/connectSumoSeccessfully');
        } else {
            console.log('Wrong:- Sumoquote Code Not Found!')
        }
        console.log("sumoquote callback page end")
    } catch (error) {
        return res.status(400).json({from: '(controller/sumoquote/callback) Function Error :- ', message: error.message});
    }
}

exports.disconnect = async (req, res) => {
    try {
        console.log("sumoquote disconnect page start")
        const connectId = req.query.connectionId
        const user = await User.findById(connectId)

        if (! user) {
            return res.send('There is no sumoquote connection found for this user, contact the developer')
        }
        user.sumoquoteAccessToken = "";
        user.sumoquoteTokenExpiry = "";
        user.sumoquoteRefreshToken = "";

        if (user.sumoquoteWebhookId) {
            const token = await getSumoquoteAccessToken(user);
            await this.deleteWebhook(user.sumoquoteWebhookId, token);
        }

        user.sumoquoteWebhookId = "";
        await user.save()
        console.log("sumoquote disconnect page end")
        return res.send('<h2>Disconnected from Sumoquote successfully!!!</h2>');
    } catch (error) {
        return res.status(400).json({from: '(controller/sumoquote/disconnect) Function Error :- ', message: error.message});
    }
}

exports.deleteWebhook = async (id, sumoToken) => {
    try {
        console.log("sumoquote delete webhook start")
        let data = JSON.stringify([{
                "hookEvent": "Report_Signed",
                "hookUrl": process.env.HOST + '/sumoquote/webhook/signatory-signed/' + id,
                "isZapHook": false
            }]);

        const config = {
            method: 'delete',
            url: 'https://api.sumoquote.com/v1/WebHook/batch',
            headers: {
                Authorization: `Bearer ${sumoToken}`,
                'Content-Type': 'application/json'
            },
            data: data
        };

        await axios(config);
        console.log("success delete webhook..")
        console.log("sumoquote delete webhook end")
    } catch (error) {
        console.log('(controller/sumoquote/deleteWebhook) Function Error');
        console.log('message :- ', error.message);
    }
}

exports.getMogooseId = async () => {
    let id = new mongoose.Types.ObjectId()
    console.log(id);
    return id;
}

exports.createWebhook = async (id, sumoToken) => {
    try {
        console.log("sumoquote create webhook start")
        let data = JSON.stringify([{
                "hookEvent": "Project_Updated", //Report_Signed
                "hookUrl": process.env.HOST + '/sumoquote/webhook/signatory-signed/' + id,
                "isActive":true,
                "isZapHook": false
            }]);

        const config = {
            method: 'delete',
            url: 'https://api.sumoquote.com/v1/WebHook/batch',
            headers: {
                Authorization: `Bearer ${sumoToken}`,
                'Content-Type': 'application/json'
            },
            data: data
        };

        await axios(config);
        console.log("success create webhook..")
        console.log("sumoquote create webhook end")
        return true;
    } catch (error) {
        return {from: '(controller/sumoquote/createWebhook) Function Error :- ', message: error.message};
    }
}

exports.responseWebhook = async (req, res) => {
    try {
        console.log("sumoquote webhook response start")
        let sumoquoteWebhookId = req.params.sumoquoteWebhookId;
        console.log("Response from webhook Id :- " + sumoquoteWebhookId)
        console.log("Response from webhook :- ", req.body)
        let projectId = req.body.ProjectId;
        let SignatureDate = req.body.SignatureDate;
        let SentForSignatureOn = req.body.SentForSignatureOn;
        const user = await User.findOne({sumoquoteWebhookId});

        const data = await this.getProjectById(projectId, sumoToken);
        if (data ?. message !== undefined || data ?. message) {
            return res.status(400).json(data);
        }
        console.log("sumoquote webhook response end")

    } catch (error) {
        return {from: '(controller/sumoquote/responseWebhook) Function Error :- ', message: error.message};
    }
}

exports.getProjectById = async (id, sumoToken, mode = "production") => {
    try {
        console.log("sumoquote get project by id start")
        let headers = await sumoApiKeyHeader(sumoToken, mode, 'application/json');
        const config = {
            method: 'get',
            url: `https://api.sumoquote.com/v1/Project?q=${id}`,
            headers
        };
        const {data} = await axios(config);
        console.log("sumoquote get project by id end")
        return data;
    } catch (error) {
        return {from: '(controller/sumoquote/getProjectById) Function Error :- ', message: error.message};
    }
}

exports.getReportsByProjectId = async (id, sumoToken,mode = "production") => {
    try {
        console.log("sumoquote get report by project id start")
        const config = {
            method: 'get',
            url: 'https://api.sumoquote.com/v1/Project/' + id + '/report',
            headers: await sumoApiKeyHeader(sumoToken, mode, 'application/json'),
        };

        const {data: reports} = await axios(config);
        console.log("sumoquote get report by project id end")
        return reports;
    } catch (error) {
        return {from: '(controller/sumoquote/getReportsByProjectId) Function Error :- ', message: error.message};
    }
}

exports.createProjectByObjectId = async (req, res) => {
    try {
        console.log("sumoquote create project by hubspot object id start")
        const user = req.user;
        if (req.query.deal) {
            let properties = "?properties=dealname,hs_object_id,companycam_project_id,customer_first_name,customer_last_name,email,phone_number,address_line_1,address_line_2,state,zip_code,city"
            let objectData = await getHubspotObjectData(req.query.deal, 'deal', user.hubspotAccessToken, properties);
            if (objectData.id) {
                let newSumoUpdate = {};
                let objectProperties = objectData.properties;
                newSumoUpdate["projectId"] = objectData.id;
                newSumoUpdate["PortalId"] = user.hubspotPortalId;
                console.log(objectProperties);
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
                
                if (await checkPropertyObj(objectProperties, 'email')) 
                    newSumoUpdate["emailAddress"] = objectProperties.email;
                
                if (await checkPropertyObj(objectProperties, 'state')) 
                    newSumoUpdate["province"] = objectProperties.state;
                
                if (await checkPropertyObj(objectProperties, 'zip_code')) 
                    newSumoUpdate["postalCode"] = objectProperties.zip_code;
                
                if (await checkPropertyObj(objectProperties, 'city')) 
                    newSumoUpdate["city"] = objectProperties.city;
                
                if (await checkPropertyObj(objectProperties, 'address_line_2')) 
                    newSumoUpdate["addressLine2"] = objectProperties.address_line_2;
                
                if (await checkPropertyObj(objectProperties, 'companycam_project_id')) {
                    let projectIntegration = {
                        'companyCamProjectId' : objectProperties.companycam_project_id
                    };
                    newSumoUpdate["projectIntegration"] = projectIntegration;
                }                    
                
                console.log(newSumoUpdate);

                const config = {
                    method: 'post',
                    url: 'https://api.sumoquote.com/v1/Project/',
                    headers: await sumoApiKeyHeader(user.sumoquoteAPIKEY, 'development', 'application/json'),
                    data: newSumoUpdate
                };

                let {data} = await axios(config);
                console.log("Project create response :- ", data);
                console.log("sumoquote create project by hubspot object id end")
                if(data.Data.Id){
                    return res.redirect(301,'https://app.sumoquote.com/project/'+objectData.id);
                }else{
                    return res.send('Project Not Create Properly from api please re-create project');
                }
            } else {
                return res.send('Deal Data Not get from api please re-create project');
            }
        } else {
            return res.send('Deal Id Not found');
        }
        return res.send('Someting Wrong in Create Project!.Please re-create project');
    } catch (error) {
        return res.status(400).json({from: '(controller/sumoquote/createProjectByObjectId) Function Error :- ', message: error.message});
    }
}
