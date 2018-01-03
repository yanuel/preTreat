var util = require('./util.js')
var pathConfig = require('../config/pathConfig.js')

/**
 * pretreat as3 code 
 * 预处理的流程：
 * 		1. 拷贝播放器代码到指定目录
 * 		2. 遍历本工程的src中的as3文件，读取可用于替换标记的代码段，并保存在内存
 * 		3. 遍历播放器代码目录中的as3文件，查找标记，将标记替换为对应的代码段
 *
 * 代码插入的方式
 * 1. 插入整个可以执行的语句
 * 2. 在一个类里面插入方法的声明，再插入执行的语句
 * 3. 对于整个类的拆分，先定义一个配置，里面需要配置内部方法的引用关系和插入的外部类等
 * 		
 * 标签的类型
 * read
 * insert
 * run: /* run: if(!this.isStudyDomain()){ return } 
 * import: import 所有涉及的外部类 
 *
 * 
 */

var codeBlockMap = {};
var insertBlockMap = {};
var runBlockMap = {};

/**
 * 拷贝播放器代码
 * @return {Void}         
 */
function copyPlayerCodeToTemp () {
	console.log('copy player code to project, from path:' + pathConfig.source_from_path + ', to path:' + pathConfig.source_path);
	util.copyAllFiles(pathConfig.source_from_path, pathConfig.source_path);	
}

/**
 * 读取可用于替换标记的read代码段,并缓存到map
 * @return {Void}         
 */  
function readCodeBlocks () {
	console.log('start read code blocks in source path:' + pathConfig.codeblock_source_path);

	var startReg = /\/\*\s*read\s*name\s*=.*\/$/;
    var endReg = /\/\*\s*read\s*end.*\//;

    util.readAllFiles(pathConfig.codeblock_source_path, (filePath) => {

    	util.readFile(filePath).split(/\r?\n/).forEach((line, index, file) => {
    		var codeBlock = [];
    		if(startReg.test(line)){
	    		var sFlag = util.getFlagName(line);

				for(var i = index + 1; i < file.length; i++){
					if(endReg.test(file[i])){
						break;
					}

					codeBlock.push(file[i]);
				}

				codeBlockMap[sFlag] = codeBlock.join('\n').trim();
    		}
    	});

    });

    util.readAllFiles(pathConfig.source_path, (filePath) => {
    	resetMap();
    	replaceInsertFlagCode(filePath);
    	replaceRunFlagCode(filePath);
    });
}

/**
 * 替换insert标签
 * @return {Void}         
 */ 
function replaceInsertFlagCode (filePath) {
	var insertRegWithName = /\/\*\s*insert\s*name.*\//g;
	var insertReg = /\/\*\s*insert\s*.*\//g;
	var handle = (target) => {
		return (key) => {
			return Object.keys(target).indexOf(key) === -1;
		};
	};

	/*先替换带name的,再替换不带name的。不然如果先随机替换不带name的，剩下带name的有可能就会存在重名，导致编译失败*/
	util.replaceFlagCode('insert', filePath, insertRegWithName, codeBlockMap, insertBlockMap, handle);
	util.replaceFlagCode('insert', filePath, insertReg, codeBlockMap, insertBlockMap, handle);
}

/**
 * 替换run标签
 * @return {Void}         
 */ 
function replaceRunFlagCode (filePath) {
	var runReg = /\/\*\s*run\s*.*\//g;
	var handle = () => {
		return (key) => {
			return !0;
		};
	};

	util.replaceFlagCode('run', filePath, runReg, insertBlockMap, runBlockMap, handle);
}

/**
 * 清空map
 * @return {Void}         
 */ 
function resetMap (){
	insertBlockMap = {};
	runBlockMap = {};
}

/**
 * 代码的主入口
 * @return {Void}         
 */
function main () {
	copyPlayerCodeToTemp();
	readCodeBlocks();
}
main();
