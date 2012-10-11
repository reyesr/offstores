var offstores = (function(offstores) {

    function findSuitableStore(managers, size) {
        return offstores.forEach(managers, function(i,manager) {
            try {
                if (manager.prototype.isAvailable(size)){
                    return manager;
                }
            } catch (exc){
                offstores.log(manager, exc);
            }
        });
    }

    offstores.Manager = function(config){
        this.managers = (config.managers&&config.managers.length>0)?config.managers:[offstores.IDBManager];
        this.config = config;
        this.metaStoreName = "offstoremeta";
    };

    function TestTest(config) {
        this.metaStoreName = "offstoresmeta";
    }

    function doInitialization(err, name, callback) {
        offstores.privCheck.call(this, offstores.Manager, "Invalid bound", "function checkInit not bound");
        var init = this.config.initializers[name];
        offstores.log("DoInitialization: " + name);
        if (init && typeof init === "function") {
            init(this, name, callback);
        } else {
            callback(false)
        }
    }

    function checkInit(err, storeNames, callback) {
        offstores.privCheck.call(this, offstores.Manager, "Invalid bound", "function checkInit not bound");

        var self = this;
        if (storeNames.length === 0) {
            return callback(false);
        }

        var name = storeNames.pop();
        this.manager.transaction([self.metaStoreName], false, function(err,tx){
            tx.store(self.metaStoreName, function(err, store){
                store.get(name, function(err,value) {
                    if (err) {
                        callback(err,value);
                    } else {
                        value = value || {init:false};
                        if (name !== self.metaStoreName && (value.init == false || self.config.forceInit[name])) {

                            offstores.link()
                                .useThis(self)
                                .async(true)
                                .add(function(err, callback) {
                                    this.txStore(this.metaStoreName, false, function(err,store) {
                                        if (err) {
                                            callback(err,store);
                                        } else {
                                            store.clear(function() {
                                                callback(err, name);
                                            });
                                        }
                                    });
                                })
                                .bind(self,  doInitialization)
                                .add(function _set_init_true(err,callback) {
                                    self.txStore(self.metaStoreName, false, function(err,store){
                                        if (err) {
                                            callback(true, store);
                                        } else {
                                            value.init = true;
                                            store.put(name, value, function(err,v){
                                                callback(err)
                                            });

                                        }
                                    });
                                })
                                .success(function(err) {
                                    checkInit.call(self, false, storeNames, callback);
                                })
                                .fail(function(err,exc) {
                                    callback(err,exc);
                                })
                                .run();


                        } else {
                            checkInit.call(self, false, storeNames, callback);
                        }
                    }

                });
            });
        });
    }

    offstores.Manager.prototype.open = function(callback) {
        var self = this;
        var e;
        try {
            var candidate = findSuitableStore(this.managers, this.config.dbSize);

            this.config.addStore(this.metaStoreName);
            var mgr = new candidate(this.config);

            mgr.open(function(err, mgr) {
                self.manager = mgr;
                // Check initialization
                if (err) {
                    return callbak.apply(Array.prototype.slice(arguments));
                } else {
                    checkInit.call(self, false, self.config.stores.slice(), function(err,v){
                        callback(err,self);
                    });
                }
            });

        } catch (e) {
            callback(true, e);
            throw e;
        }
    }

    offstores.Manager.prototype.close = function(callback) {
        this.manager.close(callback);
    };

    offstores.Manager.prototype.deleteDatabase = function(callback) {
        this.manager.deleteDatabase(callback);
    };


    offstores.Manager.prototype.txStore = function(name, readOnly, callback) {
        if (callback === undefined && (typeof readOnly === "function")) {
            callback = readOnly;
            readOnly = undefined;
        }
        readOnly = readOnly===undefined?false:readOnly;
        try {
            this.manager.transaction([name], readOnly, function(err,tx){
                tx.store(name, function(err,store){
                    callback(false, store);
                });
            });
        } catch (e) {
            callback(true, e);
        }
    }

    offstores.Manager.prototype.clearStore = function(name, callback) {
        this.txStore(name, function(err, store){
           store.clear(function(err){
               callback(err);
           });
        });
    }

    return offstores;
})(offstores||{});