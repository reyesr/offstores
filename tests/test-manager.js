
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
        var storemgr = new offstores.Manager(config);
        storemgr.open(callback);
    }

    function AFTER(config, storemgr, callback) {
        storemgr.close(function() {
            setTimeout(function() {
                storemgr.deleteDatabase(function(err) {
                    console.log("Deleted!");
                    callback(err);
                });
            },0);
        });
    }

    function createSingleTest(name, config, func) {
        test(name, function() {
            QUnit.stop();
            BEFORE(config, function(err,storemgr) {
               var done = false;
                if (err) {
                    ok(false);
                    QUnit.start();
                } else {
                    func(storemgr, function() {
                        AFTER(config, storemgr, function(err) {
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

    createSingleTest("create store",
        defaultConfig().addStore("test"),
        function(manager,callback) {
        ok(manager instanceof Object);
        callback();
    });

    createSingleTest("add values by txStore",
        defaultConfig().addStore("test"),
        function(manager,callback) {
            manager.txStore("test", false, function(err, store) {
                var basevalue = new Date().getMilliseconds();
                store.put("mykey", "my value:" + basevalue, function(err) {
                    store.get("mykey", function(err,value) {
                        var expected = "my value:" + basevalue;
                        ok(value === expected);
                        callback();
                    });
                });
            });
        });

    createSingleTest("clear store",
        defaultConfig().addStore("test"),
        function(manager,callback) {

            offstores.link()
                .async()
                .add(function(err, callback){
                    manager.txStore("test", false, function(err, store) {
                        store.put("my key", "my value", function(err){
                            callback(err);
                        });
                    });
                })
                .add(function(err,callback){
                    manager.clearStore("test", function(err){
                        callback(err);
                    });
                })
                .add(function(err,callback){
                    manager.txStore("test", true, function(err, store) {
                        store.get("my key", function(err, value){
                            ok( value === undefined );
                            callback(err);
                        });
                    });
                }).run()
                .success(function(err){
                    ok(true);
                    callback(err);
                })
                .fail(function(err){
                    ok(false);
                    callback(err);
                });
        });


//    createSingleTest("put bulk string",
//        defaultConfig().addStore("test"),
//        function(manager,callback) {
//            var data = offstores.tests.mkRandomStringDataSet(500, 16, 32);
//            manager.putBulk("test", data.keys, data.values, function(err) {
//                offstores.execAsync(function(){
//                    manager.txStore("test", function(err,store){
//                        checkData(store, data, 0, function(err){
//                           callback(err);
//                        });
//                    });
//
//                });
//            });
//        });
//
//    createSingleTest("put bulk complex object",
//        defaultConfig().addStore("test"),
//        function(manager,callback) {
//            var data = offstores.tests.mkRandomObjectDataSet(4, 16, 32);
//            manager.putBulk("test", data.keys, data.values, function(err) {
//                offstores.execAsync(function(){
//                    manager.txStore("test", function(err,store){
//                        checkData(store, data, 0, function(err){
//                           callback(err);
//                        });
//                    });
//
//                });
//            });
//        });

}

createTestSuite(offstores.stores.IDBManager, "IndexedDB",  5*1024*1024);
createTestSuite(offstores.stores.WebSQLManager, "WebSQL",  5*1024*1024);
createTestSuite(offstores.stores.MemoryManager, "Memory",  5*1024*1024);
createTestSuite(offstores.stores.LocalStorageManager, "LocalStorage",  5*1024*1024);
