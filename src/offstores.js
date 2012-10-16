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
var offstores = (function (offstores) {
    'use strict';
    offstores.stores = {};


    function findSuitableStore(managers, size) {
        return offstores.forEach(managers, function (i, manager) {
            try {
                if (manager.prototype.isAvailable(size)) {
                    return manager;
                }
            } catch (exc) {
                offstores.log(manager, exc);
            }
        });
    }

    offstores.Manager = function (config) {
        this.managers = (config.managers && config.managers.length > 0) ? config.managers : [offstores.IDBManager];
        this.config = config;
        this.metaStoreName = "offstoremeta";
    };

    function TestTest(config) {
        this.metaStoreName = "offstoresmeta";
    }

    function ManagerPrivate(manager) {
        return manager;
    }

    //
    // metaInit is:
    // For each store:
    //  - get from the metatable, the init object
    //  -if init.init = false: call the initializer, and if successful, sets the init object to true
    // - otherwise, ignore and continue
    //
    function metaInit(manager, storeNames, callback) {

        function exec(offset) {
            if (offset >= storeNames.length) {
                callback(false);
            } else {
                var name = storeNames[offset];
                manager.txStore(manager.metaStoreName, true, function(err, store){
                    store.get(name, function(err, value) {
                        if (value === undefined) {
                            value = {init:false};
                        }

                        if (value.init === false && manager.config.initializers[name]!==undefined) {

                            manager.config.initializers[name](manager, name, function(err){
                                value.init = !err;
                                manager.txStore(manager.metaStoreName, false, function(err,store){
                                    store.put(name, value, function(err){
                                        if (err) {
                                            callback(err);
                                        } else {
                                            offstores.execAsync(function(){
                                                exec(offset+1);
                                            });
                                        }
                                    });
                                });
                            });

                        } else {
                            exec(offset+1);
                        }
                    });
                });
            }
        }
        exec(0);
    }


    offstores.Manager.prototype.open = function (callback) {
        var self = this;
        var e;
        try {
            this.config.addStore(this.metaStoreName);

            var Candidate = findSuitableStore(this.managers, this.config.dbSize);
            var mgr = new Candidate(this.config);

            mgr.open(function (err, mgr) {
                self.manager = mgr;
                // Check initialization
                if (err) {
                    return callback.apply(Array.prototype.slice(arguments));
                } else {
                    metaInit(self, self.config.stores, function(err) {
                        callback(err, self);
                    });
                }
            });

        } catch (e) {
            callback(true, e);
            throw e;
        }
    };

    offstores.Manager.prototype.close = function (callback) {
        this.manager.close(callback);
    };

    offstores.Manager.prototype.deleteDatabase = function (callback) {
        this.manager.deleteDatabase(callback);
    };


    offstores.Manager.prototype.txStore = function (name, readOnly, callback) {
        if (callback === undefined && (typeof readOnly === "function")) {
            callback = readOnly;
            readOnly = undefined;
        }
        readOnly = readOnly === undefined ? false : readOnly;
        try {
            this.manager.transaction([name], readOnly, function (err, tx) {
                tx.store(name, function (err, store) {
                    callback(false, store);
                });
            });
        } catch (e) {
            callback(true, e);
        }
    };

    offstores.Manager.prototype.clearStore = function (name, callback) {
        this.txStore(name, function (err, store) {
            store.clear(function (err) {
                callback(err);
            });
        });
    };

//    offstores.Manager.prototype.putBulk = function(storeName, keys, values, callback, batchSize) {
//        batchSize = batchSize||100;
//
//        function putBulk(manager, store, offset, callback) {
//
//            function singlePut(store, key, value) {
//                store.put(key, value, function(err){
//                    if (err) {
//                        callback(err);
//                    } else {
//                        putBulk(manager, store, offset+1, callback);
//                    }
//                });
//            }
//
//            if (offset >= keys.length) {
//                offstores.execAsync(function(){callback(false);});
//            } else {
//                if (store === undefined) {
//                    manager.txStore(storeName, function(err, store){
//                        if (err) {
//                            callback(err);
//                        } else {
//                            singlePut(store, keys[offset], values[offset]);
//                        }
//                    });
//                } else if (offset%batchSize==0) {
//                    offstores.execAsync(function() { putBulk(manager, undefined, offset, callback);});
//                } else {
//                    singlePut(store, keys[offset], values[offset]);
//                }
//            }
//        }
//        putBulk(this, undefined, 0, callback);
//    }

    offstores.Manager.prototype.getStoreManager = function(storeName) {
        return new offstores.StoreManager(this, storeName);
    };

    return offstores;
})(offstores || {});
