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

    function MemoryTransactionDelegate(manager) {
        this.manager = manager;
    }
    MemoryTransactionDelegate.prototype = {
        get: function(storeName, key) {
            return this.manager.stores[storeName][key];
        },
        put: function(storeName, key,value){
            this.manager.stores[storeName][key] = value;
        },
        remove: function(storeName, key) {
            delete this.manager.stores[storeName][key];
        },
        clear: function(storeName) {
            this.manager.stores[storeName] = {};
        }
    };


    stores.MemoryManager = function(config) {
        if (!(this instanceof stores.MemoryManager)) {
            return new stores.MemoryManager(config);
        }

        if (!config) {
            throw {name: "Missing config", message: "IDBManager was created without a config object"};
        }
        this.config = config;
        this.stores = {};
        this.transactionManager = new offstores.TransactionManager();
    };

    /**
     * Creates the missing stores in the database
     * @private
     */
    function createStoresmgr(self) {
        offstores.forEach(self.config.stores, function(i,storeName){
            self.stores[storeName] = {};
        });
        return true;
    }

    stores.MemoryManager.prototype = {
        open: function(callback) {
            createStoresmgr(this);
            callback(false, this);
        },
        transaction: function(stores, readOnly, callback) {
            this.transactionManager.transaction(stores, readOnly, callback, new MemoryTransactionDelegate(this));
        },
        close: function(callback) {
            delete this.stores;
            callback(false);
        },
        deleteDatabase: function(callback){
            this.close(callback);
        },
        isAvailable: function(size) {
            return true;
        },
        getName: function(){ return "MemoryManager";}
    };

})(offstores,offstores.stores);
