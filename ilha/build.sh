#!/bin/sh
# Gera github-pages/index.html a partir de ilha-do-naufrago.html (a mesma página do artifact),
# acrescentando o cabeçalho de página completa e as metas para instalar no iPhone em tela cheia.
cd "$(dirname "$0")/.." || exit 1
{
  printf '<!doctype html>\n<html lang="pt-BR">\n'
  printf '<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">\n'
  printf '<meta name="apple-mobile-web-app-capable" content="yes">\n'
  printf '<meta name="mobile-web-app-capable" content="yes">\n'
  printf '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">\n'
  printf '<meta name="apple-mobile-web-app-title" content="Náufrago">\n'
  printf '<meta name="theme-color" content="#06222b">\n'
  printf '<link rel="manifest" href="manifest.webmanifest">\n'
  printf '<script src="config.js"></script>\n'
  cat ilha-do-naufrago.html
  printf '\n</html>\n'
} > github-pages/index.html
echo "github-pages/index.html gerado"
