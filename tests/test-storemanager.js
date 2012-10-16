
function createTestSuite(storeRef, storeName, maxDbSize) {

    module(storeName);

    function defaultConfig() {
        return new offstores.Config().setSize(1024*1024*5).setVersion("1.0").setDbName("mytest").setDBRef(storeRef);
    }

    function checkData(store, data, offset, callback) {
        if (offset >= data.keys.length) {
            callback(false);
        } else {
            store.get(data.keys[offset], function(err,value) {
                deepEqual(data.values[offset], value);
                checkData(store,data,offset+1, callback);
            });
        }
    }

    function BEFORE(config, callback) {
        var mgr = new offstores.Manager(config);
        mgr.open(function(err) {
            if (err) {
                callback(err);
            } else {
                callback(false, mgr, mgr.getStoreManager("test"));
            }
        });
    }

    function AFTER(config, mgr, callback) {
        mgr.close(function() {
            setTimeout(function() {
                mgr.deleteDatabase(function(err) {
                    console.log("Deleted!");
                    callback(err);
                });
            },0);
        });
    }

    function createSingleTest(name, config, func) {
        test(name, function() {
            QUnit.stop();
            BEFORE(config, function(err,mgr, storemgr) {

                ok(storemgr instanceof offstores.StoreManager);
                ok(mgr instanceof offstores.Manager);

               var done = false;
                if (err) {
                    ok(false);
                    QUnit.start();
                } else {
                    func(storemgr, function() {
                        AFTER(config, mgr, function(err) {
                            if (err) {
                                ok(false);
                            }
                            QUnit.start();
                        }, config)
                    });
                }
           })
        });
    }

    createSingleTest("put and get",
        defaultConfig().addStore("test"),
        function(store,callback) {
            store.put("my key", "my value", function(err) {
                ok(!err);
                store.get("my key", function(err,value){
                    equal(value, "my value");
                    callback();
                });
            });
        });

    createSingleTest("put, clear, and get",
        defaultConfig().addStore("test"),
        function(store,callback) {
            store.put("my key", "my value", function(err) {
                ok(!err);
                store.clear(function(err){
                    ok(!err);
                    store.get("my key", function(err,value){
                        equal(value, undefined);
                        callback();
                    });
                });
            });
        });

    createSingleTest("put, put, remove, get, get",
        defaultConfig().addStore("test"),
        function(store,callback) {
            store.put("my key", "my value", function(err) {
                store.put("my key 2", "my value 2", function(err) {
                    ok(!err);
                    store.remove("my key", function(err){
                        ok(!err);
                        store.get("my key", function(err,value){
                            equal(value, undefined);
                            offstores.execAsync(function(){
                            store.get("my key 2", function(err,value){
                                equal(value, "my value 2");
                                callback();
                            });

                            });
                        });
                    });
                });
            });
        });

    createSingleTest("put, put, remove, get, get, all ASYNC",
        defaultConfig().addStore("test"),
        function(store,callback) {
            offstores.execAsync(offstores.bind(store, store.put, "my key", "my value", function(err){
                ok(!err);
                offstores.execAsync(offstores.bind(store, store.put, "my key 2", "my value 2", function(err){
                    ok(!err);
                    offstores.execAsync(offstores.bind(store, store.remove, "my key", function(err){
                        ok(!err);
                        offstores.execAsync(offstores.bind(store, store.get, "my key", function(err, value){
                            ok(!err);
                            equal(value, undefined);
                            offstores.execAsync(offstores.bind(store, store.get, "my key 2", function(err, value){
                                ok(!err);
                                equal(value, "my value 2");
                                callback(err);
                            }));
                        }));
                    }));

                }));
            }));
        });

    function checkData(store, data, offset, callback) {
        if (offset >= data.keys.length) {
            callback(false);
        } else {
            store.get(data.keys[offset], function(err,value) {
                deepEqual(data.values[offset], value);
                checkData(store,data,offset+1, callback);
            });
        }
    }

    function add_putBulkTest(name, dataMaker, async) {
        var execFunc = async?offstores.execAsync:function(f){f();};
        createSingleTest(name,
            defaultConfig().addStore("test"),
            function(store,callback) {
                var data = dataMaker(500,10,10);
                store.putBulk(data.keys, data.values, function(err){
                    execFunc(function(){
                        checkData(store, data, 0, function(err){
                            callback(err);
                        });
                    });
                });
            });
    }

    add_putBulkTest("putBulk string object", offstores.tests.mkRandomStringDataSet, false);
    add_putBulkTest("putBulk string object async", offstores.tests.mkRandomStringDataSet, true);
    add_putBulkTest("putBulk complex object", offstores.tests.mkRandomObjectDataSet, false);
    add_putBulkTest("putBulk complex object async", offstores.tests.mkRandomObjectDataSet, true);

}

createTestSuite(offstores.stores.IDBManager, "IndexedDB",  5*1024*1024);
createTestSuite(offstores.stores.WebSQLManager, "WebSQL",  5*1024*1024);
createTestSuite(offstores.stores.MemoryManager, "Memory",  5*1024*1024);
createTestSuite(offstores.stores.LocalStorageManager, "LocalStorage",  5*1024*1024);
