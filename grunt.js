module.exports = function(grunt) {

    //
    // Creates a list of files, ensuring offstores.js is first in the list
    //
    var files = grunt.file.expandFiles("src/*.js");
    var firstFileRE = new RegExp(".*offstores.js$");
    files.sort(function(a,b){ return (/src\/offstores.js$/.test(a.toString()))?-1:1; });
    console.log("FILES: " + files);

    function calcBuildDate(){
        function pad(n){return n<10 ? '0'+n : n;}
        var d = new Date();
        console.log(d + " : " + d.getUTCFullYear() + " / " + d.getUTCMonth());
        return d.getUTCFullYear().toString() + pad(d.getUTCMonth()+1).toString() + pad(d.getUTCDate()).toString();
    }

    // Project configuration.
    grunt.initConfig({

        meta: {
          banner: grunt.file.read('license.js')
        },
        concat: {
            dist: {
                src: files,
                dest: 'dist/offstores.'+calcBuildDate()+'.js'
            }
        },

        lint: {
            all: ['grunt.js', 'src/*.js', 'test/*.js']
        },
        jshint: {
            options: {
                browser: true
            }
        },
        qunit: {
          files: ['tests/**/*.html']
        },
         min: {
              dist: {
                src: ['<banner:meta.banner>', '<config:concat.dist.dest>'],
                dest: 'dist/offstores.min.'+ calcBuildDate() +'.js'
              }
            }
    });

    // Default task.
    grunt.registerTask('default', 'lint concat min');
};
