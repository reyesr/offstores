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
(function(offstores, stores) {
    'use strict';

    function install_request(req, success, error, blocked) {
        req.onsuccess = success;
        req.onerror = error;
        if (blocked !== undefined) {
            req.onblocked = blocked;
        }
        return req;
    }

    function safe_tx_bind(tx) {
        var args = Array.prototype.slice.call(arguments,1);
        var func = offstores.bind.apply(offstores, args);
        return function() {
            try {
                func();
            } catch (e) {
                // console.log("aborting");
                tx.abort();
                // console.log(e);
            }
        };
    }

    function install_req(self, tx, req, callback, blocked) {
        req.onsuccess = safe_tx_bind(tx, self, callback, false);
        req.onerror = safe_tx_bind(tx, self, callback, true);
        if (blocked !== undefined) {
            req.onblocked = safe_tx_bind(tx, self, callback, false);
        }
        return req;
    }

    function IDBStore(transaction, name) {
        this.transaction = transaction;
        this.store = transaction.objectStore(name);
    }

    IDBStore.prototype.clear = function (callback) {
        var req = this.store.clear();
        //install_request(req, offstores.bind(this, callback, false), offstores.bind(this, callback, true));
        install_req(this, this.transaction, req, callback);
    };

    IDBStore.prototype.put = function (key, value, callback) {
        var req = this.store.put(value, key);
//        install_request(req, offstores.bind(this, callback, false, value), offstores.bind(this, callback, true));
        install_req(this, this.transaction, req, callback);
    };

    IDBStore.prototype.get = function(key, callback) {
        var self = this;
        try {
            var req = this.store.get(key);
            req.onsuccess = function(ev) {
                try {
                    callback(false, ev.target.result);
                } catch (e) {
                    self.transaction.abort();
                }
            };
            req.onerror = offstores.bind(self, callback, true);
        } catch (e) {
            callback(true, e);
        }
        return this;
    };

    IDBStore.prototype.remove = function(key, callback) {
        var req = this.store["delete"](key); // [] notation prevents lint to complain for using delete keyword
        install_req(this, this.transaction, req, callback);
    };

    function IDBStoreTransaction(database, stores, readOnly) {
        this.database = database;
        this.transaction = undefined;
        this.stores = stores;
        this.mode = readOnly?undefined:offstores.stores.READWRITEMODE;
        this.onComplete = new offstores.CallbackManager();
        this.onError = new offstores.CallbackManager();
    }

    IDBStoreTransaction.prototype.store = function (name, callback) {
        if (this.transaction === undefined) {
            this.transaction = this.database.transaction(this.stores, this.mode);
            this.transaction.oncomplete = this.onComplete.bind();
            this.transaction.onerror = this.onError.bind();
        }
        callback(false, new IDBStore(this.transaction, name));
    };


    try {
        stores.indexedDB =  window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB || window.msIndexedDB;
        stores.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.mozIDBTransaction || window.msIDBTransaction || {};
        stores.READWRITEMODE  = offstores.stores.IDBTransaction.readwrite || offstores.stores.IDBTransaction.READ_WRITE || "readwrite";
    } catch(e) {
        stores.indexedDB = undefined;
        stores.IDBTransaction = undefined;
        stores.READWRITEMODE = undefined;
    }

    offstores.stores.IDBManager = function(config) {
        if (!(this instanceof offstores.stores.IDBManager)) {
            return new offstores.stores.IDBManager(config);
        }

        if (!config) {
            throw {name: "Missing config", message: "IDBManager was created without a config object"};
        }
        this.config = config;
    };

    /**
     * Creates the missing stores in the database
     * @param database a valid IDBDatabase object
     * @param indexRequestArray an array of fullproof.IndexRequest objects
     * @param metaStoreName the name of the index that stores the metadata
     * @private
     */
    function createStores(database, storeNames) {
        var created = [];
        offstores.forEach(storeNames, function(i,storeName){
            if (!database.objectStoreNames.contains(storeName)) {
                database.createObjectStore(storeName);
                created.push(storeName);
            }
        });
        return created;
    }
    offstores.stores.IDBManager.prototype = {
        open: function(callback) {
            var self = this;
            var updated = false;
            var openRequest = offstores.stores.indexedDB.open(this.config.dbName, this.config.dbVersion);
            openRequest.onerror = function() {
                callback(true);
            };
            openRequest.onsuccess = function(ev) {
                self.database = ev.result || ev.target.result;

                if (updated === false && self.database.version !== undefined && self.database.setVersion && self.database.version != self.config.dbVersion) {
                    var versionreq = self.database.setVersion(self.config.dbVersion);
                    //versionreq.onerror = offstores.bind(this, callback, true, "Can't change version with setVersion(" +self.config.dbVersion+")");
                    versionreq.onerror = function(){
                        callback(true, "Can't change version with setVersion(" +self.config.dbVersion+")");
                    };
                    versionreq.onsuccess = function(ev) {
                        createStores(self.database, self.config.stores);
                        callback(false, self);
                    };
                } else {
                    callback(false, self);
                }
            };
            openRequest.onupgradeneeded = function(ev) {
                createStores(ev.target.result, self.config.stores);
                updated = true;
            };
        },
        transaction: function(stores, readOnly, callback) {
            var tx = new IDBStoreTransaction(this.database, stores, readOnly);
            try {
                callback(false, tx);
            } catch (e) {
                // console.log("ROLLBACK");
                // rollbacking here
            }
        },
        close: function(callback) {
            this.database.close();
            callback(false);
        },
        deleteDatabase: function(callback) {
            var self = this;
            var req = offstores.stores.indexedDB.deleteDatabase(this.config.dbName);
            install_request(req, offstores.bind(this, callback, false), offstores.bind(this, callback, true), function() {
                setTimeout(offstores.bind(self, offstores.stores.IDBManager.prototype.deleteDatabase, callback), 500);
            });
        },
        isAvailable: function(size) {
            var sizeAccepted = true;
            return sizeAccepted && offstores.stores.indexedDB &&  offstores.stores.READWRITEMODE;
        },
        getName: function(){ return "IDBManager";}
    };

})(offstores,offstores.stores);