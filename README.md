# Space KTV 小游戏合集

Space Karaoke Bar & Cafe（德州 Plano）网站上的网页小游戏。全部是单页 HTML，不需要编译，直接用浏览器打开就能玩。

在线试玩：<https://spacektv.net/game.html>

| 游戏 | 文件 | 简介 |
|---|---|---|
| 游戏大厅 | `game.html` | 所有游戏的入口和人物图鉴 |
| 兄弟自走棋 | `autochess.html` | 2.5D 自走棋：鸡尾酒道具、海克斯、7 个首领、三档难度、四星、存档槽 |
| Space 谜案 | `whodunit.html` | 推理数独，按线索排出谁是凶手 |
| Space 夜调 | `bartender.html` | 视觉小说 + 酒桌卡牌对决 |
| 剧本杀·集卡闯关 | `jbs-game.html` | 收集剧本杀角色卡、3×3 布阵闯关 |
| SPACE 保卫战 | `fps.html` | 第一人称射击，守住店面 |
| Space Mic Flapper | `ktvgame.html` | 点按飞行小游戏 |

## 本地运行

在这个文件夹里起一个静态服务器，例如：

```
npx serve .
```

然后打开 `http://localhost:3000/game.html`。

## 存档

谜案、夜调、自走棋共用一个账号（只输名字，不用密码），进度存在浏览器里，登录后同步到云端存档服务。

自走棋加 `?debug=1` 可以打开调试接口（`window.__AC`）。
