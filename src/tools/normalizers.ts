import type { ResultNormalizer, UnknownRecord } from './shared.js';
import { asArray, asRecord, getBody, pick } from './shared.js';

export function mapArtists(value: unknown): unknown[] {
  return asArray(value).map((item) => {
    const artist = asRecord(item);

    return {
      id: artist?.id,
      name: artist?.name,
    };
  });
}

export function normalizeSong(item: unknown): UnknownRecord {
  const song = asRecord(item) ?? {};
  const album = asRecord(song.al) ?? asRecord(song.album);

  return {
    id: song.id,
    name: song.name,
    artists: mapArtists(song.ar ?? song.artists),
    album: album
      ? {
          id: album.id,
          name: album.name,
          picUrl: album.picUrl,
        }
      : undefined,
    durationMs: song.dt ?? song.duration,
    mvId: song.mv,
  };
}

export function normalizePlaylist(item: unknown): UnknownRecord {
  const playlist = asRecord(item) ?? {};
  const creator = asRecord(playlist.creator);

  return {
    id: playlist.id,
    name: playlist.name,
    trackCount: playlist.trackCount,
    playCount: playlist.playCount,
    coverImgUrl: playlist.coverImgUrl,
    creator: creator
      ? {
          userId: creator.userId,
          nickname: creator.nickname,
        }
      : undefined,
  };
}

export function normalizeAlbum(item: unknown): UnknownRecord {
  const album = asRecord(item) ?? {};
  const artist = asRecord(album.artist);

  return {
    id: album.id,
    name: album.name,
    picUrl: album.picUrl,
    size: album.size,
    publishTime: album.publishTime,
    artist: artist
      ? {
          id: artist.id,
          name: artist.name,
        }
      : undefined,
    artists: mapArtists(album.artists),
  };
}

export function normalizeArtist(item: unknown): UnknownRecord {
  const artist = asRecord(item) ?? {};

  return {
    id: artist.id,
    name: artist.name,
    picUrl: artist.picUrl,
    cover: artist.cover,
    alias: asArray(artist.alias),
    musicSize: artist.musicSize,
    albumSize: artist.albumSize,
    mvSize: artist.mvSize,
  };
}

export function normalizeMv(item: unknown): UnknownRecord {
  const mv = asRecord(item) ?? {};

  return {
    id: mv.id ?? mv.vid,
    name: mv.name ?? mv.title,
    cover: mv.cover ?? mv.imgurl16v9 ?? mv.coverUrl,
    playCount: mv.playCount,
    durationMs: mv.duration,
    artistName: mv.artistName,
    artists: mapArtists(mv.artists),
  };
}

export function normalizeUser(item: unknown): UnknownRecord {
  const user = asRecord(item) ?? {};

  return {
    userId: user.userId ?? user.uid,
    nickname: user.nickname,
    avatarUrl: user.avatarUrl,
    signature: user.signature,
    follows: user.follows,
    followeds: user.followeds,
    playlistCount: user.playlistCount,
    eventCount: user.eventCount,
  };
}

export function normalizeComment(item: unknown): UnknownRecord {
  const comment = asRecord(item) ?? {};
  const user = asRecord(comment.user);

  return {
    commentId: comment.commentId,
    content: comment.content,
    time: comment.time,
    likedCount: comment.likedCount,
    replyCount: comment.replyCount,
    user: user
      ? {
          userId: user.userId,
          nickname: user.nickname,
          avatarUrl: user.avatarUrl,
        }
      : undefined,
  };
}

export function normalizeVideo(item: unknown): UnknownRecord {
  const video = asRecord(item) ?? {};

  return {
    id: video.vid ?? video.id,
    title: video.title ?? video.name,
    coverUrl: video.coverUrl ?? video.cover,
    durationMs: video.durationms ?? video.duration,
    playTime: video.playTime,
    creator: asArray(video.creator).map(normalizeUser),
  };
}

export function buildListData(
  items: unknown[],
  mapper: (item: unknown) => UnknownRecord,
  extras?: UnknownRecord,
): UnknownRecord {
  return {
    count: items.length,
    items: items.map(mapper),
    ...extras,
  };
}

export function normalizeSearchResult(
  result: unknown,
  params: UnknownRecord,
): UnknownRecord {
  const body = getBody(result);
  const search = asRecord(body.result) ?? {};
  const type = params.type;

  const config = {
    '1': { key: 'songs', mapper: normalizeSong },
    '10': { key: 'albums', mapper: normalizeAlbum },
    '100': { key: 'artists', mapper: normalizeArtist },
    '1000': { key: 'playlists', mapper: normalizePlaylist },
    '1002': { key: 'userprofiles', mapper: normalizeUser },
    '1004': { key: 'mvs', mapper: normalizeMv },
    '1009': { key: 'djRadios', mapper: (item: unknown) => asRecord(item) ?? {} },
    '1014': { key: 'videos', mapper: normalizeVideo },
    '1018': { key: 'song', mapper: normalizeSong },
  } as const;

  const selected =
    typeof type === 'string' ? config[type as keyof typeof config] : undefined;

  if (!selected) {
    return {
      type,
      result: search,
    };
  }

  const items = asArray(search[selected.key]);

  return buildListData(items, selected.mapper, {
    type,
    hasMore: body.hasMore ?? search.hasMore,
  });
}

export function normalizeSongDetailResult(result: unknown): UnknownRecord {
  const body = getBody(result);
  return buildListData(asArray(body.songs), normalizeSong, {
    privileges: asArray(body.privileges),
  });
}

export function normalizeSongUrlResult(result: unknown): UnknownRecord {
  const body = getBody(result);
  return buildListData(asArray(body.data), (item) => {
    const entry = asRecord(item) ?? {};
    return pick(entry, [
      'id',
      'url',
      'br',
      'size',
      'md5',
      'type',
      'level',
      'encodeType',
      'freeTrialInfo',
    ] as const);
  });
}

export function normalizeLyricResult(result: unknown): UnknownRecord {
  const body = getBody(result);
  return {
    id: body.sgid ?? body.songId,
    lyric: asRecord(body.lrc)?.lyric,
    translatedLyric: asRecord(body.tlyric)?.lyric,
    romanLyric: asRecord(body.romalrc)?.lyric,
  };
}

export function normalizePlaylistDetailResult(result: unknown): UnknownRecord {
  const body = getBody(result);
  const playlist = asRecord(body.playlist) ?? {};
  return {
    playlist: normalizePlaylist(playlist),
    description: playlist.description,
    tags: asArray(playlist.tags),
    tracks: asArray(playlist.tracks).map(normalizeSong),
  };
}

export function normalizePlaylistTracksResult(result: unknown): UnknownRecord {
  const body = getBody(result);
  return buildListData(asArray(body.songs), normalizeSong, {
    playlist: asRecord(body.playlist)
      ? normalizePlaylist(body.playlist)
      : undefined,
  });
}

export function normalizePlaylistCategoriesResult(result: unknown): UnknownRecord {
  const body = getBody(result);
  return {
    categories: asRecord(body.categories) ?? {},
    sub: asArray(body.sub),
    all: asRecord(body.all) ?? undefined,
  };
}

export function normalizePlaylistListResult(result: unknown): UnknownRecord {
  const body = getBody(result);
  return buildListData(asArray(body.playlists), normalizePlaylist, {
    more: body.more,
    total: body.total,
  });
}

export function normalizeAlbumDetailResult(result: unknown): UnknownRecord {
  const body = getBody(result);
  return {
    album: normalizeAlbum(body.album),
    songs: asArray(body.songs).map(normalizeSong),
  };
}

export function normalizeArtistDetailResult(result: unknown): UnknownRecord {
  const body = getBody(result);
  return {
    artist: normalizeArtist(body.data),
    user: asRecord(body.user) ? normalizeUser(body.user) : undefined,
    hotSongs: asArray(body.hotSongs).map(normalizeSong),
  };
}

export function normalizeArtistSongsResult(result: unknown): UnknownRecord {
  const body = getBody(result);
  return buildListData(asArray(body.songs), normalizeSong, {
    more: body.more,
    total: body.total,
  });
}

export function normalizeArtistAlbumsResult(result: unknown): UnknownRecord {
  const body = getBody(result);
  return buildListData(asArray(body.hotAlbums), normalizeAlbum, {
    more: body.more,
  });
}

export function normalizeTopSongResult(result: unknown): UnknownRecord {
  const body = getBody(result);
  return buildListData(asArray(body.data), normalizeSong);
}

export function normalizeMvDetailResult(result: unknown): UnknownRecord {
  const body = getBody(result);
  return {
    data: normalizeMv(body.data),
  };
}

export function normalizeMvUrlResult(result: unknown): UnknownRecord {
  const body = getBody(result);
  return buildListData(asArray(body.data), (item) => {
    const entry = asRecord(item) ?? {};
    return pick(entry, ['id', 'url', 'r', 'size', 'md5', 'code'] as const);
  });
}

export function normalizeVideoListResult(result: unknown): UnknownRecord {
  const body = getBody(result);
  return buildListData(asArray(body.data), normalizeVideo);
}

export function normalizeToplistResult(result: unknown): UnknownRecord {
  const body = getBody(result);
  return buildListData(asArray(body.list), normalizePlaylist);
}

export function normalizeRecommendedPlaylistsResult(result: unknown): UnknownRecord {
  const body = getBody(result);
  return buildListData(asArray(body.result), normalizePlaylist);
}

export function normalizeRecommendedSongsResult(result: unknown): UnknownRecord {
  const body = getBody(result);
  const data = asRecord(body.data);
  return buildListData(
    asArray(data?.dailySongs ?? body.dailySongs),
    normalizeSong,
  );
}

export function normalizeLoginStatusResult(result: unknown): UnknownRecord {
  const body = getBody(result);
  return {
    account: asRecord(body.account) ?? undefined,
    profile: asRecord(body.profile) ? normalizeUser(body.profile) : undefined,
  };
}

export function normalizeUserAccountResult(result: unknown): UnknownRecord {
  const body = getBody(result);
  return {
    account: asRecord(body.account) ?? undefined,
    profile: asRecord(body.profile) ? normalizeUser(body.profile) : undefined,
  };
}

export function normalizeUserDetailResult(result: unknown): UnknownRecord {
  const body = getBody(result);
  const profile = asRecord(body.profile) ?? {};
  return {
    profile: normalizeUser(profile),
    level: body.level,
    createDays: body.createDays,
    listenSongs: body.listenSongs,
  };
}

export function normalizeUserSubcountResult(result: unknown): UnknownRecord {
  const body = getBody(result);
  return pick(body, [
    'createdPlaylistCount',
    'subPlaylistCount',
    'subArtistCount',
    'subDjRadioCount',
    'subAlbumCount',
    'subMvCount',
  ] as const);
}

export function normalizeUserPlaylistResult(result: unknown): UnknownRecord {
  const body = getBody(result);
  return buildListData(asArray(body.playlist), normalizePlaylist, {
    more: body.more,
    version: body.version,
  });
}

export function normalizeUserListResult(
  result: unknown,
  key: 'follow' | 'followeds',
): UnknownRecord {
  const body = getBody(result);
  return buildListData(
    asArray(body[key]),
    normalizeUser,
    key === 'followeds'
      ? { more: body.more, lasttime: body.lasttime }
      : { more: body.more },
  );
}

export function normalizeUserRecordResult(result: unknown): UnknownRecord {
  const body = getBody(result);
  const items = asArray(body.allData ?? body.weekData);
  return buildListData(items, (item) => {
    const entry = asRecord(item) ?? {};
    return {
      score: entry.score,
      playCount: entry.playCount,
      song: normalizeSong(entry.song),
    };
  });
}

export function normalizeCommentListResult(result: unknown): UnknownRecord {
  const body = getBody(result);
  return {
    total: body.total,
    more: body.more,
    comments: asArray(body.comments).map(normalizeComment),
    hotComments: asArray(body.hotComments).map(normalizeComment),
  };
}

export function normalizeMutationResult(
  result: unknown,
  params: UnknownRecord,
): UnknownRecord {
  const body = getBody(result);
  return {
    code: body.code,
    success: body.code === 200,
    params,
  };
}

export function normalizeLikeListResult(result: unknown): UnknownRecord {
  const body = getBody(result);
  return {
    ids: asArray(body.ids),
    checkPoint: body.checkPoint,
  };
}

export function normalizePlaylistCreateResult(result: unknown): UnknownRecord {
  const body = getBody(result);
  return {
    code: body.code,
    success: body.code === 200,
    playlist: asRecord(body.playlist)
      ? normalizePlaylist(body.playlist)
      : undefined,
    id: body.id,
  };
}

export const knownMethodNormalizers: Record<string, ResultNormalizer> = {
  album: (result) => normalizeAlbumDetailResult(result),
  artist_album: (result) => normalizeArtistAlbumsResult(result),
  artist_detail: (result) => normalizeArtistDetailResult(result),
  artist_songs: (result) => normalizeArtistSongsResult(result),
  captcha_sent: (result, params) => normalizeMutationResult(result, params),
  captcha_verify: (result, params) => normalizeMutationResult(result, params),
  cellphone_existence_check: (result, params) => normalizeMutationResult(result, params),
  cloudsearch: (result, params) => normalizeSearchResult(result, params),
  comment_album: (result) => normalizeCommentListResult(result),
  comment_music: (result) => normalizeCommentListResult(result),
  comment_mv: (result) => normalizeCommentListResult(result),
  comment_playlist: (result) => normalizeCommentListResult(result),
  comment_video: (result) => normalizeCommentListResult(result),
  like: (result, params) => normalizeMutationResult(result, params),
  likelist: (result) => normalizeLikeListResult(result),
  login: (result) => normalizeLoginStatusResult(result),
  login_cellphone: (result) => normalizeLoginStatusResult(result),
  login_refresh: (result, params) => normalizeMutationResult(result, params),
  login_status: (result) => normalizeLoginStatusResult(result),
  logout: (result, params) => normalizeMutationResult(result, params),
  lyric: (result) => normalizeLyricResult(result),
  mv_detail: (result) => normalizeMvDetailResult(result),
  mv_url: (result) => normalizeMvUrlResult(result),
  personalized: (result) => normalizeRecommendedPlaylistsResult(result),
  playlist_catlist: (result) => normalizePlaylistCategoriesResult(result),
  playlist_create: (result) => normalizePlaylistCreateResult(result),
  playlist_delete: (result, params) => normalizeMutationResult(result, params),
  playlist_desc_update: (result, params) => normalizeMutationResult(result, params),
  playlist_detail: (result) => normalizePlaylistDetailResult(result),
  playlist_name_update: (result, params) => normalizeMutationResult(result, params),
  playlist_order_update: (result, params) => normalizeMutationResult(result, params),
  playlist_subscribe: (result, params) => normalizeMutationResult(result, params),
  playlist_track_add: (result, params) => normalizeMutationResult(result, params),
  playlist_track_all: (result) => normalizePlaylistTracksResult(result),
  playlist_track_delete: (result, params) => normalizeMutationResult(result, params),
  recommend_songs: (result) => normalizeRecommendedSongsResult(result),
  related_allvideo: (result) => normalizeVideoListResult(result),
  simi_artist: (result) =>
    buildListData(asArray(getBody(result).artists), normalizeArtist),
  simi_playlist: (result) => normalizePlaylistListResult(result),
  simi_song: (result) => normalizeSongDetailResult(result),
  song_detail: (result) => normalizeSongDetailResult(result),
  song_url_v1: (result) => normalizeSongUrlResult(result),
  top_playlist: (result) => normalizePlaylistListResult(result),
  top_playlist_highquality: (result) => normalizePlaylistListResult(result),
  top_song: (result) => normalizeTopSongResult(result),
  toplist: (result) => normalizeToplistResult(result),
  toplist_detail: (result) => normalizeToplistResult(result),
  user_account: (result) => normalizeUserAccountResult(result),
  user_detail: (result) => normalizeUserDetailResult(result),
  user_followeds: (result) => normalizeUserListResult(result, 'followeds'),
  user_follows: (result) => normalizeUserListResult(result, 'follow'),
  user_playlist: (result) => normalizeUserPlaylistResult(result),
  user_record: (result) => normalizeUserRecordResult(result),
  user_subcount: (result) => normalizeUserSubcountResult(result),
};

export function normalizeKnownMethodResult(
  method: string,
  result: unknown,
  params: UnknownRecord,
): UnknownRecord | undefined {
  return knownMethodNormalizers[method]?.(result, params);
}
