/**
 * 一些工具方法
 */
var fs = require('fs');
var path = require('path');

/**
 * 命令行运行
 *
 * @param  {Array}    list - command list
 * @param  {Function} done - task done callback
 * @return {void}
 */
exports.run = function (list, done) {
    require('child_process').exec(list.join(' && '),function (err,stdout,stderr) {
        var std, out;
        if (err){
            std = err;
            console.error(err);
        }else{
            if (stdout){
                out = stdout;
                console.log(stdout);
            }
            if (stderr){
                std = stderr;
                console.error(stderr);
            }
        }
        if (!!done){
            done(std,out);
        }
    });
};

/**
 * 遍历一个文件夹下的所有文件（包括子文件夹），返回文件列表
 *
 * @param {String}      dir
 * @param {Function}    callback
 * @returns {Array}
 */
exports.getAllFiles = function (dir, callback) {
    var fileList = [];
    
    (function walk(dirpath) {
        var reg = new RegExp(path.sep + '$', 'g');

        dirpath = reg.test(dirpath) ? dirpath : dirpath + path.sep;

        var dirList = fs.readdirSync(dirpath);

        dirList.forEach(function(item){
            // console.log('path.sep:' + path.sep);

            if(fs.statSync(dirpath + item).isDirectory()){
                walk(dirpath + item);
            }else{
                fileList.push(dirpath + item);
                callback && callback(dirpath + item);
            }
        });
    })(dir);
    
    return fileList;
}

/**
 * 判断一个文件夹是否存在（同步）
 *
 * @param {String}      dir
 * @returns {Boolean}
 */
exports.checkPathExist = function (dir) {
    try{
        fs.accessSync(dir, fs.F_OK);
    }catch(e){
        return false;
    }

    return true;
}

/**
 * 创建多级文件夹（同步）
 *
 * @param {String}      dirpath
 * @returns {void}
 */
exports.createPath = function (dirpath, mode) {
    if (!exports.checkPathExist(dirpath)) {
        var pathtmp;

        dirpath.split(path.sep).forEach(function(dirname) {
            if (!dirname) { 
                return;
            };

            if (pathtmp) {
                pathtmp = path.join(pathtmp, dirname);
            }else {
                pathtmp = dirname;
            }

            var reg = new RegExp('^' + path.sep, 'g');

            pathtmp = reg.test(pathtmp) ? pathtmp :  path.sep + pathtmp;

            if (!exports.checkPathExist(pathtmp)) {
                if (!fs.mkdirSync(pathtmp, mode)) {
                    return false;
                }
            }
        });
    }
}

/**
 * 拷贝一个文件夹下的所有文件（包括子文件夹）到指定目录（同步）
 *
 * @param {String}      dir
 * @param {String}      targetDir
 * @returns {void}
 */
exports.copyAllFiles = function (dir, targetDir) {
    exports.getAllFiles(dir, function(filePath){
        var filePathInDir = filePath.substr(filePath.indexOf(dir) + dir.length);
        // console.log('filePathInDir:' + filePathInDir);

        var targetFilePath = path.join(targetDir, filePathInDir);
        // console.log('targetFilePath:' + targetFilePath);
        
        exports.createPath(path.dirname(targetFilePath));

        fs.writeFileSync(targetFilePath, fs.readFileSync(filePath));
    });
}

/**
 * 遍历所有以.as为后缀名的源文件，针对不同的业务场景分别作处理
 *
 * @param {String}      filePath
 * @returns {void}
 */
exports.readAllFiles = (dir, handle) => {
    exports.getAllFiles(dir, (filePath) => {
        if(filePath.substr(-3) === '.as'){
            handle(filePath);
        }
    });
}

/**
 * 读取文件
 *
 * @param {String}      fileName
 * @param {String}      str
 * @returns {void}
 */
exports.readFile = (filePath) => fs.readFileSync(filePath,'utf8');

/**
 * 写入文件
 *
 * @param {String}      fileName
 * @param {String}      str
 * @returns {void}
 */
exports.writeFile = (fileName, str) => {
    fs.writeFileSync(fileName, str, 'utf8');
}

/**
 * 获取标记块的函数名
 * insert name=functionName
 * @param {String}      flag
 * @returns 标记块的函数名
 */
exports.getFlagName = (flag) => {
    var result = flag.match(/=.*\s/);

    if(!result){
        return null;
    }else{
        return result[0].slice(1).trim();
    }
}

/**
 * 获取随机插入的代码段
 * 
 * @param {}      source
 * @param {}      target
 * @returns 获取随机插入的代码段
 */
exports.randomInsert = (type, source, target, cb) => {
    var rest = Object.keys(source).filter(cb(target));
    var randomIndex = Math.floor(Math.random() * rest.length);
    var key = rest[randomIndex];

    target[key] = source[key];

    var result = source[key];

    return exports.getReplaceCode(type, result);
}

/**
 * 遍历播放器代码目录中的as3文件，查找标记，将标记替换为对应的代码段
 * @return {Void}         
 */
exports.replaceFlagCode = (type, filePath, reg, source, target, handle) => {
    var file = exports.readFile(filePath).split(/\r?\n/).join('\n');

    exports.writeFile(filePath, file.replace(reg, (code) => {
        var tFlag = exports.getFlagName(code);

        if(!tFlag){
            //随机插入
            return exports.randomInsert(type, source, target, handle);
        }else{
            if(source[tFlag]){
                target[tFlag] = source[tFlag];

                var result = source[tFlag];

                return exports.getReplaceCode(type, result);

            }else{
                return code;
            }
        }
    }));
}

/**
 * 获取替代的文本
 * @return {Void}         
 */
exports.getReplaceCode = (type, result) => {
    if(type == 'insert'){
        return result;
    }else if(type == 'run'){
        return (result || '').slice(result.indexOf("{") + 1, result.lastIndexOf("}"));
    }
}
