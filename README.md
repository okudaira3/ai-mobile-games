# AI Mobile Games

広告で見かけたゲームを、広告なしでちゃんと遊べる形にしていくブラウザゲーム集です。現在は色ごとの水を試験管へ整理する **Water Sort Lab** を公開しています。

公開URL: https://okudaira3.github.io/ai-mobile-games/#/

## 開発

```bash
npm install
npm run dev
```

ローカルで公開版の挙動を確認するには、ビルド後に `npm run preview` を実行します。

```bash
npm run build
npm run preview
```

## ゲームを追加する

1. ゲームのReactコンポーネントを `src/games/<game-id>/` に追加します。
2. `src/data/games.js` にタイトル、説明、ハッシュルート、公開状態を登録します。
3. `src/App.jsx` で `#/ゲームID` を対応コンポーネントへ割り当てます。

ゲーム一覧は `src/data/games.js` に集約しているため、カード表示の追加は登録だけで行えます。

## 公開

`main` へのpushで GitHub Actions がビルドし、GitHub Pages にデプロイします。Viteのbaseはプロジェクトサイト用に `/ai-mobile-games/` を設定済みで、ハッシュルーティングを使うため直接アクセス時にも404になりません。
