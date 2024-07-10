# 準備

Lambdaレイヤーについては知っている前提。以下の2つのレイヤーを追加すること。

## 軽量Chromeレイヤーの追加

https://github.com/shelfio/chrome-aws-lambda-layer
から `arn:aws:lambda:ap-northeast-1:764866452798:layer:chrome-aws-lambda:45` などのARNで指定

## 日本語レイヤーの追加

`./fonts` の中身を圧縮して zip を解凍した際に `./fonts` ディレクトリが存在するようにしておく。今の中身は https://github.com/minoryorg/Noto-Sans-CJK-JP/tree/master/fonts から取得したものなので、必要なら最新版で置き換えたり、不要なファイルを削除したりする。

出来上がった zip を Lambda レイヤーとしてアップロードして利用する。

このレイヤーは、 `/opt/.fonts` にファイルをアップロードすることに注意（この辺りがバージョンによって違う様子で様々な情報が世間で錯綜している）

# リクエスト・レスポンス

例えばこんな感じ。content の内容がPDFに変換される。fontを指定しておけば日本語も対応できる。

リクエスト例

```
{
  "bucket": "ms2sato-test-pdf-store",
  "key": "mydir/debug1.pdf",
  "content": "\n    <html>\n      <head>\n        <meta charset=\"utf-8\">\n  <style>@font-face {font-family: 'NotoSansJP';src: url('/opt/.fonts/NotoSansJP-Regular.woff') format(\"woff\");} \n @font-face {font-family: 'NotoSansJP'; font-weight: bold; src: url('/opt/.fonts/NotoSansJP-Bold.woff') format(\"woff\");} \nbody {font-family: 'NotoSansJP', sans-serif;}</style>    </head>\n      <body>\n        <h1>[1]test:日本語:Your awesome PDF report template</h1>\n        <h2 class=\"title\">title</h2>\n      </body>\n    </html>",
  "option": {
    "pdf": {
      "format": "A4",
      "printBackground": true,
      "margin": {
        "top": 20,
        "left": 20,
        "right": 20,
        "bottom": 20
      },
      "displayHeaderFooter": true
    },
    "signedUrl": {
      "expiresIn": "3600"
    }
  }
}
```

レスポンス例

```
{
  "statusCode": 200,
  "body": "{\"key\":\"mydir/debug1.pdf\",\"bucket\":\"ms2sato-test-pdf-store\",\"signedUrl\":\"https://ms2sato-test-pdf-store.s3.ap-northeast-1.amazonaws.com/mydir/debug1.pdf?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIA4XHSGQIOTWIZYWDI%2F20240710%2Fap-northeast-1%2Fs3%2Faws4_request&X-Amz-Date=20240710T010424Z&X-Amz-Expires=3600&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEHEaDmFwLW5vcnRoZWFzdC0xIkcwRQIgcXa6cvHZx0D7NJ%2FvIAqmJm2Zb9SYOLoop%2BT1y0yO17ACIQDpir92U4ZHNfnLbmmJgWL4VcO419yYsG1FsTj7mlsiGCq0Awg6EAAaDDg3NDUzMzc4MjA0NSIMobS0tsOSMLxvea9zKpED5j%2BUPf6tIm6%2Fe9X5%2FZbjQD%2Fam%2Flu0XXTnv7deDao2hhMkOscQACMzlBXrrxa0LKVQ31KXY4WDuUIq9KeozfXPEXTuiAD%2Bx62G54I3L5bvnbxt04198TvIi6w78Hy6i%2Fec%2BJL6s8YRoyANopRrmTxGYoJermqu%2FVW88lWHl%2FQyJtvP6Ovry2AlZvFOcy9DDftJvNu5tIY0beQca9zE9nSYM4EuY8tTLl6OaNXHKWwnhC4G%2B3GNWo9XFEmxaqek5Z%2BaqL2B6veGMbHGzsai07fXXB6VeawFMcDhrusf%2Bk%2F2BuJpDYe%2BEGQMp%2B56nRTz0Kx63CRnAoFdeBII6cA5SmkXBogklpQ%2BdY9kHj9%2FlWj9NE%2FP5QsrXF%2FB5myd%2FOePX62mjipbs3D8JCZKafDET85HS2e0Iwb37B442HOkNClZ67Kd2Eh0lh0gyIdFam81O%2FYrBIXg3cmFVNl1%2ByB3JLxtIxU1362oAxcq7vf8F%2FyHIERYnkCzjZkk%2BldSPsB1r61D%2FIy9qNoA8Cfp8Uh9nNexRMwkLy3tAY6ngFlAaeG0l6fu9tNOM9M5tr64zKTFneaLVx9Up%2BLw96ODeOc2y8KXbycXOO2YlZAqYPu4yLwyM0olbfrkGi1Bzskg1XHEg6dYNGOR03Vwu7tpHVC3wZBZZT0tvKoEPryIi3oiLc752H5gsunk5QZPowGZIXWnihBWUFD6l1Jqxf%2B%2BC3tXDr4P1ulrp%2FFgcw8apD%2FmzJzwnbmjkeue%2BXGgg%3D%3D&X-Amz-Signature=0689d90d4e9593c00c5c3f9e08a2876e1032733b0ee87ab6d59d2cc2867dc66e&X-Amz-SignedHeaders=host&x-id=GetObject\"}"
}
```

# 内部動作のメモ

フォントを利用する場所を環境変数で指定すること。この時、アップロードされているフォントディレクトリを選択する。アップロードするフォントディレクトリの名前（ここでは `.fonts`）を変えたらここも変える必要があることに注意。

```
process.env.FONTCONFIG_PATH = '/opt/.fonts';
```

この内容も参考にすると良い
https://github.com/alixaxel/chrome-aws-lambda/issues/246#issuecomment-1205412171
