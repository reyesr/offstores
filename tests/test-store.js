offstores.mkRandomString = function(size) {
    var result = "";
    for (var i=0;i<size; ++i) {
        result += String.fromCharCode(65+parseInt(Math.random()*26));
    }
    return result;
}

function createTestSuite(storeRef, storeName, maxDbSize) {

    module(storeName);

    function defaultConfig() {
        return new offstores.Config().setSize(1024*1024*5).setVersion("1.0").setDbName("mytest").setDBRef(storeRef);
    }

    function insertData(store, data, offset, callback) {
        if (offset < data.length) {
            store.put(data[offset].key, data[offset].value, function(err) {
                if (err) {
                    callback(true);
                } else {
                    insertData(store, data, offset+1, callback);
                }
            });
        } else {
            callback(false);
        }
    }

    function readData(store, data, offset, callback, checkFunc) {
        checkFunc = checkFunc || deepEqual;        if (offset < data.length) {
            store.get(data[offset].key, function(err,res){
                if (err) {
                    callback(true);
                } else {
                    checkFunc(res, data[offset].value);
                    readData(store, data, offset+1, callback, checkFunc);
                }
            });
        } else {
            callback(false);
        }
    }

    function mkData(count) {
        var data = [];
        for (var i=0; i<count; ++i) {
            var key = offstores.mkRandomString(12);
            var value = {key1: offstores.mkRandomString(12), key2: Math.random()*9999999};
            data.push({key:key, value:value});
        }
        return data;
    }

    function BEFORE(config, callback) {
        var store = new storeRef(config);
        store.open(callback);
    }

    function AFTER(config, store, callback) {
        store.close(function() {
            setTimeout(function() {
                store.deleteDatabase(function(err) {
                    console.log("Deleted!");
                    callback(err);
                });
            },0);
        });
    }

    function createSingleTest(name, config, func) {
        test(name, function() {
            QUnit.stop();
            BEFORE(config, function(err,store) {
               var done = false;
                if (err) {
                    ok(false);
                    QUnit.start();
                } else {
                    func(store, function() {
                        AFTER(config, store, function(err) {
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
        function(store,callback) {
            ok(store instanceof Object);
            callback();
        });

    createSingleTest("put single value and retrieve",
        defaultConfig().addStore("test"),
        function(store,callback) {
            store.transaction("test", false, function(err,tx) {
                tx.store("test", function(err,store){
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
        });

    createSingleTest("put multiple values in single transaction and retrieves",
        defaultConfig().addStore("test"),
        function(store,callback) {
            expect(101);
            var data = mkData(100);
            store.transaction("test", false, function(err,tx) {
                tx.store("test", function(err,store){
                    var basevalue = new Date().getMilliseconds();

                    insertData(store, data, 0, function(err){
                        if (err){
                            ok(false, "Couldn't insert all values");
                        } else {
                            readData(store, data, 0, function(err){
                                if (err) {
                                    ok(false, "Couldn't read all values");
                                    callback();
                                } else {
                                    ok(true);
                                    callback();
                                }
                            })
                        }
                    });

                });
            });
        });

    createSingleTest("put multiple values in single transaction and clear",
        defaultConfig().addStore("test"),
        function(store,callback) {
            expect(101);
            var data = mkData(100);
            store.transaction("test", false, function(err,tx) {
                tx.store("test", function(err,store){
                    var basevalue = new Date().getMilliseconds();

                    insertData(store, data, 0, function(err){
                        if (err){
                            ok(false, "Couldn't insert all values");
                        } else {

                            store.clear(function(err) {
                                if (err) {
                                    ok(false);
                                    callback();
                                } else {
                                    readData(store, data, 0, function(err){
                                        if (err) {
                                            ok(false, "Couldn't read all values");
                                            callback();
                                        } else {
                                            ok(true);
                                            callback();
                                        }
                                    }, function(a,b) { ok(a===undefined);});
                                }
                            });
                        }
                    });

                });
            });
        });

    createSingleTest("put single value in init and retrieve",
        defaultConfig().addStore("test").setInitializer("test", function(){
            console.log(arguments);
        }).forceInitializer("test"),
        function(store,callback) {
            store.transaction("test", false, function(err,tx) {
                tx.store("test", function(err,store){
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
        });

    createSingleTest("put complex value and retrieve",
        defaultConfig().addStore("test").setInitializer("test", function(){
            console.log(arguments);
        }).forceInitializer("test"),
        function(store,callback) {
            store.transaction("test", false, function(err,tx) {
                tx.store("test", function(err,store){
                    var basevalue = new Date().getMilliseconds();
                    store.put("mykey", {val: "my value", val2: basevalue}, function(err) {
                        store.get("mykey", function(err,value) {
                            deepEqual(value, {val: "my value", val2: basevalue});
                            equal(value.val, "my value");
                            callback();
                        });
                    });
                });
            });
        });

}

createTestSuite(offstores.stores.IDBManager, "IndexedDB",  5*1024*1024);
createTestSuite(offstores.stores.WebSQLManager, "WebSQL",  5*1024*1024);
createTestSuite(offstores.stores.MemoryManager, "Memory",  5*1024*1024);