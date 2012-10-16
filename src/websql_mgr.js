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

    function WebSQLStore(webtx, name) {
        this.webtx = webtx;
        this.name = name;
    }

    function safe_tx(tx, func) {
        try {
            func();
        } catch (e) {
            tx.executeSql("INVALID_STATEMENT!!",[]);
        }
    }

    function safe_tx_bind(tx) {
        var args = Array.prototype.slice.call(arguments,1);
        var func = offstores.bind.apply(tx, args);
        return function() {
            safe_tx(tx, func);
        };
    }

    WebSQLStore.prototype = {
        clear: function(callback) {
            this.webtx.tx.executeSql("DELETE FROM " + this.name,
                [],
                safe_tx_bind(this.webtx.tx, this, callback, false),
                safe_tx_bind(this.webtx.tx, this, callback, true));
        },
        put: function(key, value, callback) {
            this.webtx.tx.executeSql("INSERT OR REPLACE INTO " + this.name + " (id,value) VALUES (?,?)",
                [key, this.webtx.config.serializer(value)],
                safe_tx_bind(this.webtx.tx, this, callback, false),
                safe_tx_bind(this.webtx.tx, this, callback, true));
        },
        get: function(key, callback) {
            var self = this;
            this.webtx.tx.executeSql("SELECT * FROM " + this.name  + " WHERE id=?", [key],
                function(tx,res) {
                    if (res.rows.length) {
                        var item = res.rows.item(0);
                        safe_tx(self.webtx.tx, function(){
                            callback(false, self.webtx.config.unSerializer(item.value));
                        });
                    } else {
                        safe_tx(self.webtx.tx, function(){
                            callback(false, undefined);
                        });
                    }
                },
                safe_tx_bind(this.webtx.tx, this, callback, true));

        },
        remove: function(key, callback) {
            this.webtx.tx.executeSql("DELETE FROM " + this.name + " WHERE id=?",
                [key],
                safe_tx_bind(this.webtx.tx, this, callback, false),
                safe_tx_bind(this.webtx.tx, this, callback, true));
        }
    };

    function WebSQLTransaction(tx, stores, config) {
        this.stores = stores;
        this.tx = tx;
        this.config = config;
    }
    WebSQLTransaction.prototype = {
        store: function(name, callback) {
            callback(false, new WebSQLStore(this, name));
        }
    };


    offstores.stores.WebSQLManager = function(config) {
        if (!(this instanceof offstores.stores.WebSQLManager)) {
            return new offstores.stores.WebSQLManager(config);
        }

        if (!config) {
            throw {name: "Missing config", message: "WebSQLManager was created without a config object"};
        }
        this.config = config;
    };
    offstores.stores.WebSQLManager.prototype.isAvailable = function(size) {
        var sizeAccepted = true;
        return sizeAccepted && offstores.stores.indexedDB &&  offstores.stores.READWRITEMODE;
    };

    function createStores(manager, storeNames, callback) {
        manager.db.transaction(function(tx){
            var op = new offstores.link();
            op.forEach(storeNames, function(i,name){
                return function(err, callback) {
                    var error = function(){callback(true);};
                    tx.executeSql("CREATE TABLE IF NOT EXISTS "+ name +" (id NCHAR(48), value)", [],
                        function() {
                                tx.executeSql("CREATE INDEX IF NOT EXISTS "+ name +"_indx ON " + name + " (id)", [], function() {
                                    callback(false);
                                }, error);
                            }, error);
                };
            });

            op.run()
                .success(function(){
                    callback(false);
                })
                .fail(function(){
                    callback(true);
                });
        });
    }

    offstores.stores.WebSQLManager.prototype = {
        isAvailable: function(size) {
            return !!window.openDatabase;
        },
        open: function(callback) {
            try {
                var self = this;
                this.db = openDatabase(this.config.dbName, this.config.dbVersion, "offstore", this.config.dbSize);
                createStores(this, this.config.stores, function(err, exc){
                    return err?callback(err,exc):callback(err,self);
                });
            } catch (e) {
                callback(true, e);
            }
        },
        transaction: function(stores, readOnly, callback) {
            var self = this;
            if (readOnly) {
                this.db.readTransaction(function(tx){
                    callback(false, new WebSQLTransaction(tx,stores, self.config));
                });
            } else {
                this.db.transaction(function(tx){
                    callback(false, new WebSQLTransaction(tx,stores, self.config));
                });
            }
        },
        close: function(callback) {
            // CAN'T
            callback(false);
        },
        deleteDatabase: function(callback) {
            // CAN'T
            var self = this;
            var l = (new offstores.link())
                .as("delDb")
                .async()
                .setCancellable(false)
                .useThis(this)
                .forEach(this.config.stores, function(i,name) {
                    return function(err,callback){
                        self.transaction([name], false, function(err, tx){
                            tx.store(name, function(err, store){
                                store.clear(function(err){
                                    callback(err);
                                });
                            });
                        });
                    };
                })
                .success(offstores.bind(this, callback, false))
                .fail(offstores.bind(this, callback, true))
                .run();
        },
        getName: function(){ return "WebSQLManager";}
    };

})(offstores,offstores.stores);