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
(function(offstores) {
    'use strict';

    offstores.Config = function () {
        if (!(this instanceof  offstores.Config)) {
            return new offstores.Config();
        }
        this.managers = [];
        this.stores = [];
        this.versionChanged = undefined;
        this.dbName = "defaultName";
        this.dbSize = 0;
        this.dbVersion = "1.0";
        this.initializers = {};
        this.forceInit = {};
        this.serializer = window.JSON.stringify;
        this.unSerializer = window.JSON.parse;
    };

    offstores.Config.prototype = {
        addDBRef:function (dbref) {
            this.managers.push(dbref);
        },
        setDBRef:function () {
            this.managers = [];
            for (var i = 0; i < arguments.length; ++i) {
                this.managers = this.managers.concat(arguments[i]);
            }
            return this;
        },
        addIndexedDB:function () {
            this.managers.push(offstores.stores.IDBManager);
            return this;
        },
        addWebSQL:function () {
            this.managers.push(offstores.stores.WebSQLManager);
            return this;
        },
        addLocalStorage:function () {
            this.managers.push(offstores.stores.LocalStorageManager);
            return this;
        },
        addMemory:function () {
            this.managers.push(offstores.stores.MemoryManager);
            return this;
        },
        addStore:function () {
            this.stores = this.stores.concat(Array.prototype.slice.call(arguments));
            return this;
        },
        setSize:function (size) {
            this.dbSize = size;
            return this;
        },
        setVersion:function (version) {
            this.dbVersion = version.toString();
            return this;
        },
        setDbName:function (name) {
            this.dbName = name;
            return this;
        },
        setInitializer:function (storeName, initializerFunc) {
            this.initializers[storeName] = initializerFunc;
            return this;
        },
        forceInitializer:function (storeName) {
            this.forceInit[storeName] = true;
            return this;
        },
        hasStore:function (name) {
            for (var i = 0; i < this.stores.length; ++i) {
                if (this.stores[i] == name) {
                    return true;
                }
            }
            return false;
        },
        setVersionChangeCallback:function (callback) {
            this.versionChanged = callback;
        },
        setSerializer:function (serializer) {
            this.serializer = serializer;
        },
        setUnserializer:function (unserializer) {
            this.unSerializer = unserializer;
        }

    };

    return offstores;
})(offstores);
