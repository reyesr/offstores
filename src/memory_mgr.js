var offstores = offstores||{};
var offstores = (function(offstores, stores) {

    offstores.stores=stores;

    function MemoryStore(transaction, name) {
        this.transaction = transaction;
        this.name = name;
    }

    MemoryStore.prototype = {
        clear: function(callback) {
            this.transaction.clear();
            callback(false);
        },
        put:function(key,value,callback) {
            this.transaction.put(key,value);
            callback(false);
        },
        remove:function(key,callback) {
            this.transaction.remove(key);
            callback(false);
        },
        get: function(key, callback) {
            callback(false, this.transaction.get(key));
        }
    };

    var ReadOnlyErrorFunction = function(callback){
        callback(true, "Transaction is read-only");
    }

    function MemoryTransactionProxy(tx) {
        this.tx = tx;
    }

    MemoryTransactionProxy.prototype = {
        mkStoreProxy: function(name) {
            var self = this;
            return {
                get: function(key) {
                    if (self.tx.cacheLocal[name][key] != undefined) {
                        return self.tx.cacheLocal[name][key];
                    } else if (self.tx.removed[name][key]) {
                        return undefined;
                    } else if (self.tx.clearRequested[name]) {
                        return undefined;
                    } else {
                        return self.tx.manager.stores[name][key];
                    }
                },
                put: function(key,value) {
                    if (self.tx.removed[name][key]) {
                        delete self.tx.removed[name][key];
                    }
                    self.tx.cacheLocal[name][key] = value;
                },
                clear: function() {
                    self.tx.removed[name] = {};
                    self.tx.cacheLocal[name] = {};
                    self.tx.clearRequested[name] = true;
                },
                remove: function(key) {
                    self.tx.removed[name][key] = true;
                }
            }
        }
    };


    function MemoryTransaction(manager, stores, readOnly) {
        this.manager = manager;
        this.stores = stores;
        this.readOnly = readOnly;
        this.onComplete = new offstores.CallbackManager();
        this.onError = new offstores.CallbackManager();

        this.proxy = new MemoryTransactionProxy(this);
        this.cacheLocal = {};
        this.removed = {};
        this.clearRequested = {};

        offstores.forEach(stores, function(i,name){
            this.cacheLocal[name] = {};
            this.removed[name] = {};
            this.clearRequested[name] = false;
        }, this);
    }

    MemoryTransaction.prototype = {
        store: function(name, callback) {
            // var store = new MemoryStore(this, name, this.manager.stores[name]);
            var store = this.proxy.mkStoreProxy(name);
            store = new MemoryStore(this.proxy.mkStoreProxy(name), name);
            if (this.readOnly){
                store.put = store.clear = store.remove = ReadOnlyErrorFunction;
            }
            callback(false, store);
        },
        commit:  function() {
            if (this.manager.stores !== undefined) {
                // First clear what needs to be cleared
                offstores.forEach(this.clearRequested, function(storeName) {
                    this.manager.stores[storeName] = {};
                }, this);

                // then apply the removed
                offstores.forEach(this.removed, function(storeName) {
                    offstores.forEach(this.removed[storeName], function(key) {
                        delete this.manager.stores[storeName][key];
                    }, this);
                }, this);

                // then puts
                offstores.forEach(this.removed, function(storeName) {
                    offstores.forEach(this.cacheLocal[storeName], function(key, value) {
                        this.manager.stores[storeName][key] = value;
                    }, this);
                }, this);
            }
        }
    };

    offstores.stores.MemoryManager = function(config) {
        if (!(this instanceof offstores.stores.MemoryManager)) {
            return new offstores.stores.MemoryManager(config);
        }

        if (!config) {
            throw {name: "Missing config", message: "IDBManager was created without a config object"};
        }
        this.config = config;
        this.stores = {};
    };

    offstores.stores.MemoryManager.prototype.isAvailable = function(size) {
        return true;
    };

    /**
     * Creates the missing stores in the database
     * @private
     */
    function createStoresmgr() {
        offstores.forEach(this.config.stores, function(i,storeName){
            this.stores[storeName] = {};
        }, this);
        return true;
    }

    offstores.stores.MemoryManager.prototype = {
        open: function(callback) {
            createStoresmgr.call(this);
            callback(false, this);
        },
        transaction: function(stores, readOnly, callback) {
            var mt;
            callback(false, mt=new MemoryTransaction(this, stores, readOnly));
            mt.commit();

        },
        close: function(callback) {
            delete this.stores;
            callback(false);
        },
        deleteDatabase: function(callback){
            this.close(callback);
        }
    }


    return offstores;
})(offstores,offstores.stores||{});
