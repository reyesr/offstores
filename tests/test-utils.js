//
//test("serialAsync-allgood", function() {
//    expect(4);
//    QUnit.stop();
//    offstores.chain(
//        function(callback){
//            ok(true);
//            callback(false, true);
//        }, function(err,v, callback){
//            ok(true);
//            callback(false);
//        }, function(err,callback){
//            ok(true);
//            callback(false);
//        }, function(){
//            ok(true);
//            QUnit.start();
//        })
//});
//
//test("serialAsync-error-catched", function() {
//    expect(2);
//    QUnit.stop();
//    offstores.chain(
//        function(callback){
//            ok(true);
//            callback(true, true); // -> error reported
//        }, function(err,v, callback){
//            ok(true);
//            callback(false);
//        }, function(err,callback){
//            ok(true);
//            callback(false);
//        }, function(err){
//            ok(true);
//            QUnit.start();
//        })
//});
//
//test("test forEach on array", function(){
//    var arr = [1,"two",4,"four"];
//    expect(4);
//    offstores.forEach(arr,function(i,e){
//        equal(e,arr[i]);
//    });
//});
//
//test("test forEach on object", function(){
//    var o = {1:"one","two":2, 3:"three", "four": 4};
//    expect(4);
//    offstores.forEach(o,function(i,e){
//        equal(e,o[i]);
//    });
//});
//
//test("test forEach on object, interrupted", function(){
//    var o = {1:"one","two":2, 3:"three", "four": 4};
//    var res = offstores.forEach(o,function(i,e){
//        equal(e,o[i]);
//        if (i == 3) {
//            return "FOUND";
//        }
//    });
//    equal(res, "FOUND");
//});
//
//
//test("test forEach on primitives", function(){
//    expect(4);
//    offstores.forEach(1,function(i,e){
//        equal(e,1);
//        equal(i,0);
//    });
//    offstores.forEach("my string",function(i,e){
//        equal(e,"my string");
//        equal(i,0);
//    });
//});
//
//test("link test", function(){
//    expect(3);
//    offstores.link(function(err,callback){
//        ok(err === false);
//        ok(typeof callback === "function");
//        callback(false, "ONE");
//    }).run().success(function(err,value){
//            equal(value, "ONE");
//        }).fail(function(err,value){
//            ok(false);
//        });
//});
//
//test("link test async", function(){
//    expect(3);
//    QUnit.stop();
//    offstores.link(function(err,callback){
//        ok(err === false);
//        ok(typeof callback === "function");
//        callback(false, "ONE");
//    }).async().run().success(function(err,value){
//            equal(value, "ONE");
//            QUnit.start();
//        }).fail(function(err,value){
//            ok(false);
//            QUnit.start();
//        });
//});
//
//test("link test interrupted", function(){
//    expect(4);
//    offstores.link(function(err,callback){
//        ok(err === false);
//        ok(typeof callback === "function");
//        callback(false, "ONE");
//    }, function(err,value, callback){
//        ok(value, "ONE")
//        callback(true, "TWO");
//    }, function(err, value, callback){
//        ok(false);
//        callback(false, "THREE");
//    }).run().success(function(err,value){
//            ok(false);
//        }).fail(function(err,value){
//            equal(value, "TWO");
//        });
//});
//
//test("link test async interrupted", function(){
//    expect(4);
//    QUnit.stop();
//    offstores.link(function(err,callback){
//        ok(err === false);
//        ok(typeof callback === "function");
//        callback(false, "ONE");
//    }, function(err,value, callback){
//        ok(value, "ONE")
//        callback(true, "TWO");
//    }, function(err, value, callback){
//        ok(false);
//        callback(false, "THREE");
//    }).async().run().success(function(err,value){
//            ok(false);
//            QUnit.start();
//        }).fail(function(err,value){
//            equal(value, "TWO");
//            QUnit.start();
//        });
//});
//
//test("link bind test", function(){
//    expect(1);
//
//    function test1(err, value, callback) {
//        callback(err, value+"1");
//    }
//    function test2(err, value, callback) {
//        callback(err, value+"2", "XXX");
//    }
//    function test3(err, value, othervalue, callback) {
//        callback(err, value+othervalue);
//    }
//
//    offstores.link()
//        .bind(this, test1)
//        .bind(this, test2)
//        .bind(this, test3)
//        .run(false, "TEST").success(function(err,value){
//            equal("TEST12XXX", value);
//        }).fail(function(err,value){
//            ok(false);
//        });
//});
//
//test("link bind with embedded link test", function(){
//    expect(1);
//
//    function test1(err, value, callback) {
//        callback(err, value+"1");
//    }
//    function test2(err, value, callback) {
//        callback(err, value+"2", "XXX");
//    }
//    function test3(err, value, othervalue, callback) {
//        callback(err, value+othervalue);
//    }
//
//    offstores.link()
//        .bind(this, test1)
//        .bind(this, test2)
//        .bind(this, test3)
//        .add(offstores.link().bind(this, test1).bound())
//        .run(false, "TEST").success(function(err,value){
//            equal("TEST12XXX1", value);
//        }).fail(function(err,value){
//            ok(false);
//        });
//});
//
