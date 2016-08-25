#!/bin/bash

# 去除重复包
## 判断文件是否存在
[ ! -d "./node_modules" ] && { echo "gs项目未安装"; exit 1; }
[ ! -d "../gstation-script/node_modules" ] && { echo "script项目未安装"; exit 1; }
[ ! -d "../gstation-web/node_modules" ] && { echo "web项目未安装"; exit 1; }
echo "==项目检查完毕=="

echo "此脚本可能会删除.git, 如果不制作运行纯净包, 请注释相关语句再执行"

read -p "Do you want to continue?" -n 1 continue
case $continue in
    Y | y)
        echo -e "\n您选择继续运行";;
    *)
        echo -e "\n脚本退出"; exit 0;;
esac

echo "==开始处理重复包=="

## 使用"npm ddp "先处理下三个项目下的重复
npm ddp
cd ../gstation-script; npm ddp
cd ../gstation-web; npm ddp
cd ../gstation;

## gstation script web 三项目同级目录下创建文件夹node_modules
## 执行了npm ddp之后, 同级目录下的包可能相关联,
## 所以这里改成把所有包都移动同一个node_modules文件夹里
new_path="../node_modules/"
mkdir $new_path


find node_modules/*  -maxdepth 0 | xargs  mv -t $new_path 
rm -r node_modules
echo "moved gstation"

cd ../gstation-script
find node_modules/* -maxdepth 0 | xargs mv -t $new_path -n # -n 重复包不复制,注意此操作未判断版本号是否相同
rm -r node_modules
echo "moved gstation-script"

cd ../gstation-web
find node_modules/* -maxdepth 0 | xargs mv -t $new_path -n
rm -r node_modules
echo "moved gstation-web"

cd ../gstation

echo "==重复包处理完毕==" 



# 去除包无用文件
echo "==开始去除无用文件=="

## 注意部分obj.target文件夹不能删掉, 所以下面会单独列出删掉


rm -r ../node_modules/serialport/build/Release
rm -r ../node_modules/serialport/src
echo "serialport done"

rm -r ../node_modules/zmq/windows
rm -r ../node_modules/zmq/examples
rm -r ../node_modules/zmq/docs
echo "zmq done"


rm -r ../node_modules/moment/min
rm  ../node_modules/moment/*.log
echo "moment done"

rm ../node_modules/lodash/lodash.js
rm ../node_modules/lodash/dist/lodash.compat.*
rm ../node_modules/lodash/dist/lodash.underscore.*
rm ../node_modules/lodash/dist/lodash.min.js
echo "lodash done"

rm -r ../node_modules/buffertools/build/Release/obj.target
rm -r ../node_modules/buffertools/build/Release/.deps
echo "buffertools done"

rm -r ../node_modules/iconv/deps
rm -r ../node_modules/iconv/build/Release/obj.target
rm -r ../node_modules/iconv/build/Release/.deps
echo "iconv done"

rm -r ../node_modules/msgpack/deps
rm -r ../node_modules/msgpack/build/Release/obj.target
echo "msgpack done"

rm -r ../node_modules/socket.io/node_modules/ws/build/Release/obj.target
echo "ws done"

rm -r ../node_modules/less-middleware/node_modules/less/benchmark
rm -r ../node_modules/less-middleware/node_modules/less/dist
echo "less done"


# remove *.md files
find ../node_modules -name "*.md" | xargs rm
echo "removed *.md"

find ../node_modules -type d -name "example*" | xargs rm -r
echo "removed examples"

find ../node_modules -type d -name "docs" | xargs rm -r
echo "removed docs"


find ../node_modules -type d -name ".deps" | xargs rm -r
echo "removed .deps"

find ../node_modules -type d -name "test*" | xargs rm -r
find ../node_modules -type d -name "tst" | xargs rm -r
echo "removed tests"

find ../node_modules -type d -name "benchmark*" | xargs rm -r

find ../node_modules -iname "license*" | xargs rm 
find ../node_modules -iname "licence" | xargs rm
echo "removed license*"

find ../node_modules -name "Makefile" | xargs rm
echo "removed Makefile"

find ../node_modules -name ".*ignore" | xargs rm
echo "removed .*ignore"

find ../node_modules -iname "readme*" | xargs rm
echo "removed readme*"

find ../node_modules -name ".travis.yml" | xargs  rm
echo "remvoed .travis.yml"

echo "==去除无用文件结束=="

## 打包时忽略 .git 目录即可.
# 去除.git
#echo "remove .git"
#rm -r ./.git
#rm -r ../gstation-script/.git
#rm -r ../gstation-web/.git
#rm -r ../hw/hwtest/.git
#echo ".git  done"

# 移动 DEVICE-CONFIG 目录到 ../hw
mkdir -p ../hw
mv DEVICE-CONFIG ../hw/
echo "移动 DEVICE-CONFIG"




