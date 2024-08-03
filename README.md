# 準備

## 開発環境
今の所 Docker 内で開発しているので以下の流れです。

### 環境変数の設定

```
$ cp .env.sample .env
```

.env ファイルの環境変数を入れてください。

```terminal
$ docker-compose run app bash
> cd pdfgen
> sam build
> sam deploy
```

開発中は `build` `deploy` よりも `sam sync --watch` が便利です。

## AWS上のLambda関数の設定

### 一般設定
- [必須]作成されたLambda関数のロールに対してS3アクセスできるように設定
- タイムアウト（3分とかにしたほうがいい）
- メモリの調整（6000MB等。最低でも1024MB以上推奨）

### 環境変数
[必須]S3へのアップ先のバケット名を環境変数で指定すること。画面としてはGUIなので、以下の意味合いになる設定を書く。

```
AWS_S3_BUCKET=ms2sato-test-pdf-store # simple bucket name
AWS_S3_BUCKET=ms2sato-test-pdf-store,pdf-test2 # multiple bucket names
```

# リクエスト・レスポンス

例えばこんな感じ。content の内容がPDFに変換される。明示的なfont指定がない場合にも、日本語はfallbackされて表示できるはず。

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
    "s3": {
        "ContentDisposition": "inline;filename=PDFDLTest"
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
  "key": "mydir/debug1.pdf",
  "bucket": "ms2sato-test-pdf-store",
  "signedUrl": "https://ms2sato-test-pdf-store.s3.ap-northeast-1.amazonaws.com/mydir/debug1.pdf?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIA4XHSGQIO22NSCQGP%2F20240712%2Fap-northeast-1%2Fs3%2Faws4_request&X-Amz-Date=20240712T060030Z&X-Amz-Expires=3600&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEKb%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaDmFwLW5vcnRoZWFzdC0xIkgwRgIhAKbIQJ9INfHYSQ6FTaPIDNEOGOpR3uAL4n8C27yQeiXJAiEAy8ctFWZiIVQsAfGjaBBhOdu15wlQDnmOzcUiMCXL%2Fs8qigMIbxAAGgw4NzQ1MzM3ODIwNDUiDGbX8qr2VXBLEiuqyyrnAlfV9JSth%2BYQHnwDY9XttAEnMZF3yw%2F3jnN%2BmEdNRrGJkjDeV9DVHqlVTc9Z3cJQgpGK9v%2BL1lo7%2BOyPj9k3XK7oRywPB7OhkK2yJHfy9KtVqbXtjHJqpOr0Ds9cPAg8mdkBhhZQMYtuusKTc3KbzDqfgyCvkqJPH%2BDOHD5%2BrSg1lnVSszYR%2BHfcajFyZwqy8RROIZAdiJHJ3paJVVw%2B3z%2BMliszabfoiQux%2FuuQDiWJfLyafxbFH6p8doc0SmkLc9VbNZT44hPCak%2BKK6c4Bbc38fsSusatgTCgfIwSP7yKVX04gH6TOiWXaE7gESWrkP7tyCcEggZD7niIiZMbxtHVo7Y7L0tjp0lc106Zl4CsK6SxCFJDzc0pbmJSE%2Bb5StPc3s4leU6%2FB7OtDbK5JgPn8O1jRknXonYYqcfznNP5uRUirc9CPIo38kXy05wPOZv%2BD4obabA0AUnAJHheYtNlWl91gQ7YMPeMw7QGOpwBj%2BXk7mqhyi0rHmEQO1IO%2BHsEg%2B3SJi9%2Fy2Vkfo6P9vOuzSnIyCNnv4%2BMyOxldRuWzCHDdI%2BuwQIPJxBgNDzcEnoUmRFue0%2FddVChmSvfzG%2BA1HPU46pNOYf7HukZwsx4kqZTOMuGJuhwUyU6PyLShrnxuv3d1xnajXMxQQnElEOX0MmU7VjLp3Ce1OfYmH8sTdc%2F6O85b5zaIE08&X-Amz-Signature=32599e83b25e777927f76a61214b408414aea6972536db9e1f7a5c18d15d527b&X-Amz-SignedHeaders=host&x-id=GetObject"
}
```

# 内部動作のメモ

フォントを利用する場所を環境変数で指定すること。この時、アップロードされているフォントディレクトリを選択する。アップロードするフォントディレクトリの名前（ここでは `.fonts`）を変えたらここも変える必要があることに注意。

```
process.env.FONTCONFIG_PATH = '/opt/.fonts';
```

この内容も参考にすると良い
https://github.com/alixaxel/chrome-aws-lambda/issues/246#issuecomment-1205412171


## レイヤー

Lambdaレイヤーについては知っている前提。以下の2つのレイヤーが追加される。

### 軽量Chromeレイヤーの追加

https://github.com/shelfio/chrome-aws-lambda-layer
から `arn:aws:lambda:ap-northeast-1:764866452798:layer:chrome-aws-lambda:45` などのARNで指定

### 日本語レイヤーの追加

`pdfgen/fonts_layer/.fonts` の中身が自動的にFontsLayerとして作成される。今の中身は https://github.com/minoryorg/Noto-Sans-CJK-JP/tree/master/fonts から取得したものなので、必要なら最新版で置き換えたり、不要なファイルを削除したりする。

レイヤーは `/opt/.fonts` にファイルを配置するすることに注意（この辺りがバージョンによって違う様子で様々な情報が世間で錯綜している）
