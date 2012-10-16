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
    "use strict";

    offstores.stores=stores;

    function deleteStorage(storage, regex) {
        var toDelete = [];
        for (var k in storage) {
            if (regex.test(k)){
                toDelete.push(k);
            }
        }
        offstores.forEach(toDelete,function(i,e){
            delete storage[e];
        });
    }

    function LSTransactionDelegate(manager) {
        this.manager = manager;
    }
    LSTransactionDelegate.prototype = {
        get: function(storeName, key) {
            var raw = this.manager.store[this.manager.dbPrefix+storeName+"."+key];
            return (raw !== undefined)?this.manager.config.unSerializer(raw):undefined;
        },
        put: function(storeName, key,value){
            this.manager.store[this.manager.dbPrefix+storeName+"."+key] = this.manager.config.serializer(value);
        },
        remove: function(storeName, key) {
            delete this.manager.store[this.manager.dbPrefix+storeName+"."+key];
        },
        clear: function(storeName) {
            var prefix = new RegExp("^" + this.manager.dbPrefix + storeName);
            deleteStorage(this.manager.store, prefix);
        }
    };

    offstores.stores.LocalStorageManager = function(config) {
        if (!(this instanceof offstores.stores.LocalStorageManager)) {
            return new offstores.stores.LocalStorageManager(config);
        }

        if (!config) {
            throw {name: "Missing config", message: "LocalStorageManager was created without a config object"};
        }
        this.config = config;
        this.dbPrefix = config.dbName!==undefined?(config.dbName+"."):"offstore.";
        this.store = window.localStorage;
        this.transactionManager = new offstores.TransactionManager();
    };
    offstores.stores.LocalStorageManager.prototype = {
        open: function(callback) {
            callback(false, this);
        },
        transaction: function(stores, readOnly, callback) {
            this.transactionManager.transaction(stores, readOnly, callback, new LSTransactionDelegate(this));
        },
        close: function(callback) {
            callback(false);
        },
        deleteDatabase: function(callback){
            deleteStorage(this.store, new RegExp("^" + this.dbPrefix));
            this.close(callback);
        },
        isAvailable: function(size) {
        return window.localStorage && (size <= 5*1024*1024);
        },
        getName: function(){ return "LocalStorageManager";}
    };

})(offstores,offstores.stores);
