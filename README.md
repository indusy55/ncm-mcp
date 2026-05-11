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
- `NCM_TOOL_MODE`：`readonly` / `authenticated` / `full`，默认 `readonly`
- `NCM_ENABLE_NCM_CALL`：是否启用 `ncm_call`，默认 `true`
- `NCM_ALLOW_COOKIE_AUTH`：是否允许每次请求透传 `cookie`，默认 `false`
- `NCM_ALLOW_NETWORK_OVERRIDES`：是否允许 `proxy` / `realIP` / `randomCNIP`，默认 `false`

## 安全默认值

默认配置就是面向公共服务的保守模式：

- 默认只开放只读工具
- 默认禁用登录、写操作类工具
- 默认不允许透传 `cookie`
- 默认不允许透传 `proxy`、`realIP`、`randomCNIP`

如果要开放登录但仍禁写，设置：

```bash
NCM_TOOL_MODE=authenticated
```

如果要开放写操作，再设置：

```bash
NCM_TOOL_MODE=full
```

## 暴露的 MCP tools

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
- `ncm_login_qr_key`：生成二维码登录 key
- `ncm_login_qr_create`：生成二维码登录内容
- `ncm_login_qr_check`：查询二维码登录状态
- `ncm_login_qr_start`：一步拿到二维码登录 key 和二维码内容
- `ncm_login_email`：邮箱登录
- `ncm_login_cellphone`：手机号登录
- `ncm_captcha_send`：发送手机验证码
- `ncm_captcha_verify`：校验手机验证码
- `ncm_cellphone_existence_check`：检查手机号是否存在
- `ncm_login_status`：获取当前登录状态
- `ncm_login_refresh`：刷新登录状态
- `ncm_logout`：退出当前登录
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

如果目标方法需要 `cookie`、`proxy`、`realIP`、`randomCNIP` 等参数，直接放在同一层即可。

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

如果是受信任的私有部署，再按需启用邮箱登录、手机号登录、`cookie` 透传。

## 验证说明

`pnpm verify:mcp` 会自动：

1. 启动本地 MCP 服务
2. 用 SDK 的 Streamable HTTP client 连接服务
3. 执行 `tools/list`
4. 执行一次 `ncm_search`

如果本机网络、代理或目标服务不可用，`tools/call` 可能返回目标接口错误，但这不代表 MCP 链路本身有问题。

## 暴露的 MCP resources

- `ncm://methods`：全部方法列表
- `ncm://methods/{name}`：单个方法信息
- `ncm://security`：当前安全策略
- `ncm://login-guide`：登录使用说明
