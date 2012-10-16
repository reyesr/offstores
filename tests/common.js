offstores.tests = {
    mkRandomString: function(size) {
        var result = "";
        for (var i=0;i<size; ++i) {
            result += String.fromCharCode(65+parseInt(Math.random()*26));
        }
        return result;
    },
    mkRandomStringDataSet: function(count, keyLength, valueLength) {
        var result = {keys:[], values:[]};
        for (var i=0; i<count; ++i) {
            result.keys.push(offstores.tests.mkRandomString(keyLength));
            result.values.push(offstores.tests.mkRandomString(valueLength));
        }
        return result;
    },
    mkRandomObjectDataSet: function(count, keyLength, valueLength) {
        var result = {keys:[], values:[]};
        for (var i=0; i<count; ++i) {
            result.keys.push(offstores.tests.mkRandomString(keyLength));
            // result.values.push(this.mkRandomString(valueLength));
            result.values.push({key1: offstores.tests.mkRandomString(valueLength), key2: Math.random()*9999999});
        }
        return result;
    },
    mkData: function(count, keyLength, valueLength) {
            var data = [];
            for (var i=0; i<count; ++i) {
                var key = offstores.tests.mkRandomString(keyLength);
                var value = {key1: offstores.tests.mkRandomString(valueLength), key2: Math.random()*9999999};
                data.push({key:key, value:value});
            }
            return data;
        }

};

