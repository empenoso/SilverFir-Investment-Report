#!/bin/bash
# $ sh nasdaqtraded.sh

echo -n '["' > nasdaqtraded.json
curl -o nasdaq.txt ftp://ftp.nasdaqtrader.com/symboldirectory/nasdaqtraded.txt
cat nasdaq.txt | grep -Eo '^\w\|\w*' | sed 's/^\w|//g' | sed 'H;1h;$!d;x;y/\n/,/' | sed 's/,/\",\"/g' >> nasdaqtraded.json
echo '"]' >> nasdaqtraded.json
sed -i ':a;N;$!ba;s/\n//' nasdaqtraded.json
rm nasdaq.txt