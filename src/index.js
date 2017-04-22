/**
 * Created by Andy on 3/24/2017.
 */

import request from "superagent";
import Promise from "promise";
import {o} from "atp-sugar";

import {addMessages} from "atp-flash";

const BASE_URL = __DEVELOPMENT__
    ? "http://api.runes.com/rest/1.0/"
    : "http://api-atp.wittrock.us/rest/1.0/";

const restCall = options =>
    new Promise((resolve, reject) => {
        return o(options.method).switch({
            get: () => request.get(BASE_URL + options.endPoint).query(options.data),
            post: () => request.post(BASE_URL + options.endPoint).send(options.data),
            put: () => request.put(BASE_URL + options.endPoint).send(options.data),
            delete: () => request.delete(BASE_URL + options.endPoint),
        })
            .set('loginToken', options.loginToken)
            .end((err, response) => {
                if(options.dispatch && response.body.messages) {
                    options.dispatch(addMessages(response.body.messages));
                }
                return err || !response.ok
                    ? reject(err, response)
                    : resolve(response.body)
            })
    });

class Rest {
    constructor() {
        this.startHandler = () => {};
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

    thunk() {
        return (dispatch, getState) => new Promise((resolve, reject) => {
            this.startHandler(this.data, dispatch, getState);
            restCall({
                endPoint: this.endPoint,
                method: this.method,
                data: this.data,
                dispatch,
                loginToken: getState().uac.loginToken
            })
                .then(data => {
                    this.successHandler(data, dispatch);
                    resolve(data, dispatch);
                })
                .catch(error => {
                    this.errorHandler(error, dispatch);
                    reject(error, dispatch);
                });
        });
    }
}

export default () => new Rest();
export {restCall};