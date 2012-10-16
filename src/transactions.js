/*
 * Copyright 2012 Rodrigo Reyes
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
(function(offstores) {
    "use strict";

    /**
     * The TransactionProxy adds a transaction layer on top of an existing synchronized storage object.
     * It uses a delegate expected to provide the put/get/remove/clear sync operations.
     * @param storeNames an array of store names which will be covered by this transaction
     * @param delegate the delegate, an object that provides put/get/remove/clear methods.
     * @constructor
     */
    offstores.TransactionProxy = function(storeNames, delegate) {

        this.delegate = delegate;

        this.cacheLocal = {};
        this.removed = {};
        this.clearRequested = {};

        offstores.forEach(storeNames, function(i,name){
            this.cacheLocal[name] = {};
            this.removed[name] = {};
            this.clearRequested[name] = false;
        }, this);

    };

    offstores.TransactionProxy.prototype = {
        commit:  function() {
                // First clear what needs to be cleared
                offstores.forEach(this.clearRequested, function(storeName) {
                    if (this.clearRequested[storeName] === true) {
                        this.delegate.clear(storeName);
                    }
                }, this);

                // then apply the removed
                offstores.forEach(this.removed, function(storeName) {
                    offstores.forEach(this.removed[storeName], function(key) {
                        this.delegate.remove(storeName, key);
                    }, this);
                }, this);

                // then puts
                offstores.forEach(this.cacheLocal, function(storeName) {
                    offstores.forEach(this.cacheLocal[storeName], function(key, value) {
                        this.delegate.put(storeName, key,value);
                    }, this);
                }, this);

            // Remove this transaction
        },
        store: function(name, callback) {
            var self = this;
            callback(false, {
                get: function(key, callback) {
                    if (self.cacheLocal[name][key] !== undefined) {
                        callback(false, self.cacheLocal[name][key]);
                    } else if (self.removed[name][key]) {
                        return callback(false, undefined);
                    } else if (self.clearRequested[name]) {
                        return callback(false, undefined);
                    } else {
                        callback(false, self.delegate.get(name,key));
//                        return self.tx.manager.stores[name][key];
                    }
                },
                put: function(key,value, callback) {
                    if (self.removed[name][key]) {
                        delete self.removed[name][key];

                    }
                    self.cacheLocal[name][key] = value;
                    callback(false);
                },
                clear: function(callback) {
                    self.removed[name] = {};
                    self.cacheLocal[name] = {};
                    self.clearRequested[name] = true;
                    callback(false);
                },
                remove: function(key, callback) {
                    self.removed[name][key] = true;
                    if (self.cacheLocal[name][key] !== undefined) {
                        delete self.cacheLocal[name][key];
                    }
                    callback(false);
                }
            });
        }
    };

    offstores.TransactionManager = function () {
        this.queue = [];
        this.currentTx = undefined;
        this.currentTxDesc = undefined;
    };
    offstores.TransactionManager.prototype = {
        transaction: function(stores, readOnly, callback, delegate) {
            var streq = "";
            offstores.forEach(stores, function(i,e){
                streq += e + "...";
            });
            if (this.currentTx !== undefined && this.currentTxDesc === streq) {
                callback(false, this.currentTx);
            } else if (this.currentTx === undefined) {
                this.currentTxDesc = streq;
                this.currentTx = new offstores.TransactionProxy(stores, delegate);
                try {
                    callback(false, this.currentTx);
                    this.currentTx.commit();
                } catch (e) {
                    // IGNORE
                }
                this.currentTx = this.currentTxDesc = undefined;
                if (this.queue.length) {
                    var o = this.queue.shift();
                    this.transaction(o.stores, o.readOnly, o.callback, o.delegate);
                }
            } else {
                this.queue.push({stores: stores, readOnly: readOnly, callback: callback, delegate: delegate});
            }
        }
    };

})(offstores);
