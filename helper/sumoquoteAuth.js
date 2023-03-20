const axios = require('axios');
const {isTokenExpired, getExpiry} = require("../common-middleware");

exports.getSumoquoteAccessToken = async (req, res, next) => {
    try {
        console.log("Get sumoquote access token start")
        const tokenExpired = isTokenExpired(req.user.sumoquoteTokenExpiry);
        if (tokenExpired) {
            let response = await this.refreshSumoquoteAccessToken(req.user)
            if (response?.message !== undefined || response?.message) {
                return res.status(400).json(response);
            }
        }
        console.log("Get sumoquote access token end")
        next();
    } catch (error) {
        return res.status(400).json({from: '(helper/sumoquoteAuth/getSumoquoteAccessToken) Helper Function Error :- ', message: error.message});
    }
}

exports.refreshSumoquoteAccessToken = async (user) => {
    try {
        console.log("refresh sumoquote access token start")
        let data = {
            'grant_type': 'refresh_token',
            'client_id': process.env.SUMO_CLIENT_ID,
            'client_secret': process.env.SUMO_CLIENT_SECRET,
            'refresh_token': user.sumoquoteRefreshToken
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
        user.sumoquoteAccessToken = response.access_token;
        user.sumoquoteTokenExpiry = getExpiry(response.expires_in);
        user.sumoquoteRefreshToken = response.refresh_token;

        await user.save();
        console.log("updated sumoquote access token :- ", response)
        console.log("refresh sumoquote access token end")
        return response.access_token;
    } catch (error) {
        return res.status(400).json({from: '(helper/sumoquoteAuth/refreshSumoquoteAccessToken) Helper Function Error :- ', message: error.message});
    }
}
