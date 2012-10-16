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

    offstores.StoreManager = function(manager, storeName){
        this.manager = manager;
        this.storeName = storeName;
    };

    offstores.StoreManager.prototype = {
        put: function(key,value, callback) {
            this.manager.txStore(this.storeName, function(err,store){
                store.put(key, value, callback);
            });
        },
        get: function(key, callback) {
            this.manager.txStore(this.storeName, function(err,store){
                store.get(key, callback);
            });
        },
        clear: function(callback) {
            this.manager.txStore(this.storeName, function(err,store){
                store.clear(callback);
            });
        },
        remove: function(key,  callback) {
            this.manager.txStore(this.storeName, function(err,store){
                store.remove(key, callback);
            });
        },
        putBulk: function(keys, values, callback, batchSize) {
                batchSize = batchSize||100;
                var manager = this.manager;
                var self = this;

                function putBulk(store, offset, callback) {

                    function singlePut(store, key, value) {
                        store.put(key, value, function(err){
                            if (err) {
                                callback(err);
                            } else {
                                putBulk(store, offset+1, callback);
                            }
                        });
                    }

                    if (offset >= keys.length) {
                        offstores.execAsync(function(){callback(false);});
                    } else {
                        if (store === undefined) {
                            manager.txStore(self.storeName, function(err, store){
                                if (err) {
                                    callback(err);
                                } else {
                                    singlePut(store, keys[offset], values[offset]);
                                }
                            });
                        } else if (offset%batchSize===0) {
                            offstores.execAsync(function() { putBulk(undefined, offset, callback);});
                        } else {
                            singlePut(store, keys[offset], values[offset]);
                        }
                    }
                }
                putBulk(undefined, 0, callback);
            }
    };

})(offstores);
