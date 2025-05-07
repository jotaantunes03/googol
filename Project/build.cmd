@echo off
echo Compilação iniciada...

cd src\main\java

javac -d ..\..\..\target\ ^
-cp ..\..\..\target\lib\jsoup-1.18.3.jar;..\..\..\target\lib\sqlite-jdbc-3.49.1.0.jar ^
search\*.java search\Sockets\*.java

cd ..\..\..

echo Compilação concluída.
