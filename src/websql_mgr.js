var offstores = offstores||{};
var offstores = (function(offstores, stores) {


    function WebSQLStore(webtx, name) {
        this.webtx = webtx;
        this.name = name;
    }

    WebSQLStore.prototype = {
        clear: function(callback) {
            this.webtx.tx.executeSql("DELETE FROM " + this.name,
                [],
                offstores.bind(this, callback, false),
                offstores.bind(this, callback, true));
        },
        put: function(key, value, callback) {
            this.webtx.tx.executeSql("INSERT OR REPLACE INTO " + this.name + " (id,value) VALUES (?,?)",
                [key, this.webtx.config.serializer(value)],
                offstores.bind(this, callback, false),
                offstores.bind(this, callback, true));
        },
        get: function(key, callback) {
            var self = this;
            this.webtx.tx.executeSql("SELECT * FROM " + this.name  + " WHERE id=?", [key],
            function(tx,res) {
                if (res.rows.length) {
                    var item = res.rows.item(0);
                    callback(false, self.webtx.config.unSerializer(item.value));
                } else {
                    callback(false, undefined);
                }
            },
            function() {
                callback(true);
            });

        },
        remove: function(key, callback) {
            this.webtx.tx.executeSql("DELETE FROM " + this.name + " WHERE id=?",
                [key],
                offstores.bind(this, callback, true),
                offstores.bind(this, callback, false));
        }
    };

    function WebSQLTransaction(tx, stores, config) {
        this.stores = stores;
        this.tx = tx;
        this.config = config;
    };
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

    function createStores(storeNames, callback) {
        var error = function(){callback(true);};
        this.db.transaction(function(tx){
            var op = new offstores.link();
            offstores.forEach(storeNames, function(i,name){
                op.add(function(err) {
                    tx.executeSql("CREATE TABLE IF NOT EXISTS "+ name +" (id NCHAR(48), value)", [],
                        function() {
                                tx.executeSql("CREATE INDEX IF NOT EXISTS "+ name +"_indx ON " + name + " (id)", [], function() {
                                    callback(false);
                                }, error);
                            });
                        }, error);

                });
            op.run()
                .success(function(){callback(false);})
                .fail(error);
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
                createStores.call(this, this.config.stores, function(err, exc){
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
                ;
        }
    };

    return offstores;
})(offstores,offstores.stores||{});