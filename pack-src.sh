#!/usr/bin/env bash

# 一時ディレクトリを作成
tempdir=$(mktemp -d /tmp/project.XXXXXX)

# rsync を使用してファイルをコピー
rsync -av --exclude='.git' --exclude-from='.gitignore' ./ "$tempdir/"

# 一時ディレクトリに移動
cd "$tempdir"

# 一時ディレクトリ内の内容を zip 形式で圧縮
zip -r project.zip .

# 圧縮ファイルを実行したディレクトリに移動
mv project.zip "$OLDPWD"

# 元のディレクトリに戻る
cd -

# 一時ディレクトリを削除
rm -rf "$tempdir"

echo "圧縮が完了しました: project.zip"
