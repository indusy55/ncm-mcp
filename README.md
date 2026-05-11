# ncm-mcp

基于 `@modelcontextprotocol/sdk` 的 Streamable HTTP MCP，内部调用 `@neteasecloudmusicapienhanced/api`。

## 启动

```bash
pnpm install
pnpm dev
```

默认监听 `http://127.0.0.1:3000/mcp`。

本地验证：

```bash
pnpm verify:mcp
```

可用环境变量：

- `HOST`：默认 `127.0.0.1`
- `PORT`：默认 `3000`
- `NETEASE_COOKIE`：可选，服务启动时直接注入服务端登录态
- `NCM_ENABLE_LOGIN_BOOTSTRAP`：是否暴露二维码登录引导 tools，默认 `false`
- `NCM_ALLOW_AUTH_READS`：是否暴露“需要登录但不写入”的 tools，默认 `false`
- `NCM_ALLOW_WRITE_TOOLS`：是否暴露写操作 tools，默认 `false`
- `NCM_ENABLE_NCM_CALL`：是否启用 `ncm_call`，默认 `false`
- `NCM_ALLOW_COOKIE_AUTH`：是否允许每次请求透传 `cookie`，默认 `false`
- `NCM_ALLOW_NETWORK_OVERRIDES`：是否允许 `proxy` / `realIP` / `randomCNIP`，默认 `false`
- `NCM_ALLOWED_TOOLS`：可选，逗号分隔的 tool 白名单；配置后只注册名单内的 tool

## 安全默认值

默认配置就是面向公共服务的保守模式：

- 默认开放公开只读工具
- 默认不暴露二维码登录引导 tools
- 默认不暴露需要登录的只读 tools
- 默认不暴露写操作 tools
- 默认不暴露 `ncm_call`
- 默认不允许透传 `cookie`
- 默认不允许透传 `proxy`、`realIP`、`randomCNIP`

如果要开放二维码登录引导，但仍然不开放登录后的私有只读能力和写能力，设置：

```bash
NCM_ENABLE_LOGIN_BOOTSTRAP=true
```

如果要开放“需要登录的只读能力”，设置：

```bash
NCM_ALLOW_AUTH_READS=true
```

如果服务端已经有登录态，`NCM_ALLOW_AUTH_READS=true` 后会自动使用服务端会话，客户端不需要也拿不到 cookie。

如果要开放写操作，再设置：

```bash
NCM_ALLOW_WRITE_TOOLS=true
```

## MCP tools 暴露规则

服务启动时会按安全策略决定是否注册 tool：

- 始终注册公开只读工具
- `NCM_ENABLE_LOGIN_BOOTSTRAP=true` 且当前没有服务端会话：额外注册二维码登录引导 tools
- `NCM_ALLOW_AUTH_READS=true` 且当前有服务端会话：额外注册需要登录的只读 tools
- `NCM_ALLOW_WRITE_TOOLS=true` 且当前有服务端会话：额外注册写操作 tools
- `NCM_ENABLE_NCM_CALL=true`：额外注册 `ncm_call`
- `NCM_ALLOWED_TOOLS`：如果设置，只保留白名单中的 tool

下面是项目内已经实现的 tools，实际对外暴露以当前策略为准：

- `ncm_search`：搜索歌曲、专辑、歌手、歌单、歌词、MV、视频等
- `ncm_song_detail`：获取歌曲详情
- `ncm_song_url`：获取歌曲播放地址
- `ncm_lyric`：获取歌词
- `ncm_like_song`：喜欢 / 取消喜欢歌曲
- `ncm_liked_songs`：获取用户喜欢歌曲 ID 列表
- `ncm_playlist_detail`：获取歌单详情
- `ncm_playlist_create`：创建歌单
- `ncm_playlist_delete`：删除歌单
- `ncm_playlist_name_update`：修改歌单名称
- `ncm_playlist_desc_update`：修改歌单简介
- `ncm_playlist_order_update`：调整当前账户歌单顺序
- `ncm_playlist_subscribe`：收藏 / 取消收藏歌单
- `ncm_playlist_tracks`：获取歌单全部歌曲
- `ncm_playlist_track_add`：向歌单添加歌曲
- `ncm_playlist_track_delete`：从歌单删除歌曲
- `ncm_playlist_categories`：获取歌单分类
- `ncm_top_playlist`：按分类获取热门 / 最新歌单
- `ncm_top_playlist_highquality`：获取精品歌单
- `ncm_album_detail`：获取专辑详情
- `ncm_artist_detail`：获取歌手详情
- `ncm_artist_songs`：获取歌手歌曲
- `ncm_artist_albums`：获取歌手专辑
- `ncm_top_song`：获取新歌速递
- `ncm_mv_detail`：获取 MV 详情
- `ncm_mv_url`：获取 MV 播放地址
- `ncm_related_videos`：获取关联视频
- `ncm_similar_songs`：获取相似歌曲
- `ncm_similar_playlists`：获取相似歌单
- `ncm_similar_artists`：获取相似歌手
- `ncm_toplist`：获取榜单概览
- `ncm_toplist_detail`：获取榜单详情
- `ncm_recommended_playlists`：获取推荐歌单
- `ncm_recommended_songs`：获取每日推荐歌曲
- `ncm_login_qr_check`：查询二维码登录状态
- `ncm_login_qr_start`：一步拿到二维码登录 key 和二维码内容
- `ncm_user_account`：获取当前账户信息
- `ncm_user_detail`：获取指定用户详情
- `ncm_user_subcount`：获取当前账户收藏统计
- `ncm_user_playlists`：获取指定用户歌单
- `ncm_user_follows`：获取用户关注列表
- `ncm_user_followeds`：获取用户粉丝列表
- `ncm_user_record`：获取用户听歌记录
- `ncm_comment_music`：获取歌曲评论
- `ncm_comment_playlist`：获取歌单评论
- `ncm_comment_album`：获取专辑评论
- `ncm_comment_mv`：获取 MV 评论
- `ncm_comment_video`：获取视频评论
- `ncm_list_methods`：分页列出可调用方法和对应路由
- `ncm_describe_method`：查看单个方法信息
- `ncm_call`：调用一个网易云方法；除 `method` 外的字段会原样透传给目标方法

## 调用示例

调用 `cloudsearch`：

```json
{
  "method": "cloudsearch",
  "keywords": "周杰伦",
  "limit": 10,
  "offset": 0
}
```

调用 `song_url_v1`：

```json
{
  "method": "song_url_v1",
  "id": 33894312,
  "level": "standard"
}
```

调用强类型工具 `ncm_search`：

```json
{
  "keywords": "周杰伦",
  "type": "1",
  "limit": 10,
  "offset": 0
}
```

调用强类型工具 `ncm_song_url`：

```json
{
  "id": 33894312,
  "level": "standard"
}
```

如果要透传 `cookie`、`proxy`、`realIP`、`randomCNIP`，需要先在服务端显式打开对应环境变量；默认会被拒绝。公共服务更适合使用服务端会话，不要让客户端传 cookie。

## 返回结构

大部分强类型工具会同时返回两层结果：

- `content[0].text`：原始返回的 JSON 文本
- `structuredContent.result`：原始返回对象
- `structuredContent.data`：为常用字段整理过的结果，适合客户端直接消费

`ncm_call` 调用到已适配的方法时，也会自动补 `structuredContent.data`。

## 代码组织

工具代码已经按领域拆分到 `src/tools/`：

- `music-tools.ts`
- `playlist-tools.ts`
- `social-tools.ts`
- `auth-tools.ts`
- `normalizers.ts`
- `shared.ts`

## 登录建议

公共服务场景下，推荐优先使用二维码登录：

1. 读取 `ncm://login-guide`
2. 调用 `ncm_login_qr_start`
3. 轮询 `ncm_login_qr_check`
4. 登录成功后，cookie 只保存在服务端；登录引导 tools 会自动隐藏

如果服务启动时已经配置了 `NETEASE_COOKIE`，则不需要暴露登录引导 tools。

## 验证说明

`pnpm verify:mcp` 会自动：

1. 启动本地 MCP 服务
2. 用 SDK 的 Streamable HTTP client 连接服务
3. 执行 `tools/list`
4. 执行一次 `ncm_search`

如果本机网络、代理或目标服务不可用，`tools/call` 可能返回目标接口错误，但这不代表 MCP 链路本身有问题。

## 暴露的 MCP resources

- `ncm://methods`：当前策略允许的方法列表
- `ncm://methods/{name}`：单个方法信息
- `ncm://security`：当前安全策略
- `ncm://login-guide`：登录使用说明
