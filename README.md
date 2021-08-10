# eddi2voicevox

EDDIのspeechresponder.outを読み取り、VOICEVOXで読み上げます

## 使い方

1. [eddi2voicevoc.zip](https://github.com/heishi1HUMANITY/eddi2voicevox/releases)をダウンロードし、適当な場所に展開
2. 展開したファイルの「win64/eddi2voicevox.exe」を実行
3. 初回起動時には「config.jsonを～に作成しました」と表示されるはずです。また、speechresponder.outのファイルパスが正しいかを確認してください。
4. VOICEVOX、EDDI、Elite Dangerousを起動

## アンインストール

1. 展開したファイルを削除してください
2. C:/Users/[ユーザー名]/AppData/Roaming/eddi2voicevoxというフォルダができているはずなので、削除してください

## config.jsonについて

アプリを初回起動時、「C:/Users/[ユーザー名]/AppData/Roaming/eddi2voicevox」にconfig.jsonが作成されます。  
config.jsonには以下のデータが保存されています。

```json
{
  "path": "",           // <= speechresponder.outのパス 
  "translation": true,　// <= 翻訳機能を使用するか
                        //    (trueの場合でも、EDDIの出力文の先頭に
                        //    「*//」がついていれば翻訳しません)
  "skip": [
    "word"
  ],                    // <= 読み飛ばす単語
  "dict": {
    "key": "読み"
  }                     // <= 単語と読みを設定できます、
                        //    文章内のkeyにマッチするところを読みに置き換えます
}
```

pathとdictはアプリ内で変更できます。
