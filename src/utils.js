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
(function(offstores,console) {
    "use strict";

    function noop(){}

    offstores.bind = function() {
        var args = Array.prototype.slice.call(arguments, 2);
        var t = arguments[0];
        var func = arguments[1];
        if (t !== undefined && func !== undefined) {
            return function() {
                var newargs = arguments.length?args.concat(Array.prototype.slice.call(arguments)):args;
                func.apply(t, newargs);
            };
        } else {
            return noop;
        }
    };

    offstores.bindApply = function() {
        var args = Array.prototype.slice.call(arguments, 2), t = arguments[0], func = arguments[1];
        if (t !== undefined && func !== undefined) {
            return function() {
                var newargs = arguments.length?arguments[0]:[];
                try {
                    func.apply(t, newargs);
                } catch (e) {
                    offstores.log("offstores.bind: error ", e);
                }
            };
        } else {
            return noop;
        }
    };


    offstores.Exception = function(name,message,e) {
        this.name = name;
        this.message = message;
        this.exception = e;
    };

    offstores.log = (console && console.log)?offstores.bind(console, console.log):noop;

    offstores.CallbackManager = function() {
        this.callbacks = [];
    };
    offstores.CallbackManager.prototype.addCallback = function() {
        this.callbacks = this.callbacks.concat(Array.prototype.slice.call(arguments));
        return this;
    };
    offstores.CallbackManager.prototype.emit = function() {
        var args = Array.prototype.slice.call(arguments);
        for (var i=0; i<this.callbacks; ++i) {
            this.callbacks.apply(this, args);
        }
        return this;
    };

    offstores.CallbackManager.prototype.bind = function() {
        var self = this;
        return function() {
            self.emit.apply(Array.prototype.slice(arguments));
        };
    };

    offstores.execAsync = function(func){
        setTimeout(func,0);
    };

    offstores.privCheck = function(someType, error, message){
        if (!(this instanceof someType)) {
            throw {name:error, message: message};
        }
    };

    offstores.meta_chain_ = function(useAsync) {
        var recall = useAsync?offstores.execAsync:function(a){a();};
        return function(){
            var functions = Array.prototype.slice.call(arguments);
            var self = this;
            function exec(){
                if (functions.length) {
                    var func = functions.shift();
                    var curArgs = Array.prototype.slice.call(arguments);
                    if (functions.length>0) {
                        curArgs.push(function(err){
                            var ra = Array.prototype.slice.call(arguments);
                            if (err) {
                                var lastFunc = functions.length?functions.pop():noop;
                                return lastFunc.apply(self, ra);
                            } else {
                                recall(function(){
                                    exec.apply(self, ra);
                                });
                            }
                        });
                    }
                    func.apply(self, curArgs);
                }
            }
            recall(exec);
        };
    };

    offstores.chainAsync = offstores.meta_chain_(true);
    offstores.chain = offstores.meta_chain_(false);

    offstores.link = function () {
        if (!(this instanceof offstores.link)) {
            var l = new offstores.link();
            return l.add.apply(l, Array.prototype.slice.call(arguments));
        }

        this.functions = (arguments.length > 0) ? Array.prototype.slice.call(arguments) : [];
        this.result = undefined;
        this.value = undefined;
        this.successListeners = [];
        this.failListeners = [];
        this.withThis = this;
        this.name = undefined;
        this.cancellable = true;
        return this;
    };
    offstores.link.prototype = {
        as: function(name){
            this.lname = name;
            return this;
        },
        add: function() {
            offstores.forEach(arguments, function(i,e){
                this.functions.push(e);
            },this, true);
            return this;
        },
        setCancellable: function(b){
            this.cancellable = b;
            return this;
        },
        run: function(){
            var self = this;
            var funcs = this.functions.concat(function(err,value) {
                self.resolve(err,value);
            });
            var recall = this.useAsync?offstores.execAsync:function(a){a();};
            function exec(){
                if (funcs.length > 0) {
                    var func = funcs.shift();
                    var curArgs = Array.prototype.slice.call(arguments);
                    curArgs.push(function(err){
                        var ra = Array.prototype.slice.call(arguments);
                        if (err && self.cancellable) {
                            return self.resolve(true, arguments[1]);
                        } else {
                            recall(function(){
                                exec.apply(self, ra);
                            });
                        }
                    });
                    try {
                        func.apply(self.withThis, curArgs);
                    } catch (e) {
                        self.exc = e;
                        offstores.forEach(self.errorListeners, function(i,errl) {
                            errl(false,self.exc);
                        });
                    }
                }
            }
            exec.apply(this, arguments.length>0?Array.prototype.slice.call(arguments):[false]);
            return this;
        },
        async: function(b){
            this.useAsync = b===undefined?true:b;
            return this;
        },
        addAsync: function(f,timeout) {
            timeout = timeout===undefined?0:timeout;
            this.add(function(err,callback) {
                setTimeout(function(){
                    f(err,callback);
                }, timeout);
            });
            return this;
        },
        success: function(cb) {
            if (this.resolved === undefined) {
                this.successListeners.push(cb);
            } else if (this.resolved===true) {
                cb.call(this.withThis, false, this.value);
            }
            return this;
        },
        setFailOnError: function(b){
            this.failOnError = b===undefined?true:b;
            return this;
        },
        error: function(cb) {
            if (this.exc) {
                cb(this.exc);
            } else if (this.resolved === undefined) {
                this.errorListeners = this.errorListeners || [];
                this.errorListeners.push(cb);
            }
            return this;
        },
        fail: function(cb){
            if (this.resolved === undefined) {
                this.failListeners.push(cb);
            } else if (this.resolved ===false) {
                cb.call(this.withThis, true, this.value);
            }
            return this;
        },
        resolve: function(err, result) {
            this.resolved = !err;
            this.value = result;
            offstores.forEach(err ? this.failListeners : this.successListeners, function (i, e) {
                e.call(this.withThis, !this.resolved, this.value);
            }, this);
            return this;
        },
        useThis: function(self){
            this.withThis = self;
            return this;
        },
        bind: function() {
            var args = Array.prototype.slice.call(arguments, 2);
            var t = arguments[0];
            var func = arguments[1];
            if (t !== undefined && func !== undefined) {
                this.add(function() {
                    var newargs = Array.prototype.slice.call(arguments).concat(args.slice());
//                    arguments.length>0 && newargs.push(arguments[arguments.length-1]);
                    try {
                        func.apply(t, newargs);
                    } catch (e) {
                        offstores.log("offstores.chainBind: error ", e);
                        e.stack();
                    }
                });
            }
            return this;
        },
        bound: function() {
            var self = this;
            return function() {
                var args = Array.prototype.slice.call(arguments);
                var cb = args.pop();
                self.run.apply(self, args).success(cb).fail(cb);
            };
        },
        forEach: function(arr, func) {
            offstores.forEach(arr, function(i,e){
                this.add(func.call(this, i,e));
            }, this);
            return this;
        }

    };

    offstores.forEach = function(object, callback, self, enableDuckTyping) {
        self = self||this;
        if (object instanceof Object) {
            var res;
            if (object.constructor === Array || (enableDuckTyping && object.length !== undefined)) {
                for (var i= 0,max=object.length;i<max;++i){
                    res = callback.call(self, i,object[i]);
                    if (res !== undefined) {
                        return res;
                    }
                }
            } else {
                for (var k in object) {
                    res = callback.call(self, k,object[k]);
                    if (res !== undefined) {
                        return res;
                    }
                }
            }
        } else {
            return callback.call(self, 0,object);
        }
    };

    offstores.Cache = function(initializer) {
        this.data = {};
        this.initializer = initializer;
    };
    offstores.Cache.prototype = {
        get: function(name) {
            if (this.data[name] === undefined) {
                this.data[name] = this.initializer(name);
            }
            return this.data[name];
        }
    };

})(offstores,console);