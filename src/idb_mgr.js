var offstores = offstores||{};
var offstores = (function(offstores, stores) {

    offstores.stores=stores;

    function install_request(req, success, error, blocked) {
        req.onsuccess = success;
        req.onerror = error;
        blocked && (req.onblocked = blocked);
        return req;
    }


    function IDBStore(transaction, name) {
        this.transaction = transaction;
        this.store = transaction.objectStore(name);
    }

    IDBStore.prototype.clear = function(callback) {
        var req = this.store.clear();
        install_request(req, offstores.bind(this, callback, false), offstores.bind(this, callback, true));
    }

    IDBStore.prototype.put = function(key, value, callback) {
        var req = this.store.put(value, key);
        install_request(req, offstores.bind(this, callback, false, value), offstores.bind(this, callback, true));
    }

    IDBStore.prototype.get = function(key, callback) {
        var self = this;
        try {
            var req = this.store.get(key);
            req.onsuccess = function(ev) {
                callback(false, ev.target.result);
            };
            req.onerror = offstores.bind(self, callback, true);
        } catch (e) {
            callback(true, e);
        }
        return this;
    };

    IDBStore.prototype.remove = function(key, callback) {
        var req = this.store.delete(key);
        install_request(req, offstores.bind(this, callback, false, key), offstores.bind(this, callback, true));
    };

    function IDBStoreTransaction(database, stores, readOnly) {
        this.database = database;
        this.transaction = undefined;
        this.stores = stores;
        this.mode = readOnly?undefined:offstores.stores.READWRITEMODE;
        this.onComplete = new offstores.CallbackManager();
        this.onError = new offstores.CallbackManager();
    }

    IDBStoreTransaction.prototype.store = function(name, callback) {
        if (this.transaction === undefined) {
            this.transaction = this.database.transaction(this.stores, this.mode);
            this.transaction.oncomplete = this.onComplete.bind();
            this.transaction.onerror = this.onError.bind();
        }
        callback(false, new IDBStore(this.transaction, name));
    }


    try {
        offstores.stores.indexedDB =  window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB || window.msIndexedDB;
        offstores.stores.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.mozIDBTransaction || window.msIDBTransaction || {};
        offstores.stores.READWRITEMODE  = offstores.stores.IDBTransaction.readwrite || offstores.stores.IDBTransaction.READ_WRITE || "readwrite";
    } catch(e) {
        offstores.stores.indexedDB = undefined;
        offstores.stores.IDBTransaction = undefined;
        offstores.stores.READWRITEMODE = undefined;
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

    offstores.stores.IDBManager.prototype.isAvailable = function(size) {
        var sizeAccepted = true;
        return sizeAccepted && offstores.stores.indexedDB &&  offstores.stores.READWRITEMODE;
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

    offstores.stores.IDBManager.prototype.open = function(callback) {
        var self = this;
        var updated = false;
        var openRequest = offstores.stores.indexedDB.open(this.config.dbName, this.config.dbVersion);
        openRequest.onerror = function() {
            callback(true);
        };
        openRequest.onsuccess = function(ev) {
            self.database = ev.result || ev.target.result;

            if (updated == false && self.database.version !== undefined && self.database.setVersion && self.database.version != self.dbVersion) {
                var versionreq = self.database.setVersion(self.dbVersion);
                versionreq.onerror = offstores.bind(this, callback, true, "Can't change version with setVersion(" +self.dbVersion+")");
                versionreq.onsuccess = function(ev) {
                    createStores(self.database, self.config.stores);
                    callback(false, self);
                }
            } else {
                callback(false, self);
            }
        };
        openRequest.onupgradeneeded = function(ev) {
            createStores(ev.target.result, self.config.stores);
            updated = true;
        };
    };

    offstores.stores.IDBManager.prototype.transaction = function(stores, readOnly, callback) {
        callback(false, new IDBStoreTransaction(this.database, stores, readOnly));
    };

    offstores.stores.IDBManager.prototype.close = function(callback) {
        this.database.close();
        callback(false);
    }

    offstores.stores.IDBManager.prototype.deleteDatabase = function(callback) {
        var self = this;
        var req = offstores.stores.indexedDB.deleteDatabase(this.config.dbName);
        install_request(req, offstores.bind(this, callback, false), offstores.bind(this, callback, true), function() {
            setTimeout(offstores.bind(self, offstores.stores.IDBManager.prototype.deleteDatabase, callback), 500);
        });
    };

    return offstores;
})(offstores,offstores.stores||{});