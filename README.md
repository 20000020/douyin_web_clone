## 项目结构（精简清晰版）

这是一个纯前端离线 H5 工程（无后端依赖），可直接用于 GitHub Pages / 任意静态托管。

```text
douyin_web_clone/
├─ index.html              # 入口：抖音推荐流（上下刷视频 + 机位打卡卡片 + 抖音卡片）
├─ bars.html               # 机位打卡页面（地图 + 下拉抽屉视频）
├─ css/
│  └─ style.css            # 入口页样式
├─ js/
│  └─ app.js               # 入口页交互（视频懒加载/封面抽帧/点赞/评论弹层等）
├─ assets/                 # 入口页通用资源
│  ├─ dy_icons/            # UI 图标（点赞/评论/分享等）
│  ├─ *.mp4                # 视频资源（u*/lwh*/jzh*）
│  └─ *.jpg/*.jpeg/*.svg   # 封面/背景等
└─ pages/
   └─ douyin/
      ├─ index.html         # “输入城市 → 城市风景 / 调色成片”左右切换卡片（iframe 内页）
      ├─ css/style.css
      ├─ js/app.js
      └─ assets/            # 该卡片自身资源（城市照片/图标/背景等）
```

### 入口关系

- `index.html` 会通过 iframe 加载：`pages/douyin/index.html`
- `bars.html` 作为推荐流中的一条卡片（同样用 iframe 承载）

### 发布到 GitHub Pages 的注意点

1. 仓库根目录必须直接包含 `index.html`
2. 所有资源都使用相对路径（本项目已满足）
