@echo off
chcp 65001 >nul
title Servidor de Etiquetas Yamaha
cls
echo ===================================================================
echo           INICIANDO SERVIDOR DE ETIQUETAS YAMAHA
echo ===================================================================
echo.

:: Descobre o IP local da máquina na rede
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4" ^| findstr /v "127.0.0.1"') do (
    set IP=%%a
    goto :ip_encontrado
)

:ip_encontrado
set IP=%IP: =%

echo Servidor ativo!
echo.
echo Link para voce acessar neste computador:
echo    http://localhost:8000
echo.
echo -------------------------------------------------------------------
echo LINK PARA COMPARTILHAR COM OUTRAS PESSOAS NA REDE YAMAHA:
echo    http://%IP%:8000
echo -------------------------------------------------------------------
echo.
echo Dica: Mantenha esta janela aberta enquanto as pessoas estiverem usando.
echo Para fechar o servidor, pressione Ctrl + C ou feche esta janela.
echo.

:: Abre o navegador automaticamente para o usuário
start http://localhost:8000

:: Inicia o servidor Python aceitando conexoes de outras maquinas (0.0.0.0)
python -m http.server 8000 --bind 0.0.0.0

pause
