/**
 * @author  Hamza Waqas <hamzawaqas@live.com>
 * @since   1/14/14
 */

(function () {

    var _ = require('lodash')
        , util = require('util')
        , request = require('request')
        , oauth = require('oauth')
        , qs = require('querystring')
        , stateIn = [];

    var Auth = function (Inherits, args) {
        Inherits(this);

        if (args.state && args.state.constructor === Array)
            stateIn = args.state;
        else
            stateIn.push(args.state || Math.random().toString());
        this.hasCustomState = args.state ? true : false;

        this.options = {};

        this.authorize = function (res, scope, state) {
            
            if(res.constructor === Array) {
                scope = res;
                res = null;
            }

            var url = util.format("https://www.linkedin.com/uas/oauth2/authorization?response_type=code" +
                "&client_id=%s" +
                "&scope=%s" +
                "&state=%s" +
                "&redirect_uri=%s",
                args.appId,
                scope.join(' '),
                this.hasCustomState ? state : stateIn[0],
                args.callback
            );

            return res ? res.redirect(url) : url;
        };

        this.getAccessToken = function (res, code, stateOut, cb) {

            if (typeof res == 'string') {
                cb = stateOut;
                stateOut = code;
                code = res;
                res = null;
            }

            var error = true;
            stateIn.forEach(function(state) {
                if (state === stateOut) {
                    error = false;
                }
            });

            if (error) {
                err = new Error('Possible CSRF attack, state parameters do not match.');
                err.name = 'CSRF Alert';
                return cb(err, null);
            }

            //If state is randomly generated, then reset it for future auth code/token requests
            if (!this.hasCustomState)
                stateIn[0] = Math.random().toString();

            var url = "https://www.linkedin.com/uas/oauth2/accessToken",
                form = {
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": args.callback,
                    "client_id": args.appId,
                    "client_secret": args.appSecret
                };

            request.post({url: url, form: form}, function (err, response, body) {

                if (err)
                    return cb(err, null);

                var res = JSON.parse(body);

                if (typeof res.error !== 'undefined') {
                    err = new Error(res.error_description);
                    err.name = res.error;
                    return cb(err, null);
                }

                return cb(null, res);

            })
        };

        this.exchangeAccessToken = function (token, cb) {
            var oauthClient = new oauth.OAuth(
                'https://api.linkedin.com/uas/oauth/requestToken',
                'https://api.linkedin.com/uas/oauth/accessToken',
                args.appId,
                args.appSecret,
                '1.0',
                null,
                'HMAC-SHA1'
            );

            oauthClient.get(
                'https://api.linkedin.com/uas/oauth/accessToken?xoauth_oauth2_access_token=' + encodeURIComponent(token),
                null,
                null,
                function (err, data) {
                    if (err) {
                        return cb(err);
                    }
                    else {
                        data = qs.decode(data);
                        return cb(null, data);
                    }
                }
            );
        };

        this.setAccessToken = function (accessToken) {
            this.options['accessToken'] = accessToken;
        };

        this.getOptions = function () {
            return this.options;
        }

        /**
         *  Set Callback
         *
         *  @param {String} 'url' to be set
         *
         **/
        this.setCallback = function(cb){
          args.callback = cb || args.callback;
        };

        return this;
    }.bind(this);
    module.exports = Auth;
}).call(this);
