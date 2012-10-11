var offstores = (function(offstores) {
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
            if (this.manager.stores !== undefined) {
                // First clear what needs to be cleared
                offstores.forEach(this.clearRequested, function(storeName) {
                    this.delegate.clear(storename);
                    // this.manager.stores[storeName] = {};
                }, this);

                // then apply the removed
                offstores.forEach(this.removed, function(storeName) {
                    offstores.forEach(this.removed[storeName], function(key) {
                        this.delegate.remove(storeName, key);
                        // delete this.manager.stores[storeName][key];
                    }, this);
                }, this);

                // then puts
                offstores.forEach(this.removed, function(storeName) {
                    offstores.forEach(this.cacheLocal[storeName], function(key, value) {
                        this.deletegate.put(key,value);
                        // this.manager.stores[storeName][key] = value;
                    }, this);
                }, this);
            }
        },
        getStoreProxy: function(name) {
            var self = this;
            return {
                get: function(key) {
                    if (self.cacheLocal[name][key] != undefined) {
                        return self.cacheLocal[name][key];
                    } else if (self.removed[name][key]) {
                        return undefined;
                    } else if (self.clearRequested[name]) {
                        return undefined;
                    } else {
                        self.delegate.get(name,key);
//                        return self.tx.manager.stores[name][key];
                    }
                },
                put: function(key,value) {
                    if (self.removed[name][key]) {
                        delete self.removed[name][key];
                    }
                    self.cacheLocal[name][key] = value;
                },
                clear: function() {
                    self.removed[name] = {};
                    self.cacheLocal[name] = {};
                    self.clearRequested[name] = true;
                },
                remove: function(key) {
                    self.removed[name][key] = true;
                }
            };
        }
    }

};

    return offstores;
})(offstores||{});
