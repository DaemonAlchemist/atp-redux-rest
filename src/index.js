/**
 * Created by Andy on 3/24/2017.
 */

import request from "superagent";
import Promise from "promise";
import {o} from "atp-sugar";
import config from "atp-config";

import {addMessages} from "atp-flash";

const restUrl = (url, location = "default") => config.get('rest.baseUrl')[location] + url;

const restCall = options =>
    new Promise((resolve, reject) =>
        o(restUrl(options.endPoint, options.module)).as(url =>
            o(options.method).switch({
                get: () => request.get(url).query(options.data),
                post: () => request.post(url).send(options.data),
                put: () => request.put(url).send(options.data),
                delete: () => request.delete(url),
            })
        )
        .set('Login-Token', options.loginToken)
        .end((err, response) => {
            if(options.dispatch && response.body.messages) {
                options.dispatch(addMessages(response.body.messages));
            }
            return err || !response.ok
                ? reject([err, response])
                : resolve([response.body, response]);
        })
    );

class Rest {
    constructor() {
        this.startHandler = () => {};
        this.curModule = "default";
        this.successHandler = null;
        this.errorHandler = null;
        this.method = null;
        this.endPoint = null;
        this.data = {};

        this.then();
    }

    get(endPoint)   {this.method = 'get';    this.endPoint = endPoint; return this;}
    post(endPoint)  {this.method = 'post';   this.endPoint = endPoint; return this;}
    put(endPoint)   {this.method = 'put';    this.endPoint = endPoint; return this;}
    delete(endPoint){this.method = 'delete'; this.endPoint = endPoint; return this;}

    start(handler) {
        this.startHandler = handler;

        return this;
    }

    then(resolve, reject) {
        this.successHandler = resolve || (() => {});
        this.catch(reject);

        return this;
    }

    catch(reject) {
        this.errorHandler = reject || (() => {});

        return this;
    }

    send(data) {
        this.data = data;

        return this;
    }

    module(m) {
        this.curModule = typeof config.get('rest.baseUrl')[m] !== 'undefined' ? m : "default";
        return this;
    }

    thunk() {
        return (dispatch, getState) => new Promise((resolve, reject) => {
            this.startHandler(this.data, dispatch, getState);
            restCall({
                endPoint: this.endPoint,
                module: this.curModule,
                method: this.method,
                data: this.data,
                dispatch,
                loginToken: getState().uac.loginToken
            })
                .then(([data, response]) => {
                    this.successHandler([data, dispatch, getState, response]);
                    resolve([data, dispatch, getState, response]);
                })
                .catch(([error, response]) => {
                    this.errorHandler([error, dispatch]);
                    reject([error, dispatch, getState]);
                });
        });
    }
}

export default () => new Rest();
export {restCall, restUrl};