# 16bit Camera

PCやスマホのインカメラの画像を16bit風に変換し画面に表示するWebアプリケーションです。

## 特徴

- PCやスマホのフロントカメラにアクセス
- リアルタイムで16bit風の映像効果を適用
- レスポンシブデザインでさまざまなデバイスに対応
- Next.jsで構築されたモダンなWebアプリケーション

## セットアップ方法

```bash
# リポジトリをクローン
git clone https://github.com/yourusername/16bit-camera.git
cd 16bit-camera

# 依存関係をインストール
npm install

# 開発サーバーを起動
npm run dev
```

その後、ブラウザで http://localhost:3000 にアクセスして、アプリケーションを使用できます。

## 使用方法

1. アプリにアクセスするとカメラの許可を求められます
2. 許可するとフロントカメラの映像が16bit風に変換されて表示されます
3. 「カメラを停止」ボタンでカメラを停止できます

## 技術スタック

- Next.js
- React
- HTML5 Canvas API
- MediaDevices API

## 注意事項

- カメラを使用するためには、HTTPSまたはlocalhostでの実行が必要です
- すべてのブラウザでカメラが動作するわけではありません（特にiOSのSafariでは制限があります）

## ライセンス

ISC